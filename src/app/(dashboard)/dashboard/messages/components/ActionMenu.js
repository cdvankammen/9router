"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/shared/utils/cn";

/**
 * ActionMenu — per-message actions wired to M5 backend (plan M6).
 *
 * Actions:
 *   copy cURL      — local (buildCurl from page.js)
 *   export         — GET /api/messages/[id]/export
 *   replay         — POST /api/messages/[id]/actions { action: "replay" }
 *   summarize      — POST .../actions { action: "summarize" }
 *   send-to-webhook— POST .../actions { action: "send-to-webhook", url, template? }
 *   add-note       — POST .../actions { action: "add-note", note }
 *   tag            — POST .../actions { action: "tag", tag }
 *   remove-tag     — POST .../actions { action: "remove-tag", tag }
 *   alert-on-match — POST .../actions { action: "alert-on-match", match, url }
 *
 * Props:
 *   message: detail object (has .id, .request, .response, .annotations?)
 *   onCopyCurl: () => void — provided by page.js (uses buildCurl)
 *   onChanged: () => void — refresh detail after mutations (notes/tags)
 */
export default function ActionMenu({ message, onCopyCurl, onChanged }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [tag, setTag] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [matchField, setMatchField] = useState("status");
  const [matchOp, setMatchOp] = useState("eq");
  const [matchValue, setMatchValue] = useState("error");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const run = async (action, params = {}) => {
    setBusy(action);
    setResult(null);
    setError("");
    try {
      const res = await fetch(`/api/messages/${message.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `action failed (${res.status})`);
      setResult(json);
      if (onChanged) onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const exportMessage = async () => {
    setBusy("export");
    setError("");
    try {
      const res = await fetch(`/api/messages/${message.id}/export`);
      if (!res.ok) throw new Error(`export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `message-${message.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setResult({ ok: true, exported: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  const item = (label, onClick, disabled) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-text-main hover:bg-black/[0.03] disabled:opacity-40 dark:hover:bg-white/[0.03]"
    >
      {busy === label ? <span className="inline-block h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" /> : null}
      {label}
    </button>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 items-center gap-1 rounded-lg border border-black/10 px-2 text-xs text-text-main outline-none hover:border-primary/40 dark:border-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-sm">more_vert</span>
        Actions
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-black/10 bg-surface p-2 shadow-lg dark:border-white/10">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">Actions</div>

          {item("Copy cURL", () => { onCopyCurl(); setOpen(false); })}
          {item("Export JSON", exportMessage)}

          <div className="my-1 border-t border-black/5 dark:border-white/5" />

          {item("Replay", () => run("replay"), !!busy)}
          {item("Summarize", () => run("summarize"), !!busy)}

          <div className="my-1 border-t border-black/5 dark:border-white/5" />

          <div className="px-2 py-1">
            <div className="mb-1 text-[10px] text-text-muted">Send to webhook</div>
            <div className="flex gap-1">
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://…"
                className="h-6 min-w-0 flex-1 rounded border border-black/10 bg-transparent px-1.5 text-[11px] outline-none focus:border-primary dark:border-white/10"
              />
              <button
                type="button"
                disabled={busy || !webhookUrl}
                onClick={() => run("send-to-webhook", { url: webhookUrl })}
                className="h-6 shrink-0 rounded bg-primary/10 px-2 text-[11px] font-medium text-primary disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>

          <div className="px-2 py-1">
            <div className="mb-1 text-[10px] text-text-muted">Add note</div>
            <div className="flex gap-1">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="note text"
                className="h-6 min-w-0 flex-1 rounded border border-black/10 bg-transparent px-1.5 text-[11px] outline-none focus:border-primary dark:border-white/10"
              />
              <button
                type="button"
                disabled={busy || !note.trim()}
                onClick={() => { run("add-note", { note }); setNote(""); }}
                className="h-6 shrink-0 rounded bg-primary/10 px-2 text-[11px] font-medium text-primary disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          <div className="px-2 py-1">
            <div className="mb-1 text-[10px] text-text-muted">Tag</div>
            <div className="flex gap-1">
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="tag name"
                className="h-6 min-w-0 flex-1 rounded border border-black/10 bg-transparent px-1.5 text-[11px] outline-none focus:border-primary dark:border-white/10"
              />
              <button
                type="button"
                disabled={busy || !tag.trim()}
                onClick={() => { run("tag", { tag }); setTag(""); }}
                className="h-6 shrink-0 rounded bg-primary/10 px-2 text-[11px] font-medium text-primary disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          <div className="px-2 py-1">
            <div className="mb-1 text-[10px] text-text-muted">Alert on match</div>
            <div className="flex gap-1">
              <select
                value={matchField}
                onChange={(e) => setMatchField(e.target.value)}
                className="h-6 rounded border border-black/10 bg-transparent px-1 text-[11px] outline-none dark:border-white/10"
              >
                <option value="status">status</option>
                <option value="errorCategory">errorCategory</option>
                <option value="model">model</option>
                <option value="provider">provider</option>
              </select>
              <select
                value={matchOp}
                onChange={(e) => setMatchOp(e.target.value)}
                className="h-6 rounded border border-black/10 bg-transparent px-1 text-[11px] outline-none dark:border-white/10"
              >
                <option value="eq">=</option>
                <option value="ne">≠</option>
                <option value="contains">contains</option>
              </select>
              <input
                value={matchValue}
                onChange={(e) => setMatchValue(e.target.value)}
                placeholder="value"
                className="h-6 min-w-0 flex-1 rounded border border-black/10 bg-transparent px-1.5 text-[11px] outline-none focus:border-primary dark:border-white/10"
              />
              <button
                type="button"
                disabled={busy || !webhookUrl}
                onClick={() => run("alert-on-match", { match: { field: matchField, op: matchOp, value: matchValue }, url: webhookUrl })}
                className="h-6 shrink-0 rounded bg-primary/10 px-2 text-[11px] font-medium text-primary disabled:opacity-40"
              >
                Arm
              </button>
            </div>
          </div>

          {result && (
            <div className="mt-1 rounded bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              {result.summary ? `Summary: ${result.summary}` : result.matched !== undefined ? (result.matched ? "Matched — webhook sent" : "No match — skipped") : result.exported ? "Exported" : "Done"}
            </div>
          )}
          {error && <div className="mt-1 rounded bg-red-500/10 px-2 py-1 text-[10px] text-red-500">{error}</div>}
        </div>
      )}
    </div>
  );
}