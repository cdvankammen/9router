# Branch H: UI/UX Integration — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, ui, ux, dashboard, binary-tree, branch-h

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch H: UI/UX INTEGRATION

Integrate imported messages into the existing Messages page and dashboard so they're viewable, filterable, and analyzable alongside native traffic.

### L2 H1: MESSAGES PAGE ENHANCEMENTS

#### L3 H1a: Source Filter
- **L4 H1a1: Filter Dropdown**
  - L5: Add "Source" dropdown: All / Native / Hermes / Claude Code / Log File / Manual
  - L6: Filters `source` field in `all_messages` view
- **L4 H1a2: Source Badge**
  - L5: Each message row shows source badge: `[Native]`, `[Hermes]`, `[Claude Code]`
  - L6: Color-coded: native=blue, hermes=green, claude-code=purple

#### L3 H1b: Model Match Confidence
- **L4 H1b1: Confidence Indicator**
  - L5: Show confidence badge: `1.0` (green), `0.9` (yellow), `0.7` (orange), `0.0` (red)
  - L6: Tooltip explains: "Exact match", "Prefix match", "Fuzzy match", "Unknown"
- **L4 H1b2: Filter by Confidence**
  - L5: Add "Match Confidence" filter: All / High (≥0.9) / Medium (≥0.7) / Low (<0.7)
  - L6: Helps identify unmatched models needing manual mapping

### L2 H2: MESSAGE DETAIL VIEW

#### L3 H2a: Import Metadata Section
- **L4 H2a1: Source Info**
  - L5: Show "Imported from: Hermes", "Source Session: abc123", "Imported at: 2026-09-17 10:30"
  - L6: Collapsible section in message detail
- **L4 H2a2: Match Info**
  - L5: Show "Provider: anthropic (matched by model name, confidence 1.0)"
  - L6: Link to provider page

#### L3 H2b: Request/Response Tabs
- **L4 H2b1: Same as Native**
  - L5: Pretty JSON / Raw / Headers / cURL tabs (reuse existing component)
  - L6: Imported messages use same viewer as native
- **L4 H2b2: Sanitization Notice**
  - L5: If request/response was sanitized, show notice: "Auth headers stripped for security"
  - L6: Tooltip explains sanitization rules

### L2 H3: ERROR INBOX INTEGRATION

#### L3 H3a: Unified Error List
- **L4 H3a1: Include Imported Errors**
  - L5: Error inbox shows errors from both native and imported messages
  - L6: Source badge on each error row
- **L4 H3a2: Filter by Source**
  - L5: "Source" filter in error inbox: All / Native / Imported
  - L6: Helps isolate issues from specific sources

#### L3 H3b: Error Detail
- **L4 H3b1: Reconstruction Notice**
  - L5: If error was reconstructed, show notice: "Error category inferred from HTTP status + error body"
  - L6: Tooltip explains reconstruction logic
- **L4 H3b2: Fallback Suggestions**
  - L5: Show "Suggested fallback: gpt-4o (same task, different provider)"
  - L6: Link to combo page to create fallback rule

### L2 H4: DASHBOARD QUOTA PAGE

#### L3 H4a: Cost Breakdown
- **L4 H4a1: Native vs Imported**
  - L5: Pie chart: Native $45 / Imported $12
  - L6: Tooltip shows breakdown by source
- **L4 H4a2: Source Table**
  - L5: Table: Source | Requests | Tokens | Cost
  - L6: Rows: Native, Hermes, Claude Code, Log File, Manual

#### L3 H4b: Quota Tracking
- **L4 H4b1: Include Imported in Quotas**
  - L5: If user has quota limits, imported messages count toward quota
  - L6: Configurable: "Include imported traffic in quota calculations" toggle
- **L4 H4b2: Separate Quotas per Source**
  - L5: Optional: set separate quotas for native vs imported
  - L6: Advanced setting, default off

### L2 H5: UNKNOWN MODELS UI

#### L3 H5a: Unmatched Models List
- **L4 H5a1: Dedicated Page**
  - L5: Settings → Unknown Models → list of models with `provider='unknown'`
  - L6: Shows model name, count, first seen, last seen
- **L4 H5a2: Manual Mapping**
  - L5: Click model → modal: "Map to provider: [dropdown], canonical model name: [input]"
  - L6: Mapping saved, applied to future imports

#### L3 H5b: Auto-Learn
- **L4 H5b1: Suggest Mappings**
  - L5: If model name is similar to known model (>80% fuzzy match), suggest mapping
  - L6: User confirms in UI
- **L4 H5b2: Bulk Mapping**
  - L5: Select multiple unknown models → "Map to provider" bulk action
  - L6: Useful when onboarding new agent with many unknown models

### L2 H6: IMPORT WORKFLOW UI

#### L3 H6a: Import Button
- **L4 H6a1: Messages Page Header**
  - L5: "Import" button next to "Refresh" button
  - L6: Opens import modal
- **L4 H6a2: Import Modal**
  - L5: Tabs: "Upload File" / "Paste JSON" / "Configure Hook"
  - L6: Each tab has instructions + input area

#### L3 H6b: Import Progress
- **L4 H6b1: Progress Bar**
  - L5: Show "Importing... 42/100 messages" with progress bar
  - L6: Cancel button to abort import
- **L4 H6b2: Results Summary**
  - L5: After import: "Imported 42 messages, skipped 3 (duplicates), 5 unmatched models"
  - L6: Link to unknown models page for unmatched

## Implementation Priority

1. **Source Filter + Badge in Messages Page** (core) — 2 days
2. **Import Modal + Upload/Paste** — 2 days
3. **Error Inbox Integration** — 1 day
4. **Dashboard Quota Page Updates** — 1 day
5. **Unknown Models UI** — 2 days

## Open Questions

- Should imported messages be editable (e.g., add notes, tags)?
- How to handle very large imports (10,000+ messages) without blocking the UI?
- Should the import workflow support scheduling (e.g., import every hour)?
