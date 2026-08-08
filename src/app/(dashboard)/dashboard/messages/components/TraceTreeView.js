"use client";

import { useState } from "react";
import { cn } from "@/shared/utils/cn";

/**
 * Trace Tree view — Messages 3.
 *
 * Design philosophy: APM/distributed-trace tree (Claude Code trace, Sentry
 * breadcrumbs). Left: conversation list. Middle: the request chain for the
 * selected conversation (each node = one request, parent = prior request in
 * same session). Right: detail for the selected request.
 *
 * Props:
 *   conversations: [{ conversationId, messageCount, tokens, messages }]
 *   providerNames
 *   onSelect: (message) => void  — opens the shared detail drawer
 */

function statusDot(status) {
  const colors = {
    done: "bg-green-500",
    success: "bg-green-500",
    error: "bg-red-500",
    partial: "bg-amber-500",
    cancelled: "bg-gray-500",
    aborted: "bg-gray-500",
  };
  return colors[status] || "bg-gray-500";
}

export default function TraceTreeView({ conversations = [], providerNames, onSelect }) {
  const [selectedConv, setSelectedConv] = useState(null);
  const [selectedMsgId, setSelectedMsgId] = useState(null);

  const conv = conversations.find((c) => c.conversationId === selectedConv) || null;

  return (
    <div className="flex min-h-0 flex-1 gap-3 p-3">
      {/* Left: conversation list */}
      <div className="w-52 shrink-0 overflow-auto rounded-lg border border-black/5 dark:border-white/5">
        <div className="border-b border-black/5 dark:border-white/5 p-2 text-xs font-semibold text-text-muted">
          Conversations
        </div>
        {conversations.length === 0 && (
          <div className="p-3 text-center text-[11px] text-text-muted">None</div>
        )}
        {conversations.map((c) => (
          <button
            key={c.conversationId}
            type="button"
            onClick={() => { setSelectedConv(c.conversationId); setSelectedMsgId(null); }}
            className={cn(
              "flex w-full flex-col gap-0.5 border-b border-black/5 dark:border-white/5 p-2 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02]",
              selectedConv === c.conversationId && "bg-primary/5"
            )}
          >
            <code className="truncate font-mono text-[11px]">{c.conversationId}</code>
            <span className="text-[10px] text-text-muted">
              {c.messageCount} msg · {c.tokens.prompt + c.tokens.completion} tok
            </span>
          </button>
        ))}
      </div>

      {/* Middle: request chain for selected conversation */}
      <div className="w-72 shrink-0 overflow-auto rounded-lg border border-black/5 dark:border-white/5">
        <div className="border-b border-black/5 dark:border-white/5 p-2 text-xs font-semibold text-text-muted">
          {conv ? "Request chain" : "Select a conversation"}
        </div>
        {conv && (
          <div className="p-2">
            {conv.messages.map((m, i) => (
              <div key={m.id || m._id || i} className="relative flex items-start gap-2 pb-3 pl-4">
                {/* vertical connector */}
                {i < conv.messages.length - 1 && (
                  <span className="absolute left-[5px] top-3 h-full w-px bg-black/10 dark:bg-white/10" />
                )}
                <span className={cn("relative mt-1.5 h-2 w-2 shrink-0 rounded-full", statusDot(m.status))} />
                <button
                  type="button"
                  onClick={() => { setSelectedMsgId(m.id || m._id); onSelect(m); }}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg p-1.5 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02]",
                    selectedMsgId === (m.id || m._id) && "bg-primary/5"
                  )}
                >
                  <span className="truncate font-mono text-[11px] text-text-main">
                    {String(m.timestamp || "").slice(11, 19)} · {m.model || "?"}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {m.status}{m.latency?.total ? ` · ${m.latency.total}ms` : ""}
                  </span>
                  {m.errorCategory && (
                    <span className="text-[10px] text-red-500/80">{m.errorCategory}</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: hint (detail opens in the shared drawer) */}
      <div className="flex min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed border-black/10 dark:border-white/10">
        <p className="text-center text-xs text-text-muted">
          Click a request in the chain to open its full detail (drawer with
          Pretty JSON / Raw / Headers / cURL / Markdown).
        </p>
      </div>
    </div>
  );
}
