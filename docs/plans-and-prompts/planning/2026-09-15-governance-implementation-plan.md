# Governance & Attribution — Code-Bearing Implementation Plan

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #governance #attribution #profiles #gates #queues #model-groups #adaptive-rate #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, DB adapter API, settings shape, dashboard conventions).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, hit the endpoints, check the DB, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation (read before implementing each milestone):
> - `../research/2026-08-31-message-origin-and-destination-research.md`
> - `../research/2026-09-14-keyless-governance-research.md`
> - `../research/2026-09-15-tree-t*.md` + `../research/2026-09-15-exp-e*.md` (per-topic deep dives)
> - `../interpretation/2026-09-15-governance-synthesis.md` (distilled knowledge)

## Scope

**In scope:**
- Agent profiles (named identity bundles) as keyless identity + policy.
- Synthetic source labels + behavioral fingerprints for tracking without identity cooperation.
- Tag/keyword priority queues (tags = keyword groups → priority class).
- Gate levels (L0–L5 identity-confidence ladder).
- Model groups (shared RPM/TPM budget across models, e.g. 9 qwen models) with interval pacing.
- Adaptive/predictive rate control (AIMD + EWMA + 429 feedback + budget-proportional pacing).
- UI: Profiles, Gates, Tags, Model Groups, Queue depth, Adaptive-rate dashboard.

**Out of scope (future):**
- mTLS/client certs (L5) — listed in research, not built.
- Prompt-embedding clustering for synthetic sources (expensive; future).
- OAuth/device flow.
- Cloud-sync of governance config.
- Teams/workspaces with shared budgets (Phase 4).

**Consolidation note:** This plan consolidates `2026-08-31-source-app-governance-plan.md` (M1–M7) and `2026-09-14-keyless-governance-plan.md` (M1–M7) into one implementation-ready plan. The older plans remain as design rationale.

---

## M1: Agent Profiles (keyless identity)

**Goal:** Requests without keys resolve to a profile (or default); profile policy (limits/models/priority) applied.

### Reference code

**Migration** (`src/lib/db/migrations/` — new migration file, follow existing migration pattern):

```js
// migrations/00NN_agent_profiles.js (NN = next number)
export async function up(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS agent_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      app TEXT,
      ua_patterns TEXT DEFAULT '[]',      -- JSON array of regex strings
      allowed_headers TEXT DEFAULT '[]',  -- JSON array of header names
      allowed_ips TEXT DEFAULT '[]',      -- JSON array of CIDRs
      model_allowlist TEXT DEFAULT '[]',  -- JSON array of model ids / wildcards
      provider_allowlist TEXT DEFAULT '[]',
      rate_limits TEXT DEFAULT '{}',      -- JSON {rpm, tpm}
      budget TEXT DEFAULT '{}',           -- JSON {usd, period}
      priority INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      guardrails TEXT DEFAULT '{}',
      gate_level INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}
export async function down(db) {
  await db.exec(`DROP TABLE IF EXISTS agent_profiles;`);
}
```

**Repo** (`src/lib/db/repos/agentProfilesRepo.js` — new):

