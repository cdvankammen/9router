# Implementation Plan 08: Messages Page UI Integration

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** implementation-plan, hermes-import, ui, messages-page

> ⚠️ **AGENT REVIEW NOTE (READ FIRST)**
> THIS PLAN IS A RESEARCH DOCUMENT — NOT AN IMPLEMENTATION INSTRUCTION.
> The code is a **SUGGESTION / OPTION** for future agents — NOT a final decision, NOT an instruction to implement anything.
> Code snippets show **possible approaches** (file paths, function signatures, patterns) — options, not requirements.
> **Nothing in this plan should be implemented automatically** — future agents must evaluate each suggestion, decide if there's a better way, and only then proceed.
> The agent is the final arbiter: if a better approach exists, make those changes happen.

## Source Research Branches

This plan implements options researched in:
- `../2026-09-17-hermes-import-branch-h-ui-ux.md` (primary — badges, filters, import modal, large-import UX)
- `../2026-09-17-hermes-import-branch-e-conversation-reconstruction.md` (conversation viewer surfaces)

## Goal

Integrate imported messages into the existing Messages page so they're viewable, filterable, and analyzable alongside native traffic.

## Grounding (verified against the real codebase, 2026-09-17)

| Fact | Verified value |
|------|---------------|
| **Real Messages page path** | `src/app/(dashboard)/dashboard/messages/page.js` — NOT `src/app/dashboard/messages/page.js` (original plan was wrong) |
| Components dir | `src/app/(dashboard)/dashboard/messages/components/` — has `TimelineView`, `TraceTreeView`, `BoardView`, `InboxView`, `FacetsSidebar`, `SavedViewsDropdown`, `ActionMenu`, `TruncatedBadge` |
| Shared components | `@/shared/components/` — `Card`, `Button`, `Drawer`, `Pagination` |
| Styling | Tailwind + `cn()` from `@/shared/utils/cn`; status badge pattern: `bg-{color}-500/10 text-{color}-600 dark:text-{color}-400` |
| Provider names | `AI_PROVIDERS` + `getProviderByAlias` from `@/shared/constants/providers`; fetched `/api/provider-nodes` |
| API | `GET /api/messages` returns `{ messages, conversations, errors, searchMode, pagination }` |
| Import API | Plan 03: `POST /api/messages/import` with `x-api-key` header |

## Scope

- Source filter + badge
- Match confidence indicator
- Import metadata section
- Import modal (upload/paste)
- Unknown models UI

## Design

### 1. Source Filter — `src/app/(dashboard)/dashboard/messages/page.js` (add to existing filters)

**Purpose:** Filter the list by `source` (native vs imported). The API already accepts `sourceApp`; a `source` param would be added to the messages API (plan 03/19).

```jsx
// src/app/(dashboard)/dashboard/messages/page.js (addition to existing filter bar)
// SUGGESTION ONLY — review against actual codebase before implementing
<div className="filter-group">
  <label>Source</label>
  <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
    <option value="">All Sources</option>
    <option value="native">Native (9Router)</option>
    <option value="hermes">Hermes</option>
    <option value="claude-code">Claude Code</option>
    <option value="log-file">Log File</option>
    <option value="manual">Manual Import</option>
  </select>
</div>
```

### 2. Source Badge — `src/app/(dashboard)/dashboard/messages/components/SourceBadge.jsx`

**Purpose:** Color-coded source label. Follows the existing `StatusBadge` styling pattern (`bg-{color}-500/10 text-{color}-600 dark:text-{color}-400`).

```jsx
// src/app/(dashboard)/dashboard/messages/components/SourceBadge.jsx
// SUGGESTION ONLY — review against actual codebase before implementing
import { cn } from "@/shared/utils/cn";

const SOURCE_COLORS = {
  native: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  hermes: "bg-green-500/10 text-green-600 dark:text-green-400",
  "claude-code": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "log-file": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  manual: "bg-gray-500/10 text-gray-500 dark:text-gray-400",
};

export function SourceBadge({ source }) {
  const label = source === "native" ? "Native" : source;
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium", SOURCE_COLORS[source] || SOURCE_COLORS.manual)}>
      {label}
    </span>
  );
}
```

### 3. Confidence Indicator — `src/app/(dashboard)/dashboard/messages/components/ConfidenceBadge.jsx`

**Purpose:** Show model-match confidence with tooltip.

```jsx
// src/app/(dashboard)/dashboard/messages/components/ConfidenceBadge.jsx
// SUGGESTION ONLY — review against actual codebase before implementing
export function ConfidenceBadge({ confidence }) {
  if (confidence === null || confidence === undefined) return null;
  const color = confidence >= 0.9 ? "text-green-500" : confidence >= 0.7 ? "text-yellow-500" : "text-red-500";
  const label = confidence >= 0.9 ? "High" : confidence >= 0.7 ? "Medium" : "Low";
  const matchType = confidence >= 0.9 ? "Exact match" : confidence >= 0.7 ? "Fuzzy match" : "Unknown";
  return (
    <span className={`text-xs ${color}`} title={matchType}>
      {label} ({confidence.toFixed(1)})
    </span>
  );
}
```

### 4. Import Metadata Section — `src/app/(dashboard)/dashboard/messages/components/ImportMetadata.jsx`

