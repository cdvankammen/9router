import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

const DEFAULT_MITM_ROUTER_BASE = "http://localhost:20128";
const DEFAULT_HEADROOM_URL = process.env.HEADROOM_URL || "http://localhost:8787";

const DEFAULT_SETTINGS = {
  cloudEnabled: false,
  tunnelEnabled: false,
  tunnelUrl: "",
  tunnelProvider: "cloudflare",
  tailscaleEnabled: false,
  tailscaleUrl: "",
  stickyRoundRobinLimit: 3,
  providerStrategies: {},
  quotaVisibility: {},
  comboStrategy: "fallback",
  comboStickyRoundRobinLimit: 1,
  comboStrategies: {},
  smartRouter: {
    enabled: false,
    names: ["modelRouter"],
    allowedProviders: [],
    allowedModels: [],
    costQualityTradeoff: 5,
    maxCandidates: 3,
    stickyTtlMin: 5,
  },
  // Optional sweep of stale smart-router (sr-*) combos. OFF by default —
  // users opt in. ttlHours = age after which an unused sr- combo is deleted;
  // intervalHours = how often the sweeper runs.
  srComboCleanup: {
    enabled: false,
    ttlHours: 24,
    intervalHours: 12,
  },
  analyzeErrorModel: "oc/mimo-v2.5-free",
  // L1 in-app peer forwarding (node failover): array of peer base URLs
  // (e.g. ["http://mini2-9.local:20128"]). When the LOCAL node is up but
  // degraded (health probe failing / all providers dead), /v1* requests are
  // forwarded to the first healthy peer. Empty = feature off.
  peerNodes: [],
  // Error Inbox (P2) triage assignments: { [errorFingerprint]: columnKey }.
  // Coarse fingerprint key = provider|model|errorCategory (Sentry-style) —
  // see requestDetailsRepo.getErrorSummary. Stored with MAP_REPLACE semantics
  // (sender owns the full map).
  boardColumns: {},
  markdownLogEnabled: false,
  markdownLogFlushIntervalMin: 5,
  modelFallbacks: {},
  // User-set per-model capability overrides: { [fullModelId]: { vision: true, audioInput: false, ... } }.
  // Merged over static capabilities so users can mark custom/unknown models as
  // vision/audio-capable (or correct a wrong static flag). Only the fields the
  // user explicitly set are stored; resolution merges over DEFAULT_CAPABILITIES.
  modelCapOverrides: {},
  capacityAdapter: {
    vision: { enabled: true, roundRobin: false, models: [] },
    pdf: { enabled: false, roundRobin: false, models: [] },
    audioInput: { enabled: true, roundRobin: false, models: [] },
    videoInput: { enabled: false, roundRobin: false, models: [] },
  },
  requireLogin: true,
  requireApiKey: true,
  tunnelDashboardAccess: true,
  authMode: "password",
  ssoType: "oidc",
  oidcIssuerUrl: "",
  oidcClientId: "",
  oidcClientSecret: "",
  oidcScopes: "openid profile email",
  oidcLoginLabel: "Sign in with OIDC",
  samlEntryPoint: "",
  samlIssuer: "urn:9router:sp",
  samlCert: "",
  samlLoginLabel: "Sign in with SAML SSO",
  samlAttributeEmail: "email",
  samlAttributeName: "name",
  enableObservability: false,
  observabilityMaxRecords: 1000,
  observabilityBatchSize: 20,
  observabilityFlushIntervalMs: 5000,
  observabilityMaxJsonSize: 5,
  outboundProxyEnabled: false,
  outboundProxyUrl: "",
  outboundNoProxy: "",
  mitmRouterBaseUrl: DEFAULT_MITM_ROUTER_BASE,
  dnsToolEnabled: {},
  rtkEnabled: true,
  headroomEnabled: false,
  headroomUrl: DEFAULT_HEADROOM_URL,
  headroomCompressUserMessages: false,
  headroomTimeoutMs: 3000,
  cavemanEnabled: false,
  cavemanLevel: "full",
  ponytailEnabled: false,
  ponytailLevel: "full",
  pxpipeEnabled: false,
  pxpipeAutoInstall: true,
  pxpipeMinChars: 25000,
  pxpipeTimeoutMs: 15000,
  // Per-provider user header overrides applied at dispatch: { [providerId]: { headers: {..} } }
  providerOverrides: {},
  // Auto-persist discovered model IDs from compatible providers to kv customModels.
  // Default OFF — users opt in via dashboard settings toggle.
  // First-discovery only (addCustomModel is idempotent). No auto-reap.
  modelAutoPersist: {
    enabled: false,
    maxModelsPerProvider: 200,
    markSource: true,
  },
  // CORS allowlist for API endpoints. Empty = wildcard (legacy behavior).
  // When non-empty, only listed origins receive Access-Control-Allow-Origin.
  corsAllowedOrigins: [],
  // Claude compat layer (see src/lib/claudeCompat.js): suffixMode controls
  // when [1m] is appended to rewritten /v1/models ids.
  claudeCompat: {
    enabled: true,
    suffixMode: "auto",
    keywords: [],
  },
  // Default-model mapping written to ~/.claude/settings.json env by the
  // endpoint page's one-click button (see /api/claude-compat/write-claude-settings).
  claudeDefaultModels: {
    sonnet: { model: "", name: "", oneM: false },
    opus: { model: "", name: "", oneM: false },
    fable: { model: "", name: "", oneM: false },
    haiku: { model: "", name: "", oneM: false },
    subagent: { model: "", oneM: false },
  },
  // User contextWindow overrides, keyed by model id or glob pattern (e.g.
  // "glm-5.3" or "glm-5*"). Consumed by open-sse/providers/capabilities.js
  // via setContextWindowOverrides(); managed on /dashboard/model-context.
  contextWindowOverrides: {},
  // ── AI Memory & Context Optimization (PR #3599 additive) ──
  memoryToolPruningEnabled: false,
  memoryMaxToolTurnsKeepFull: 2,
  memoryMaxHistoricalToolChars: 4000,
  memoryMediaPruningEnabled: false,
  memoryCompactionEnabled: false,
  memoryCompactionThresholdTokens: 128000,
  memoryRecentTurnsToKeep: 8,
  memoryCacheAnchorEnabled: false,
  memoryHandoffEnabled: false,
};

