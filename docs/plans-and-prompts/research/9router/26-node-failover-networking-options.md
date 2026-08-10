# Node Failover — Networking Options Matrix (real-world grounded, 2026-08-10)

**Date:** 2026-08-10
**Author:** GitHub Copilot agent
**Status:** active
**Tags:** #research #ha #failover #networking #vrrp #haproxy #dns

## 1. Why this doc exists

User asked: are the two nodes actually using each other? Are we spoofing a
name so one becomes the main router and the other takes over on the network?
What are the possibilities? Were the ideas verified against real-world
documentation? This doc answers with sources fetched 2026-08-10:
- HAProxy 2.9 Configuration Manual (docs.haproxy.org, v2.9.15, 2025-03-21)
- VRRP — RFC 9568/5798/3768/2338 (Wikipedia + IETF)
- Keepalived (keepalived.org — Linux VRRP/IPVS/health-check daemon)
- Tailscale MagicDNS (tailscale.com/kb/1081)

## 2. Direct answers to the user's questions

### Q: Are we creating a new endpoint?
**No.** The app's OpenAI-compatible `/v1/*` surface is unchanged. Failover
lives in a separate proxy process in front of the app. The proxy probes the
app's EXISTING `/api/health` (no new app endpoint needed). An optional
observability endpoint (`/api/health/peers`) could be added later, purely
for dashboard visibility, not for failover mechanics.

### Q: Are the two nodes actually using each other?
**Yes — that is exactly what is deployed (mutual backup).**
- mini-2's proxy (`:20142`) → local app `:20130`, peer **mini2** `:20128`
- mini2's proxy (`:20142`) → local app `:20128`, peer **mini-2** `:20130`
Local is always preferred; the peer is used only when the local app is
unhealthy. Verified live both directions (identity-proven via
`/api/settings/require-login`), including under launchd.

### Q: Are we spoofing a name / floating an IP so the backup "throws itself on the network"?
That mechanism is **VRRP / CARP (virtual IP failover)** — the backup holds
no address; on heartbeat loss it *grabs* the virtual IP and answers ARP for
it. RFC 5798: routers in a VRRP group share a virtual IP; the active router
advertises via multicast 224.0.0.18 (proto 112); if the backup hears nothing
for 3× the advertisement interval it assumes the active is dead and
elevates itself (priority-based election).

