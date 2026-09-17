import test from "node:test";
import assert from "node:assert/strict";

import { pruneHistoricalTools } from "../../open-sse/services/memory/toolPruner.js";
import { compactContextWindow, validateSequence } from "../../open-sse/services/memory/contextCompactor.js";

// NOTE: This file covers the Tool Pruner, Context Compactor, and Cache Anchor
// modules. TIER3-MEMORY-INTEGRATE extends it with mediaPruner / handoffStore /
// index tests once those modules land on the branch.

import { anchorPromptCache } from "../../open-sse/services/memory/cacheAnchor.js";

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

// =========================================================================
// Context Compactor — sequence validity fixes (PR #3599 review §3)
// =========================================================================

// Build a tool-heavy conversation in PR-review probe shape. Each step is
// user -> assistant(tool_calls) -> tool(result).
function buildToolConversation(stepCount = 6) {
  const messages = [];
  for (let i = 0; i < stepCount; i++) {
    messages.push({ role: "user", content: `Step ${i}: instructions `.repeat(8) });
    messages.push({
      role: "assistant",
      content: `Step ${i}: exec`,
      tool_calls: [{ id: `tc${i}`, function: { name: "tool" } }],
    });
    messages.push({ role: "tool", tool_call_id: `tc${i}`, content: `Result for step ${i} `.repeat(8) });
  }
  return messages;
}

/** Collect dangling tool_call_ids: tool results whose id has no matching tool_calls. */
function findDanglingToolCallIds(messages) {
  const declared = new Set();
  const dangling = [];
  for (const msg of messages) {
    if (Array.isArray(msg.tool_calls)) {
      msg.tool_calls.forEach((tc) => declared.add(tc.id));
    }
    if (msg.role === "tool" && typeof msg.tool_call_id === "string") {
      if (!declared.has(msg.tool_call_id)) dangling.push(msg.tool_call_id);
    }
  }
  return dangling;
}

/** Collect consecutive same-role breaks for alternation roles (user/assistant). */
function findAlternationBreaks(messages) {
  const breaks = [];
  for (let i = 1; i < messages.length; i++) {
    const a = messages[i - 1].role;
    const b = messages[i].role;
    if (a && b && a === b && a !== "tool" && a !== "system") {
      breaks.push(`${a}->${b}@${i}`);
    }
  }
  return breaks;
}

// ----- Defect 1: dangling tool result (trailing tool message) -----

test("Context Compactor: keep=2 with trailing tool result → no dangling tool_call_id", () => {
  const body = { messages: buildToolConversation() };
  const res = compactContextWindow(body, {
    enabled: true,
    thresholdTokens: 1, // force compaction
    recentTurnsToKeep: 2,
  });

  assert.equal(res.compacted, true, "should compact");
  assert.deepEqual(findDanglingToolCallIds(body.messages), [], "no dangling tool_call_ids");
  assert.equal(validateSequence(body.messages).valid, true, "sequence valid");
});

test("Context Compactor: keep=3 with trailing tool result → no dangling tool_call_id", () => {
  const body = { messages: buildToolConversation() };
  const res = compactContextWindow(body, {
    enabled: true,
    thresholdTokens: 1,
    recentTurnsToKeep: 3,
  });

  assert.equal(res.compacted, true, "should compact");
  assert.deepEqual(findDanglingToolCallIds(body.messages), [], "no dangling tool_call_ids");
  assert.equal(validateSequence(body.messages).valid, true, "sequence valid");
});

test("Context Compactor: keep=4 with trailing tool result → no dangling tool_call_id", () => {
  const body = { messages: buildToolConversation() };
  const res = compactContextWindow(body, {
    enabled: true,
    thresholdTokens: 1,
    recentTurnsToKeep: 4,
  });

  assert.equal(res.compacted, true, "should compact");
  assert.deepEqual(findDanglingToolCallIds(body.messages), [], "no dangling tool_call_ids");
  assert.equal(validateSequence(body.messages).valid, true, "sequence valid");
});

// ----- Defect 2: assistant->assistant alternation break from synthetic ack -----

