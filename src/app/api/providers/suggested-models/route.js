import { NextResponse } from "next/server";
import { FILTERS } from "./filters.js";
import { assertPublicUrlResolved } from "@/shared/utils/ssrfGuard.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
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

  // SSRF guard: reject internal/private/metadata targets (incl. DNS-resolving hostnames)
  // before fetching. Prevents classic SSRF via ?url=http://169.254.169.254/... etc.
  try {
    await assertPublicUrlResolved(url);
  } catch {
    return NextResponse.json({ error: "Blocked: URL targets an internal host" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ data: [] });
    }
    const json = await res.json();
    const raw = json.data ?? json.models ?? json;
    const data = filter(Array.isArray(raw) ? raw : []);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
