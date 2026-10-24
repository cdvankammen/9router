# Implementation Plan Import-08 — Messages Page UI Integration — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #hermes-import #ui #messages-page #badges #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (**real Messages page path is `src/app/(dashboard)/dashboard/messages/page.js`** — NOT `src/app/dashboard/messages/page.js`; components dir `src/app/(dashboard)/dashboard/messages/components/` — `TimelineView`, `TraceTreeView`, `BoardView`, `InboxView`, `FacetsSidebar`, `SavedViewsDropdown`, `ActionMenu`, `TruncatedBadge`; shared components from `@/shared/components/`; styling Tailwind + `cn()` from `@/shared/utils/cn`; status badge pattern `bg-{color}-500/10 text-{color}-600 dark:text-{color}-400`; provider names from `@/shared/constants/providers`; API `GET /api/messages` returns `{ messages, conversations, errors, searchMode, pagination }`).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — filter; badges; modal.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-import-08-messages-page-ui.md`, `../research/9router/impl-plan-import-03-import-api.md`, `../research/9router/impl-plan-import-01-db-schema.md`.

## Scope

**In scope:** source filter + badge; match confidence indicator; import metadata section; import modal (upload/paste); unknown models UI.
**Out of scope:** import API (import-03); messages API changes (import-19).

## Milestones

### M1 — Source filter

**Reference code (`src/app/(dashboard)/dashboard/messages/page.js` addition):**

```jsx
// Addition to existing filter bar.
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

**Acceptance criteria:** filter renders; API param wired.

### M2 — Source badge

**Reference code (`src/app/(dashboard)/dashboard/messages/components/SourceBadge.jsx`):**

```jsx
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

**Acceptance criteria:** badge renders; color-coded.

### M3 — Confidence indicator + import metadata

**Reference code (`src/app/(dashboard)/dashboard/messages/components/ConfidenceBadge.jsx` + `ImportMetadata.jsx`):**

```jsx
// ConfidenceBadge.jsx
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

// ImportMetadata.jsx — show import provenance in the message detail drawer.
export function ImportMetadata({ message }) {
  if (!message.source || message.source === "native") return null;
  return (
    <div className="rounded-lg border border-border p-3 space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Imported from</span>
        <span>{message.source}</span>
      </div>
      {message.sourceSessionId && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Source session</span>
          <span className="font-mono text-xs">{message.sourceSessionId}</span>
        </div>
      )}
      {message.modelMatchConfidence !== undefined && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Match confidence</span>
          <ConfidenceBadge confidence={message.modelMatchConfidence} />
        </div>
      )}
    </div>
  );
}
```

**Acceptance criteria:** confidence badge; metadata section.

### M4 — Import modal + tests

**Reference code (`src/app/(dashboard)/dashboard/messages/components/ImportModal.jsx`):**

```jsx
// Upload/paste import modal — POSTs to /api/messages/import.
export function ImportModal({ open, onClose }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState(null);

  async function submit() {
    try {
      const res = await fetch("/api/messages/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "manual", messages: JSON.parse(text) }),
      });
      const body = await res.json();
      setStatus(body.ok ? `Imported ${body.inserted} messages` : body.error);
    } catch (err) {
      setStatus(`Failed: ${err.message}`);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-background p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">Import Messages</h2>
        <textarea className="mt-2 h-40 w-full rounded border border-border p-2 font-mono text-xs" placeholder='[{"model":"claude-3.5-sonnet","request":{...}}]' value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}>Import</Button>
        </div>
        {status && <p className="mt-2 text-sm text-muted-foreground">{status}</p>}
      </div>
    </div>
  );
}
```

**Files touched:** `src/app/(dashboard)/dashboard/messages/page.js` (filter), `src/app/(dashboard)/dashboard/messages/components/SourceBadge.jsx` (new), `src/app/(dashboard)/dashboard/messages/components/ConfidenceBadge.jsx` (new), `src/app/(dashboard)/dashboard/messages/components/ImportMetadata.jsx` (new), `src/app/(dashboard)/dashboard/messages/components/ImportModal.jsx` (new), `tests/unit/import-ui.test.jsx` (new).

**Acceptance criteria:** modal works; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Wrong page path | Broken UI | Verify (dashboard) group |
| Badge styling | Inconsistent UI | Follow StatusBadge |
| API shape | Missing fields | Verify /api/messages |
| Modal errors | Bad imports | Error display |

## Verification

- Unit: SourceBadge, ConfidenceBadge, ImportMetadata, ImportModal
- Manual: filter → badge → modal import
- Regression: `tests/__baseline__/verify-no-regression.mjs`