test("Context Compactor: first kept message is assistant → no assistant→assistant break", () => {
  // Conversation of user/assistant pairs ending on an assistant message.
  // With keep=1 the first kept message IS the final assistant message; the old
  // synthetic assistant ack (placed before it) would create the break.
  const messages = [];
  for (let i = 0; i < 8; i++) {
    messages.push({ role: "user", content: `Turn ${i}: questions `.repeat(10) });
    messages.push({ role: "assistant", content: `Turn ${i}: answer `.repeat(10) });
  }

  const body = { messages };
  const res = compactContextWindow(body, {
    enabled: true,
    thresholdTokens: 1,
    recentTurnsToKeep: 1,
  });

  assert.equal(res.compacted, true, "should compact");
  assert.deepEqual(findAlternationBreaks(body.messages), [], "no alternation breaks");
  assert.equal(validateSequence(body.messages).valid, true, "sequence valid");
});

test("Context Compactor: summary does NOT introduce assistant→assistant break (first kept is assistant)", () => {
  // 10 user/assistant pairs, keep=3 → older=[u0..a8], recent=[u8,a8,u9,a9].
  // First kept message is assistant (a8): the old ack(assistant) before it
  // created summary(user), ack(assistant), a8(assistant) → break.
  const messages = [];
  for (let i = 0; i < 10; i++) {
    messages.push({ role: "user", content: `Q ${i} `.repeat(20) });
    messages.push({ role: "assistant", content: `A ${i} `.repeat(20) });
  }

  const body = { messages };
  const res = compactContextWindow(body, {
    enabled: true,
    thresholdTokens: 1,
    recentTurnsToKeep: 3,
  });

  assert.equal(res.compacted, true, "should compact");
  assert.deepEqual(findAlternationBreaks(body.messages), [], "no alternation breaks");
  assert.equal(validateSequence(body.messages).valid, true, "sequence valid");
});

// ----- user->user prevention: summary merged into first kept user message -----

test("Context Compactor: summary merges into first kept user message (no user→user break)", () => {
  const messages = [];
  for (let i = 0; i < 10; i++) {
    messages.push({ role: "user", content: `Question ${i}: details `.repeat(10) });
    messages.push({ role: "assistant", content: `Answer ${i}: response `.repeat(10) });
  }
  messages.push({ role: "user", content: "What next? Keep going." }); // trailing user

  const body = { messages };
  const res = compactContextWindow(body, {
    enabled: true,
    thresholdTokens: 1,
    recentTurnsToKeep: 3,
  });

  assert.equal(res.compacted, true, "should compact");

  // First non-system message is the merged summary + first kept user content
  const firstNonSystem = body.messages.find((m) => m.role !== "system");
  assert.equal(firstNonSystem.role, "user", "first non-system should be user");
  assert.ok(firstNonSystem.content.includes("[Historical Context Summary"), "contains summary");
  assert.ok(
    firstNonSystem.content.includes("Question 9: details"),
    "contains first kept user's original content"
  );

  // Trailing user message preserved intact
  assert.equal(
    body.messages[body.messages.length - 1].content,
    "What next? Keep going.",
    "trailing user message preserved intact"
  );

  assert.deepEqual(findAlternationBreaks(body.messages), [], "no alternation breaks");
  assert.equal(validateSequence(body.messages).valid, true, "sequence valid");
});

// ----- Other sequence/edge guarantees -----

test("Context Compactor: realistic 10-turn tool-heavy conversation, keep={2,3,4}", () => {
  const messages = [{ role: "system", content: "You are a coding assistant." }];
  for (let i = 0; i < 10; i++) {
    messages.push({ role: "user", content: `Task ${i}: implement feature ${i} `.repeat(5) });
    messages.push({
      role: "assistant",
      content: `Analyzing task ${i}`,
      tool_calls: [{ id: `tc${i}`, function: { name: "shell" } }],
    });
    messages.push({
      role: "tool",
      tool_call_id: `tc${i}`,
      content: `stdout: implementation details for task ${i} `.repeat(5),
    });
    messages.push({
      role: "assistant",
      content: `Task ${i} completed with notes `.repeat(5),
    });
  }

  for (const keep of [2, 3, 4]) {
    const body = { messages: structuredClone(messages) };
    const res = compactContextWindow(body, {
      enabled: true,
      thresholdTokens: 1,
      recentTurnsToKeep: keep,
    });

    assert.equal(res.compacted, true, `keep=${keep}: should compact`);
    assert.equal(validateSequence(body.messages).valid, true, `keep=${keep}: sequence valid`);
    assert.equal(body.messages[0].role, "system", `keep=${keep}: system preserved`);
  }
});

test("Context Compactor: conversation shorter than threshold → no compaction", () => {
  const messages = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" },
  ];
  const body = { messages };
  const res = compactContextWindow(body, {
    enabled: true,
    thresholdTokens: 999999,
    recentTurnsToKeep: 2,
  });
  assert.equal(res.compacted, false, "should NOT compact small conversation");
  assert.deepEqual(body.messages, messages, "messages unchanged");
});