async function readRaw() {
  const db = await getAdapter();
  const row = db.get(`SELECT data FROM settings WHERE id = 1`);
  return row ? parseJson(row.data, {}) : {};
}

// Merge raw settings with defaults; backward-compat for missing keys
// Deep-merges nested objects so a PARTIAL update (e.g. {smartRouter:{enabled:true}})
// never shadows the sibling defaults (names, allowedModels, ...).
// (Key sets are defined below: CONFIG_MERGE_KEYS + MAP_REPLACE_KEYS.)

// Recursive plain-object merge (arrays and scalars replace; objects merge
// key-by-key). Used for the nested settings so partial updates at ANY depth
// (e.g. capacityAdapter.vision.enabled) keep the sibling defaults.
function deepMergeObject(base, override) {
  if (
    !override ||
    typeof override !== "object" ||
    Array.isArray(override) ||
    !base ||
    typeof base !== "object" ||
    Array.isArray(base)
  ) {
    return override === undefined ? base : override;
  }
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) {
    out[k] = deepMergeObject(base[k], v);
  }
  return out;
}

// Nested config OBJECTS: partial PATCHes accumulate against the stored value
// (sequential PATCHes never reset each other). These are UI-owned config
// shapes, not maps — merging with the stored value is the correct semantics.
const CONFIG_MERGE_KEYS = new Set([
  "smartRouter",
  "capacityAdapter",
  "srComboCleanup",
  "modelAutoPersist",
  "claudeCompat",
]);

