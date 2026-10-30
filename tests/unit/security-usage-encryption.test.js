// SECURITY (Finding #295 phase 2): prove usageHistory.apiKey is encrypted
// at rest via saveRequestUsage, AND that the hash-for-dedup column is
// populated with a stable SHA-256 so identical keys dedup correctly even
// though AES-GCM encryption is non-deterministic (random IV per row).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let DATA_DIR;
let saveRequestUsage, getUsageHistory;
let hashApiKey, decryptToken;

beforeAll(async () => {
  DATA_DIR = mkdtempSync(join(tmpdir(), "9r-usage-enc-"));
  process.env.DATA_DIR = DATA_DIR;
  // Force re-import with fresh DATA_DIR
  const dbMod = await import("@/lib/db/index.js");
  await dbMod.initDatabase?.();
  const usageRepo = await import("@/lib/db/repos/usageRepo.js");
  saveRequestUsage = usageRepo.saveRequestUsage;
  getUsageHistory = usageRepo.getUsageHistory;
  const te = await import("@/lib/db/tokenEncryption.js");
  hashApiKey = te.hashApiKey;
  decryptToken = te.decryptToken;
});

afterAll(() => {
  if (DATA_DIR) rmSync(DATA_DIR, { recursive: true, force: true });
});

describe("Finding #295 phase 2: usageHistory encryption at rest", () => {
  it("writes apiKey as enc:v1: ciphertext with stable hash", async () => {
    const plainKey = "sk-test-9router-usage-enc-proof-2026";
    await saveRequestUsage({
      provider: "openai",
      model: "gpt-4o-mini",
      tokens: { prompt_tokens: 10, completion_tokens: 5 },
      apiKey: plainKey,
      endpoint: "/v1/chat/completions",
    });

    // Read raw row via the adapter (bypass decrypt-on-read in getUsageHistory)
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    const row = db.get(
      `SELECT apiKey, apiKeyHash FROM usageHistory WHERE model = ? ORDER BY id DESC LIMIT 1`,
      ["gpt-4o-mini"]
    );
    expect(row).toBeTruthy();
    expect(row.apiKey).toMatch(/^enc:v1:/);
    expect(row.apiKey).not.toBe(plainKey);
    expect(row.apiKey).not.toContain("sk-test-9router");
    expect(row.apiKeyHash).toBe(hashApiKey(plainKey));
    expect(row.apiKeyHash).toMatch(/^[a-f0-9]{64}$/);

    // Decrypt round-trip
    const decrypted = decryptToken(row.apiKey);
    expect(decrypted).toBe(plainKey);
  });

  it("dedups by hash when same key sends identical requests", async () => {
    const plainKey = "sk-test-9router-dedup-proof";
    const entry = {
      provider: "openai",
      model: "gpt-4o-mini-dedup",
      tokens: { prompt_tokens: 7, completion_tokens: 3 },
      apiKey: plainKey,
      timestamp: "2026-10-30T12:00:00.000Z",
    };
    await saveRequestUsage({ ...entry });
    await saveRequestUsage({ ...entry }); // duplicate
    await saveRequestUsage({ ...entry }); // triplicate

    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    const rows = db.all(
      `SELECT apiKey, apiKeyHash FROM usageHistory WHERE model = ?`,
      ["gpt-4o-mini-dedup"]
    );
    // Dedup should collapse to ONE row
    expect(rows.length).toBe(1);
    expect(rows[0].apiKeyHash).toBe(hashApiKey(plainKey));
  });

  it("writes NULL apiKeyHash when no apiKey provided", async () => {
    await saveRequestUsage({
      provider: "openai",
      model: "gpt-4o-mini-nokey",
      tokens: { prompt_tokens: 1, completion_tokens: 1 },
    });
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    const row = db.get(
      `SELECT apiKey, apiKeyHash FROM usageHistory WHERE model = ? ORDER BY id DESC LIMIT 1`,
      ["gpt-4o-mini-nokey"]
    );
    expect(row.apiKey).toBeNull();
    expect(row.apiKeyHash).toBeNull();
  });

  it("getUsageHistory decrypts before masking (no ciphertext leak)", async () => {
    const plainKey = "sk-test-9router-readpath-proof";
    await saveRequestUsage({
      provider: "openai",
      model: "gpt-4o-mini-readpath",
      tokens: { prompt_tokens: 2, completion_tokens: 2 },
      apiKey: plainKey,
    });
    const history = await getUsageHistory(50);
    const row = history.find((r) => r.model === "gpt-4o-mini-readpath");
    expect(row).toBeTruthy();
    // getUsageHistory returns apiKeyMasked (not apiKey) — the ciphertext is
    // decrypted then masked before surfacing. Neither raw ciphertext nor
    // plaintext may leak.
    const key = row.apiKeyMasked || "";
    expect(key).not.toMatch(/^enc:v1:/);
    expect(key).not.toBe(plainKey);
    // maskApiKey convention: prefix(8) + *** + suffix(4)
    expect(key).toMatch(/\*\*\*/);
  });
});
