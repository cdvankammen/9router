import { NextResponse } from "next/server";
import {
  getRequestDetails, getRequestFacets,
  getConversationSummary, getConversationMessages,
} from "@/lib/usageDb";

/**
 * GET /api/messages
 * List captured request messages with filters + conversation grouping.
 *
 * Query parameters: page, pageSize (1-100), cursor (opaque keyset cursor),
 * view=conversations, provider, model, status, errorCategory, conversationId,
 * startDate, endDate, search
 *
 * Response:
 * {
 *   messages: [...],            // flat list (newest first), each = requestDetails.data
 *   conversations: [...],       // grouped: { conversationId, messages: [...], tokens, cost, messageCount }
 *   searchMode: "fts"|"like",  // present when a search term was applied
 *   pagination: { page, pageSize, totalItems, totalPages, hasNext, hasPrev, nextCursor }
 * }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const pageRaw = parseInt(searchParams.get("page"));
    const page = Number.isNaN(pageRaw) ? 1 : pageRaw;
    const pageSizeRaw = parseInt(searchParams.get("pageSize"));
    const pageSize = Number.isNaN(pageSizeRaw) ? 50 : pageSizeRaw;
    const view = searchParams.get("view");
    const cursor = searchParams.get("cursor");
    const provider = searchParams.get("provider");
    const model = searchParams.get("model");
    const status = searchParams.get("status");
    const errorCategory = searchParams.get("errorCategory");
    const sourceApp = searchParams.get("sourceApp");
    const conversationId = searchParams.get("conversationId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (page < 1) {
      return NextResponse.json({ error: "Page must be >= 1" }, { status: 400 });
    }
    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: "PageSize must be between 1 and 100" }, { status: 400 });
    }

    const filter = { page, pageSize };
    if (cursor) filter.cursor = cursor;
    if (provider) filter.provider = provider;
    if (model) filter.model = model;
    if (status) filter.status = status;
    if (errorCategory) filter.errorCategory = errorCategory;
    if (sourceApp) filter.sourceApp = sourceApp;
    if (conversationId) filter.conversationId = conversationId;
    if (search) filter.search = search;
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;

    // errorCategory/sourceApp are filtered in SQL (JSON1) so pagination math
    // stays correct — client-side filtering after pagination would produce
    // wrong totals and empty pages with matches on later pages.
    const result = await getRequestDetails(filter);

    let messages = result.details || [];
    // Keyset cursor for the next page of the flat list (null at the end).
    const pagination = { ...result.pagination, nextCursor: result.nextCursor || null };

    // ── Conversation aggregation (B3) ───────────────────────────────────────
    // view=conversations → DB-level GROUP BY over the FULL filtered set, so
    // counts/tokens/cost are correct for conversations spanning pages. When a
    // specific conversation is selected (conversationId param), its full
    // thread is attached regardless of the page window.
    let conversations;
    if (view === "conversations") {
      const summary = await getConversationSummary(filter);
      conversations = summary.conversations;
      // Pagination now refers to the conversation LIST (distinct convs).
      pagination.page = summary.pagination.page;
      pagination.pageSize = summary.pagination.pageSize;
      pagination.totalItems = summary.pagination.totalItems;
      pagination.totalPages = summary.pagination.totalPages;
      pagination.hasNext = summary.pagination.hasNext;
      pagination.hasPrev = summary.pagination.hasPrev;
      pagination.nextCursor = null; // conversations page by number, not cursor

      if (conversationId) {
        const convKey = conversationId === "null" || conversationId === "(none)" ? null : conversationId;
        const thread = await getConversationMessages(convKey, { pageSize: 500 });
        const conv = conversations.find((c) => (c.conversationId ?? null) === convKey);
        if (conv) conv.messages = thread;
        messages = thread; // flat list = the full session (list view compat)
      }
    } else {
      // Default / list / trace views: lightweight projection from the page's
      // rows (only conversations whose rows appear in this page's window).
      conversations = [];
      const byConversation = new Map();
      for (const m of messages) {
        const key = m.conversationId || "no-conversation";
        if (!byConversation.has(key)) byConversation.set(key, []);
        byConversation.get(key).push(m);
      }
      for (const [convId, msgs] of byConversation) {
        let tokens = { prompt: 0, completion: 0 };
        let cost = 0;
        for (const m of msgs) {
          tokens.prompt += m.tokens?.prompt_tokens || m.tokens?.input_tokens || 0;
          tokens.completion += m.tokens?.completion_tokens || m.tokens?.output_tokens || 0;
          cost += m.cost || 0;
        }
        conversations.push({
          conversationId: convId,
          messageCount: msgs.length,
          tokens,
          cost,
          messages: msgs.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))),
        });
      }
      conversations.sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.timestamp || "";
        const bLast = b.messages[b.messages.length - 1]?.timestamp || "";
        return String(bLast).localeCompare(String(aLast));
      });

      if (conversationId) {
        // B3: even in the page-window views, the selected conversation shows
        // its FULL thread (not just the rows on this page).
        const convKey = conversationId === "null" || conversationId === "(none)" ? null : conversationId;
        const thread = await getConversationMessages(convKey, { pageSize: 500 });
        const conv = conversations.find((c) =>
          convKey === null ? c.conversationId === "no-conversation" : c.conversationId === convKey
        );
        if (conv) conv.messages = thread;
      }
    }

    // ── Facets: counts per dimension for the filter sidebar ────────────────
    // Computed in SQL (GROUP BY) over the FULL filtered set — no row payloads,
    // correct counts at any scale, stable across pages.
    const { facets, histogram } = await getRequestFacets(filter);

    return NextResponse.json({
      messages,
      conversations,
      facets,
      histogram,
      searchMode: result.searchMode,
      pagination,
    });
  } catch (error) {
    console.error("[API] Failed to get messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
