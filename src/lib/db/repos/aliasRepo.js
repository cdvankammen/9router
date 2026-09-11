import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { makeKv } from "../helpers/kvStore.js";

const aliasKv = makeKv("modelAliases");
const customKv = makeKv("customModels");
const mitmKv = makeKv("mitmAlias");

// modelAliases: key=alias, value=modelString
export async function getModelAliases() {
  return await aliasKv.getAll();
}

export async function setModelAlias(alias, model) {
  await aliasKv.set(alias, model);
}

export async function deleteModelAlias(alias) {
  await aliasKv.remove(alias);
}

// customModels: key=`${providerAlias}|${id}|${type}`, value=full model object
function customKey(providerAlias, id, type) {
  return `${providerAlias}|${id}|${type}`;
}

export async function getCustomModels() {
  const all = await customKv.getAll();
  return Object.values(all);
}

<<<<<<< HEAD
// Atomic upsert inside transaction to prevent duplicate races.
// Re-adding an existing model updates caps/name/transport without resetting omitted fields.
export async function addCustomModel({ providerAlias, id, type = "llm", name, caps, transport }) {
=======
// Atomic check-then-insert inside transaction to prevent duplicate races
export async function addCustomModel({ providerAlias, id, type = "llm", name, source }) {
>>>>>>> a0650fda (feat(merge-prep): stage all local work for upstream merge)
  const k = customKey(providerAlias, id, type);
  const db = await getAdapter();
  let added = false;
  db.transaction(() => {
<<<<<<< HEAD
    const row = db.get(`SELECT value FROM kv WHERE scope = 'customModels' AND key = ?`, [k]);
    if (row) {
      const prev = parseJson(row.value) || {};
      const next = { ...prev, ...(name ? { name } : {}), ...(caps ? { caps } : {}), ...(transport ? { transport } : {}) };
      db.run(`UPDATE kv SET value = ? WHERE scope = 'customModels' AND key = ?`, [stringifyJson(next), k]);
      return;
    }
    const value = stringifyJson({ providerAlias, id, type, name: name || id, ...(caps ? { caps } : {}), ...(transport ? { transport } : {}) });
=======
    const row = db.get(`SELECT 1 FROM kv WHERE scope = 'customModels' AND key = ?`, [k]);
    if (row) return;
    const obj = { providerAlias, id, type, name: name || id };
    if (source) obj.source = source;
    const value = stringifyJson(obj);
>>>>>>> a0650fda (feat(merge-prep): stage all local work for upstream merge)
    db.run(`INSERT INTO kv(scope, key, value) VALUES('customModels', ?, ?)`, [k, value]);
    added = true;
  });
  return added;
}

// Auto-persist discovered model IDs from compatible providers. Fire-and-forget
// caller: don't await in the response path. Bounded concurrency (batch 20).
// Idempotent via addCustomModel's atomic check-then-insert.
export async function persistDiscoveredModels(providerAlias, modelIds, markSource) {
  if (!Array.isArray(modelIds) || modelIds.length === 0) return;
  const existing = await getCustomModels();
  const existingIds = new Set(
    existing
      .filter((m) => m.providerAlias === providerAlias)
      .map((m) => `${m.id}|${m.type || "llm"}`)
  );
  const source = markSource ? "auto-discovered" : undefined;
  const BATCH_SIZE = 20;
  for (let i = 0; i < modelIds.length; i += BATCH_SIZE) {
    const batch = modelIds.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((modelId) => {
        const compositeKey = `${modelId}|llm`;
        if (existingIds.has(compositeKey)) return;
        return addCustomModel({
          providerAlias,
          id: modelId,
          type: "llm",
          name: modelId,
          source,
        });
      })
    );
  }
}

export async function deleteCustomModel({ providerAlias, id, type = "llm" }) {
  await customKv.remove(customKey(providerAlias, id, type));
}

// mitmAlias: key=toolName, value=mappings object
export async function getMitmAlias(toolName) {
  if (toolName) {
    const v = await mitmKv.get(toolName);
    return v || {};
  }
  return await mitmKv.getAll();
}

export async function setMitmAliasAll(toolName, mappings) {
  await mitmKv.set(toolName, mappings || {});
}
