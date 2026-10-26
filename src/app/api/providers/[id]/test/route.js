import { NextResponse } from "next/server";
import { testSingleConnection } from "./testUtils.js";
import { requireAuth } from "@/lib/auth/requireAuth";

// POST /api/providers/[id]/test - Test connection
// Finding #7 (2026-10-26): route-level requireAuth — this endpoint forces
// the server outbound using the stored credentials of the connection
// (SSRF-via-stored-config). An unauthenticated peer could trigger credential
// use against any connection whose UUID they know.
export async function POST(request, { params }) {
  try {
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const result = await testSingleConnection(id);

    if (result.error === "Connection not found") {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    return NextResponse.json({
      valid: result.valid,
      error: result.error,
      refreshed: result.refreshed || false,
    });
  } catch (error) {
    console.log("Error testing connection:", error);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}