// Nested MAP keys: the sender owns the full map (replace semantics — deleting
// an entry = sending the map without it; merging with stored would resurrect
// deletes). Their defaults are empty objects, so merging against defaults IS
// a replace.
const MAP_REPLACE_KEYS = new Set([
  "modelFallbacks",
  "comboStrategies",
  "providerStrategies",
  "quotaVisibility",
  "dnsToolEnabled",
  "boardColumns",
]);

const NESTED_KEYS = new Set([...CONFIG_MERGE_KEYS, ...MAP_REPLACE_KEYS]);

// Read-path: fill missing nested keys from defaults (backward compat for DBs
// written before a key existed). Map keys have empty-object defaults, so this
// is a no-op for them unless the stored value is missing entirely.
function deepMergeNested(merged, key) {
  const defVal = DEFAULT_SETTINGS[key];
  const curVal = merged[key];
  if (
    curVal &&
    typeof curVal === "object" &&
    !Array.isArray(curVal) &&
    defVal &&
    typeof defVal === "object" &&
    !Array.isArray(defVal)
  ) {
    merged[key] = deepMergeObject(defVal, curVal);
  }
}

export function mergeWithDefaults(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...(raw || {}) };
  for (const key of NESTED_KEYS) deepMergeNested(merged, key);
  for (const [key, defVal] of Object.entries(DEFAULT_SETTINGS)) {
    if (merged[key] === undefined) {
      if (
        key === "outboundProxyEnabled" &&
        typeof merged.outboundProxyUrl === "string" &&
        merged.outboundProxyUrl.trim()
      ) {
        merged[key] = true;
      } else {
        merged[key] = defVal;
      }
    }
  }
  if (merged.capacityAdapter && typeof merged.capacityAdapter === "object") {
    for (const capKey of Object.keys(merged.capacityAdapter)) {
      const entry = merged.capacityAdapter[capKey];
      if (Array.isArray(entry?.models)) {
        entry.models = entry.models.map((m) =>
          m === "oc/mimo-v2.5-free" ? "oc/mimo-v2.6-flash-free" : m
        );
      }
    }
  }
  return merged;
}

export async function getSettings() {
  const raw = await readRaw();
  return mergeWithDefaults(raw);
}

// Atomic read-merge-write inside transaction (prevents losing concurrent updates)
export async function updateSettings(updates) {
  const db = await getAdapter();
  let next;
  db.transaction(function () {
    const row = db.get(`SELECT data FROM settings WHERE id = 1`);
    const current = row ? parseJson(row.data, {}) : {};
    // CONFIG_MERGE_KEYS accumulate against the STORED value: sequential partial
    // PATCHes (e.g. {smartRouter:{enabled:true}} then {smartRouter:{allowedModels:[...]}})
    // never reset each other. MAP_REPLACE_KEYS keep replace semantics — the
    // sender owns the full map, so deleting an entry (map without the key) is
    // honored and never resurrected.
    next = { ...current, ...updates };
    for (const key of CONFIG_MERGE_KEYS) {
      if (updates[key] && typeof updates[key] === "object" && !Array.isArray(updates[key])) {
        next[key] = deepMergeObject(current[key] ?? DEFAULT_SETTINGS[key] ?? {}, updates[key]);
      }
    }
    db.run(
      `INSERT INTO settings(id, data) VALUES(1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
      [stringifyJson(next)],
    );
  });
  return mergeWithDefaults(next);
}

export async function isCloudEnabled() {
  const settings = await getSettings();
  return settings.cloudEnabled === true;
}

export async function getCloudUrl() {
  const settings = await getSettings();
  return (
    settings.cloudUrl ||
    process.env.CLOUD_URL ||
    process.env.NEXT_PUBLIC_CLOUD_URL ||
    ""
  );
}

export async function exportSettings() {
  return await readRaw();
}