test("Context Compactor: enabled=false → no compaction", () => {
  const messages = [
    { role: "user", content: "Test" },
    { role: "assistant", content: "Reply" },
  ];
  const body = { messages };
  const res = compactContextWindow(body, { enabled: false });
  assert.equal(res.compacted, false);
  assert.deepEqual(body.messages, messages);
});

test("Context Compactor: disabled validation still exported (validateSequence)", () => {
  // validateSequence is exported and independently usable
  const bad = [
    { role: "user", content: "Q1" },
    { role: "user", content: "Q2" },
  ];
  assert.equal(validateSequence(bad).valid, false);
  assert.ok(validateSequence(bad).errors.some((e) => e.includes("user->user")));

  const dangling = [
    { role: "assistant", content: "run", tool_calls: [{ id: "t1", function: { name: "f" } }] },
    { role: "tool", tool_call_id: "t1", content: "ok" },
    { role: "tool", tool_call_id: "t999", content: "dangling" },
  ];
  assert.equal(validateSequence(dangling).valid, false);
  assert.ok(validateSequence(dangling).errors.some((e) => e.includes("danglingToolCallIds")));

  // Valid: tool->tool adjacency both allowed and accepted
  const good = [
    { role: "assistant", content: "run", tool_calls: [{ id: "t1", function: { name: "f" } }, { id: "t2", function: { name: "g" } }] },
    { role: "tool", tool_call_id: "t1", content: "ok1" },
    { role: "tool", tool_call_id: "t2", content: "ok2" },
    { role: "user", content: "next" },
  ];
  assert.equal(validateSequence(good).valid, true);

  // Valid: trailing assistant with in-flight tool call (no result yet) is legal
  const inflight = [
    { role: "user", content: "do it" },
    { role: "assistant", content: "running", tool_calls: [{ id: "t1", function: { name: "f" } }] },
  ];
  assert.equal(validateSequence(inflight).valid, true);
});

test("Context Compactor: input field (not messages) → compacted via input array", () => {
  const messages = [];
  for (let i = 0; i < 10; i++) {
    messages.push({ role: "user", content: `Q${i} `.repeat(20) });
    messages.push({ role: "assistant", content: `A${i} `.repeat(20) });
  }
  const body = { input: messages };
  const res = compactContextWindow(body, {
    enabled: true,
    thresholdTokens: 1,
    recentTurnsToKeep: 3,
  });
  assert.equal(res.compacted, true);
  assert.ok(Array.isArray(body.input));
  assert.ok(body.input.length < messages.length);
  assert.equal(validateSequence(body.input).valid, true);
});
// =========================================================================
// Cache Anchor — reimplemented on v2 anchorClaudeCache semantics (TIER3-MEMORY-CACHE)
// =========================================================================

test("Cache Anchor: enabled=false → no anchoring, anchored=false", () => {
  const body = { system: "sys", messages: [{ role: "user", content: "hi" }] };
  const res = anchorPromptCache(body, { enabled: false, format: "claude" });
  assert.equal(res.anchored, false);
  assert.deepEqual(body, { system: "sys", messages: [{ role: "user", content: "hi" }] });
});

test("Cache Anchor: null/undefined body → no anchoring", () => {
  assert.deepEqual(anchorPromptCache(null, { enabled: true }), { body: null, anchored: false });
  assert.deepEqual(anchorPromptCache(undefined, { enabled: true }), { body: undefined, anchored: false });
});

test("Cache Anchor: Claude passthrough (clientTool=claude) → SKIP (v2 anchor covers it)", () => {
  const body = {
    system: "sys",
    tools: [{ name: "bash", description: "run" }],
    messages: [{ role: "user", content: "hello" }],
  };
  const res = anchorPromptCache(body, {
    enabled: true,
    format: "claude",
    passthrough: true,
    clientTool: "claude",
  });
  // Must NOT anchor: v2's anchorClaudeCache runs later in chatCore and handles
  // this case. Anchoring here would be redundant (double-anchor) and could emit
  // intermediate invalid shapes (defer_loading + cache_control).
  assert.equal(res.anchored, false);
  assert.equal(typeof body.system, "string", "system must stay a string on passthrough");
  assert.equal(body.system, "sys");
  assert.equal(body.tools[0].cache_control, undefined, "tools must not get cache_control");
  assert.equal(body.messages[0].content, "hello");
});

