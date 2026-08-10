"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/shared/utils/cn";

/**
 * Timeline / Waterfall view — Messages 2.
 *
 * Design philosophy: trace-style timeline (CloudWatch / New Relic / GitHub
 * Actions job view). Top: request-volume histogram (last 24h, errors
 * highlighted). Below: each request as a waterfall row with ttft + total
 * latency segments, status color-coded. Click a row → detail.
 *
 * Props:
 *   histogram: [{ label, count, errors }]
 *   messages:  captured request records (the page window)
 *   providerNames: cache for resolving provider ids
 *   onSelect: (message) => void
 */

const STATUS_COLORS = {
  done: "#22c55e",
  success: "#22c55e",
  error: "#ef4444",
  partial: "#f59e0b",
  cancelled: "#6b7280",
  aborted: "#6b7280",
  pending: "#3b82f6",
};

function statusColor(status) {
  return STATUS_COLORS[status] || "#6b7280";
}

// providerNames is a mix of id→display-name strings (provider nodes) and
// id→provider-config objects (AI_PROVIDERS). Never render the object as a
// React child — always reduce to a string.
function resolveProviderName(providerId, providerNames) {
  if (!providerId) return providerId;
  if (!providerNames) return providerId;
  const cached = providerNames[providerId];
  if (typeof cached === "string") return cached;
  if (cached?.name) return cached.name;
  return providerId;
}

// Compute waterfall metrics: ttft (time-to-first-token) and total latency.
// If latency is missing, fall back to 0s bars with a "—" marker.
function latencyMetrics(m) {
  const lat = m.latency || {};
  const ttft = typeof lat.ttft === "number" ? lat.ttft : 0;
  const total = typeof lat.total === "number" ? lat.total : null;
  return { ttft, total };
}

// Find the max total latency for scale normalization.
function maxTotal(messages) {
  let max = 0;
  for (const m of messages) {
    const { total } = latencyMetrics(m);
    if (total && total > max) max = total;
  }
  return max || 1;
}

export default function TimelineView({ histogram = [], messages = [], providerNames, onSelect }) {
  const max = useMemo(() => maxTotal(messages), [messages]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
      {/* Volume histogram (last 24h) */}
      {histogram.length > 0 && (
        <div className="rounded-lg border border-black/5 dark:border-white/5 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">Request volume (last 24h)</span>
            <span className="text-[10px] text-text-muted">red = errors</span>
          </div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={3} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: 8 }}
                  formatter={(v, name, props) => {
                    const e = props?.payload?.errors || 0;
                    return [`${v} req${e ? ` · ${e} err` : ""}`, ""];
                  }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {histogram.map((b, i) => (
                    <Cell key={i} fill={b.errors > 0 ? "#ef4444" : "#e56a4a"} fillOpacity={b.count === 0 ? 0.15 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Waterfall rows */}
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
          No messages to display.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-black/5 dark:border-white/5">
                <th className="p-2 text-left text-xs font-semibold text-text-muted w-36">Time</th>
                <th className="p-2 text-left text-xs font-semibold text-text-muted w-44">Model</th>
                <th className="p-2 text-left text-xs font-semibold text-text-muted w-16">Status</th>
                <th className="p-2 text-left text-xs font-semibold text-text-muted">Timeline</th>
                <th className="p-2 text-right text-xs font-semibold text-text-muted w-24">Latency</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m, i) => {
                const { ttft, total } = latencyMetrics(m);
                const color = statusColor(m.status);
                const ttftPct = ttft ? (ttft / max) * 100 : 0;
                // Body segment only when there is real body latency after ttft.
                const bodyMs = total && ttft < total ? total - ttft : 0;
                const bodyPct = bodyMs ? (bodyMs / max) * 100 : 0;
                return (
                  <tr
                    key={m.id || m._id || i}
                    onClick={() => onSelect(m)}
                    className="cursor-pointer border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  >
                    <td className="whitespace-nowrap p-2 font-mono text-[11px] text-text-muted">
                      {String(m.timestamp || "").slice(11, 19)}
                    </td>
                    <td className="p-2">
                      <div className="truncate font-mono text-xs text-text-main">{m.model || "?"}</div>
                      <div className="truncate text-[10px] text-text-muted">
                        {resolveProviderName(m.provider, providerNames)}
                      </div>
                    </td>
                    <td className="p-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                        <span className="text-[10px] text-text-muted">{m.status}</span>
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex h-5 w-full min-w-[180px] items-center">
                        {/* ttft segment */}
                        {ttft > 0 && (
                          <div
                            className="h-3 rounded-l bg-blue-500/70"
                            style={{ width: `${Math.max(ttftPct, 2)}%` }}
                            title={`ttft ${ttft}ms`}
                          />
                        )}
                        {/* body segment — only when there is real body latency */}
                        {bodyMs > 0 && (
                          <div
                            className={cn("h-3", ttft > 0 ? "" : "rounded", "opacity-80")}
                            style={{ width: `${Math.max(bodyPct, 2)}%`, background: color }}
                            title={`body ${bodyMs}ms (total ${total}ms)`}
                          />
                        )}
                        {!total && <span className="text-[10px] text-text-muted">—</span>}
                      </div>
                    </td>
                    <td className="p-2 text-right font-mono text-[11px] text-text-muted">
                      {total ? `${total}ms` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
