/**
 * Tests for the multi-bucket rate limiter (backlog #1).
 * Verifies that auth, chat, api, and general buckets are independent.
 */

"use strict";
const assert = require("assert");

function loadLimiter() {
  delete require.cache[require.resolve("../../custom-server.rate-limiter")];
  return require("../../custom-server.rate-limiter");
}

// ── Test 1: Auth bucket is tighter than general ─────────────────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "192.168.1.10";

  // Auth bucket should be tighter
  assert.ok(LIMITS.auth < LIMITS.general, `auth (${LIMITS.auth}) should be < general (${LIMITS.general})`);

  // Exhaust auth bucket
  for (let i = 0; i < LIMITS.auth; i++) {
    const r = checkLimit(ip, "/api/auth/login", "POST");
    assert.strictEqual(r.allowed, true, `auth iter ${i} should be allowed`);
    assert.strictEqual(r.category, "auth");
  }
  const blocked = checkLimit(ip, "/api/auth/login", "POST");
  assert.strictEqual(blocked.allowed, false, "auth bucket should be exhausted");
  assert.strictEqual(blocked.category, "auth");

  // General API should still have full budget
  const api = checkLimit(ip, "/api/models", "GET");
  assert.strictEqual(api.allowed, true, "api bucket should be independent");
  assert.strictEqual(api.category, "api");

  console.log(`✓ Test 1: auth bucket (${LIMITS.auth}/min) independent from api — PASS`);
}

// ── Test 2: Chat bucket is tighter than general ─────────────────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "192.168.1.20";

  assert.ok(LIMITS.chat < LIMITS.general, `chat (${LIMITS.chat}) should be < general (${LIMITS.general})`);

  // Exhaust chat bucket
  for (let i = 0; i < LIMITS.chat; i++) {
    const r = checkLimit(ip, "/v1/chat/completions", "POST");
    assert.strictEqual(r.allowed, true, `chat iter ${i} should be allowed`);
    assert.strictEqual(r.category, "chat");
  }
  const blocked = checkLimit(ip, "/v1/chat/completions", "POST");
  assert.strictEqual(blocked.allowed, false, "chat bucket should be exhausted");

  // General API should still have full budget
  const api = checkLimit(ip, "/api/providers", "GET");
  assert.strictEqual(api.allowed, true, "api bucket should be independent");

  console.log(`✓ Test 2: chat bucket (${LIMITS.chat}/min) independent from api — PASS`);
}

// ── Test 3: Exhausting api doesn't affect auth ──────────────────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "192.168.1.30";

  // Exhaust api bucket
  for (let i = 0; i < LIMITS.api; i++) {
    checkLimit(ip, "/api/models", "GET");
  }
  const apiBlocked = checkLimit(ip, "/api/usage", "GET");
  assert.strictEqual(apiBlocked.allowed, false, "api bucket should be exhausted");

  // Auth bucket should still have full budget. Probe a credential endpoint —
  // /api/auth/status is polled on every page load and deliberately stays in "api".
  const auth = checkLimit(ip, "/api/auth/login", "POST");
  assert.strictEqual(auth.allowed, true, "auth bucket should be independent");
  assert.strictEqual(auth.category, "auth");

  console.log(`✓ Test 3: exhausting api (${LIMITS.api}/min) doesn't affect auth — PASS`);
}

