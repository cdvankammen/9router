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

function formatConnectionIds(ids) {
  if (!ids || ids.length === 0) return null;
  if (ids.length <= 2) return ids.join(", ");
  return `${ids.slice(0, 2).join(", ")} +${ids.length - 2} more`;
}

function ErrorGroupRow({ group, showModel }) {
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [drillDownRecords, setDrillDownRecords] = useState([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

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

  const loadDrillDown = async () => {
    if (showDrillDown) {
      setShowDrillDown(false);
      return;
    }
    if (drillDownRecords.length > 0) {
      setShowDrillDown(true);
      return;
    }
    setDrillDownLoading(true);
    setShowDrillDown(true);
    try {
      // Fetch the individual requestDetails rows for this group. The flat
      // list (no view=errors) returns one record per failed request — each
      // entry is the full requestDetails.data blob with connectionId,
      // timestamp, latency, response.error, etc. COALESCE'd 'unknown' values
      // from the group cannot be used as SQL filters (NULL != 'unknown'),
      // so skip those params.
      const params = new URLSearchParams({
        status: "error",
        pageSize: "20",
      });
      if (group.provider && group.provider !== "unknown") params.set("provider", group.provider);
      if (group.model && group.model !== "unknown") params.set("model", group.model);
      if (group.errorCategory && group.errorCategory !== "unknown") params.set("errorCategory", group.errorCategory);
      const res = await fetch(`/api/messages?${params}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.messages)) {
        setDrillDownRecords(data.messages);
      }
    } catch (err) {
      console.error("Failed to load drill-down:", err);
    } finally {
      setDrillDownLoading(false);
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
        {group.connectionIds && group.connectionIds.length > 0 && (
          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-500" title={`Connections: ${group.connectionIds.join(", ")}`}>
            {formatConnectionIds(group.connectionIds)}
          </span>
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
        <button
          onClick={loadDrillDown}
          disabled={drillDownLoading}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-text-muted hover:bg-sidebar hover:text-primary disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-xs" style={drillDownLoading ? { animation: "spin 1s linear infinite" } : undefined}>
            {drillDownLoading ? "progress_activity" : "expand_more"}
          </span>
          {drillDownLoading ? "Loading…" : showDrillDown ? "Hide Details" : "View Details"}
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
      {showDrillDown && (
        <div className="mt-2 rounded border border-border/40 bg-sidebar/30 p-2">
          {drillDownRecords.length === 0 ? (
            <p className="text-[11px] text-text-muted">No detailed records available.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {drillDownRecords.map((record, idx) => (
                <div key={record.id || idx} className="rounded border border-border/30 bg-background/50 p-2">
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span className="font-mono">{record.connectionId || "unknown"}</span>
                    <span>·</span>
                    <span>{formatWhen(record.timestamp)}</span>
                    {record.latency?.total && (
                      <>
                        <span>·</span>
                        <span>{Math.round(record.latency.total)}ms</span>
                      </>
                    )}
                  </div>
                  {record.response?.error && (
                    <p className="mt-1 break-words text-[11px] text-red-500/90">
                      {typeof record.response.error === "string"
                        ? record.response.error
                        : JSON.stringify(record.response.error)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
