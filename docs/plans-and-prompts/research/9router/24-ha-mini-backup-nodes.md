# HA for mini & mini2 — Backup-Node Research (2026-08-08)

**Date:** 2026-08-08
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #ha #high-availability #failover #litestream #sqlite #replication #proxmox

## 1. The ask

> "If mini and mini2 were running 9Router, could they be backups of each other if
> one goes down — in a similar concept to how Proxmox has backup nodes for their
> VMs? Is there a way to do that with networking and nodes? Look up different
> options, find an exhaustive no-limits list of possibilities, then research them
> and find how we could do this."

### Grounding so far
- **Litestream** (https://litestream.io/how-it-works/): WAL → LTX files with
  monotonically increasing TXIDs + checksums; compaction L0/L1/L2/L3 + 24h
  snapshots; restore = snapshot + contiguous LTX replay (whole-file only,
  granularity coarser over time; `l0-retention` default 5m); retention default
  24h; VFS read-replica extension available.
- **HAProxy 2.9 config manual** (docs.haproxy.org): `backup` server directive —
  *"When 'backup' is present on a server line, the server is only used in load
  balancing when all other non-backup servers are unavailable"*; `option
  allbackups` (use all backups at once); `monitor-uri` + `monitor fail` (health
  endpoint returning 200/503); `peers` section (stick-table replication between
  HAProxy instances, multi-master push, resumes from last known point).
- **rqlite** (rqlite.io / GitHub README): fault-tolerant distributed SQLite on
  Raft; full SQL via SQLite incl. FTS5 + JSON1; atomic multi-statement HTTP
  API; hot backups incl. automatic S3/MinIO/GCS; tunable read consistency +
  queued (async) writes; single-writer leader with automatic leader election;
  "outage of a node doesn't impact the cluster".

### What "backup node" means here (Proxmox analogy, mapped down)
Proxmox HA is: quorum (corosync), fencing, a manager that **migrates/fails-over
VMs** between physical nodes, plus (optionally) replicated storage (ZFS
replication, Ceph). For 9Router the mapping is:

| Proxmox concept | 9Router equivalent |
|---|---|
| Physical node | mini / mini2 hosts |
| VM | the `cli/app` 9Router server process (port 20128/20130) |
| VM disk | `~/.9router/` SQLite DB (settings, connections, keys, usage) + `usage.json`/`log.txt` |
| VM live migration | impossible here (Next.js server has in-memory SSE streams) — but **failover** (restart elsewhere) is |
| Corosync/quorum | heartbeat + leader election script (or HAProxy) |
| Storage replication | SQLite replication (Litestream / rqlite / file sync) |
| Fencing | kill-the-stale-node guard before promotion (STONITH-lite) |

Key asymmetry vs Proxmox: **9Router's DB is SQLite (single-writer)**. So
master–master is NOT free; the realistic topologies are master–standby with
replication, or a proxy layer in front of both.

### State inventory — what actually must be protected
1. **SQLite DB** (`~/.9router/9router.db` — settings, connections/API keys,
   combo/fallback config, session store). Small, written rarely. **Critical.**
2. **usage.json + log.txt** (`src/lib/usageDb.js`, still file-based). Written
   per request. **Nice-to-have** (loses telemetry only).
3. **The binary** (`cli/app` — 62 MB). Deployable via rsync; not "state".
4. **In-flight SSE streams** — lost on failover by design (client reconnects
   and retries; 9Router's own fallback chains help clients here).

---

## 2. THE EXHAUSTIVE OPTIONS LIST (numbered, no limits)

### A. Data replication (SQLite/state) — 12 options
1. **Litestream continuous streaming** — litestream replicate the DB to the
   peer over SFTP/object storage; standby restores snapshot+LTX.
2. **Litestream file:// replica** — replicate to a shared/networked folder
   (NFS/SMB/Syncthing target) both nodes can read.
3. **Litestream on the *standby* only** — standby pulls a litestream replica
   from the primary; zero cost on primary.
4. **rqlite** — replace direct SQLite with a 2-node (or 3-node) rqlite cluster;
   app talks to rqlite HTTP API; Raft handles leader election + replication.
5. **dqlite** — Canonical's replicated SQLite (Raft, used by LXD). Heavier C
   deps; not Node-friendly without a server daemon.
6. **Better-sqlite3 WAL file rsync** — periodic `rsync`/`scp` of the DB while
   in WAL mode (must quiesce or use `sqlite3 .backup`/`VACUUM INTO` for
   consistency).
7. **sqlite3 online backup API** — scheduled `sqlite3 db 'VACUUM INTO ...'` or
   `.backup` on the primary, then ship the copy (scriptable, crash-safe).
8. **SQLite `dbstat`/change-stream via trigger table** — app-level outbox
   table + a sync script replaying rows to the peer's API (custom, robust,
   moderate effort).
9. **9Router-native state API sync** — a small "sync endpoint" on each node
   that the peer polls (`GET /api/admin/state`, `POST /api/admin/state/import`)
   — reuses the app's own repos (no DB file sharing at all).
10. **Litestream VFS read-replica extension** — second node reads the
    replicated LTX stream directly via custom VFS (real-time-ish read
    replica; write still only on primary).
11. **CRDT/merge-based JSON settings sync** (like the existing cloud-sync
    feature) — if settings were stored as JSON documents with merge
    semantics, bidirectional sync without a DB. High complexity, high risk of
    merge bugs.
12. **iCloud/Drive/Dropbox folder sync of the DB file** — zero engineering,
    but NOT crash-safe (file replaced mid-write), NOT recommended for SQLite.

### B. Traffic failover / load balancing — 12 options
13. **HAProxy on a dedicated port with `backup` server** — one frontend,
    `server mini :20128 check`, `server mini2 :20128 check backup`; health =
    `option httpchk GET /api/health/providers`; traffic goes to mini, the
    instant it fails checks → mini2 (HAProxy's native, sub-second failover).
14. **HAProxy active/active (roundrobin, both primary)** — load-split; each
    node still needs its own DB copy → couples with option 1/4/9.
15. **nginx `upstream` with `backup`** — same semantics as 13 with nginx
    (passive health checks via `max_fails`/`fail_timeout`, or active via
    njs/third-party).
16. **Caddy reverse proxy + health check** — built-in `health_uri`/`health_port`
    since 2.5; JSON config; automatic failover among upstreams.
17. **Caddy `try_files`/`handle` scripting** — hacky; not recommended.
18. **DNS round-robin / dynamic DNS failover** — give 9router.example.com two
    A records and a script that flips TTL/pool when one node dies (works from
    anywhere; slow convergence; needs public DNS or local resolver like
    dnsmasq/adguard).
19. **mDNS/Bonjour service resolution** — `.local` names; no failover logic;
    not a real option alone (listed for completeness).
20. **Tailscale L4 load balancer** — one tailnet IP:port load-balanced across
    both nodes with health checks; works LAN + remote; current Tailscale
    LB supports port ranges, `L4` balancing, backend health monitoring
    (per docs kb/1631).
21. **Tailscale + subnet router for remote access** — if mini2 is remote,
    Tailscale gives mini (and clients) a stable path to mini2 regardless of
    IP changes; pairs with 13/20.
22. **Client-side retry via 9Router's own fallback chains** — 9Router already
    has model/combo fallback; add "provider" entries pointing at
    `http://mini:20128/v1` and `http://mini2:20128/v1` — the *clients* do the
    failover at the LLM-call layer with zero infra.
23. **VPN tunnel (WireGuard/Tailscale) + virtual IP** — both nodes share a
    VIP on a VPN interface; failover moves the VIP (see 26).
24. **mDNS + custom DNS service (AdGuard Home) with health script** — local
    DNS name flips to the healthy node; nice for laptops on LAN.

### C. Cluster/coordination (the "corosync" layer) — 8 options
25. **keepalived VRRP** — classic VIP failover on LAN (floating IP moves to
    backup on heartbeat loss). Needs `sudo`/root on both Macs; VRRP on macOS
    is poorly supported (keepalived is Linux-first; on macOS use
    `ifstated`/pf-based or skip).
26. **macOS-native VIP via `ifconfig alias` + a heartbeat script** — small
    script does `ping`/HTTP check, `sudo ifconfig en0 alias 192.168.x.50` on
    promotion. DIY corosync-lite. Works; needs sudoers rule.
27. **Corosync + Pacemaker** — the real Proxmox stack. Linux-only; macOS
    unsupported. Listed to answer "the Proxmox way" honestly: **not portable
    to macOS**.
28. **etcd / Consul / ZooKeeper** — external consensus for leader election +
    health registry. Overkill for 2 nodes; needs 3 for quorum; but rocksolid
    if we ever add a 3rd node or want service discovery.
29. **HashiCorp Consul (2-node + built-in gossip)** — works on macOS, has
    health checks + service mesh; used by many homelabs; reasonable middle
    ground.
30. **SQLite-as-lockfile leader election** — both nodes hold the same
    replicated DB (option 1/4); leader writes a `leader` row with a heartbeat
    timestamp; standby polls and self-promotes after N misses. Zero extra
    infra, uses the replication we already built. **Elegant for 2 nodes.**
31. **systemd/cron heartbeat + `launchctl` kickstart** — macOS-native: each
    node runs a `launchd` agent that curls the peer's health endpoint and
    starts/stops the local 9Router accordingly. Simplest possible "cluster".
32. **Orchestrator daemon inside 9Router itself** — a built-in `haMode`
    setting: nodes register to each other, one is leader, it syncs state and
    auto-promotes. (Feature work in the app; couples HA to the app.)

### D. Failure detection & health — 5 options
33. **HTTP health endpoint** — 9Router already exposes
    `/api/health/providers` (+ `/login`). Any watcher (HAProxy/Caddy/script)
    probes it. **This is the detection primitive.**
34. **TCP port check** — connect to :20128; detects process-down but not
    app-hang.
35. **Application-level "I'm alive + I'm primary" endpoint** — extend health
    with role + last-sync info; lets HAProxy/scripts make richer decisions.
36. **Liveness vs readiness split** — `/healthz` (process) vs `/readyz`
    (DB+replication caught up) — lets a standby advertise "ready to serve".
37. **External watchdog (Uptime Kuma / Healthchecks.io)** — third place
    (phone/home server) decides both are down; pairs with any option; gives
    notifications.

### E. Deploy/ops (keep both nodes identical) — 4 options
38. **rsync deploy + checksum verify** — existing runbook; add `shasum` of
    `cli/app` and a `VERSION` file; both nodes assert same build at startup.
39. **Git-based deploy (auto-pull + rebuild on the node)** — mini2 builds
    from source; heavier but removes binary-skew risk.
40. **Bidirectional file sync of config (Syncthing)** — sync `~/.9router`
    *except* the DB; settings/keys as YAML/JSON sidecar. Works well with 8/9.
41. **launchd plists for auto-start + restart** — both nodes start 9Router at
    boot, `KeepAlive` restarts on crash; the "systemd unit" part of the story.

---

## 3. Deep dives (the realistic candidates)

### 3.1 Litestream — SQLite-to-SQLite replication (Options 1–3, 10)
**How it works (grounded):** SQLite WAL frames are copied out and written to
LTX files with monotonically-increasing transaction IDs and per-file
checksums. Compaction levels L0–L3 plus 24h snapshots keep restores efficient.
**Restore** = latest snapshot + contiguous replay of LTX files → a consistent
DB. Whole-file granularity: recent data restores to *the last LTX boundary*
(≈5 min default `l0-retention`), older data coarser.

**For 9Router:**
- Replicate `~/.9router/9router.db` → `ssh://chris@mini2/~/litestream-replica`
  (or file:// via a shared folder). Standby keeps a `litestream restore`
  landing area and, on failover, does `litestream restore -o db && start`.
- **RPO**: ~seconds (LTX interval). **RTO**: tens of seconds (restore +
  app start).
- **Read-replica VFS** (option 10): the standby could serve *reads* nearly
  live, but 9Router doesn't need read-only mode; not worth the complexity.
- **Gotcha:** Litestream must run *while the app runs* on the primary
  (WAL-mode DB only); on failover the *new* primary must stop consuming and
  start producing (run litestream on whichever node is primary — an
  asymmetric-but-scriptable switch).
- **Fit: excellent.** Minimal code, battle-tested, fits SQLite reality.

### 3.2 rqlite / dqlite — replicated SQLite as the datastore (Option 4, 5)
- rqlite: Raft consensus; **single-writer leader**; followers replicate;
  HTTP API (`/db/execute`, `/db/query`); automatic leader election; a 2-node
  cluster loses quorum on one node's death — so **2 nodes alone give you
  failover only if the surviving node can still serve (rqlite supports
  single-node operation after leader death only with 3 nodes or manual
  intervention)**. Real HA needs 3 nodes (or 2 + tie-breaker).
- dqlite: similar but C-embedded; used by LXD. No great Node client story.
- **Fit: poor for this specific case** — 9Router's `src/lib/db/` is a
  *local file* SQLite adapter chain (bun/better-sqlite3/node/sql.js). Rewiring
  every repo to an HTTP DB is a big refactor, and 2-node quorum math is
  worse than master–standby replication. **Keep as reference**, not a plan.

### 3.3 HAProxy with `backup` server (Option 13) — the "HAProxy is Proxmox's
fence here" story
Grounded config shape:
```
frontend fe_9router
    bind :20128
    mode http
    default_backend bk_9r
backend bk_9r
    mode http
    option httpchk GET /api/health/providers
    server mini  <mini-ip>:20128 check inter 2s fall 3 rise 2
    server mini2 <mini2-ip>:20128 check backup
```
- Primary serves; when checks fail (3×2s ≈ 6s), **all** traffic goes to the
  `backup` server automatically. `monitor-uri /alive` + `monitor fail if
  { nbsrv(bk_9r) lt 1 }` gives the *outer* world a 200/503 health signal.
- Run HAProxy on **both** nodes (each proxies to the other + itself) so
  either node's death doesn't kill the LB itself → **two LB points, one
  logical address per node** (or a VIP via option 26).
- **Fit: excellent** — this is literally the "backup node" concept Proxmox
  users imagine, at the traffic layer, and it composes with 3.1/3.6 for state.

### 3.4 In-app / replicated-DB leader election (Option 30)
With Litestream or the state-sync API (option 9) in place, both nodes see a
`cluster` table:
- Primary: writes `heartbeat = now` every 5 s (same row it replicates).
- Standby: reads its (replicated) copy; if heartbeat older than 20 s and the
  local HTTP health of the peer fails → promote self (stop restoring, start
  app, become writer, flip its HAProxy `backup`→primary or its own role).
- **Split-brain guard:** only promote if the peer is *provably* down (HTTP
  fails AND TCP fails AND heartbeat stale), and on promotion write a
  `promoted_at` row so a resurrected old primary can detect it lost the race
  and demote itself. This is fencing-lite. Document it; 2-node clusters
  always have this corner.

### 3.5 macOS-native heartbeat + launchd (Options 26, 31, 41)
- Each node runs a launchd agent (`KeepAlive=true`) starting 9Router and a
  tiny `peer-watch` script.
- `peer-watch`: every 5 s `curl -fsS http://<peer>:20128/api/health/providers`.
  On N failures → optional `sudo ifconfig en0 alias 192.168.x.50/24` (VIP) or
  local HAProxy reconfig. All shell; no new deps; fully transparent to LAN
  clients that use the VIP.
- **Fit: good as the "glue"** regardless of which data option is chosen.

### 3.6 9Router-native state sync endpoint (Option 9) — the zero-new-deps path
- Add `GET/POST /api/admin/state` (auth-gated by the existing JWT/session):
  exports settings+connections as JSON (repos already exist:
  `settingsRepo`, connections repo), peer imports via the same repos (which
  already have merge semantics after BUG-A fix).
- Sync loop: primary pushes on change (or every 60 s); standby imports.
  Usage/logs excluded or best-effort.
- **Fit: excellent as an *alternative* to Litestream** if we want to avoid a
  new daemon; strictly worse RPO than Litestream for the DB, but covers the
  same critical surface (settings/keys) and reuses tested code.

---

## 4. Recommended architecture (phased, opinionated)

### Phase 0 — baseline (already true)
Both nodes run identical `cli/app` (verified builds), each with its own
`~/.9router`, ports 20128. Node-local data only.

### Phase 1 — replication (pick ONE data path)
| Choice | Effort | RPO | Notes |
|---|---|---|---|
| **A. Litestream primary→standby** | Low (daemon + launchd + restore-on-failover) | ~5 s | Recommended: true DB-level, battle-tested |
| B. State-sync API (option 9) | Medium (new endpoint + sync loop) | ~60 s | No new deps; app-native |
| C. rqlite | High (repo rewrite) | n/a | Rejected for 2-node quorum + refactor cost |

### Phase 2 — traffic failover (pick ONE traffic path)
| Choice | Effort | Failover time | Notes |
|---|---|---|---|
| **A. HAProxy per node w/ `backup` server** | Low (2 configs) | ~6 s | Recommended: native, health-aware, works for LAN clients pointing at either node |
| B. Caddy w/ health_uri | Low | ~5–10 s | Simpler config than HAProxy; less observability |
| C. Tailscale L4 LB | Low | varies | Best if remote access/off-LAN is needed; also covers phones |
| D. VIP script + launchd | Medium | ~10 s | Gives one stable IP; pairs with A |

### Phase 3 — role/fencing (when both nodes can be primary)
- Implement option 30 (replicated-DB heartbeat + promote/demote) OR keep
  it manual: "which node is primary" is a text file + health dashboards.
- For a 2-person homelab, **manual/scripted failover with health alerts is
  legitimate** — Proxmox-grade automation is justified only when nobody can
  SSH in to flip a switch.

### The "backup node" answer in one line
> **Litestream (or state-sync) keeps mini2's DB a mirror of mini's; HAProxy on
> both nodes (or one VIP) sends traffic to the live node and automatically to
> the backup when the primary fails its `/api/health/providers` check. That is
> the networking+nodes equivalent of Proxmox backup nodes for this app.**

---

## 5. Honest limitations (what Proxmox has that we can't have)
1. **No live migration**: in-flight SSE streams die on failover. Clients must
   reconnect (9Router's client-side fallback chains mitigate).
2. **2-node quorum is impossible** with real consensus (etcd/rqlite need 3).
   All 2-node designs accept a split-brain window or manual arbitration.
   Mitigations: fencing guard (3.4), "promote only if peer provably dead".
3. **RPO>0**: last seconds of usage.json/log.txt and any un-replicated DB
   write are lost on a hard crash. Acceptable for settings/keys; telemetry
   loss is cosmetic.
4. **macOS has no Corosync/VRRP-class tooling** (keepalived is Linux). DIY
   scripts + launchd + HAProxy is the honest local equivalent.
5. **DB schema is app-owned** — any replication must respect SQLite WAL
   semantics; never rsync a live DB file (option 12 is a trap).

## 6. Open questions for Chris
1. Are mini and mini2 on the **same LAN** (both reachable at 192.168.x)? —
   determines VIP vs Tailscale vs DNS options.
2. Do you want **automatic** failover or **scripted/manual** (alert + one
   command)? — determines Phase 3 scope.
3. Is losing ~5 s of telemetry (usage.json) acceptable? (Almost certainly
   yes.)
4. Do any clients point at 9Router from **off-LAN** (phone, laptop away)?
   — yes → Tailscale enters the picture.
5. Prefer a new daemon (Litestream) or app-native sync endpoint (option 9)?
