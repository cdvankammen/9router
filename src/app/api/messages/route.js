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

    // errorCategory lives inside requestDetails.data — filter client-visible rows
    let messages = result.details || [];
    if (errorCategory) {
      messages = messages.filter((m) => m.errorCategory === errorCategory);
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

    return NextResponse.json({
      messages,
      conversations,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("[API] Failed to get messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
