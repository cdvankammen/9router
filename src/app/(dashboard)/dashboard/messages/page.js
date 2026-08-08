"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Card from "@/shared/components/Card";
import Button from "@/shared/components/Button";
import Drawer from "@/shared/components/Drawer";
import Pagination from "@/shared/components/Pagination";
import { cn } from "@/shared/utils/cn";
import { AI_PROVIDERS, getProviderByAlias } from "@/shared/constants/providers";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import TimelineView from "./components/TimelineView";
import TraceTreeView from "./components/TraceTreeView";
import BoardView from "./components/BoardView";
import { prettyJson, buildCurl, extractText } from "@/shared/messageFormats";

// ── Provider name resolution (mirrors RequestDetailsTab) ────────────────────
let providerNameCache = null;
let providerNodesCache = null;

async function fetchProviderNames() {
  if (providerNameCache && providerNodesCache) return { providerNameCache, providerNodesCache };
  const nodesRes = await fetch("/api/provider-nodes");
  const nodesData = await nodesRes.json();
  const nodes = nodesData.nodes || [];
  providerNodesCache = {};
  for (const node of nodes) providerNodesCache[node.id] = node.name;
  providerNameCache = { ...AI_PROVIDERS, ...providerNodesCache };
  return { providerNameCache, providerNodesCache };
}

function getProviderName(providerId, cache) {
  if (!providerId) return providerId;
  if (!cache) return providerId;
  const cached = cache[providerId];
  if (typeof cached === "string") return cached;
  if (cached?.name) return cached.name;
  const cfg = getProviderByAlias(providerId) || AI_PROVIDERS[providerId];
  return cfg?.name || providerId;
}

