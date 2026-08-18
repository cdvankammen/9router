"use client";

import PropTypes from "prop-types";
import Link from "next/link";
import Card from "@/shared/components/Card";
import ErrorGroupList from "./ErrorGroupList";

/**
 * Provider-level error/log panel. Presentational: the parent page owns the
 * fetch of /api/messages?view=errors&provider=<id> (so the same data also feeds
 * the per-model chips) and passes the grouped errors down.
 */
export default function ProviderErrorPanel({ providerId, errors, loading, onRefresh }) {
  const total = (errors || []).reduce((sum, g) => sum + (g.count || 0), 0);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Errors &amp; Logs</h2>
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

      <ErrorGroupList
        groups={errors}
        showModel
        emptyMessage="No errors recorded for this provider."
      />
    </Card>
  );
}

ProviderErrorPanel.propTypes = {
  providerId: PropTypes.string.isRequired,
  errors: PropTypes.array,
  loading: PropTypes.bool,
  onRefresh: PropTypes.func,
};
