"use client";

import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import Card from "@/shared/components/Card";
import OverviewCards from "../../usage/components/OverviewCards";

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

function formatWhen(ts) {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return "-";
  }
}

/**
 * Recent/aggregate usage for a single provider, reusing the Usage-tab's
 * OverviewCards. Reads /api/usage/stats (global rollup) and slices out this
 * provider's row from `byProvider` + its models from `byModel`. Numbers are
 * accurate for OpenAI-compatible providers after the include_usage fix.
 */
export default function ProviderUsageCard({ providerId }) {
  const [period, setPeriod] = useState("7d");
  const [stats, setStats] = useState(null);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/usage/stats?period=${period}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`stats ${res.status}`);
      const data = await res.json();

      const p = (data.byProvider || {})[providerId] || null;
      setStats(
        p
          ? {
              totalRequests: p.requests,
              totalPromptTokens: p.promptTokens,
              totalCompletionTokens: p.completionTokens,
              totalCachedTokens: p.cachedTokens,
              totalCost: p.cost,
            }
          : {
              totalRequests: 0,
              totalPromptTokens: 0,
              totalCompletionTokens: 0,
              totalCachedTokens: 0,
              totalCost: 0,
            },
      );

      // byModel keys are "<rawModel> (<providerId>)". Slice out this provider.
      const suffix = `(${providerId})`;
      const rows = Object.entries(data.byModel || {})
        .filter(([key]) => key.endsWith(suffix))
        .map(([, v]) => v)
        .sort((a, b) => (b.requests || 0) - (a.requests || 0));
      setModels(rows);
    } catch {
      setError(true);
      setStats(null);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [providerId, period]);

  useEffect(() => {
    load();
  }, [load]);

  const hasUsage = stats && stats.totalRequests > 0;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Usage &amp; Cost</h2>
        <div className="flex items-center gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                period === opt.value
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:bg-sidebar"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={load}
            disabled={loading}
            className="ml-1 rounded-md p-1 text-text-muted hover:bg-sidebar hover:text-primary disabled:opacity-50"
            title="Refresh"
          >
            <span className="material-symbols-outlined text-sm" style={loading ? { animation: "spin 1s linear infinite" } : undefined}>
              {loading ? "progress_activity" : "refresh"}
            </span>
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-text-muted">Unable to load usage data.</p>
      ) : !hasUsage && !loading ? (
        <p className="text-sm text-text-muted">
          No usage recorded for this provider in the selected period.
        </p>
      ) : (
        <>
          {stats && <OverviewCards stats={stats} />}

          {models.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    <th className="py-2 pr-3 font-semibold">Model</th>
                    <th className="py-2 px-3 text-right font-semibold">Requests</th>
                    <th className="py-2 px-3 text-right font-semibold">Input</th>
                    <th className="py-2 px-3 text-right font-semibold">Output</th>
                    <th className="py-2 px-3 text-right font-semibold">Cost</th>
                    <th className="py-2 pl-3 text-right font-semibold">Last used</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.rawModel} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-3">
                        <code className="font-mono text-[11px] text-text-muted">{m.rawModel}</code>
                      </td>
                      <td className="py-2 px-3 text-right">{fmt(m.requests)}</td>
                      <td className="py-2 px-3 text-right text-primary">{fmt(m.promptTokens)}</td>
                      <td className="py-2 px-3 text-right text-success">{fmt(m.completionTokens)}</td>
                      <td className="py-2 px-3 text-right text-warning">~{fmtCost(m.cost)}</td>
                      <td className="py-2 pl-3 text-right text-text-muted">{formatWhen(m.lastUsed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

ProviderUsageCard.propTypes = {
  providerId: PropTypes.string.isRequired,
};
