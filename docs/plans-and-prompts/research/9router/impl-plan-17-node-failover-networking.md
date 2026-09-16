---
Date: 2026-09-15
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, node-failover, networking, ha, backup-nodes
---

# Implementation Plan 17 — Node Failover & Networking

> Written after the binary-tree research expansion (see `39-binary-tree-expansion-master-plan.md`, `47-branch-9router-internal-threads.md` — `24-node-failover.md`, `25-node-failover-networking.md`, `26-node-failover-options.md`, `28-node-failover-crashloop.md`).
> This plan covers the "node failover/networking" option: robust node failover with networking hardening.

## 1. Goal

Harden 9Router's node failover and networking: HA mini backup nodes, failover networking (socket reuse, connection pooling), crash-loop protection, and session recovery — so a node failure never loses sessions.

## 2. Background (from research)

- **9Router node failover** (docs 24–28): HA mini backup nodes; failover networking options; mini2 crashloop deep-dive; failover session command log; packaging fixes; dual-instance conflicts.
- **Research findings**: failover must be fast (<1s); crash loops need exponential backoff; sessions must survive failover; dual instances conflict on ports/locks.

## 3. Design

### 3.1 Failover Architecture

- **Primary + backup**: primary node with hot standby backup node(s).
- **Health checks**: heartbeat-based health monitoring.
- **Promotion**: automatic promotion on primary failure.
- **Demotion**: clean demotion on primary recovery.

### 3.2 Networking Hardening

- **Socket reuse**: SO_REUSEADDR for fast restart.
- **Connection pooling**: pooled upstream connections.
- **Keep-alive**: connection keep-alive with timeout.
- **Port conflicts**: dynamic port allocation; conflict detection.

### 3.3 Crash-Loop Protection

- **Exponential backoff**: backoff on repeated crashes (1s, 2s, 4s, ...).
- **Health gates**: only promote healthy nodes.
- **Crash diagnostics**: crash logs with context.

### 3.4 Session Recovery

- **Session persistence**: sessions persisted to DB.
- **Session restore**: restore sessions after failover.
- **Command log**: failover session command log (doc 28c).
- **State ownership**: single-owner state; lock files.

## 4. Implementation Steps

1. Audit current failover (docs 24–28 findings).
2. Build health check + promotion.
3. Harden networking (socket reuse, pooling).
4. Add crash-loop protection.
5. Add session persistence + restore.
6. Fix dual-instance conflicts.
7. Tests: failover, crash-loop, session restore.

## 5. Files Touched

- `custom-server.js` (networking)
- `src/lib/failover/` (new: health, promotion)
- `src/lib/db/repos/sessionRepo.js` (session persistence)
- `cli/` (backup node packaging)
- `tests/unit/failover.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Split-brain | Quorum; fencing |
| Promotion latency | Hot standby; pre-warmed |
| Session loss | Persistence; command log |
| Port conflicts | Dynamic allocation |

## 7. Success Criteria

- Failover <1s.
- No crash loops (backoff works).
- Sessions survive failover.
- No dual-instance conflicts.

## 8. Related Plans
- Plan 9 (Error System) — failover error handling.
- Plan 10 (Security) — failover security.
- Plan 8 (Observability) — failover telemetry.