```js
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

const COLS = ["id","name","app","ua_patterns","allowed_headers","allowed_ips",
  "model_allowlist","provider_allowlist","rate_limits","budget","priority",
  "tags","guardrails","gate_level","enabled","created_at","updated_at"];

function rowToProfile(r) {
  if (!r) return null;
  return {
    id: r.id, name: r.name, app: r.app,
    uaPatterns: parseJson(r.ua_patterns, []),
    allowedHeaders: parseJson(r.allowed_headers, []),
    allowedIps: parseJson(r.allowed_ips, []),
    modelAllowlist: parseJson(r.model_allowlist, []),
    providerAllowlist: parseJson(r.provider_allowlist, []),
    rateLimits: parseJson(r.rate_limits, {}),
    budget: parseJson(r.budget, {}),
    priority: r.priority, tags: parseJson(r.tags, []),
    guardrails: parseJson(r.guardrails, {}),
    gateLevel: r.gate_level, enabled: !!r.enabled,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export async function getProfiles() {
  const db = await getAdapter();
  const rows = await db.all(`SELECT * FROM agent_profiles ORDER BY name`);
  return rows.map(rowToProfile);
}

export async function getProfileById(id) {
  const db = await getAdapter();
  return rowToProfile(await db.get(`SELECT * FROM agent_profiles WHERE id = ?`, [id]));
}

export async function createProfile(profile) {
  const db = await getAdapter();
  const now = Date.now();
  const id = profile.id || `prof_${crypto.randomUUID().slice(0, 8)}`;
  await db.run(
    `INSERT INTO agent_profiles (id,name,app,ua_patterns,allowed_headers,allowed_ips,
      model_allowlist,provider_allowlist,rate_limits,budget,priority,tags,guardrails,
      gate_level,enabled,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, profile.name, profile.app ?? null,
     stringifyJson(profile.uaPatterns ?? []), stringifyJson(profile.allowedHeaders ?? []),
     stringifyJson(profile.allowedIps ?? []), stringifyJson(profile.modelAllowlist ?? []),
     stringifyJson(profile.providerAllowlist ?? []), stringifyJson(profile.rateLimits ?? {}),
     stringifyJson(profile.budget ?? {}), profile.priority ?? 0, stringifyJson(profile.tags ?? []),
     stringifyJson(profile.guardrails ?? {}), profile.gateLevel ?? 0,
     profile.enabled === false ? 0 : 1, now, now]
  );
  return getProfileById(id);
}

export async function updateProfile(id, patch) {
  const db = await getAdapter();
  const existing = await getProfileById(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch, id, updatedAt: Date.now() };
  await db.run(
    `UPDATE agent_profiles SET name=?, app=?, ua_patterns=?, allowed_headers=?, allowed_ips=?,
      model_allowlist=?, provider_allowlist=?, rate_limits=?, budget=?, priority=?, tags=?,
      guardrails=?, gate_level=?, enabled=?, updated_at=?
     WHERE id=?`,
    [merged.name, merged.app, stringifyJson(merged.uaPatterns), stringifyJson(merged.allowedHeaders),
     stringifyJson(merged.allowedIps), stringifyJson(merged.modelAllowlist),
     stringifyJson(merged.providerAllowlist), stringifyJson(merged.rateLimits),
     stringifyJson(merged.budget), merged.priority, stringifyJson(merged.tags),
     stringifyJson(merged.guardrails), merged.gateLevel, merged.enabled ? 1 : 0,
     merged.updatedAt, id]
  );
  return getProfileById(id);
}

export async function deleteProfile(id) {
  const db = await getAdapter();
  await db.run(`DELETE FROM agent_profiles WHERE id = ?`, [id]);
}
```

**Resolution** (`src/lib/profiles.js` — new; called from `src/sse/handlers/chat.js`):

```js
import { fingerprintSourceApp } from "./sourceApps.js";
import { getProfiles } from "@/lib/db/repos/agentProfilesRepo.js";
import { isLoopback } from "../../custom-server.rate-limiter.js"; // or re-implement locally

let cache = null; let cacheAt = 0;
const CACHE_TTL = 5000;

async function loadProfiles() {
  if (cache && Date.now() - cacheAt < CACHE_TTL) return cache;
  cache = await getProfiles();
  cacheAt = Date.now();
  return cache;
}