**Honest status: this is NOT what we implemented, and it is not
practical on macOS:**
- Keepalived (the standard VRRP implementation) is **Linux-only**
  ("Keepalived builds load balancing on top of the well known LVS kernel
  module… High availability comes from the VRRP protocol" — keepalived.org).
- Doc 24 option 25 flagged this: "keepalived VRRP … needs sudo/root on both
  Macs; VRRP on macOS is poorly supported (keepalived is Linux-first)".
- The macOS-native approximation (doc 24 option 26) is `ifconfig <if> alias
  <VIP>` + a heartbeat script that moves the alias — root-level, fragile,
  and still leaves the "whole machine dead" problem unsolved on the peer
  side unless the VIP lives on a third box.

**What we DID implement instead is the application-layer equivalent** of
the same user-facing promise: each machine exposes ONE stable endpoint
(`:20142`) that keeps working when the local app dies, by transparently
forwarding to the peer. It is strictly better than VIP for the app-death
case (it also covers "app hung / DB locked / partial crash", which VRRP
cannot see), and it required zero changes to the app or the OS network
stack.

### Q: What are ALL the possibilities? (with real-world grounding)

| # | Option | Real-world basis | Works on macOS? | Covers app-death? | Covers whole-machine death for a client pinned to that endpoint? |
|---|---|---|---|---|---|
| 1 | **L2 app-layer proxy per node (IMPLEMENTED)** | custom `failover-proxy.cjs`, same pattern as HAProxy frontend/backend with health checks | ✅ | ✅ | ❌ (proxy dies with the machine) |
| 2 | HAProxy with `backup` server | HAProxy 2.9 manual: `server srv1 … check`, `server srv2 … backup` — backup used only when all non-backup servers are down; `option allbackups` to spread; `inter`/`rise`/`fall` + `option httpchk` health logic | ✅ (HAProxy builds on macOS) | ✅ | ❌ (same single-frontend problem) |
| 3 | VRRP/CARP virtual IP | RFC 5798; keepalived (Linux) | ❌ (keepalived Linux-only; `ifconfig alias` hack possible but root/fragile) | ✅ | ✅ (if VIP moves to the surviving box) |
| 4 | DNS failover (health-checked name) | Tailscale MagicDNS = per-machine names only (no VIP/health abstraction — verified in Tailscale docs); dnsmasq/AdGuard + health script (doc 24 option 24) | ✅ | ✅ | ✅ (name points at whichever machine is up — but TTL/convergence lag) |
| 5 | Client-side dual-endpoint retry | OpenAI-compatible clients point at a primary base URL; some support fallback lists (LiteLLM-style) | ✅ | ✅ | ✅ (client decides) |
| 6 | L1 in-app peer forwarding (`settings.peerNodes`) | Designed in doc 25 §5; not implemented | ✅ | ✅ (covers degraded-local too) | ❌ |

### Q: The honest gap — what current setup does NOT cover
If the **entire machine** dies (power loss, not just the app process), its
proxy dies with it. A client whose base URL is that machine's `:20142`
must manually switch to the other machine. The current design protects
against *app* failure (the common case, and what we've tested) but not
against *machine* failure with a single pinned client endpoint.

Realistic fixes, in order of practicality for THIS infrastructure
(Tailscale mesh, macOS, two machines):
1. **Client-side fallback** (option 5): point tools at `mini-2:20142` with
   `mini2:20142` as documented fallback — zero infra change, works today.
2. **Tailscale MagicDNS names** (option 4-lite): both machines have stable
   names (`mini2` etc.); document + use names instead of IPs so re-IPs
   never break configs (already partially done).
3. **Third-box VIP** (option 3): if a small Linux box/VM ever joins the
   mesh, run keepalived there with the VIP, and HAProxy `backup` (option 2)
   pointing at both 9Router proxies — the "real" HA answer, matching the
   Proxmox analogy from doc 24.
4. **HAProxy with `backup`** (option 2) on one Mac in front of both apps —
   simplest single-endpoint upgrade of what we have; still machine-death
   vulnerable on the HAProxy host itself.

## 3. What was tested (evidence) before "completed" was claimed

- Automated suite: `tests/unit/failover-proxy.test.js` — spawns the REAL
  proxy, 6 tests (local-pref, failover, failback, loop protection,
  both-down fail-open, abort-survival) — 6/6 ×3 runs.
- Real-world (both machines, launchd-managed, fresh full build):
  - kill local app → proxy serves peer within 2s (sustained outage, 6/6 polls)
  - restore → failback
  - reverse direction identical
  - kill app+proxy → launchd respawn → healthy <12s (both machines)
  - matrix 200/200/200/200 via Tailscale
- The tests FOUND and we FIXED real production bugs: launchd mDNS → fe80::
  + macOS Local-Network TCC blocking LAN peers (→ Tailscale IP peers), and
  the rsync --delete proxy-orphaning (→ proxy ships in the bundle).

## 4. Recommendation

Keep the implemented L2 mutual-proxy (it is correct for app-death and is
the only option that works cleanly on macOS today). Add, in order:
1. Client-facing docs with BOTH endpoints + fallback guidance (option 5).
2. MagicDNS names everywhere instead of raw IPs (option 4-lite).
3. Revisit HAProxy `backup` (option 2) if a single-endpoint front is ever
   wanted; revisit keepalived VIP (option 3) only if a Linux box joins.

## 5. Sources

- HAProxy 2.9 Configuration Manual — docs.haproxy.org/2.9/configuration.html
  (server `backup` keyword, `option allbackups`, `check`/`inter`/`rise`/`fall`,
  `option httpchk`, `monitor-uri`)
- VRRP — RFC 9568 (current), 5798 (v3), 3768 (v2), 2338 (v1); Wikipedia
- Keepalived — keepalived.org (Linux-only VRRP + IPVS + health checkers, BFD)
- Tailscale MagicDNS — tailscale.com/kb/1081 (per-machine names; no VIP
  abstraction)
- Prior: docs/plans-and-prompts/research/9router/24-ha-mini-backup-nodes.md
  (options list), 25-node-failover-implementation.md (L0/L1/L2 + test plan)
