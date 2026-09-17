import test from "node:test";
import assert from "node:assert/strict";

import { pruneHistoricalTools } from "../../open-sse/services/memory/toolPruner.js";

// NOTE: This file currently covers only the Tool Pruner module.
// TIER3-MEMORY-INTEGRATE extends it with mediaPruner / contextCompactor /
// cacheAnchor / handoffStore / index tests once those modules land on the branch.

test("Tool Pruner: preserves recent tool turns and truncates older ones", () => {
  const largeOutput1 = "Line 1: error in compilation\n".repeat(50);
  const largeOutput2 = "Line 2: git diff output\n".repeat(50);
  const recentOutput = "Line 3: active tool output with latest details\n".repeat(5);

  const body = {
    messages: [
      { role: "user", content: "Check code" },
      { role: "assistant", content: "Running check", tool_calls: [{ id: "c1", function: { name: "build" } }] },
      { role: "tool", tool_call_id: "c1", content: largeOutput1 },
      { role: "assistant", content: "Checking git diff", tool_calls: [{ id: "c2", function: { name: "git_diff" } }] },
      { role: "tool", tool_call_id: "c2", content: largeOutput2 },
      { role: "assistant", content: "Running latest check", tool_calls: [{ id: "c3", function: { name: "test" } }] },
      { role: "tool", tool_call_id: "c3", content: recentOutput },
      { role: "user", content: "What is next?" }
    ]
  };

  // Keep last 1 tool turn full, truncate older ones to 200 chars
  const res = pruneHistoricalTools(body, {
    enabled: true,
    keepRecentTurns: 1,
    maxHistoricalChars: 200
  });

  assert.equal(res.pruned, true);
  assert.equal(res.count, 2);
  assert.ok(res.savedChars > 500);

  // Older tools should contain the truncation notice
  assert.ok(body.messages[2].content.includes("Tool output truncated by 9router memory optimizer"));
  assert.ok(body.messages[4].content.includes("Tool output truncated by 9router memory optimizer"));

  // Recent tool (index 6) must remain completely intact
  assert.equal(body.messages[6].content, recentOutput);
});

test("Tool Pruner: is idempotent — prune(twice) === prune(once)", () => {
  // Regression for PR #3599 review §6: re-pruning the same already-truncated
  // output used to re-truncate (591→589 chars) because the notice itself was cut
  // on subsequent passes. The pipeline re-runs over stored history every request.
  const largeOutput = "DATA ".repeat(2000); // 10,000 chars, exceeds 500-char budget
  const body = {
    messages: [
      { role: "user", content: "Go" },
      { role: "assistant", content: "Running", tool_calls: [{ id: "c1", function: { name: "probe" } }] },
      { role: "tool", tool_call_id: "c1", content: largeOutput }
    ]
  };
  const opts = { enabled: true, keepRecentTurns: 0, maxHistoricalChars: 500 };

  const once = pruneHistoricalTools(body, opts);
  assert.equal(once.pruned, true);
  assert.equal(once.count, 1);
  const afterFirst = structuredClone(body);

  // Second pass over the SAME already-truncated history must be a no-op
  const twice = pruneHistoricalTools(body, opts);
  assert.equal(twice.pruned, false);
  assert.equal(twice.count, 0);
  assert.equal(twice.savedChars, 0);

  // Bytes must be byte-identical: no further degradation of the notice or content
  assert.deepEqual(body.messages, afterFirst.messages);
  const truncated = body.messages[2].content;
  assert.equal(truncated.length, afterFirst.messages[2].content.length);
  assert.ok(truncated.includes("Tool output truncated by 9router memory optimizer"));
});

test("Tool Pruner: truncateText skips content that already carries the truncation marker", () => {
  // Even when the already-truncated text is longer than the budget (e.g. because
  // maxHistoricalChars was lowered between passes), the marker must prevent
  // re-truncation so the notice and preserved head/tail stay stable.
  const alreadyTruncated =
    "HEAD CONTENT KEPT\n" +
    "\n[... Tool output truncated by 9router memory optimizer: 5 lines / 9000 chars omitted ...]\n" +
    "TAIL CONTENT KEPT";
  const body = {
    messages: [{ role: "tool", tool_call_id: "c1", content: alreadyTruncated }]
  };

  const res = pruneHistoricalTools(body, {
    enabled: true,
    keepRecentTurns: 0,
    maxHistoricalChars: 100 // deliberately smaller than the already-truncated text
  });

  assert.equal(res.pruned, false);
  assert.equal(res.count, 0);
  assert.equal(res.savedChars, 0);
  assert.equal(body.messages[0].content, alreadyTruncated);
});