function ipInCidr(ip, cidr) {
  // IPv4 only for v1; IPv6 (fd00::/8) future.
  const [range, bits] = cidr.split("/");
  const mask = bits ? ~0 << (32 - Number(bits)) : 0;
  const ipInt = ip.split(".").reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
  const rangeInt = range.split(".").reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/**
 * Resolve the effective profile for a request.
 * Order: X-9R-Profile header (post-auth/trusted net) → UA+IP match → default.
 */
export async function resolveProfile({ userAgent, ip, headerProfile, isTrusted }) {
  const profiles = (await loadProfiles()).filter((p) => p.enabled);
  if (headerProfile && isTrusted) {
    const byName = profiles.find((p) => p.name === headerProfile);
    if (byName) return byName;
  }
  const app = fingerprintSourceApp(userAgent);
  for (const p of profiles) {
    const uaMatch = p.uaPatterns.some((pat) => new RegExp(pat, "i").test(userAgent || ""));
    const ipMatch = p.allowedIps.some((cidr) => ipInCidr(ip, cidr));
    if (uaMatch || ipMatch) return p;
  }
  return profiles.find((p) => p.name === "default") ?? null;
}
```

**Files touched:**
- `src/lib/db/migrations/` — new migration: `agent_profiles` table
- `src/lib/db/repos/agentProfilesRepo.js` (new) — CRUD
- `src/lib/profiles.js` (new) — resolution logic
- `src/sse/handlers/chat.js` — profile resolution: key → `X-9R-Profile` header (post-auth/trusted net) → UA+IP match → default profile; thread profile into policy checks
- `src/lib/db/index.js` — export new repo functions
- Dashboard: `src/app/(dashboard)/dashboard/profiles/` — Profiles page (create/edit/delete, policy editor)

**Acceptance:**
- Requests without keys resolve to a profile (or default); profile policy (limits/models/priority) applied.
- Profile matching by UA+IP works; `X-9R-Profile` header works from trusted net.
- Profiles page CRUD works; changes take effect without restart (5s cache TTL).

---

## M2: Synthetic Source Tracking

**Goal:** Every request gets a stable synthetic source label; dashboard groups by it. No raw inputs persisted.

### Reference code

**`src/lib/syntheticSource.js` (new):**

```js
import { createHash } from "node:crypto";
import { fingerprintSourceApp } from "./sourceApps.js";

const SALT = process.env.MACHINE_ID_SALT || "9router-synthetic";

/** Stable, privacy-preserving synthetic source label. */
export function syntheticSource({ userAgent, ip, sessionId }) {
  const uaClass = fingerprintSourceApp(userAgent);
  const ipPrefix = ipPrefixOf(ip);
  const raw = `${uaClass}|${ipPrefix}|${sessionId || ""}`;
  return createHash("sha256").update(SALT + raw).digest("hex").slice(0, 16);
}

/** /24 for IPv4, /48 for IPv6 — never the full IP. */
export function ipPrefixOf(ip) {
  if (!ip) return "0.0.0.0/0";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 4).join(":") + "::/48";
  }
  return ip.split(".").slice(0, 3).join(".") + ".0/24";
}

/** Behavioral fingerprint: arrival cadence + request-size pattern → cluster id. */
export function behavioralFingerprint(history) {
  // history: array of {ts, promptTokens} for this synthetic source
  if (history.length < 3) return null;
  const gaps = [];
  for (let i = 1; i < history.length; i++) gaps.push(history[i].ts - history[i - 1].ts);
  const medianGap = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  const avgTokens = history.reduce((s, h) => s + h.promptTokens, 0) / history.length;
  const bucket = medianGap < 2000 ? "burst" : medianGap < 30000 ? "interactive" : "batch";
  const sizeBucket = avgTokens < 500 ? "small" : avgTokens < 4000 ? "medium" : "large";
  return `${bucket}-${sizeBucket}`;
}
```

**Files touched:**
- `src/lib/syntheticSource.js` (new)
- `src/lib/usageDb.js` — persist `meta.syntheticSource` (hash only, never inputs)
- `src/sse/handlers/chat.js` — compute + thread synthetic source
- Dashboard: Sources view — group by synthetic source alongside app/key/user

**Acceptance:**
- Every request gets a stable synthetic source label; dashboard groups by it.
- Behavioral fingerprint clusters requests into "agents" without identity cooperation.
- No raw inputs persisted (privacy).

---

## M3: Tag/Keyword Priority Queues

**Goal:** Prompt with "urgent" keywords gets higher priority than plain chat. Blocked tags → 403; redacted tags → content redacted. Queue bounded; TTL expiry → 429; per-profile fairness.

### Reference code

**`src/lib/tags.js` (new):**

```js
import { getSettings } from "@/lib/localDb";

