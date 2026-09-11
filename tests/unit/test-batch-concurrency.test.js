/**
 * Unit tests for test-batch concurrency and parallel execution.
 * 
 * Verifies:
 *  - runWithConcurrency runs tasks in parallel (not sequential)
 *  - Bounded concurrency: never more than N tasks in-flight at once
 *  - All results reported even when some fail (allSettled semantics)
 *  - Order preserved: result[i] corresponds to factory[i]
 *  - Edge cases: empty array, limit > length, single item
 */

import { describe, it, expect, vi } from "vitest";

// Re-implement the concurrency runner here to test it in isolation
// (mirrors the one in src/app/api/providers/test-batch/route.js)
async function runWithConcurrency(factories, limit) {
  const results = new Array(factories.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < factories.length) {
      const i = nextIndex++;
      try {
        results[i] = { status: "fulfilled", value: await factories[i]() };
      } catch (err) {
        results[i] = { status: "rejected", reason: err };
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, factories.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

describe("runWithConcurrency", () => {
  it("should execute all tasks and return results in order", async () => {
    const factories = [
      () => Promise.resolve("a"),
      () => Promise.resolve("b"),
      () => Promise.resolve("c"),
    ];
    const results = await runWithConcurrency(factories, 5);
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ status: "fulfilled", value: "a" });
    expect(results[1]).toEqual({ status: "fulfilled", value: "b" });
    expect(results[2]).toEqual({ status: "fulfilled", value: "c" });
  });

  it("should run tasks in parallel, not sequential", async () => {
    const DELAY = 50;
    const start = Date.now();
    const factories = Array.from({ length: 4 }, (_, i) =>
      () => new Promise((resolve) => setTimeout(() => resolve(i), DELAY))
    );
    // With concurrency=4 and 50ms each, total should be ~50ms not ~200ms
    const results = await runWithConcurrency(factories, 4);
    const elapsed = Date.now() - start;
    expect(results).toHaveLength(4);
    // Allow generous margin but must be well under 200ms (sequential would be)
    expect(elapsed).toBeLessThan(150);
    // All results present
    const values = results.map((r) => r.value).sort();
    expect(values).toEqual([0, 1, 2, 3]);
  });

  it("should respect concurrency limit (bounded parallelism)", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const factories = Array.from({ length: 10 }, () => async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight--;
      return "done";
    });
    const results = await runWithConcurrency(factories, 3);
    expect(results).toHaveLength(10);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    // The critical assertion: never more than 3 concurrent
    expect(maxInFlight).toBeLessThanOrEqual(3);
    // And it should actually parallelize (more than 1)
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it("should report rejected tasks without stopping others (allSettled semantics)", async () => {
    const factories = [
      () => Promise.resolve("ok1"),
      () => Promise.reject(new Error("boom")),
      () => Promise.resolve("ok3"),
      () => Promise.reject(new Error("bang")),
      () => Promise.resolve("ok5"),
    ];
    const results = await runWithConcurrency(factories, 5);
    expect(results).toHaveLength(5);
    expect(results[0].status).toBe("fulfilled");
    expect(results[0].value).toBe("ok1");
    expect(results[1].status).toBe("rejected");
    expect(results[1].reason.message).toBe("boom");
    expect(results[2].status).toBe("fulfilled");
    expect(results[2].value).toBe("ok3");
    expect(results[3].status).toBe("rejected");
    expect(results[3].reason.message).toBe("bang");
    expect(results[4].status).toBe("fulfilled");
    expect(results[4].value).toBe("ok5");
  });

  it("should handle empty factory array", async () => {
    const results = await runWithConcurrency([], 5);
    expect(results).toEqual([]);
  });

  it("should handle limit greater than factory count", async () => {
    const factories = [() => Promise.resolve(1), () => Promise.resolve(2)];
    const results = await runWithConcurrency(factories, 100);
    expect(results).toHaveLength(2);
    expect(results[0].value).toBe(1);
    expect(results[1].value).toBe(2);
  });

  it("should handle single factory", async () => {
    const results = await runWithConcurrency([() => Promise.resolve("only")], 5);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ status: "fulfilled", value: "only" });
  });

  it("should handle concurrency limit of 1 (sequential fallback)", async () => {
    const order = [];
    const factories = [
      async () => { await new Promise((r) => setTimeout(r, 10)); order.push("a"); return "a"; },
      async () => { await new Promise((r) => setTimeout(r, 5)); order.push("b"); return "b"; },
      async () => { await new Promise((r) => setTimeout(r, 1)); order.push("c"); return "c"; },
    ];
    const results = await runWithConcurrency(factories, 1);
    // With concurrency=1, must execute in order: a, b, c
    expect(order).toEqual(["a", "b", "c"]);
    expect(results.map((r) => r.value)).toEqual(["a", "b", "c"]);
  });
});

describe("makeErrorResult shape", () => {
  // Verify the error result shape matches what the dashboard expects
  function makeErrorResult(conn, error) {
    const message = error?.message || String(error);
    return {
      provider: conn.provider,
      connectionId: conn.id,
      connectionName: conn.name || conn.email || conn.provider,
      authType: conn.authType || "apikey",
      valid: false,
      latencyMs: 0,
      error: message,
      diagnosis: { type: "network_error", source: "local", code: null, message },
      statusCode: null,
      testedAt: new Date().toISOString(),
    };
  }

  it("should produce correct shape from Error object", () => {
    const conn = { id: "c1", provider: "openai", name: "My Key" };
    const result = makeErrorResult(conn, new Error("timeout"));
    expect(result.valid).toBe(false);
    expect(result.error).toBe("timeout");
    expect(result.connectionId).toBe("c1");
    expect(result.provider).toBe("openai");
    expect(result.connectionName).toBe("My Key");
    expect(result.diagnosis.type).toBe("network_error");
    expect(result.latencyMs).toBe(0);
  });

  it("should handle non-Error thrown values", () => {
    const conn = { id: "c2", provider: "anthropic", email: "test@test.com" };
    const result = makeErrorResult(conn, "string error");
    expect(result.error).toBe("string error");
    expect(result.connectionName).toBe("test@test.com");
  });

  it("should use provider as fallback for connectionName", () => {
    const conn = { id: "c3", provider: "gemini" };
    const result = makeErrorResult(conn, new Error("x"));
    expect(result.connectionName).toBe("gemini");
  });
});
