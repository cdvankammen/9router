"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Button from "@/shared/components/Button";
import { cn } from "@/shared/utils/cn";

/**
 * Error Inbox (Messages P2) — server-aggregated fingerprint view.
 *
 * Rows come from GET /api/messages?view=errors, which groups captured errors
 * in SQL by the COARSE Sentry-style fingerprint `provider|model|errorCategory`
 * over the FULL filtered set (unlike BoardView's rich client-side fingerprint
 * over the page window). Error text is display-only.
 *
 * Triage: per-card column assignment persisted in the settings KV as
 * `boardColumns: { [fingerprint]: columnKey }` (MAP_REPLACE — the client owns
 * the full map, PATCHes it wholesale, deletes are honored). Columns default
 * to Open/Acknowledged/Resolved/Dismissed and survive reload.
 *
 * Props:
 *   errors: grouped rows from the API
 *   providerNames: id → display name cache
 *   onSelect: (detailId) => void — opens the shared detail drawer
 *   errorCategory / onErrorCategoryChange: server-side category filter
 *   categoryFacets: [{ value, count }] from facets.errorCategory (status=error scoped)
 *   pagination / onLoadMore: group-list paging (page by number)
 */

const ERROR_COLUMNS = [
  { key: "open", label: "Open", accent: "#ef4444" },
  { key: "acknowledged", label: "Acknowledged", accent: "#f59e0b" },
  { key: "resolved", label: "Resolved", accent: "#22c55e" },
  { key: "dismissed", label: "Dismissed", accent: "#6b7280" },
];

// Category pill colors — mirrors the errorCategory taxonomy from
// open-sse/utils/errorCategorizer.js (rate_limit | auth | billing | timeout |
// overloaded | content_filter | invalid_request | network | unknown).
const CATEGORY_STYLES = {
  rate_limit: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  auth: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  billing: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  timeout: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  overloaded: "bg-red-500/10 text-red-600 dark:text-red-400",
  content_filter: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  invalid_request: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  network: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  unknown: "bg-gray-500/10 text-gray-500 dark:text-gray-400",
};

function fmtWhen(ts) {
  if (!ts) return "—";
  return String(ts).slice(5, 19).replace("T", " ");
}

function fmtSampleError(err) {
  if (err == null) return "";
  const s = typeof err === "string" ? err : (err.message || JSON.stringify(err));
  return s.length > 220 ? `${s.slice(0, 220)}…` : s;
}