const DEFAULT_TAGS = [
  { name: "urgent", keywords: ["urgent", "asap", "now", "immediately"], priority: 5, action: "allow" },
  { name: "batch", keywords: ["batch", "background", "overnight"], priority: 0, action: "allow" },
  { name: "blocked", keywords: ["ignore previous instructions", "jailbreak"], priority: 0, action: "block" },
  { name: "pii", keywords: ["ssn", "credit card", "passport"], priority: 0, action: "redact" },
];

/** Match tags against the last user message. Returns [{tag, priority, action}]. */
export function matchTags(messages, tagConfig = null) {
  const tags = tagConfig ?? getSettings().tags ?? DEFAULT_TAGS;
  const lastUser = [...(messages ?? [])].reverse().find((m) => m.role === "user");
  const text = extractText(lastUser?.content);
  if (!text) return [];
  const hits = [];
  for (const t of tags) {
    const re = new RegExp(t.keywords.map(escapeRe).join("|"), "i");
    if (re.test(text)) hits.push(t);
  }
  return hits;
}

function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((p) => (typeof p === "string" ? p : p.text ?? "")).join("\n");
  }
  return "";
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
```

**`src/lib/queue.js` (new) — bounded priority queue with strict priority + WFQ + aging:**

```js
// Bounded priority queue: strict priority drain with aging boost.
// Per-profile fairness: each profile gets its own queue set.
const DEFAULT_MAX = 100;
const DEFAULT_TTL_MS = 60_000;

export class PriorityQueue {
  constructor({ maxSize = DEFAULT_MAX, ttlMs = DEFAULT_TTL_MS, agingBoostMs = 60_000, agingCap = 3 } = {}) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.agingBoostMs = agingBoostMs;
    this.agingCap = agingCap;
    this.queues = new Map(); // priority (0-5) → array of items
    this.count = 0;
  }

  enqueue(item, priority = 0) {
    if (this.count >= this.maxSize) return { ok: false, reason: "full" };
    const p = Math.max(0, Math.min(5, priority));
    if (!this.queues.has(p)) this.queues.set(p, []);
    this.queues.get(p).push({ ...item, priority: p, enqueuedAt: Date.now() });
    this.count++;
    return { ok: true };
  }

  /** Dequeue next item, applying aging boost to stale items. */
  dequeue() {
    const now = Date.now();
    for (let p = 5; p >= 0; p--) {
      const q = this.queues.get(p);
      if (!q || q.length === 0) continue;
      // Aging: boost items waiting > agingBoostMs (up to agingCap levels).
      const boosted = q.find((it) => {
        const age = now - it.enqueuedAt;
        return age > this.agingBoostMs && p + Math.min(this.agingCap, Math.floor(age / this.agingBoostMs)) > p;
      });
      if (boosted) {
        const idx = q.indexOf(boosted);
        q.splice(idx, 1);
        this.count--;
        const newP = Math.min(5, boosted.priority + Math.min(this.agingCap, Math.floor((now - boosted.enqueuedAt) / this.agingBoostMs)));
        boosted.priority = newP;
        if (!this.queues.has(newP)) this.queues.set(newP, []);
        this.queues.get(newP).push(boosted);
        continue; // re-scan from top
      }
      const item = q.shift();
      this.count--;
      return item;
    }
    return null;
  }

  /** Drop expired items; returns count dropped. */
  sweep() {
    const now = Date.now();
    let dropped = 0;
    for (const [p, q] of this.queues) {
      const keep = q.filter((it) => now - it.enqueuedAt <= this.ttlMs);
      dropped += q.length - keep.length;
      this.queues.set(p, keep);
      this.count -= q.length - keep.length;
    }
    return dropped;
  }

  depth() {
    return this.count;
  }
}
```

**Files touched:**
- `src/lib/tags.js` (new)
- `src/lib/queue.js` (new)
- `src/sse/handlers/chat.js` — tag match → priority class → queue (opt-in per key/profile)
- `src/lib/db/repos/tagsRepo.js` + migration — tag config (or settings-backed `DEFAULT_SETTINGS.tags`)
- Dashboard: Tags page (keyword editor, priority, allow/block/redact action); Queue view (depth, per-class counts, TTL)

**Acceptance:**
- Prompt with "urgent" keywords gets higher priority than plain chat.
- Blocked tags → 403; redacted tags → content redacted before dispatch.
- Queue bounded; TTL expiry → 429; per-profile fairness prevents starvation.

---

## M4: Gate Levels

**Goal:** A request's gate level determines its policy (limits/models/priority). Profile with `gateLevel: 2` only activates for requests clearing L2.

### Reference code

**`src/lib/gates.js` (new):**

```js
import { isLoopback } from "../../custom-server.rate-limiter.js";
import { isValidApiKey } from "../sse/services/auth.js";
import { ipInCidr } from "./profiles.js";

