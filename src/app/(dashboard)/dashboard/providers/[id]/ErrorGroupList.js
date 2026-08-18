"use client";

import { useState } from "react";
import PropTypes from "prop-types";

const CATEGORY_STYLES = {
  auth: "bg-red-500/10 text-red-500",
  rate_limit: "bg-amber-500/10 text-amber-500",
  quota: "bg-amber-500/10 text-amber-500",
  timeout: "bg-orange-500/10 text-orange-500",
  network: "bg-orange-500/10 text-orange-500",
  upstream: "bg-purple-500/10 text-purple-500",
  invalid_request: "bg-blue-500/10 text-blue-500",
};

function categoryStyle(cat) {
  return CATEGORY_STYLES[cat] || "bg-text-muted/10 text-text-muted";
}

function formatWhen(ts) {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleString();
  } catch {
    return "-";
  }
}

function ErrorGroupRow({ group, showModel }) {
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const analyze = async () => {
    if (analyzing || !group.detailId) return;
    setAnalyzing(true);
    setExpanded(true);
    try {
      const res = await fetch("/api/analyze-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailId: group.detailId }),
      });
      const data = await res.json();
      setAnalysis(res.ok ? data.analysis : data.error || "Analysis failed");
    } catch (err) {
      setAnalysis(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${categoryStyle(group.errorCategory)}`}>
          {group.errorCategory || "unknown"}
        </span>
        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
          ×{group.count}
        </span>
        {showModel && (
          <code className="font-mono text-[11px] text-text-muted">{group.model}</code>
        )}
        <span className="ml-auto text-[10px] text-text-muted">{formatWhen(group.lastTimestamp)}</span>
      </div>
      {group.sampleError && (
        <p className="mt-1 line-clamp-2 break-words text-xs text-text-muted">
          {typeof group.sampleError === "string" ? group.sampleError : JSON.stringify(group.sampleError)}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-2">
        <button
          onClick={analyze}
          disabled={analyzing || !group.detailId}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-primary hover:bg-primary/5 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-xs" style={analyzing ? { animation: "spin 1s linear infinite" } : undefined}>
            {analyzing ? "progress_activity" : "auto_awesome"}
          </span>
          {analyzing ? "Analyzing…" : "Analyze"}
        </button>
        {analysis && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] text-text-muted hover:text-text"
          >
            {expanded ? "Hide" : "Show"} analysis
          </button>
        )}
      </div>
      {expanded && analysis && (
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-sidebar/60 p-2 text-[11px] text-text-muted">
          {analysis}
        </pre>
      )}
    </div>
  );
}

ErrorGroupRow.propTypes = {
  group: PropTypes.object.isRequired,
  showModel: PropTypes.bool,
};

/**
 * Compact list of error groups (from getErrorSummary / /api/messages?view=errors).
 * Reused by the provider-level error panel and the per-model expander. Each row
 * can run an on-demand AI analysis via /api/analyze-error using its detailId.
 */
export default function ErrorGroupList({ groups, showModel = false, emptyMessage = "No errors recorded." }) {
  if (!groups || groups.length === 0) {
    return <p className="text-xs text-text-muted">{emptyMessage}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {groups.map((g) => (
        <ErrorGroupRow key={g.fingerprint || `${g.model}-${g.errorCategory}`} group={g} showModel={showModel} />
      ))}
    </div>
  );
}

ErrorGroupList.propTypes = {
  groups: PropTypes.array,
  showModel: PropTypes.bool,
  emptyMessage: PropTypes.string,
};
