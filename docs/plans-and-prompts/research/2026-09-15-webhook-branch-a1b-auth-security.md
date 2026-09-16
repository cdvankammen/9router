# Branch Research — A1b: Auth & Security (7-node subtree)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #research #webhook #inbound #auth #security #hmac #binary-tree #branch-a1b

## Objective

Deep-dive the **auth & security** subtree of the webhook master tree (`2026-09-15-webhook-master-research-tree.md`). Covers HMAC verification (A1b1) and secret management (A1b2), down to L6 leaves.

```
A1b AUTH & SECURITY
├─ A1b1: HMAC VERIFICATION
│  ├─ A1b1L: signature schemes
│  │  ├─ A1b1LL: Stripe t=,v1= format
│  │  └─ A1b1LR: Standard Webhooks webhook-signature
│  └─ A1b1R: verification mechanics
│     ├─ A1b1RL: timingSafeEqual constant-time compare
│     └─ A1b1RR: timestamp tolerance (5-min replay protection)
└─ A1b2: SECRET MANAGEMENT
   ├─ A1b2L: secret ID in URL (Home Assistant)
   │  ├─ A1b2LL: UUID as password
   │  └─ A1b2LR: local_only default
   └─ A1b2R: secret rotation
      ├─ A1b2RL: whsec_ prefix (Stripe/Svix)
      └─ A1b2RR: dual-secret grace (Stripe 24h)
```

## Codebase grounding (what exists today)

### `custom-server.js` — IP trust foundation (A1b2)

- 9router's custom server derives client IP from the TCP socket and strips attacker-controlled `X-Forwarded-For` — trusting forwarding headers only from a loopback reverse proxy.
- This is the security foundation any webhook receiver builds on: the webhook route can trust `request.ip` for logging/audit.

### `src/lib/db/repos/settingsRepo.js` — secret storage (A1b2)

- `PROTECTED_SETTING_KEYS = ["password", "mitmSudoEncrypted"]` — the pattern for secrets that must never be returned by the settings API.
- Webhook secrets (`whsec_...`) should join this list.

### `src/app/api/analyze-error/route.js` — internal auth pattern (A1b1)

- The analyze-error route runs LLM analysis through the internal routing pipeline using `settings.analyzeErrorModel` — it's an internal API, not a public webhook. A webhook route is different: it MUST verify external signatures.

## External research

### A1b1LL — Stripe t=,v1= format

- **Stripe:** `Stripe-Signature: t=<timestamp>,v1=<hmac-sha256>,v0=<test>`; `signed_payload = timestamp + "." + raw body`; secret `whsec_…`.
- Multiple `v1=` values allowed (for secret rotation — old + new both valid).
- **Recommended:** adopt the Stripe format for 9router's own signature header: `t=<ts>,v1=<hmac>` over `ts + "." + rawBody`. It's the most battle-tested format in the industry.

### A1b1LR — Standard Webhooks webhook-signature

- **Svix/Standard Webhooks spec:** headers `webhook-id`, `webhook-timestamp`, `webhook-signature` (Svix aliases `svix-id`, `svix-timestamp`, `svix-signature`); `whsec_` secrets; HMAC over raw body.
- The spec is the "USB of webhooks" — adopting it makes 9router compatible with the whole ecosystem (Svix, Hookdeck, and any spec-compliant sender).
- **Recommended:** support BOTH — accept Standard Webhooks headers (`webhook-id/timestamp/signature`) AND emit Stripe-style `t=,v1=` for 9router's own outbound. The verification util handles both formats.

### A1b1RL — timingSafeEqual constant-time compare

- **Stripe/Slack/Svix/GitHub** all mandate constant-time comparison (`crypto.timingSafeEqual`) to prevent timing attacks.
- **Gotcha:** `timingSafeEqual` throws on length mismatch — pad/compare lengths first (compare `sha256(provided)` vs `sha256(expected)` or pad both to same length).
- **Helicone** uses `crypto.timingSafeEqual` for its `helicone-signature` header.
- **Recommended:** a `safeEqual(a, b)` util that hashes both sides first, then `timingSafeEqual`.

### A1b1RR — timestamp tolerance (5-min replay protection)

- **Stripe:** 5-minute tolerance — reject if `|now - timestamp| > 5 min`.
- **Slack:** 5-minute tolerance.
- **Svix:** timestamp tolerance configurable (default 5 min).
- **Recommended:** 5-min tolerance, reject with 401. This is replay protection — a captured webhook can't be replayed later.

### A1b2LL — UUID as password (Home Assistant)

- **Home Assistant:** webhook IDs are unique UUIDs treated like passwords; "don't use for destructive actions" (no signature — secrecy of the ID is the auth).
- **Recommended:** 9router generates a secret UUID per webhook endpoint. For local-only use, the UUID alone is acceptable (Home Assistant model). For tunnel/public exposure, require HMAC too.

### A1b2LR — local_only default

- **Home Assistant:** `local_only: true` default — blocks external access unless explicitly disabled.
- **Recommended:** 9router webhooks default to local-only (loopback + trusted subnets); the tunnel API (`src/app/api/tunnel/`) is the explicit opt-in for external exposure.

### A1b2RL — whsec_ prefix

- **Stripe/Svix:** secrets use `whsec_` prefix for recognizability.
- **Recommended:** `whsec_` prefix for 9router webhook secrets; stored in settingsRepo under a protected key.

### A1b2RR — dual-secret grace (Stripe 24h)

- **Stripe:** on secret rotation, the old secret remains valid for 24h (grace period) — senders can switch without downtime.
- **Recommended:** support a `secrets: [current, previous]` array per webhook; verify against any; rotate by pushing new + dropping old after 24h.

## L6 Leaf Summary

| Leaf | Finding | Precedent |
|------|---------|-----------|
| A1b1LL | `t=<ts>,v1=<hmac>` over `ts + "." + rawBody` | Stripe |
| A1b1LR | Accept Standard Webhooks headers too | Svix spec |
| A1b1RL | `safeEqual`: hash both sides, then `timingSafeEqual` | Stripe, Slack, Svix, Helicone |
| A1b1RR | 5-min tolerance, 401 on stale | Stripe, Slack, Svix |
| A1b2LL | Secret UUID in path = auth for local-only | Home Assistant |
| A1b2LR | Default local-only; tunnel = explicit opt-in | Home Assistant local_only |
| A1b2RL | `whsec_` prefix, protected settings key | Stripe, Svix |
| A1b2RR | Old secret valid 24h on rotation | Stripe |

## Related Docs

- Master tree: `2026-09-15-webhook-master-research-tree.md`
- Flat research: `2026-09-15-webhook-receive-act-research.md` (Part 2 B1 Home Assistant, D1 Stripe, D2 GitHub, D3 Svix, A3 Helicone, C1 Slack)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M1)