// L0 open → L1 loopback → L2 trusted subnet → L3 API key → L4 profile → L5 session
export const GATE_LEVELS = ["L0", "L1", "L2", "L3", "L4", "L5"];

/**
 * Evaluate the highest gate level a request clears.
 * @returns {{ level: number, name: string, reasons: string[] }}
 */
export async function evaluateGate({ ip, apiKey, hasSession, trustedSubnets = [] }) {
  const reasons = [];
  let level = 0; // L0 always clears

  if (isLoopback(ip)) { level = 1; reasons.push("loopback"); }
  if (trustedSubnets.some((cidr) => ipInCidr(ip, cidr))) { level = Math.max(level, 2); reasons.push("trusted-subnet"); }
  if (apiKey && (await isValidApiKey(apiKey))) { level = Math.max(level, 3); reasons.push("api-key"); }
  // L4 (profile) is assigned by the caller when a profile resolved.
  if (hasSession) { level = 5; reasons.push("session"); }

  return { level, name: GATE_LEVELS[level], reasons };
}

/** Gate config JSON: { defaultLevel: 1, levels: { L1: {...}, L2: {...} } } */
export const DEFAULT_GATE_CONFIG = {
  defaultLevel: 1,
  levels: {
    L0: { enabled: false },          // open — dev only
    L1: { enabled: true },           // loopback
    L2: { enabled: true },           // trusted subnets
    L3: { enabled: true },           // api key
    L4: { enabled: true },           // profile
    L5: { enabled: true },           // session
  },
};
```

**Files touched:**
- `src/lib/gates.js` (new)
- `src/sse/handlers/chat.js` — gate evaluation before policy/queue
- `src/lib/db/repos/gatesRepo.js` + migration — gate config (or settings-backed `DEFAULT_SETTINGS.gates`)
- Dashboard: Gates page (per-level limits/models/priority editor); usage view shows "current gate" per request

**Acceptance:**
- A request's gate level determines its policy (limits/models/priority).
- Profile with `gateLevel: 2` only activates for requests clearing L2.
- Gate config editable in UI; changes live.

---

## M5: Model-Group Limiting + Interval Pacing

**Goal:** 9 qwen models under one group share a cap; excess requests queue and drain at paced intervals (no burst). Upstream 429 → group cooldown. `model_group` recorded in usage.

### Reference code

**`src/lib/modelGroups.js` (new):**

```js
import { getSettings } from "@/lib/localDb";

/** Auto-derive group from model id: "qwen-max" → "qwen" (prefix before first "-"). */
export function deriveGroup(modelId) {
  if (!modelId) return null;
  const dash = modelId.indexOf("-");
  return dash === -1 ? modelId : modelId.slice(0, dash);
}

/** Resolve the group for a model id from config (explicit map wins over auto-derive). */
export function groupForModel(modelId, groupConfig = null) {
  const cfg = groupConfig ?? getSettings().modelGroups ?? {};
  for (const [group, def] of Object.entries(cfg)) {
    if (def.models?.includes(modelId)) return group;
    if (def.prefix && modelId.startsWith(def.prefix)) return group;
  }
  return null;
}