export default function InboxView({
  errors = [],
  providerNames,
  onSelect,
  errorCategory = "",
  onErrorCategoryChange,
  categoryFacets = [],
  pagination,
  onLoadMore,
}) {
  // Triage assignments: { [fingerprint]: columnKey }, persisted via settings
  // KV (`boardColumns`). null until the first GET /api/settings resolves.
  const [assignments, setAssignments] = useState(null);
  // Last map confirmed by the server — revert target on a failed PATCH.
  const persistedRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (cancelled || !s) return;
        const map = s.boardColumns || {};
        persistedRef.current = map;
        setAssignments(map);
      })
      .catch(() => { /* fail-open: assignments stay null → everything "open" */ });
    return () => { cancelled = true; };
  }, []);

  const triage = useCallback(async (fingerprint, columnKey) => {
    if (!assignments) return; // settings not loaded yet
    const next = { ...assignments, [fingerprint]: columnKey };
    setAssignments(next); // optimistic
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardColumns: next }),
      });
      if (!res.ok) throw new Error(`settings PATCH ${res.status}`);
      persistedRef.current = next;
    } catch (e) {
      // Fail-open: revert to the last confirmed map (triage is best-effort).
      console.warn("[Inbox] triage save failed, reverting:", e.message);
      setAssignments(persistedRef.current);
    }
  }, [assignments]);

  // Per-fingerprint analysis state from /api/analyze-error (reuses the exact
  // request/response handling of RequestDetailsTab's Analyze button).
  const [analysisByFp, setAnalysisByFp] = useState({}); // fp -> { loading, analysis, error, model }

  const analyze = useCallback(async (g) => {
    const key = g.fingerprint;
    setAnalysisByFp((prev) => ({ ...prev, [key]: { loading: true, analysis: null, error: null, model: null } }));
    try {
      const res = await fetch("/api/analyze-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailId: g.detailId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalysisByFp((prev) => ({ ...prev, [key]: { loading: false, analysis: null, error: data.error || "Analysis failed", model: null } }));
        return;
      }
      setAnalysisByFp((prev) => ({ ...prev, [key]: { loading: false, analysis: data.analysis, error: null, model: data.model } }));
    } catch (err) {
      setAnalysisByFp((prev) => ({ ...prev, [key]: { loading: false, analysis: null, error: err.message || "Analysis failed", model: null } }));
    }
  }, []);

  const dismissAnalysis = useCallback((fp) => {
    setAnalysisByFp((prev) => {
      const next = { ...prev };
      delete next[fp];
      return next;
    });
  }, []);

  // Derive column membership: user assignments win; everything else is "open".
  const byColumn = useMemo(() => {
    const cols = {};
    for (const c of ERROR_COLUMNS) cols[c.key] = [];
    for (const g of errors) {
      const target = (assignments || {})[g.fingerprint] || "open";
      if (!cols[target]) cols[target] = [];
      cols[target].push(g);
    }
    return cols;
  }, [errors, assignments]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar: category filter + group count */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 dark:border-white/5 p-2">
        <select
          value={errorCategory}
          onChange={(e) => onErrorCategoryChange(e.target.value)}
          aria-label="Filter by error category"
          className="h-8 rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-2 text-xs text-text-main outline-none focus:border-primary"
        >
          <option value="">All categories</option>
          {categoryFacets.map((f) => (
            <option key={f.value} value={f.value}>
              {f.value} ({f.count})
            </option>
          ))}
        </select>
        <span className="text-[10px] text-text-muted">
          {errors.length} error group{errors.length === 1 ? "" : "s"}
          {pagination?.totalItems > errors.length ? ` of ${pagination.totalItems}` : ""}
        </span>
        <span className="ml-auto text-[10px] text-text-muted" title="Groups are aggregated in SQL by provider | model | errorCategory (Sentry-style). Error text is display-only.">
          fingerprint: provider · model · category
        </span>
      </div>

      {/* Columns */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-auto p-3">
        {ERROR_COLUMNS.map((col) => (
          <div
            key={col.key}
            className="flex w-72 shrink-0 flex-col rounded-lg border border-black/5 dark:border-white/5"
          >
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 p-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />
                {col.label}
              </span>
              <span className="rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 text-[10px] text-text-muted">
                {byColumn[col.key].length}
              </span>
            </div>
            <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-auto p-2">
              {byColumn[col.key].length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded border border-dashed border-black/10 dark:border-white/10 p-4 text-[10px] text-text-muted">
                  No groups
                </div>
              )}
              {byColumn[col.key].map((g) => {
                const an = analysisByFp[g.fingerprint];
                return (
                  <div
                    key={g.fingerprint}
                    className="rounded-lg border border-black/5 dark:border-white/5 bg-surface p-2 shadow-sm hover:border-primary/40"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium",
                          CATEGORY_STYLES[g.errorCategory] || CATEGORY_STYLES.unknown
                        )}
                      >
                        {g.errorCategory || "unknown"}
                      </span>
                      <span className="text-[10px] text-text-muted">×{g.count}</span>
                    </div>
                    <div
                      className="mb-1 truncate font-mono text-[11px] text-text-main"
                      title={`${g.provider}/${g.model}`}
                    >
                      {providerNames?.[g.provider] || g.provider} / {g.model}
                    </div>
                    {fmtSampleError(g.sampleError) && (
                      <div
                        className="mb-1 line-clamp-2 text-[11px] leading-snug text-text-muted"
                        title={fmtSampleError(g.sampleError)}
                      >
                        {fmtSampleError(g.sampleError)}
                      </div>
                    )}
                    <div className="mb-1 flex flex-wrap gap-x-2 text-[10px] text-text-muted">
                      <span>first {fmtWhen(g.firstTimestamp)}</span>
                      <span>last {fmtWhen(g.lastTimestamp)}</span>
                      <span>${Number(g.cost || 0).toFixed(4)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={(assignments || {})[g.fingerprint] || "open"}
                        onChange={(e) => triage(g.fingerprint, e.target.value)}
                        aria-label={`Triage ${g.fingerprint}`}
                        className="h-6 rounded border border-black/10 dark:border-white/10 bg-transparent px-1 text-[10px] text-text-main outline-none focus:border-primary"
                      >
                        {ERROR_COLUMNS.map((c) => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => onSelect(g.detailId)}>View</Button>
                      <Button size="sm" variant="ghost" onClick={() => analyze(g)}>Analyze</Button>
                    </div>
                    {an && an.loading && (
                      <div className="mt-2 text-[10px] text-text-muted">Analyzing…</div>
                    )}
                    {an && an.error && (
                      <div className="mt-2 rounded bg-red-500/10 p-2 text-[10px] text-red-500">{an.error}</div>
                    )}
                    {an && an.analysis && (
                      <div className="mt-2 rounded border border-black/5 dark:border-white/5 bg-black/[0.02] p-2 dark:bg-white/[0.02]">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-text-muted">
                            Analysis{an.model ? ` (${an.model})` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => dismissAnalysis(g.fingerprint)}
                            className="text-[10px] text-text-muted hover:text-text-main"
                            aria-label="Dismiss analysis"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="whitespace-pre-wrap text-[10px] leading-snug text-text-main">
                          {an.analysis}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {pagination?.hasNext && (
        <div className="flex justify-center border-t border-black/5 dark:border-white/5 p-2">
          <Button size="sm" variant="ghost" onClick={onLoadMore}>
            Load more error groups
          </Button>
        </div>
      )}
    </div>
  );
}
