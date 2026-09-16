"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/shared/utils/cn";

/**
 * SavedViewsDropdown — named filter presets for the Messages page (plan M6).
 *
 * Backed by /api/saved-views (M4):
 *   GET  → list views
 *   POST → save/update (upsert by name)
 *   DELETE?id= → delete
 *
 * Props:
 *   currentFilters: object of active /api/messages query params
 *   onApply: (filter) => void — apply a saved view's filter
 */
export default function SavedViewsDropdown({ currentFilters, onApply }) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-views");
      if (!res.ok) return;
      const json = await res.json();
      setViews(json.views || []);
    } catch { /* fail-open */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, filter: currentFilters }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `save failed (${res.status})`);
      }
      setName("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`/api/saved-views?id=${id}`, { method: "DELETE" });
      await load();
    } catch { /* fail-open */ }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 items-center gap-1 rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-2 text-xs text-text-main outline-none hover:border-primary/40"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-sm">bookmark</span>
        Saved views
        <span className="material-symbols-outlined text-xs text-text-muted">arrow_drop_down</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-black/10 dark:border-white/10 bg-surface p-2 shadow-lg">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Saved views</div>

          {views.length === 0 && (
            <div className="mb-2 rounded bg-black/[0.02] p-2 text-[11px] text-text-muted dark:bg-white/[0.02]">
              No saved views yet. Set some filters, then save them below.
            </div>
          )}

          <div className="mb-2 flex max-h-40 flex-col gap-0.5 overflow-auto">
            {views.map((v) => (
              <div
                key={v.id}
                className="group flex items-center gap-1 rounded px-1.5 py-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
              >
                <button
                  type="button"
                  onClick={() => { onApply(v.filter); setOpen(false); }}
                  className="min-w-0 flex-1 truncate text-left text-xs text-text-main"
                  title={JSON.stringify(v.filter)}
                >
                  {v.name}
                </button>
                <button
                  type="button"
                  onClick={(e) => remove(v.id, e)}
                  className="text-[10px] text-text-muted opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                  aria-label={`Delete view ${v.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-1 border-t border-black/5 dark:border-white/5 pt-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              placeholder="Save current filters as…"
              className="h-7 min-w-0 flex-1 rounded border border-black/10 dark:border-white/10 bg-transparent px-2 text-[11px] text-text-main outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || !name.trim()}
              className="h-7 shrink-0 rounded bg-primary/10 px-2 text-[11px] font-medium text-primary disabled:opacity-40"
            >
              {saving ? "…" : "Save"}
            </button>
          </div>
          {error && <div className="mt-1 text-[10px] text-red-500">{error}</div>}
        </div>
      )}
    </div>
  );
}