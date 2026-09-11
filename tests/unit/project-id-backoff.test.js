// Locks GAP-P3-37: exponential backoff + jitter in projectId.js onboardUser retry loop.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID_PATH = resolve(__dirname, "../../open-sse/services/projectId.js");

// Mock the heavy appConstants dependency chain before importing projectId.
vi.mock("../../open-sse/config/appConstants.js", () => ({
    CLOUD_CODE_API: {
        "gemini-cli": {
            loadCodeAssist: "https://fake/loadCodeAssist",
            onboardUser: "https://fake/onboardUser",
        },
        antigravity: {
            loadCodeAssist: "https://fake/ag/loadCodeAssist",
            onboardUser: "https://fake/ag/onboardUser",
        },
    },
    LOAD_CODE_ASSIST_HEADERS: { "Content-Type": "application/json" },
    ANTIGRAVITY_LOAD_CODE_ASSIST_HEADERS: { "Content-Type": "application/json" },
    LOAD_CODE_ASSIST_METADATA: {},
}));

const {
    ONBOARD_BACKOFF_BASE_MS,
    ONBOARD_BACKOFF_CAP_MS,
    ONBOARD_BACKOFF_JITTER_MS,
    onboardBackoffDelay,
} = await import("../../open-sse/services/projectId.js");

// ─── Unit tests for onboardBackoffDelay ──────────────────────────────────────

describe("onboardBackoffDelay — exponential growth with cap and jitter", () => {
    it("returns base delay (1000ms) + jitter on attempt 1", () => {
        const fakeRandom = vi.fn(() => 0.5);
        const delay = onboardBackoffDelay(1, fakeRandom);
        // 1000 * 2^0 = 1000, capped at 10000 → 1000 + floor(0.5*500) = 1250
        expect(delay).toBe(ONBOARD_BACKOFF_BASE_MS + Math.floor(0.5 * ONBOARD_BACKOFF_JITTER_MS));
        expect(fakeRandom).toHaveBeenCalledTimes(1);
    });

    it("doubles the base delay each attempt (exponential growth)", () => {
        const fakeRandom = vi.fn(() => 0); // zero jitter for clean math
        const d1 = onboardBackoffDelay(1, fakeRandom);
        const d2 = onboardBackoffDelay(2, fakeRandom);
        const d3 = onboardBackoffDelay(3, fakeRandom);
        const d4 = onboardBackoffDelay(4, fakeRandom);

        expect(d1).toBe(1000);  // 1000 * 2^0
        expect(d2).toBe(2000);  // 1000 * 2^1
        expect(d3).toBe(4000);  // 1000 * 2^2
        expect(d4).toBe(8000);  // 1000 * 2^3
    });

    it("caps delay at ONBOARD_BACKOFF_CAP_MS regardless of attempt number", () => {
        const fakeRandom = vi.fn(() => 0);
        // attempt 5 would be 16000 without cap; should be capped to 10000
        const d5 = onboardBackoffDelay(5, fakeRandom);
        const d10 = onboardBackoffDelay(10, fakeRandom);
        expect(d5).toBe(ONBOARD_BACKOFF_CAP_MS);
        expect(d10).toBe(ONBOARD_BACKOFF_CAP_MS);
    });

    it("adds random jitter in [0, ONBOARD_BACKOFF_JITTER_MS) range", () => {
        // With random=0, jitter=0; with random→1, jitter approaches JITTER_MS
        const dMin = onboardBackoffDelay(1, () => 0);
        const dMax = onboardBackoffDelay(1, () => 0.9999);
        expect(dMin).toBe(ONBOARD_BACKOFF_BASE_MS);
        expect(dMax).toBeGreaterThanOrEqual(ONBOARD_BACKOFF_BASE_MS);
        expect(dMax).toBeLessThan(ONBOARD_BACKOFF_BASE_MS + ONBOARD_BACKOFF_JITTER_MS);
    });

    it("handles edge cases: attempt 0, negative, NaN, undefined", () => {
        const fakeRandom = vi.fn(() => 0);
        // All should clamp exponent to 0 via Math.max(0, ...)
        expect(onboardBackoffDelay(0, fakeRandom)).toBe(ONBOARD_BACKOFF_BASE_MS);
        expect(onboardBackoffDelay(-1, fakeRandom)).toBe(ONBOARD_BACKOFF_BASE_MS);
        expect(onboardBackoffDelay(NaN, fakeRandom)).toBe(ONBOARD_BACKOFF_BASE_MS);
        expect(onboardBackoffDelay(undefined, fakeRandom)).toBe(ONBOARD_BACKOFF_BASE_MS);
    });
});

// ─── Anti-false-positive regression guard ────────────────────────────────────

describe("GAP-P3-37 anti-false-positive: no fixed-delay setTimeout in onboardUser", () => {
    it("projectId.js contains no raw setTimeout(resolve, 2000) calls", async () => {
        const fs = await import("fs");
        const source = fs.readFileSync(PROJECT_ID_PATH, "utf-8");

        // The old pattern: fixed 2000ms sleep
        const fixedDelayPattern = /setTimeout\s*\(\s*resolve\s*,\s*2000\s*\)/g;
        const matches = source.match(fixedDelayPattern);
        expect(matches).toBeNull();
    });

    it("projectId.js uses onboardBackoffDelay for retry delays", async () => {
        const fs = await import("fs");
        const source = fs.readFileSync(PROJECT_ID_PATH, "utf-8");

        // Must contain at least 2 calls to onboardBackoffDelay (one per retry site)
        const backoffCalls = source.match(/onboardBackoffDelay\s*\(/g);
        expect(backoffCalls).not.toBeNull();
        expect(backoffCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("projectId.js uses abortableSleep instead of raw Promise/setTimeout for retries", async () => {
        const fs = await import("fs");
        const source = fs.readFileSync(PROJECT_ID_PATH, "utf-8");

        const abortableSleepCalls = source.match(/abortableSleep\s*\(/g);
        expect(abortableSleepCalls).not.toBeNull();
        expect(abortableSleepCalls.length).toBeGreaterThanOrEqual(2);
    });
});