// ── Status badge colors ─────────────────────────────────────────────────────
const STATUS_STYLES = {
  done: "bg-green-500/10 text-green-600 dark:text-green-400",
  success: "bg-green-500/10 text-green-600 dark:text-green-400",
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
  partial: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  cancelled: "bg-gray-500/10 text-gray-500 dark:text-gray-400",
  aborted: "bg-gray-500/10 text-gray-500 dark:text-gray-400",
  pending: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  streaming: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

function StatusBadge({ status, category }) {
  const style = STATUS_STYLES[status] || "bg-gray-500/10 text-gray-500 dark:text-gray-400";
  return (
    <span
      className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium", style)}
      title={category ? `category: ${category}` : undefined}
    >
      {status}
    </span>
  );
}

function fmtTokens(n) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function fmtCost(n) {
  if (n == null || isNaN(n)) return "—";
  if (n === 0) return "$0.00";
  return "$" + n.toFixed(4);
}

function fmtLatency(latency) {
  if (!latency) return "—";
  const total = latency.total ?? latency.totalMs;
  if (total == null) return "—";
  return total + "ms";
}

// ── Format tab content builders ─────────────────────────────────────────────
// prettyJson / buildCurl / extractText come from the shared messageFormats
// module (also used by the export API route) so they can't drift.
// buildMarkdown stays local — the page renders a richer transcript than the
// export route (role-styled request + provider payload sections).


function buildMarkdown(detail) {
  const out = [];
  out.push(`## ${detail.timestamp} — ${detail.provider}/${detail.model} [${detail.status}]`);
  out.push("");
  if (detail.conversationId) out.push(`- **Conversation:** \`${detail.conversationId}\``);
  if (detail.connectionId) out.push(`- **Account:** \`${detail.connectionId}\``);
  if (detail.errorCategory) out.push(`- **Category:** \`${detail.errorCategory}\``);
  const lat = detail.latency;
  if (lat) out.push(`- **Latency:** ttft=${lat.ttft ?? "?"}ms total=${lat.total ?? "?"}ms`);
  const tok = detail.tokens;
  if (tok) out.push(`- **Tokens:** in=${tok.prompt_tokens ?? tok.input_tokens ?? "?"} out=${tok.completion_tokens ?? tok.output_tokens ?? "?"}`);
  out.push("");

  // Request messages (what the client sent)
  const reqMsgs = detail.request?.messages || detail.request?.input || [];
  if (reqMsgs.length) {
    out.push("### Request");
    out.push("");
    for (const msg of reqMsgs) {
      const role = msg.role || "unknown";
      const text = extractText(msg.content);
      out.push(`**${role}:** ${text}`);
      out.push("");
    }
  }

  // Provider payload (what was actually sent upstream)
  const provReq = detail.providerRequest;
  if (provReq && Object.keys(provReq).length) {
    out.push("### Provider Request (sent upstream)");
    out.push("");
    out.push("```json");
    out.push(JSON.stringify(provReq, null, 2));
    out.push("```");
    out.push("");
  }

  // Response content
  const content = detail.response?.content || detail.providerResponse?.choices?.[0]?.message?.content;
  if (content) {
    out.push("### Response");
    out.push("");
    out.push(content);
    out.push("");
  }

  // Thinking blocks
  if (detail.response?.thinking) {
    out.push("### Thinking");
    out.push("");
    out.push(detail.response.thinking);
    out.push("");
  }

  // Error
  const err = detail.response?.error;
  if (err) {
    out.push("### Error");
    out.push("");
    out.push(typeof err === "string" ? err : JSON.stringify(err, null, 2));
    out.push("");
  }
  return out.join("\n");
}

function FormatTabs({ detail, onCopy }) {
  const [tab, setTab] = useState("pretty");
  const [wrap, setWrap] = useState(true); // true = wrap lines; false = horizontal scroll
  const tabs = [
    { key: "pretty", label: "Pretty JSON" },
    { key: "raw", label: "Raw" },
    { key: "headers", label: "Headers" },
    { key: "curl", label: "cURL" },
    { key: "markdown", label: "Markdown" },
  ];

  const content = useMemo(() => {
    switch (tab) {
      case "pretty": return prettyJson(detail);
      case "raw": {
        // Raw = the exact provider request/response payload (wire fidelity)
        const provReq = detail.providerRequest || {};
        const provResp = detail.providerResponse || {};
        return [
          "// Provider request (what was sent upstream):",
          JSON.stringify(provReq, null, 2),
          "",
          "// Provider response (what came back):",
          JSON.stringify(provResp, null, 2),
        ].join("\n");
      }
      case "headers": {
        // Headers are sanitized at capture time; explain + show what we know.
        const known = {};
        if (detail.provider) known["x-provider"] = detail.provider;
        if (detail.model) known["x-model"] = detail.model;
        if (detail.connectionId) known["x-account"] = detail.connectionId;
        if (detail.conversationId) known["x-conversation-id"] = detail.conversationId;
        const lines = [
          "// Headers are stripped at capture time for privacy (authorization,",
          "// x-api-key, cookies are never stored). The following is what we know:",
        ];
        for (const [k, v] of Object.entries(known)) {
          lines.push(`${k}: ${v}`);
        }
        lines.push("");
        lines.push("// To capture request/response headers, enable the header");
        lines.push("// capture option (P3 enrichment — planned).");
        return lines.join("\n");
      }
      case "curl": return buildCurl(detail);
      case "markdown": return buildMarkdown(detail);
      default: return prettyJson(detail);
    }
  }, [tab, detail]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/5">
        <div className="flex flex-wrap gap-1 p-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                tab === t.key ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1 pr-2">
          <button
            type="button"
            onClick={() => setWrap(!wrap)}
            className={cn(
              "rounded-lg px-2 py-1 text-[10px] font-medium transition-colors",
              wrap ? "text-text-muted hover:bg-black/5 dark:hover:bg-white/5" : "bg-primary/10 text-primary"
            )}
            title={wrap ? "Lines wrap — click for horizontal scroll" : "No wrap — click for line wrap"}
          >
            {wrap ? "Wrap" : "No wrap"}
          </button>
          <Button size="sm" variant="ghost" onClick={() => onCopy(content)}>Copy</Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <pre
          className={cn(
            "h-full min-h-0 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-text-main",
            wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
          )}
        >
          {content}
        </pre>
      </div>
    </div>
  );
}

// ── Detail drawer ───────────────────────────────────────────────────────────
function MessageDetailDrawer({ message, onClose }) {
  const { copyToClipboard } = useCopyToClipboard();
  if (!message) return null;

  return (
    <Drawer isOpen={!!message} onClose={onClose} title="Message Detail" width="xl">
      <div className="flex h-full min-h-0 flex-col p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={message.status} category={message.errorCategory} />
          {message.errorCategory && (
            <span className="rounded bg-black/5 dark:bg-white/5 px-2 py-0.5 text-xs font-medium text-text-muted">
              {message.errorCategory}
            </span>
          )}
          <span className="font-mono text-sm text-text-main">{message.provider}/{message.model}</span>
          <span className="ml-auto text-xs text-text-muted">{message.timestamp}</span>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <InfoCell label="Status" value={message.status} />
          <InfoCell label="Latency" value={fmtLatency(message.latency)} />
          <InfoCell label="Tokens" value={`${fmtTokens(message.tokens?.prompt_tokens ?? message.tokens?.input_tokens)} / ${fmtTokens(message.tokens?.completion_tokens ?? message.tokens?.output_tokens)}`} />
          <InfoCell label="Cost" value={fmtCost(message.cost)} />
        </div>

        {message.conversationId && (
          <div className="mb-3 rounded-lg border border-black/5 dark:border-white/5 p-2">
            <div className="text-[10px] uppercase tracking-wide text-text-muted">Conversation</div>
            <code className="mt-0.5 block truncate font-mono text-xs text-text-main">{message.conversationId}</code>
          </div>
        )}

        <FormatTabs detail={message} onCopy={copyToClipboard} />
      </div>
    </Drawer>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="rounded-lg border border-black/5 dark:border-white/5 p-2">
      <div className="text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-0.5 truncate font-mono text-sm text-text-main">{value}</div>
    </div>
  );
}

// ── Conversation tree node ──────────────────────────────────────────────────
function ConversationView({ conversation, onSelect }) {
  const [open, setOpen] = useState(true);
  if (!conversation) return null;
  return (
    <div className="rounded-lg border border-black/5 dark:border-white/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 p-2 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
      >
        <span className="material-symbols-outlined text-sm text-text-muted transition-transform" style={{ transform: open ? "rotate(90deg)" : "none" }}>
          chevron_right
        </span>
        <code className="min-w-0 flex-1 truncate font-mono text-xs">{conversation.conversationId}</code>
        <span className="text-[10px] text-text-muted">{conversation.messageCount} msgs</span>
        <span className="text-[10px] text-text-muted">
          {fmtTokens((conversation.tokens?.prompt || 0) + (conversation.tokens?.completion || 0))} tok
        </span>
      </button>
      {open && (
        <div className="border-t border-black/5 dark:border-white/5 p-1">
          {conversation.messages.map((m, i) => (
            <button
              key={m.id || m._id || i}
              type="button"
              onClick={() => onSelect(m)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            >
              <span className="w-14 shrink-0 font-mono text-[10px] text-text-muted">
                {String(m.timestamp || "").slice(11, 19)}
              </span>
              <StatusBadge status={m.status} category={m.errorCategory} />
              <span className="min-w-0 flex-1 truncate font-mono text-text-main">
                {m.model || "?"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const [providerNames, setProviderNames] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [provider, setProvider] = useState("");
  const [status, setStatus] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // View mode
  const [viewMode, setViewMode] = useState("list"); // "list" | "conversations"
  const [selected, setSelected] = useState(null);
  const loadAbortRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Abort any in-flight request so a slow response for an older filter
    // can't overwrite the results of a newer one (fetch race, R1).
    if (loadAbortRef.current) loadAbortRef.current.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (provider) params.set("provider", provider);
      if (status) params.set("status", status);
      if (conversationId) params.set("conversationId", conversationId);
      const res = await fetch(`/api/messages?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to load messages");
      const json = await res.json();
      setData(json);
    } catch (e) {
      // Ignore aborts (a newer request superseded this one)
      if (e.name === "AbortError") return;
      setError(e.message);
    } finally {
      if (loadAbortRef.current === controller) setLoading(false);
    }
  }, [page, pageSize, provider, status, conversationId]);

  // Fetch on mount + whenever filters change. The initial fetch is triggered
  // by the effect; subsequent calls come from filter/pagination handlers.
  useEffect(() => { load(); }, [load]);

  // Provider names — one-time fetch (mirrors RequestDetailsTab module cache)
  useEffect(() => {
    let cancelled = false;
    fetchProviderNames().then(({ providerNameCache }) => {
      if (!cancelled) setProviderNames(providerNameCache);
    });
    return () => { cancelled = true; };
  }, []);

  const messages = data?.messages || [];
  const conversations = data?.conversations || [];
  const pagination = data?.pagination;

  const openDetail = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/messages/${id}`);
      if (!res.ok) return;
      const json = await res.json();
      setSelected(json.message);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text-main">Messages</h1>
          <p className="text-xs text-text-muted">
            Captured request/response payloads — grouped by conversation, exportable.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-black/5 dark:bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", viewMode === "list" ? "bg-surface text-text-main shadow-sm" : "text-text-muted")}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("conversations")}
            className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", viewMode === "conversations" ? "bg-surface text-text-main shadow-sm" : "text-text-muted")}
          >
            Conversations
          </button>
          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", viewMode === "timeline" ? "bg-surface text-text-main shadow-sm" : "text-text-muted")}
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode("trace")}
            className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", viewMode === "trace" ? "bg-surface text-text-main shadow-sm" : "text-text-muted")}
          >
            Trace
          </button>
          <button
            type="button"
            onClick={() => setViewMode("board")}
            className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", viewMode === "board" ? "bg-surface text-text-main shadow-sm" : "text-text-muted")}
          >
            Board
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={conversationId}
            onChange={(e) => { setConversationId(e.target.value); setPage(1); }}
            placeholder="Conversation ID…"
            className="h-8 min-w-40 flex-1 rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-2 text-xs text-text-main outline-none focus:border-primary"
          />
          <select
            value={provider}
            onChange={(e) => { setProvider(e.target.value); setPage(1); }}
            className="h-8 rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-2 text-xs text-text-main outline-none"
          >
            <option value="">All providers</option>
            {messages.map((m) => m.provider).filter((p, i, a) => p && a.indexOf(p) === i).map((p) => (
              <option key={p} value={p}>{getProviderName(p, providerNames)}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="h-8 rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-2 text-xs text-text-main outline-none"
          >
            <option value="">All statuses</option>
            <option value="success">success</option>
            <option value="error">error</option>
            <option value="streaming">streaming</option>
            <option value="partial">partial</option>
            <option value="cancelled">cancelled</option>
          </select>
          <Button size="sm" variant="ghost" onClick={() => { setProvider(""); setStatus(""); setConversationId(""); setPage(1); }}>
            Clear
          </Button>
        </div>
      </Card>

      {/* Body */}
      <Card padding="none" className="min-h-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-10 text-sm text-text-muted">Loading…</div>
        ) : error ? (
          <div className="p-10 text-center text-sm text-red-500">{error}</div>
        ) : messages.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No messages captured yet. Send a request through 9Router to populate this view.
          </div>
        ) : viewMode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5">
                  <th className="p-2 text-left text-xs font-semibold text-text-muted">Time</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-muted">Provider / Model</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-muted">Status</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-muted">Tokens</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-muted">Latency</th>
                  <th className="p-2 text-left text-xs font-semibold text-text-muted">Conversation</th>
                  <th className="p-2 text-right text-xs font-semibold text-text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m, i) => (
                  <tr
                    key={m.id || m._id || i}
                    onClick={() => openDetail(m.id || m._id)}
                    className="cursor-pointer border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  >
                    <td className="whitespace-nowrap p-2 font-mono text-[11px] text-text-muted">
                      {String(m.timestamp || "").slice(5, 19).replace("T", " ")}
                    </td>
                    <td className="p-2">
                      <span className="font-mono text-xs text-text-main">{getProviderName(m.provider, providerNames)}</span>
                      <span className="text-text-muted"> / </span>
                      <span className="font-mono text-xs text-text-muted">{m.model || "?"}</span>
                    </td>
                    <td className="p-2"><StatusBadge status={m.status} category={m.errorCategory} /></td>
                    <td className="p-2 font-mono text-xs text-text-muted">
                      {fmtTokens(m.tokens?.prompt_tokens ?? m.tokens?.input_tokens)} / {fmtTokens(m.tokens?.completion_tokens ?? m.tokens?.output_tokens)}
                    </td>
                    <td className="p-2 font-mono text-xs text-text-muted">{fmtLatency(m.latency)}</td>
                    <td className="max-w-40 truncate p-2 font-mono text-[11px] text-text-muted">
                      {m.conversationId || "—"}
                    </td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openDetail(m.id || m._id); }}>
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination && (
              <div className="flex justify-center border-t border-black/5 dark:border-white/5 p-3">
                <Pagination
                  currentPage={pagination.page}
                  pageSize={pagination.pageSize}
                  totalItems={pagination.totalItems}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        ) : viewMode === "conversations" ? (
          <div className="flex flex-col gap-2 p-3">
            {conversations.map((conv) => (
              <ConversationView key={conv.conversationId} conversation={conv} onSelect={(m) => openDetail(m.id || m._id)} />
            ))}
          </div>
        ) : viewMode === "timeline" ? (
          <TimelineView
            histogram={data?.histogram || []}
            messages={messages}
            providerNames={providerNames}
            onSelect={(m) => openDetail(m.id || m._id)}
          />
        ) : viewMode === "trace" ? (
          <TraceTreeView
            conversations={conversations}
            providerNames={providerNames}
            onSelect={(m) => openDetail(m.id || m._id)}
          />
        ) : viewMode === "board" ? (
          <BoardView
            messages={messages}
            providerNames={providerNames}
            onSelect={(m) => openDetail(m.id || m._id)}
          />
        ) : (
          <div className="flex flex-col gap-2 p-3">
            {conversations.map((conv) => (
              <ConversationView key={conv.conversationId} conversation={conv} onSelect={(m) => openDetail(m.id || m._id)} />
            ))}
          </div>
        )}
      </Card>

      <MessageDetailDrawer message={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
