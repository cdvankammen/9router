"use client";

import { useState, useMemo } from "react";
import { cn } from "@/shared/utils/cn";

/**
 * Board / Kanban triage view — Messages 4.
 *
 * Design philosophy: issue-inbox board (Sentry, Linear, Jira). Cards are
 * grouped by fingerprint (provider + model + errorCategory + normalized
 * error). Columns: New / Investigating / Resolved / Snoozed. Cards can be
 * dragged between columns (local state; persistence is a later P2 item).
 *
 * Props:
 *   messages: captured request records (full filtered set)
 *   providerNames
 *   onSelect: (message) => void — opens the shared detail drawer
 */

const COLUMNS = [
  { key: "new", label: "New", accent: "#ef4444" },
  { key: "investigating", label: "Investigating", accent: "#f59e0b" },
  { key: "resolved", label: "Resolved", accent: "#22c55e" },
  { key: "snoozed", label: "Snoozed", accent: "#6b7280" },
];

// Stable-ish fingerprint: sha-ish hash of provider+model+errorCategory+error
function fingerprint(m) {
  const err = m.response?.error
    ? String(m.response.error).slice(0, 120)
    : m.status === "error" ? "error" : "";
  const raw = `${m.provider || ""}|${m.model || ""}|${m.errorCategory || ""}|${err}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function normalizeError(m) {
  const err = m.response?.error;
  if (!err) return m.errorCategory || m.status || "unknown";
  if (typeof err === "string") return err.slice(0, 100);
  return err.message || JSON.stringify(err).slice(0, 100);
}

export default function BoardView({ messages = [], providerNames, onSelect }) {
  // Local column assignment per fingerprint (no persistence yet — P2)
  const [columns, setColumns] = useState(() => {
    const init = {};
    for (const c of COLUMNS) init[c.key] = [];
    return init;
  });

  const grouped = useMemo(() => {
    const map = new Map();
    for (const m of messages) {
      const fp = fingerprint(m);
      if (!map.has(fp)) map.set(fp, []);
      map.get(fp).push(m);
    }
    return [...map.entries()].map(([fp, msgs]) => ({
      fp,
      count: msgs.length,
      latest: msgs[0],
      error: normalizeError(msgs[0]),
      provider: msgs[0].provider,
      model: msgs[0].model,
      errorCategory: msgs[0].errorCategory,
    }));
  }, [messages]);

  // Assign unassigned groups to "new" on first render (only once)
  const [seeded, setSeeded] = useState(false);
  if (!seeded && grouped.length > 0) {
    setSeeded(true);
    const next = { ...columns };
    for (const g of grouped) {
      if (!Object.values(next).flat().some((x) => x.fp === g.fp)) {
        next.new.push(g);
      }
    }
    setColumns(next);
  }

  const move = (fp, fromKey, toKey) => {
    if (fromKey === toKey) return;
    const group = columns[fromKey].find((x) => x.fp === fp);
    if (!group) return;
    setColumns({
      ...columns,
      [fromKey]: columns[fromKey].filter((x) => x.fp !== fp),
      [toKey]: [...columns[toKey], group],
    });
  };

  const allGrouped = Object.values(columns).flat();

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-auto p-3">
      {COLUMNS.map((col) => (
        <div key={col.key} className="flex w-64 shrink-0 flex-col rounded-lg border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 p-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: col.accent }} />
              {col.label}
            </span>
            <span className="rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 text-[10px] text-text-muted">
              {columns[col.key].length}
            </span>
          </div>
          <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-auto p-2">
            {columns[col.key].length === 0 && (
              <div className="flex flex-1 items-center justify-center rounded border border-dashed border-black/10 dark:border-white/10 p-4 text-[10px] text-text-muted">
                Drop cards here
              </div>
            )}
            {columns[col.key].map((g) => (
              <div
                key={g.fp}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("text/fp", g.fp); e.dataTransfer.setData("text/from", col.key); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fp = e.dataTransfer.getData("text/fp");
                  const from = e.dataTransfer.getData("text/from");
                  if (fp) move(fp, from, col.key);
                }}
                className="group cursor-grab rounded-lg border border-black/5 dark:border-white/5 bg-surface p-2 shadow-sm hover:border-primary/40 active:cursor-grabbing"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      g.errorCategory === "rate_limit" ? "bg-amber-500/10 text-amber-600" :
                      g.errorCategory === "network" ? "bg-sky-500/10 text-sky-600" :
                      "bg-red-500/10 text-red-500"
                    )}
                  >
                    {g.errorCategory || "error"}
                  </span>
                  <span className="text-[10px] text-text-muted">×{g.count}</span>
                </div>
                <div className="mb-1 line-clamp-2 text-[11px] leading-snug text-text-main">
                  {g.error}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[10px] text-text-muted">
                    {providerNames?.[g.provider] || g.provider}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelect(g.latest)}
                    className="text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
