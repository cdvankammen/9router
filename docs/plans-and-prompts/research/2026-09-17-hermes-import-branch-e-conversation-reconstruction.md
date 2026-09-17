# Branch E: Conversation Reconstruction — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, conversation-reconstruction, binary-tree, branch-e

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch E: CONVERSATION RECONSTRUCTION

Reconstruct multi-turn conversations from imported messages so they can be viewed as threads in the Messages page.

### L2 E1: CONVERSATION ID DETECTION

#### L3 E1a: Extract from Source
- **L4 E1a1: Hermes Conversation ID**
  - L5: Hermes logs include `conversationId` or `sessionId` field
  - L6: Use as-is for `imported_messages.conversation_id`
- **L4 E1a2: Claude Code Session ID**
  - L5: Claude Code logs include `x-claude-code-session-id` header or `metadata.session_id`
  - L6: Prefix with `claude-code-` to avoid collisions

#### L3 E1b: Generate from Content
- **L4 E1b1: Hash-Based**
  - L5: If no conversation ID in source → `hash(first_user_message + timestamp)`
  - L6: Groups messages from same conversation even without explicit ID
- **L4 E1b2: Time-Based Clustering**
  - L5: Messages from same source app within 5 minutes → same conversation
  - L6: Break if gap > 5 minutes or different model

### L2 E2: MESSAGE ORDERING

#### L3 E2a: Timestamp Ordering
- **L4 E2a1: Sort by Timestamp**
  - L5: Within conversation, sort messages by `timestamp` ascending
  - L6: Handle clock skew (messages from different sources may have slightly different clocks)
- **L4 E2a2: Role-Based Ordering**
  - L5: Within same timestamp, order: system → user → assistant → tool
  - L6: Matches OpenAI/Anthropic message ordering conventions

#### L3 E2b: Turn Detection
- **L4 E2b1: User→Assistant Pairs**
  - L5: Each `user` message starts a new turn, followed by `assistant` response
  - L6: Tool calls/results are part of the same turn
- **L4 E2b2: Multi-Turn Detection**
  - L5: If `assistant` message has `finish_reason=stop` → turn complete
  - L6: Next `user` message starts new turn

### L2 E3: CONVERSATION METADATA

#### L3 E3a: Aggregate Stats
- **L4 E3a1: Token Counts**
  - L5: Sum `promptTokens + completionTokens` across all messages in conversation
  - L6: Display in conversation list: "1,234 tokens"
- **L4 E3a2: Cost Totals**
  - L5: Sum `cost` across all messages
  - L6: Display in conversation list: "$0.045"
- **L4 E3a3: Message Count**
  - L5: Count messages in conversation
  - L6: Display: "12 messages"

#### L3 E3b: Time Range
- **L4 E3b1: Duration**
  - L5: `last_message.timestamp - first_message.timestamp`
  - L6: Display: "45 min conversation"
- **L4 E3b2: First/Last Seen**
  - L5: Display first and last message timestamps
  - L6: Useful for identifying stale conversations

### L2 E4: CONVERSATION VIEWER UI

#### L3 E4a: Conversation List
- **L4 E4a1: Sort Options**
  - L5: By last activity (default), by cost, by token count, by message count
  - L6: Dropdown in Messages page header
- **L4 E4a2: Filter Options**
  - L5: By source (native/imported), by provider, by model, by date range
  - L6: Sidebar filters (same as message list)

#### L3 E4b: Conversation Detail
- **L4 E4b1: Message Thread View**
  - L5: Chat-style layout: user messages on right, assistant on left
  - L6: Collapsible tool calls, syntax-highlighted code blocks
- **L4 E4b2: Raw JSON View**
  - L5: Toggle to see raw request/response JSON for each message
  - L6: Same format tabs as message detail (Pretty/Raw/Headers/cURL)

### L2 E5: CONVERSATION MERGING

#### L3 E5a: Native + Imported
- **L4 E5a1: Merge by Conversation ID**
  - L5: If imported message has same `conversation_id` as native message → merge
  - L6: Display as single conversation with mixed source badges
- **L4 E5a2: Merge by Content Similarity**
  - L5: If imported user message is similar to native user message (>90% overlap) → suggest merge
  - L6: User confirms merge in UI

#### L3 E5b: Cross-Source
- **L4 E5b1: Hermes + Claude Code**
  - L5: If both agents worked on same task → merge conversations
  - L6: Detect by similar timestamps + same model + similar content
- **L4 E5b2: Manual Merge**
  - L5: User selects multiple conversations → "Merge" button
  - L6: Creates new conversation with all messages, ordered by timestamp

## Implementation Priority

1. **Conversation ID Detection + Message Ordering** (core) — 2 days
2. **Conversation Metadata Aggregation** — 1 day
3. **Conversation Viewer UI** — 3 days
4. **Conversation Merging** — 2 days

## Open Questions

- Should imported conversations be editable (e.g., add notes, tags)?
- How to handle conversations that span multiple days?
- Should the system suggest conversation merges automatically?
