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
  markdownLogEnabled: false,
  markdownLogFlushIntervalMin: 5,
  modelFallbacks: {},
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
};

async function readRaw() {
  const db = await getAdapter();
  const row = db.get(`SELECT data FROM settings WHERE id = 1`);
  return row ? parseJson(row.data, {}) : {};
}

// Merge raw settings with defaults; backward-compat for missing keys
// Deep-merges nested objects so a PARTIAL update (e.g. {smartRouter:{enabled:true}})
// never shadows the sibling defaults (names, allowedModels, ...).
const NESTED_KEYS = new Set([
  "providerStrategies",
  "quotaVisibility",
  "comboStrategies",
  "smartRouter",
  "srComboCleanup",
  "modelFallbacks",
  "capacityAdapter",
  "dnsToolEnabled",
]);

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
    // Deep-merge nested objects against their DEFAULTS (not against the stored
    // value): a partial nested update (e.g. {smartRouter:{enabled:true}}) keeps
    // the sibling defaults, while full-map keys (modelFallbacks, strategies)
    // keep REPLACE semantics — merging against the stored map would resurrect
    // deleted entries (the UI deletes by sending the map without the key).
    next = { ...current, ...updates };
    for (const key of NESTED_KEYS) {
      if (next[key] && typeof next[key] === "object" && !Array.isArray(next[key])) {
        next[key] = deepMergeObject(DEFAULT_SETTINGS[key] ?? {}, next[key]);
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
