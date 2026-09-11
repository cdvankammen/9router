"use strict";
const assert = require("assert");

// Reset module state between tests by re-requiring fresh copies.
function loadLimiter() {
  delete require.cache[require.resolve("../../custom-server.rate-limiter")];
  return require("../../custom-server.rate-limiter");
}

// ── Test 1: Loopback bypass ───────────────────────────────────────────────
{
  const { checkLimit } = loadLimiter();
  for (const ip of ["127.0.0.1", "::1", "::ffff:127.0.0.1"]) {
    for (let i = 0; i < 500; i++) {
      const r = checkLimit(ip, "/api/test", "GET");
      assert.strictEqual(r.allowed, true, `${ip} should always be allowed (iter ${i})`);
    }
  }
  console.log("✓ Test 1: loopback bypass — PASS");
}

// ── Test 2: General limit enforced at 120 req/min ─────────────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "192.168.1.100";
  let allowed = 0;
  let blocked = 0;
  for (let i = 0; i < LIMITS.general + 10; i++) {
    const r = checkLimit(ip, "/api/models", "GET");
    if (r.allowed) allowed++;
    else blocked++;
  }
  assert.strictEqual(allowed, LIMITS.general, `Expected ${LIMITS.general} allowed, got ${allowed}`);
  assert.strictEqual(blocked, 10, `Expected 10 blocked, got ${blocked}`);
  console.log(`✓ Test 2: general limit (${LIMITS.general}/min) — PASS`);
}

// ── Test 3: Chat limit enforced at 20 req/min ─────────────────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "10.0.0.50";
  let allowed = 0;
  let blocked = 0;
  for (let i = 0; i < LIMITS.chat + 5; i++) {
    const r = checkLimit(ip, "/v1/chat/completions", "POST");
    if (r.allowed) allowed++;
    else blocked++;
  }
  assert.strictEqual(allowed, LIMITS.chat, `Expected ${LIMITS.chat} allowed, got ${allowed}`);
  assert.strictEqual(blocked, 5, `Expected 5 blocked, got ${blocked}`);
  console.log(`✓ Test 3: chat limit (${LIMITS.chat}/min) — PASS`);
}

// ── Test 4: GET to chat endpoint uses general bucket ──────────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "172.16.0.1";
  // GET /v1/chat/completions should use general bucket, not chat
  let allowed = 0;
  for (let i = 0; i < LIMITS.general; i++) {
    const r = checkLimit(ip, "/v1/chat/completions", "GET");
    if (r.allowed) allowed++;
  }
  assert.strictEqual(allowed, LIMITS.general, `GET chat should use general bucket`);
  console.log("✓ Test 4: GET chat uses general bucket — PASS");
}

// ── Test 5: Retry-After is positive integer ───────────────────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "10.10.10.10";
  // Exhaust budget
  for (let i = 0; i < LIMITS.general; i++) checkLimit(ip, "/api/x", "GET");
  const r = checkLimit(ip, "/api/x", "GET");
  assert.strictEqual(r.allowed, false);
  assert.ok(typeof r.retryAfter === "number" && r.retryAfter >= 1,
    `retryAfter should be >= 1, got ${r.retryAfter}`);
  console.log(`✓ Test 5: retryAfter=${r.retryAfter}s — PASS`);
}

// ── Test 6: Separate IPs have independent budgets ─────────────────────────
{
  const { checkLimit, LIMITS } = loadLimiter();
  // Exhaust IP-A
  for (let i = 0; i < LIMITS.general; i++) checkLimit("1.1.1.1", "/api/x", "GET");
  // IP-B should still have full budget
  const r = checkLimit("2.2.2.2", "/api/x", "GET");
  assert.strictEqual(r.allowed, true, "Different IP should have independent budget");
  console.log("✓ Test 6: independent per-IP budgets — PASS");
}

console.log("\n✅ All rate-limiter unit tests passed.");
