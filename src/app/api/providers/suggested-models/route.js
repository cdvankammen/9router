import { NextResponse } from "next/server";
import { FILTERS } from "./filters.js";
import { requireAuth } from "@/lib/auth/requireAuth";

export const dynamic = "force-dynamic";

export async function GET(request) {
    // IDOR sweep (2026-10-29): route-level requireAuth as defence-in-depth.
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const type = searchParams.get("type");

  if (!url || !type) {
    return NextResponse.json({ error: "Missing url or type" }, { status: 400 });
  }

  const filter = FILTERS[type];
  if (!filter) {
    return NextResponse.json({ error: "Unknown filter type" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ data: [] });
    }
    const json = await res.json();
    const raw = json.data ?? json.models ?? json;
    // Object-shaped catalogs (minimax-code's {providers:[…]}) ride in as a
    // single-element array so every filter keeps an array input contract.
    const data = filter(Array.isArray(raw) ? raw : typeof raw === "object" && raw !== null ? [raw] : []);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