// ── Test 4: Static and RSC bypass entirely ──────────────────────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "192.168.1.40";

  // Exhaust all buckets
  for (let i = 0; i < LIMITS.auth; i++) checkLimit(ip, "/api/auth/login", "POST");
  for (let i = 0; i < LIMITS.chat; i++) checkLimit(ip, "/v1/chat/completions", "POST");
  for (let i = 0; i < LIMITS.api; i++) checkLimit(ip, "/api/models", "GET");

  // Static should still bypass
  const static1 = checkLimit(ip, "/_next/static/chunks/main.js", "GET");
  assert.strictEqual(static1.allowed, true, "static should bypass");
  assert.strictEqual(static1.category, "static");

  // RSC should still bypass
  const rsc = checkLimit(ip, "/dashboard/providers?_rsc=abc123", "GET");
  assert.strictEqual(rsc.allowed, true, "rsc should bypass");
  assert.strictEqual(rsc.category, "rsc");

  // Bypass shouldn't consume budget
  const apiStillBlocked = checkLimit(ip, "/api/usage", "GET");
  assert.strictEqual(apiStillBlocked.allowed, false, "bypass shouldn't refill budget");

  console.log("✓ Test 4: static and rsc bypass entirely (even when exhausted) — PASS");
}

// ── Test 5: User URLs with "rsc" substring are NOT bypassed ────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "192.168.1.50";

  // Exhaust api bucket
  for (let i = 0; i < LIMITS.api; i++) {
    checkLimit(ip, "/api/models", "GET");
  }

  // User URL with "rsc" substring should still be blocked
  const userUrl = checkLimit(ip, "/api/search?q=rsc+models", "GET");
  assert.strictEqual(userUrl.allowed, false, "user URL with 'rsc' should not bypass");
  assert.strictEqual(userUrl.category, "api");

  console.log("✓ Test 5: user URLs containing 'rsc' are not bypassed — PASS");
}

// ── Test 6: GET /v1/chat/completions uses api bucket (not chat) ─────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "192.168.1.60";

  // Exhaust chat bucket with POST
  for (let i = 0; i < LIMITS.chat; i++) {
    checkLimit(ip, "/v1/chat/completions", "POST");
  }
  const chatBlocked = checkLimit(ip, "/v1/chat/completions", "POST");
  assert.strictEqual(chatBlocked.allowed, false, "chat POST should be exhausted");

  // GET should use api bucket (still has budget)
  const get = checkLimit(ip, "/v1/chat/completions", "GET");
  assert.strictEqual(get.allowed, true, "GET should use api bucket");
  assert.strictEqual(get.category, "api");

  console.log("✓ Test 6: GET /v1/chat/completions uses api bucket, not chat — PASS");
}

// ── Test 7: Other /v1/* POST endpoints use api bucket ───────────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "192.168.1.70";

  // Exhaust chat bucket
  for (let i = 0; i < LIMITS.chat; i++) {
    checkLimit(ip, "/v1/chat/completions", "POST");
  }

  // Embeddings should use api bucket (not chat)
  const embeddings = checkLimit(ip, "/v1/embeddings", "POST");
  assert.strictEqual(embeddings.allowed, true, "embeddings should use api bucket");
  assert.strictEqual(embeddings.category, "api");

  // Images should use api bucket
  const images = checkLimit(ip, "/v1/images/generations", "POST");
  assert.strictEqual(images.allowed, true, "images should use api bucket");
  assert.strictEqual(images.category, "api");

  console.log("✓ Test 7: /v1/embeddings, /v1/images use api bucket (not chat) — PASS");
}

// ── Test 8: Separate IPs have independent budgets per category ──────────────
{
  const { checkLimit, LIMITS } = loadLimiter();

  // Exhaust IP-A's auth bucket
  for (let i = 0; i < LIMITS.auth; i++) {
    checkLimit("10.0.0.1", "/api/auth/login", "POST");
  }
  const ip1Blocked = checkLimit("10.0.0.1", "/api/auth/login", "POST");
  assert.strictEqual(ip1Blocked.allowed, false, "IP-1 auth should be exhausted");

  // IP-2 should have full auth budget
  const ip2 = checkLimit("10.0.0.2", "/api/auth/login", "POST");
  assert.strictEqual(ip2.allowed, true, "IP-2 auth should be independent");

  console.log("✓ Test 8: separate IPs have independent budgets per category — PASS");
}

console.log("\n✅ All multi-bucket rate-limiter tests passed!");