/** Group budget check + pacing. Returns {allowed, retryAfterMs} or {queued}. */
export class GroupLimiter {
  constructor(groupConfig = {}) {
    this.config = groupConfig;
    this.buckets = new Map();   // group → {tokens, lastRefill}
    this.cooldowns = new Map(); // group → cooldownUntil
  }

  check(group, { rpm, tpm, tokens = 0, cooldownMs = 30_000 } = {}) {
    const now = Date.now();
    const cd = this.cooldowns.get(group);
    if (cd && now < cd) return { allowed: false, retryAfterMs: cd - now, reason: "cooldown" };

    let b = this.buckets.get(group);
    if (!b) { b = { tokens: rpm ?? 60, lastRefill: now }; this.buckets.set(group, b); }
    // Refill at rate tokens/sec.
    const rate = (rpm ?? 60) / 60;
    const elapsed = (now - b.lastRefill) / 1000;
    b.tokens = Math.min(rpm ?? 60, b.tokens + elapsed * rate);
    b.lastRefill = now;

    if (b.tokens >= 1) {
      b.tokens -= 1;
      return { allowed: true };
    }
    const waitMs = Math.ceil((1 - b.tokens) / rate * 1000);
    return { allowed: false, retryAfterMs: waitMs, reason: "budget" };
  }

  /** Upstream 429 → cooldown the whole group. */
  triggerCooldown(group, cooldownMs = 30_000) {
    this.cooldowns.set(group, Date.now() + cooldownMs);
  }
}
```

**Files touched:**
- `src/lib/modelGroups.js` (new)
- `src/sse/handlers/chat.js` — group budget check before dispatch; group queue with interval pacing (leaky-bucket drain)
- `src/lib/db/repos/modelGroupsRepo.js` + migration — group config (or settings-backed `DEFAULT_SETTINGS.modelGroups`)
- `src/lib/usageDb.js` — record `model_group` (LiteLLM precedent)
- Dashboard: Model Groups page (create/edit, per-group limits, pacing, live usage); queue depth per group

**Acceptance:**
- 9 qwen models under one group share a cap; excess requests queue and drain at paced intervals (no burst).
- Upstream 429 → group cooldown (30s default, configurable).
- `model_group` recorded in usage; dashboard shows per-group throughput.

---

## M6: Adaptive/Predictive Rate Control

**Goal:** Rate adapts: surge → multiplicative decrease; quiet → additive increase; 429 → halve + cooldown. EWMA predicts surges and pre-throttles. Budget-proportional pacing.

### Reference code

**`src/lib/adaptiveRate.js` (new):**

```js
// AIMD + EWMA + 429 feedback + budget-proportional pacing.
const DEFAULT = {
  alpha: 0.3,          // EWMA smoothing
  minRate: 1,          // RPM floor
  maxRate: 120,        // RPM ceiling
  addStep: 1,          // additive increase per cycle
  multDecrease: 0.5,   // multiplicative decrease factor
  cooldownMs: 30_000,  // post-429 hold
  cycleMs: 60_000,
};

export class AdaptiveRate {
  constructor(opts = {}) {
    this.opts = { ...DEFAULT, ...opts };
    this.rate = this.opts.maxRate;
    this.ewmaLatency = null;
    this.ewmaErrors = 0;
    this.lastCycle = Date.now();
    this.cooldownUntil = 0;
    this.cycleCount = 0;
  }

