import { NextResponse } from "next/server";
import { getRequestDetails } from "@/lib/db/repos/requestDetailsRepo.js";
import { renderRequestsMarkdown } from "@/lib/markdownReport.js";

export const dynamic = "force-dynamic";

const MAX_EXPORT_ROWS = 5000;

/**
 * GET /api/export/requests?format=json|markdown&provider=...&model=...&conversationId=...&startDate=...&endDate=...&status=...
 *
 * Exports captured request details (when observability is enabled) as JSON
 * or a markdown report grouped by conversation. All filters are optional.
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";
    const pageSize = Math.min(Number(url.searchParams.get("limit") || 1000), MAX_EXPORT_ROWS);

    const filter = {
      provider: url.searchParams.get("provider") || undefined,
      model: url.searchParams.get("model") || undefined,
      conversationId: url.searchParams.get("conversationId") || undefined,
      status: url.searchParams.get("status") || undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
    };

    // Strip undefined keys so repo defaults apply cleanly
    for (const k of Object.keys(filter)) {
      if (filter[k] === undefined) delete filter[k];
    }

    const { details, pagination } = await getRequestDetails({ ...filter, pageSize });

    if (format === "markdown") {
      const md = renderRequestsMarkdown(details);
      return new NextResponse(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="9router-requests-${new Date().toISOString().slice(0, 10)}.md"`,
        },
      });
    }

    return NextResponse.json({ details, pagination });
  } catch (error) {
    console.error("[export] Failed to export requests:", error);
    return NextResponse.json({ error: "Failed to export requests" }, { status: 500 });
  }
}
