"use client";

import PropTypes from "prop-types";
import Link from "next/link";
import Card from "@/shared/components/Card";
import ErrorGroupList from "./ErrorGroupList";

/**
 * Provider-level error/log panel. Presentational: the parent page owns the
 * fetch of /api/messages?view=errors&provider=<id> (so the same data also feeds
 * the per-model chips) and passes the grouped errors down.
 *
 * Two error sources are shown:
 *  - Connection health (System A): the same lastError/lastErrorAt/testStatus
 *    that drives the red chip on the providers list card.
 *  - Request error groups (System B): durable requestDetails rows grouped by
 *    provider|model|errorCategory.
 */
function ConnectionHealthList({ connections }) {
  const failing = (connections || []).filter(
    (c) => c.isActive !== false && (c.lastError || c.testStatus === "error" || c.errorCode),
  );
  if (failing.length === 0) {
    return <p className="text-xs text-text-muted">No connection health errors.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {failing.map((c) => (
        <div key={c.id} className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-500">
              {c.testStatus === "error" ? "error" : c.errorCode || "error"}
            </span>
            <span className="text-xs font-medium text-text-main">{c.name || c.email || c.id}</span>
            {c.lastErrorAt && (
              <span className="ml-auto text-[10px] text-text-muted">
                {new Date(c.lastErrorAt).toLocaleString()}
              </span>
            )}
          </div>
          {c.lastError && (
            <p className="mt-1 break-words text-xs text-red-500/90">{c.lastError}</p>
          )}
        </div>
      ))}
    </div>
  );
}

ConnectionHealthList.propTypes = {
  connections: PropTypes.array,
};

export default function ProviderErrorPanel({ providerId, errors, loading, onRefresh, connections }) {
  const total = (errors || []).reduce((sum, g) => sum + (g.count || 0), 0);
  const connectionErrors = (connections || []).filter(
    (c) => c.isActive !== false && (c.lastError || c.testStatus === "error" || c.errorCode),
  ).length;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Errors &amp; Logs</h2>
          {connectionErrors > 0 && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500" title="Connection health errors">
              {connectionErrors} conn
            </span>
          )}
          {total > 0 && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
              {total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/dashboard/messages?view=errors&provider=${encodeURIComponent(providerId)}`}
            className="rounded-md px-2 py-1 text-xs text-text-muted hover:bg-sidebar hover:text-primary"
          >
            Open in Messages
          </Link>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-md p-1 text-text-muted hover:bg-sidebar hover:text-primary disabled:opacity-50"
            title="Refresh"
          >
            <span className="material-symbols-outlined text-sm" style={loading ? { animation: "spin 1s linear infinite" } : undefined}>
              {loading ? "progress_activity" : "refresh"}
            </span>
          </button>
        </div>
      </div>

      {/* Connection health (System A) — the same errors shown on the providers card chip */}
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-text-main">Connection Health</h3>
        <ConnectionHealthList connections={connections} />
      </div>

      {/* Request error groups (System B) */}
      <h3 className="mb-2 text-sm font-semibold text-text-main">Request Errors</h3>
      <ErrorGroupList
        groups={errors}
        showModel
        emptyMessage="No request errors recorded for this provider."
      />
    </Card>
  );
}

ProviderErrorPanel.propTypes = {
  providerId: PropTypes.string.isRequired,
  errors: PropTypes.array,
  loading: PropTypes.bool,
  onRefresh: PropTypes.func,
  connections: PropTypes.array,
};