  /** Called per request with {latencyMs, ok, status}. */
  observe({ latencyMs, ok, status }) {
    const now = Date.now();
    // EWMA latency
    if (latencyMs != null) {
      this.ewmaLatency = this.ewmaLatency == null
        ? latencyMs
        : this.opts.alpha * latencyMs + (1 - this.opts.alpha) * this.ewmaLatency;
    }
    // EWMA error rate (429/5xx count per cycle)
    const isError = !ok || (status >= 400 && status < 600);
    this.ewmaErrors = this.opts.alpha * (isError ? 1 : 0) + (1 - this.opts.alpha) * this.ewmaErrors;

    // Cycle rollover → AIMD step
    if (now - this.lastCycle >= this.opts.cycleMs) {
      this.lastCycle = now;
      this.cycleCount++;
      if (this.ewmaErrors > 0.05) {
        // multiplicative decrease
        this.rate = Math.max(this.opts.minRate, this.rate * this.opts.multDecrease);
        this.cooldownUntil = now + this.opts.cooldownMs;
      } else {
        // additive increase
        this.rate = Math.min(this.opts.maxRate, this.rate + this.opts.addStep);
      }
      this.ewmaErrors = 0;
    }
  }

  /** 429 feedback — immediate halve + cooldown. */
  on429() {
    this.rate = Math.max(this.opts.minRate, this.rate * this.opts.multDecrease);
    this.cooldownUntil = Date.now() + this.opts.cooldownMs;
  }

  /** Budget-proportional pacing: allowed = remaining_budget / remaining_seconds. */
  budgetPacing({ remainingBudgetUsd, remainingSeconds, costPerRequestUsd = 0.001 }) {
    if (remainingBudgetUsd == null || remainingSeconds <= 0) return null;
    const allowedRate = (remainingBudgetUsd / costPerRequestUsd) / (remainingSeconds / 60);
    return Math.max(this.opts.minRate, Math.min(this.rate, allowedRate));
  }

  /** Current allowed rate (RPM). */
  currentRate() {
    return Date.now() < this.cooldownUntil ? this.opts.minRate : this.rate;
  }
}
```

**Files touched:**
- `src/lib/adaptiveRate.js` (new)
- `custom-server.rate-limiter.js` — integrate adaptive rate for inbound; keep static limits as floor
- `src/sse/handlers/chat.js` — adaptive rate check before dispatch
- Dashboard: Adaptive Rate view — current_rate, incoming rate, 429 count, surge events per group; manual override

**Acceptance:**
- Rate adapts: surge → multiplicative decrease; quiet → additive increase; 429 → halve + cooldown.
- EWMA predicts surges and pre-throttles.
- Budget-proportional pacing: allowed = remaining_budget / remaining_time.
- UI shows live adaptive state; manual override works.

---

## M7: Governance Dashboard (unified)

**Goal:** One place to see and manage all governance entities.

**Files touched:**
- Dashboard: `src/app/(dashboard)/dashboard/governance/` — unified view: Profiles, Gates, Tags, Model Groups, Queue, Adaptive Rate, Guardrails, Keys
- `src/lib/db/repos/` — cross-entity queries (profile → usage, group → usage)

**Acceptance:**
- Unified governance page with tabs per entity.
- Cross-entity drill-down (profile → its usage; group → its throughput).
- All config editable live (no restart).

---

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| DB adapter API (`getAdapter().run/all/get`) | Repo code assumes this shape | Verify against `src/lib/db/driver.js` + existing repos before implementing |
| `isLoopback` import from `custom-server.rate-limiter.js` | That file is CJS (`"use strict"` + module.exports?) | Check module format; re-implement locally in `src/lib/` if needed |
| Settings shape (`DEFAULT_SETTINGS`) | New keys must be added to `settingsRepo.js` | Follow existing pattern; PATCH via `/api/settings` is generic |
| In-memory queue/limiter state | Lost on restart | Acceptable for v1; document |
| Profile cache (5s TTL) | Stale config briefly | Acceptable; document |
| Overlap with older plans | Confusion about which plan to follow | This plan is the consolidated reference; older plans are design rationale |

## Verification

- Unit tests for `syntheticSource`, `PriorityQueue`, `GroupLimiter`, `AdaptiveRate`, `evaluateGate`, `resolveProfile` (no live provider calls)
- Manual: run app, create profile, hit `/v1/chat/completions` with matching UA, verify policy applied
- Regression: `tests/__baseline__/verify-no-regression.mjs`