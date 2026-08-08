import { NextResponse } from "next/server";
import { getRequestDetails } from "@/lib/usageDb";

/**
 * GET /api/messages
 * List captured request messages with filters + conversation grouping.
 *
 * Query parameters: page, pageSize (1-100), provider, model, status,
 * errorCategory, conversationId, startDate, endDate
 *
 * Response:
 * {
 *   messages: [...],            // flat list (newest first), each = requestDetails.data
 *   conversations: [...],       // grouped: { conversationId, messages: [...], tokens, cost, messageCount }
 *   pagination: { page, pageSize, totalItems, totalPages, hasNext, hasPrev }
 * }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const pageRaw = parseInt(searchParams.get("page"));
    const page = Number.isNaN(pageRaw) ? 1 : pageRaw;
    const pageSizeRaw = parseInt(searchParams.get("pageSize"));
    const pageSize = Number.isNaN(pageSizeRaw) ? 50 : pageSizeRaw;
    const provider = searchParams.get("provider");
    const model = searchParams.get("model");
    const status = searchParams.get("status");
    const errorCategory = searchParams.get("errorCategory");
    const sourceApp = searchParams.get("sourceApp");
    const conversationId = searchParams.get("conversationId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (page < 1) {
      return NextResponse.json({ error: "Page must be >= 1" }, { status: 400 });
    }
    if (pageSize < 1 || pageSize > 100) {
      return NextResponse.json({ error: "PageSize must be between 1 and 100" }, { status: 400 });
    }

    const filter = { page, pageSize };
    if (provider) filter.provider = provider;
    if (model) filter.model = model;
    if (status) filter.status = status;
    if (conversationId) filter.conversationId = conversationId;
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;

    const result = await getRequestDetails(filter);

    // errorCategory + sourceApp live inside requestDetails.data — filter client-visible rows
    let messages = result.details || [];
    if (errorCategory) {
      messages = messages.filter((m) => m.errorCategory === errorCategory);
    }
    if (sourceApp) {
      messages = messages.filter((m) => m.sourceApp === sourceApp);
    }

    // Build a lightweight conversation projection from the flat list.
    // Only conversations whose rows appear in this page's window.
    const conversations = [];
    const byConversation = new Map();
    for (const m of messages) {
      const key = m.conversationId || "no-conversation";
      if (!byConversation.has(key)) byConversation.set(key, []);
      byConversation.get(key).push(m);
    }
    for (const [conversationId, msgs] of byConversation) {
      let tokens = { prompt: 0, completion: 0 };
      let cost = 0;
      for (const m of msgs) {
        tokens.prompt += m.tokens?.prompt_tokens || m.tokens?.input_tokens || 0;
        tokens.completion += m.tokens?.completion_tokens || m.tokens?.output_tokens || 0;
        cost += m.cost || 0;
      }
      conversations.push({
        conversationId,
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

    // ── Facets: counts per dimension for the filter sidebar ────────────────
    // Computed over the full filtered set (not just the page window) so
    // facet counts stay stable as you paginate. We refetch with a large
    // pageSize to get the full window for counting; cheap at this scale.
    const facetFilter = { ...filter, page: 1, pageSize: 10000 };
    const facetResult = await getRequestDetails(facetFilter);
    let facetRows = facetResult.details || [];
    if (errorCategory) facetRows = facetRows.filter((m) => m.errorCategory === errorCategory);
    if (sourceApp) facetRows = facetRows.filter((m) => m.sourceApp === sourceApp);

    const countBy = (fn) => {
      const counts = {};
      for (const m of facetRows) {
        const k = fn(m) || "unknown";
        counts[k] = (counts[k] || 0) + 1;
      }
      return Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    };

    const facets = {
      provider: countBy((m) => m.provider),
      model: countBy((m) => m.model),
      status: countBy((m) => m.status),
      errorCategory: countBy((m) => m.errorCategory),
      sourceApp: countBy((m) => m.sourceApp),
    };

    // ── Time histogram (last 24h, hourly buckets) for the waterfall header ─
    const histogram = [];
    if (facetRows.length > 0) {
      const now = Date.now();
      const start = now - 24 * 60 * 60 * 1000;
      const buckets = new Map();
      for (let h = 0; h < 24; h++) {
        const ts = new Date(start + h * 60 * 60 * 1000);
        const key = ts.toISOString().slice(0, 13) + ":00";
        buckets.set(key, { label: ts.toISOString().slice(11, 16), count: 0, errors: 0 });
      }
      for (const m of facetRows) {
        const t = new Date(m.timestamp || Date.now()).getTime();
        if (t < start || t > now) continue;
        const key = new Date(t).toISOString().slice(0, 13) + ":00";
        const b = buckets.get(key);
        if (b) {
          b.count += 1;
          if (m.status === "error") b.errors += 1;
        }
      }
      for (const [, b] of buckets) histogram.push(b);
    }

    return NextResponse.json({
      messages,
      conversations,
      facets,
      histogram,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[API] Failed to get messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
