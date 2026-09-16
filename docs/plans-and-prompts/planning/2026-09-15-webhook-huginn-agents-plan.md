# Webhook Implementation Plan — Huginn-Style Agents (R40)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #r40 #huginn #agents

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing conventions, but the agent is the final
> arbiter of implementation quality.

---

## Objective

Implement a Huginn-style agent system (R40): autonomous agents that watch for conditions and act — with scheduling, event propagation between agents, and a "keep watching" model. This is the always-on monitoring layer: agents like "quota watcher", "error spike detector", "model availability checker".

## Scope

**In scope:**
- Agent JSON: `{id, name, type, schedule (interval), options, enabled}`
- Agent types: watch (condition on events), schedule (cron/interval), digest (aggregate)
- Event propagation: agent output → other agents (chained)
- Memory: per-agent state (last seen, counters)

**Out of scope (v1):**
- Huginn's full UI (scenarios, dry-run)
- Agent types beyond watch/schedule/digest

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/webhooks/agents.js` | new | Agent runtime |
| `src/lib/webhooks/agents/types.js` | new | Agent type implementations |
| `src/instrumentation.js` | edit | Start agent scheduler |
| `src/lib/db/repos/settingsRepo.js` | edit | `webhookAgents: []` default |

## Code

### 1. `src/lib/webhooks/agents.js`

```js
// src/lib/webhooks/agents.js
// Huginn-style agent runtime: scheduled agents with event propagation.
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { runAgent } from "./agents/types.js";
import { emitEvent } from "./emitter.js";

const g = (global.__webhookAgents ??= { interval: null, lastRun: new Map() });

/**
 * Start the agent scheduler (runs every 30s, checks due agents).
 */
export function startAgentScheduler() {
  if (g.interval) return g.interval;
  g.interval = setInterval(tick, 30_000);
  g.interval.unref?.();
  return g.interval;
}

export function stopAgentScheduler() {
  if (g.interval) {
    clearInterval(g.interval);
    g.interval = null;
  }
}

async function tick() {
  const settings = await getSettings();
  const agents = settings.webhookAgents || [];
  const now = Date.now();
  for (const agent of agents) {
    if (!agent.enabled) continue;
    const last = g.lastRun.get(agent.id) || 0;
    const intervalMs = agent.schedule?.intervalMs || 60_000;
    if (now - last < intervalMs) continue;
    g.lastRun.set(agent.id, now);
    try {
      const output = await runAgent(agent, { now });
      if (output?.emit) {
        await emitEvent({ type: output.type || "agent.output", data: output.data });
      }
    } catch (err) {
      console.error(`[webhook-agents] ${agent.id} failed:`, err?.message || err);
    }
  }
}
```

### 2. `src/lib/webhooks/agents/types.js`

```js
// src/lib/webhooks/agents/types.js
// Agent type implementations.
import { getAdapter } from "@/lib/db/driver.js";

/**
 * Run a single agent.
 * @param {object} agent - {id, type, options}
 * @param {{now: number}} ctx
 */
export async function runAgent(agent, ctx) {
  switch (agent.type) {
    case "watch":
      return runWatchAgent(agent, ctx);
    case "schedule":
      return runScheduleAgent(agent, ctx);
    case "digest":
      return runDigestAgent(agent, ctx);
    default:
      throw new Error(`unknown agent type: ${agent.type}`);
  }
}

// Watch: check a condition against stored events (e.g. error spike)
async function runWatchAgent(agent, ctx) {
  const { eventType, windowMs = 5 * 60_000, minCount = 5 } = agent.options || {};
  const db = await getAdapter();
  const since = new Date(ctx.now - windowMs).toISOString();
  const row = await db.get(
    "SELECT COUNT(*) AS c FROM webhook_events WHERE payload LIKE ? AND created_at >= ?",
    [`%${eventType}%`, since]
  );
  if (row.c >= minCount) {
    return { emit: true, type: "agent.alert", data: { agent: agent.id, eventType, count: row.c, windowMs } };
  }
  return { emit: false };
}

// Schedule: emit on a fixed interval (heartbeat-style)
async function runScheduleAgent(agent, ctx) {
  return { emit: true, type: agent.options?.eventType || "agent.tick", data: { agent: agent.id, at: new Date(ctx.now).toISOString() } };
}

// Digest: aggregate events since last run
async function runDigestAgent(agent, ctx) {
  const db = await getAdapter();
  const rows = await db.all(
    "SELECT status, COUNT(*) AS c FROM webhook_events WHERE created_at >= ? GROUP BY status",
    [new Date(ctx.now - (agent.options?.windowMs || 24 * 60 * 60_000)).toISOString()]
  );
  return { emit: true, type: "agent.digest", data: { agent: agent.id, byStatus: rows } };
}
```

### 3. `src/instrumentation.js` — wire the scheduler

```js
// In instrumentation.js:
const agents = settings.webhookAgents;
if (agents?.some((a) => a.enabled)) {
  const { startAgentScheduler } = await import("@/lib/webhooks/agents.js");
  startAgentScheduler();
}
```

### 4. `src/lib/db/repos/settingsRepo.js` — default

```js
// In DEFAULT_SETTINGS:
  // Huginn-style agents: [{id, name, type, schedule: {intervalMs}, options, enabled}]
  webhookAgents: [],
```

## Acceptance Criteria

- [ ] Agents run on their schedule (30s tick, per-agent interval)
- [ ] Types: watch (event count threshold), schedule (interval emit), digest (aggregate)
- [ ] Agent output emits events (chaining possible)
- [ ] Settings-gated via `webhookAgents`

## Testing

```bash
# Unit test (tests/unit/webhook-agents.test.js)
# - watch: below threshold → no emit; above → emit
# - schedule: emits on interval
# - digest: groups by status
```

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-10-patterns-platforms.md` (R40)
- Plan: `../planning/2026-09-15-webhook-m4-outbound-triggers-plan.md` (emitter)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`