test("Cache Anchor: Claude translated route → delegates to v2 anchorClaudeCache (1h TTL)", () => {
  // v2's anchorClaudeCache does NOT convert system string→array — that was the
  // naive PR's mistake. It only anchors when system is already an array (the
  // translator pipeline handles string→array conversion separately). Pass system
  // as an array to test the anchoring path that v2 actually exercises.
  const body = {
    system: [{ type: "text", text: "sys" }],
    tools: [{ name: "bash", description: "run" }],
    messages: [{ role: "user", content: "hello" }],
  };
  const res = anchorPromptCache(body, {
    enabled: true,
    format: "claude",
    passthrough: false,
    clientTool: null, // translated route — not the claude passthrough
  });
  assert.equal(res.anchored, true);

  // v2 semantics: last system block gets 1h TTL
  assert.ok(Array.isArray(body.system), "system stays as array");
  assert.equal(body.system.length, 1);
  assert.deepEqual(body.system[0].cache_control, { type: "ephemeral", ttl: "1h" });

  // Tool gets 1h TTL
  assert.deepEqual(body.tools[0].cache_control, { type: "ephemeral", ttl: "1h" });
});

test("Cache Anchor: system string stays string on translated route (v2 does not convert)", () => {
  // Regression: the naive PR impl converted system string→array with 5m TTL.
  // v2's anchorClaudeCache only anchors Array.isArray(body.system) — it does
  // NOT do string→array conversion. That's the translator's job.
  const body = {
    system: "plain string system",
    tools: [{ name: "bash", description: "run" }],
    messages: [{ role: "user", content: "hello" }],
  };
  const res = anchorPromptCache(body, {
    enabled: true,
    format: "claude",
    passthrough: false,
  });
  assert.equal(res.anchored, true);
  assert.equal(typeof body.system, "string", "system must stay string — v2 does not convert");
  assert.equal(body.system, "plain string system");
  // Tool still gets anchored with 1h TTL
  assert.deepEqual(body.tools[0].cache_control, { type: "ephemeral", ttl: "1h" });
});

test("Cache Anchor: defer_loading tool NEVER carries cache_control (#3567)", () => {
  const body = {
    system: "sys",
    tools: [
      { name: "normal", description: "cachable" },
      { name: "deferred", description: "deferred", defer_loading: true },
    ],
    messages: [{ role: "user", content: "hello" }],
  };
  const res = anchorPromptCache(body, {
    enabled: true,
    format: "claude",
  });
  assert.equal(res.anchored, true);

  // The cache anchor lands on the LAST cacheable tool (normal), NOT the deferred one
  assert.equal(body.tools[0].defer_loading, undefined);
  assert.deepEqual(body.tools[0].cache_control, { type: "ephemeral", ttl: "1h" });
  assert.equal(body.tools[1].cache_control, undefined, "defer_loading tool must NOT carry cache_control");
});

test("Cache Anchor: all tools defer_loading → no tool cache_control (budget still works)", () => {
  const body = {
    system: "sys",
    tools: [
      { name: "d1", description: "deferred", defer_loading: true },
      { name: "d2", description: "deferred", defer_loading: true },
    ],
    messages: [{ role: "user", content: "hi" }],
  };
  const res = anchorPromptCache(body, { enabled: true, format: "claude" });
  assert.equal(res.anchored, true);
  assert.equal(body.tools[0].cache_control, undefined);
  assert.equal(body.tools[1].cache_control, undefined);
});

test("Cache Anchor: system stays string on passthrough — v2 anchor does the string→array only when needed", () => {
  // Regression for the review finding: naive PR impl mutated system string → array
  // even on passthrough, then v2 re-anchored. Now passthrough is skipped entirely.
  const body = { system: "plain string", messages: [{ role: "user", content: "x" }] };
  const res = anchorPromptCache(body, {
    enabled: true,
    format: "claude",
    passthrough: true,
    clientTool: "claude",
  });
  assert.equal(res.anchored, false);
  assert.equal(typeof body.system, "string", "must not convert string→array on passthrough");
});

test("Cache Anchor: non-Claude formats → no-op", () => {
  const body = { system: "sys", messages: [{ role: "user", content: "hi" }] };
  const res = anchorPromptCache(body, { enabled: true, format: "openai" });
  assert.equal(res.anchored, false);
  assert.deepEqual(body, { system: "sys", messages: [{ role: "user", content: "hi" }] });
});