**Purpose:** Show import provenance in the message detail drawer.

```jsx
// src/app/(dashboard)/dashboard/messages/components/ImportMetadata.jsx
// SUGGESTION ONLY — review against actual codebase before implementing
export function ImportMetadata({ message }) {
  if (!message.source || message.source === "native") return null;
  return (
    <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Imported from</span>
        <span className="font-medium">{message.source}</span>
      </div>
      {message.sourceSessionId && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Source Session</span>
          <span className="font-mono text-xs">{message.sourceSessionId}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-muted-foreground">Provider Match</span>
        <span className="flex items-center gap-2">
          {message.provider || "unknown"}
          <ConfidenceBadge confidence={message.modelMatchConfidence} />
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Imported At</span>
        <span>{new Date(message.importedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}
```

### 5. Import Modal — `src/app/(dashboard)/dashboard/messages/components/ImportModal.jsx`

**Purpose:** Paste/upload JSON → POST to import API. **Note:** the import API requires `x-api-key` when `IMPORT_API_KEY` is set — the modal must handle 401 gracefully (show "configure IMPORT_API_KEY" message).

```jsx
// src/app/(dashboard)/dashboard/messages/components/ImportModal.jsx
// SUGGESTION ONLY — review against actual codebase before implementing
"use client";
import { useState } from "react";
import Button from "@/shared/components/Button";

export function ImportModal({ onClose, onImported }) {
  const [tab, setTab] = useState("paste");
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  async function handleImport() {
    setImporting(true);
    try {
      let messages;
      try {
        messages = JSON.parse(text);
      } catch {
        // Try JSONL
        messages = text.trim().split("\n").map((l) => JSON.parse(l));
      }
      if (!Array.isArray(messages)) messages = [messages];

      const res = await fetch("/api/messages/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "manual", messages }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setResult({ error: "Import API requires IMPORT_API_KEY — set it in the server env." });
        return;
      }
      setResult(data);
      onImported?.();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Import Messages</h2>
        <div className="flex gap-2 mb-4">
          {["upload", "paste", "hook-config"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={tab === t ? "font-semibold" : ""}>
              {t === "upload" ? "Upload File" : t === "paste" ? "Paste JSON" : "Configure Hook"}
            </button>
          ))}
        </div>
        {tab === "paste" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='{"model": "claude-3.5-sonnet", "request": {...}, "response": {...}}'
            className="w-full h-64 font-mono text-sm rounded border p-2"
          />
        )}
        {result && (
          <div className="mt-4 rounded bg-muted p-3 text-sm">
            {result.error ? (
              <p className="text-red-500">{result.error}</p>
            ) : (
              <>
                <p>Imported: {result.imported} · Skipped: {result.skipped}</p>
                {result.unmatchedModels?.length > 0 && (
                  <p className="text-yellow-500">Unmatched models: {result.unmatchedModels.join(", ")}</p>
                )}
              </>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={importing || !text}>
            {importing ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## Steps (per-part instructions)

### Step 1 — Add `source` filter to Messages page
1. In `src/app/(dashboard)/dashboard/messages/page.js`, add the source select to the filter bar.
2. Pass `source` to the `GET /api/messages` fetch.
3. **Verify:** selecting "hermes" filters to imported hermes rows.

### Step 2 — Create `SourceBadge`, `ConfidenceBadge`, `ImportMetadata` components
1. Create the three files in `src/app/(dashboard)/dashboard/messages/components/`.
2. **Verify:** components render without errors (check browser console).

### Step 3 — Add source badge + confidence to message rows
1. In the message row rendering, add `<SourceBadge source={msg.source} />` and `<ConfidenceBadge confidence={msg.modelMatchConfidence} />`.
2. **Verify:** imported rows show badges; native rows show "Native".

### Step 4 — Add `ImportMetadata` to message detail
1. In the detail drawer, render `<ImportMetadata message={msg} />` for imported rows.
2. **Verify:** detail shows source session, provider match, imported-at.

### Step 5 — Create `ImportModal` component
1. Create the file in `components/`.
2. **Verify:** paste JSON → import → result summary shows.

### Step 6 — Add "Import" button to Messages page header
1. Add a Button that opens the modal.
2. **Verify:** modal opens, imports, refreshes list.

### Step 7 — Test in browser
1. Import a sample message, confirm it appears with source badge + confidence.
2. Test the source filter.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| Existing UI patterns | Style mismatch | Reuse `cn()`, `Button`, existing badge patterns |
| Import API auth | 401 when key set | Modal shows setup message |
| Large imports | UI blocking | Show progress, async import |
| Unknown models | Confusing UX | Link to mapping UI |

## Verification (commands)

```bash
# Import a sample via API, then check the page
curl -X POST http://localhost:20128/api/messages/import \
  -H 'content-type: application/json' \
  -d '{"source":"hermes","messages":[{"model":"claude-3-5-sonnet-20241022","request":{"messages":[{"role":"user","content":"hi"}]}}]}'
# Then open http://localhost:20128/dashboard/messages — row should show green "hermes" badge
```

## Note to Implementing Agents (READ FIRST)

The code above is a **starting point for review**, not a final implementation. Agents MUST review it against the actual codebase, decide if there is a better way, make those changes happen, verify by running, and update this plan.