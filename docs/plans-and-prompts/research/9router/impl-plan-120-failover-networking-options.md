---
Date: 2026-09-16
Author: GitHub Copilot
Status: draft
Tags: implementation-plan, failover-networking, failover-options, network-failover, connectivity
---

# Implementation Plan 120 — Failover Networking Options

> Mined from branch docs: `47-branch-9router-internal-threads.md` (failover networking) and `26-node-failover-networking-options.md`.

## 1. Goal

Add failover networking options to 9Router: multiple network paths for upstream connections (direct, proxy, alternate DNS, alternate endpoints), automatic path failover, and path health tracking — so upstream connectivity survives network failures.

## 2. Background (from research)

- **9Router current state**: single network path per provider.
- **Research findings** (47-branch):
  - Failover networking: alternate network paths.
  - (26) Node failover networking options: options research.

## 3. Design

### 3.1 Network Path Model

- **Path**: endpoint + proxy + DNS + protocol.
- **Path types**: direct, proxy, alternate-endpoint, alternate-DNS.
- **Path registry**: per-provider path lists.

### 3.2 Path Health

- **Path checks**: periodic connectivity probes.
- **Path metrics**: latency, success, stability.
- **Path states**: healthy, degraded, down.

### 3.3 Path Failover

- **Failover logic**: primary path → alternate paths.
- **Failover triggers**: probe failure, request failure.
- **Failover recovery**: primary path recovery detection.

### 3.4 Integration

- **Executor integration**: path selection in executors.
- **Observability**: path telemetry.
- **Dashboard**: path view.

## 4. Implementation Steps

1. Build path model (`src/lib/netpaths/`).
2. Add path health checks.
3. Build path failover.
4. Integrate executors.
5. Dashboard: path view.
6. Tests: path failover, recovery.

## 5. Files Touched

- `src/lib/netpaths/` (new: model, health, failover)
- `open-sse/executors/` (path integration)
- `open-sse/config/netpathConfig.js` (new)
- Dashboard netpaths page (new)
- `tests/unit/netpaths.test.js` (new)

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Path misdetection | Probe calibration |
| Failover storms | Hysteresis |
| Proxy issues | Path validation |
| Recovery races | Recovery checks |

## 7. Success Criteria

- Paths registered per provider.
- Health probes run.
- Failover works.
- Recovery detected.

## 8. Related Plans

- Plan 26 (Node Failover Networking) — options research.
- Plan 65 (Provider Redundancy) — redundancy.
- Plan 9 (Error Failover) — failover integration.
- Plan 94 (Acceptance/Load) — health signals.