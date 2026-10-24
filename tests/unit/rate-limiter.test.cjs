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

// ── Test 7: Next.js RSC prefetches bypass rate limiting ───────────────────
// Regression: /dashboard/providers emits 53+ <Link> prefetches (?_rsc=…)
// that used to blow past the 120 req/min general bucket and 429 the UI.
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "203.0.113.5";
  // Exhaust the general bucket first
  for (let i = 0; i < LIMITS.general; i++) checkLimit(ip, "/api/x", "GET");
  // Next request should be blocked
  const blocked = checkLimit(ip, "/api/x", "GET");
  assert.strictEqual(blocked.allowed, false, "general bucket should be exhausted");
  // RSC prefetch MUST still be allowed
  const rsc = checkLimit(ip, "/dashboard/providers/openai-compatible-chat?_rsc=11hzb", "GET");
  assert.strictEqual(rsc.allowed, true, "RSC prefetch must bypass even when bucket exhausted");
  // Static chunk too
  const chunk = checkLimit(ip, "/_next/static/chunks/app/(dashboard)/dashboard/providers/page-abc123.js", "GET");
  assert.strictEqual(chunk.allowed, true, "_next static must bypass");
  // And the bypass must not "refill" the bucket — a normal request is still blocked
  const after = checkLimit(ip, "/api/y", "GET");
  assert.strictEqual(after.allowed, false, "bypass must not consume budget or refill");
  console.log("✓ Test 7: RSC + _next bypass under exhaustion — PASS");
}

// ── Test 8: Superficially similar user URLs still count ───────────────────
// A user URL that merely contains the substring "rsc" must NOT bypass.
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "198.51.100.7";
  for (let i = 0; i < LIMITS.general; i++) checkLimit(ip, "/api/x", "GET");
  // "rsc" as part of a path segment (no "_rsc=") must still be blocked
  const r = checkLimit(ip, "/api/search?q=rsc+models", "GET");
  assert.strictEqual(r.allowed, false, "user URL with 'rsc' substring must NOT bypass");
  // Same for "_next" without the slash guard (defensive)
  const r2 = checkLimit(ip, "/api/what_is_next", "GET");
  assert.strictEqual(r2.allowed, false, "user URL mentioning 'next' must NOT bypass");
  console.log("✓ Test 8: user URLs not accidentally bypassed — PASS");
}

// ── Test 9: RSC bypass does not advance the counter ───────────────────────
// Sending a burst of RSC prefetches should not eat into the general budget.
{
  const { checkLimit, LIMITS } = loadLimiter();
  const ip = "192.0.2.99";
  // Send 500 RSC prefetches
  for (let i = 0; i < 500; i++) {
    const r = checkLimit(ip, `/dashboard/providers/p${i}?_rsc=abc`, "GET");
    assert.strictEqual(r.allowed, true, `RSC iter ${i} must be allowed`);
  }
  // General budget should still be fully intact
  let allowed = 0;
  for (let i = 0; i < LIMITS.general; i++) {
    const r = checkLimit(ip, "/api/real-traffic", "GET");
    if (r.allowed) allowed++;
  }
  assert.strictEqual(allowed, LIMITS.general,
    `general budget should be untouched after RSC burst, got ${allowed}/${LIMITS.general}`);
  console.log(`✓ Test 9: RSC burst does not consume budget (${LIMITS.general}/${LIMITS.general} intact) — PASS`);
}

console.log("\n✅ All rate-limiter unit tests passed.");
