import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { keyAccessFromColumns, keyAccessToColumns } from "@/shared/utils/keyAccess.js";
import { KEY_ACCESS_UNRESTRICTED } from "@/shared/constants/keyAccess.js";
// SECURITY (Finding #295): encrypt apiKeys.key at rest with AES-256-GCM,
// hash for equality lookups. The enc:v1: prefix distinguishes encrypted
// from plaintext values (backward compat during migration).
import { encryptToken, decryptToken, hashApiKey } from "../tokenEncryption.js";

function rowToKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    // Decrypt on read — passes through plaintext for pre-migration rows
    key: decryptToken(row.key) || row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt,
    access: keyAccessFromColumns(row.accessRestricted, row.accessAllow),
  };
}

export async function getApiKeys() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM apiKeys ORDER BY createdAt ASC`);
  return rows.map(rowToKey);
}

export async function getApiKeyById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
  return rowToKey(row);
}

// Used by the /v1 handlers to read the presented key's access settings.
// SECURITY (Finding #295): lookup by hash, not by encrypted key (random IV
// makes ciphertext non-deterministic).
export async function getApiKeyByKey(key) {
  if (!key) return null;
  const db = await getAdapter();
  const hash = hashApiKey(key);
  // Prefer hash lookup; fall back to plaintext key match for pre-migration rows
  let row = hash ? db.get(`SELECT * FROM apiKeys WHERE keyHash = ?`, [hash]) : null;
  if (!row) row = db.get(`SELECT * FROM apiKeys WHERE key = ?`, [key]);
  return rowToKey(row);
}

export async function createApiKey(name, machineId) {
  if (!machineId) throw new Error("machineId is required");
  const db = await getAdapter();
  const { generateApiKeyWithMachine } = await import("@/shared/utils/apiKey");
  const result = generateApiKeyWithMachine(machineId);
  const apiKey = {
    id: uuidv4(),
    name,
    key: result.key,
    machineId,
    isActive: true,
    createdAt: new Date().toISOString(),
    access: { restricted: false, allow: [] },
  };
  const cols = keyAccessToColumns(KEY_ACCESS_UNRESTRICTED);
  // SECURITY (Finding #295): encrypt key + store hash for lookup.
  // The plaintext key is returned to the caller (for one-time display)
  // but the DB only stores the ciphertext.
  const encryptedKey = encryptToken(apiKey.key) || apiKey.key;
  const keyHash = hashApiKey(apiKey.key);
  db.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt, accessRestricted, accessAllow, keyHash) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [apiKey.id, encryptedKey, apiKey.name, apiKey.machineId, 1, apiKey.createdAt, cols.accessRestricted, cols.accessAllow, keyHash]
  );
  return apiKey;
}

export async function updateApiKey(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;
    const merged = { ...rowToKey(row), ...data };
    const cols = keyAccessToColumns(merged.access);
    // SECURITY (Finding #295): re-encrypt key + update hash if key changed
    const encryptedKey = encryptToken(merged.key) || merged.key;
    const keyHash = hashApiKey(merged.key);
    db.run(
      `UPDATE apiKeys SET key = ?, name = ?, machineId = ?, isActive = ?, accessRestricted = ?, accessAllow = ?, keyHash = ? WHERE id = ?`,
      [encryptedKey, merged.name, merged.machineId, merged.isActive ? 1 : 0, cols.accessRestricted, cols.accessAllow, keyHash, id]
    );
    result = rowToKey(db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]));
  });
  return result;
}

export async function deleteApiKey(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM apiKeys WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}

export async function validateApiKey(key) {
  const db = await getAdapter();
  // SECURITY (Finding #295): lookup by hash first, fall back to plaintext
  // for pre-migration rows.
  const hash = hashApiKey(key);
  let row = hash ? db.get(`SELECT isActive FROM apiKeys WHERE keyHash = ?`, [hash]) : null;
  if (!row) row = db.get(`SELECT isActive FROM apiKeys WHERE key = ?`, [key]);
  if (!row) return false;
  return row.isActive === 1 || row.isActive === true;
}
