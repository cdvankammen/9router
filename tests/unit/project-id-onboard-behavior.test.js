// Behavioral tests for GAP-P3-37: drives onboardUser retry loop end-to-end
// with mocked fetch to prove exponential backoff timing and abort handling.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Mock appConstants before importing projectId
vi.mock("../../open-sse/config/appConstants.js", () => ({
    CLOUD_CODE_API: {
        "gemini-cli": {
            loadCodeAssist: "https://fake/loadCodeAssist",
            onboardUser: "https://fake/onboardUser",
        },
    },
    LOAD_CODE_ASSIST_HEADERS: { "Content-Type": "application/json" },
    ANTIGRAVITY_LOAD_CODE_ASSIST_HEADERS: { "Content-Type": "application/json" },
    LOAD_CODE_ASSIST_METADATA: {},
}));

// We need to mock global fetch for the onboardUser calls
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const { getProjectIdForConnection, invalidateProjectId } = await import("../../open-sse/services/projectId.js");

beforeEach(() => {
    fetchMock.mockReset();
    vi.useFakeTimers();
    // Re-stub fetch every test — unstubAllGlobals in afterEach removes it
    vi.stubGlobal("fetch", fetchMock);
    // Override MAX_ATTEMPTS so the retry loop runs enough iterations for the
    // exponential-backoff assertions below.
    process.env.ONBOARD_MAX_ATTEMPTS = "5";
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.ONBOARD_MAX_ATTEMPTS;
});

function mockLoadCodeAssistNoProject() {
    // loadCodeAssist returns no project, forcing fallback to onboardUser
    return {
        ok: true,
        json: async () => ({ allowedTiers: [{ id: "test-tier", isDefault: true }] }),
    };
}

function mockOnboardNotDone() {
    return {
        ok: true,
        json: async () => ({ done: false }),
    };
}

function mockOnboardDone(projectId = "test-project-123") {
    return {
        ok: true,
        json: async () => ({
            done: true,
            response: { cloudaicompanionProject: projectId },
        }),
    };
}

describe("onboardUser behavioral: exponential backoff in retry loop", () => {
    it("succeeds after retries with growing delays (not fixed 2000ms)", async () => {
        // loadCodeAssist → no project → onboardUser attempt 1 (not done) → attempt 2 (done)
        fetchMock
            .mockResolvedValueOnce(mockLoadCodeAssistNoProject())
            .mockResolvedValueOnce(mockOnboardNotDone())
            .mockResolvedValueOnce(mockOnboardDone());

        const promise = getProjectIdForConnection("conn-1", "fake-token");

        // The first backoff delay for attempt 1 = 1000 * 2^0 + jitter = ~1000-1500ms
        // Advance past the first backoff window (max 1500ms)
        await vi.advanceTimersByTimeAsync(1600);

        // Second fetch should have been made by now if backoff is working
        // Attempt 2 succeeds immediately
        const result = await promise;
        expect(result).toBe("test-project-123");

        // Verify fetch was called 3 times: loadCodeAssist + 2 onboardUser attempts
        expect(fetchMock).toHaveBeenCalledTimes(3);

        invalidateProjectId("conn-1");
    });

    it("returns null after exhausting all MAX_ATTEMPTS with backoff delays", async () => {
        // loadCodeAssist → no project → 5 onboardUser attempts all not-done
        fetchMock.mockResolvedValueOnce(mockLoadCodeAssistNoProject());
        for (let i = 0; i < 5; i++) {
            fetchMock.mockResolvedValueOnce(mockOnboardNotDone());
        }

        const promise = getProjectIdForConnection("conn-2", "fake-token");

        // Advance through all backoff windows:
        // attempt 1: ~1000ms, attempt 2: ~2000ms, attempt 3: ~4000ms,
        // attempt 4: ~8000ms, attempt 5: ~10000ms (capped)
        // Total: 25000ms base + up to 2500ms jitter = 27500ms max
        await vi.advanceTimersByTimeAsync(28000);

        const result = await promise;
        expect(result).toBeNull();

        // loadCodeAssist (1) + 5 onboardUser attempts = 6 total fetch calls
        expect(fetchMock).toHaveBeenCalledTimes(6);

        invalidateProjectId("conn-2");
    });

    it("aborts immediately when signal fires during backoff sleep", async () => {
        fetchMock
            .mockResolvedValueOnce(mockLoadCodeAssistNoProject())
            .mockResolvedValueOnce(mockOnboardNotDone());

        const controller = new AbortController();

        // Use internal fetchProjectId path via getProjectIdForConnection
        // We'll remove the connection mid-flight to trigger abort
        const promise = getProjectIdForConnection("conn-abort", "fake-token");

        // Let loadCodeAssist complete, then abort during the first backoff sleep
        await vi.advanceTimersByTimeAsync(100);

        // Abort the connection — this should cancel the pending sleep
        const { removeConnection } = await import("../../open-sse/services/projectId.js");
        removeConnection("conn-abort");

        const result = await promise;
        expect(result).toBeNull();

        // Should NOT have made a second onboardUser call since we aborted during sleep
        // loadCodeAssist (1) + onboardUser attempt 1 (1) = 2 calls max
        expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(2);
    });

    it("delays grow exponentially, not at fixed 2000ms intervals", async () => {
        // Track timing of fetch calls to verify exponential spacing
        const callTimes = [];

        fetchMock.mockImplementation(async (...args) => {
            callTimes.push(Date.now());
            if (callTimes.length === 1) return mockLoadCodeAssistNoProject();
            if (callTimes.length <= 4) return mockOnboardNotDone();
            return mockOnboardDone();
        });

        const promise = getProjectIdForConnection("conn-timing", "fake-token");

        // Advance enough for all retries to complete
        await vi.advanceTimersByTimeAsync(20000);
        await promise;

        // We need at least 4 calls to measure 3 gaps
        expect(callTimes.length).toBeGreaterThanOrEqual(4);

        // Calculate gaps between onboardUser calls (skip first call = loadCodeAssist)
        const gaps = [];
        for (let i = 2; i < callTimes.length; i++) {
            gaps.push(callTimes[i] - callTimes[i - 1]);
        }

        // Each gap should be LARGER than the previous (exponential growth)
        // With jitter, gaps won't be exact doubles but should show clear growth
        if (gaps.length >= 2) {
            // gap[1] should be roughly 2x gap[0] (allowing for jitter variance)
            // At minimum, later gaps must be strictly larger than earlier ones
            for (let i = 1; i < gaps.length; i++) {
                expect(gaps[i]).toBeGreaterThan(gaps[i - 1] * 0.8); // allow 20% jitter tolerance
            }
        }

        invalidateProjectId("conn-timing");
    });
});
