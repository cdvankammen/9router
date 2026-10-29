import { NextResponse } from "next/server";
import { FILTERS } from "./filters.js";
import { fetchPublic } from "@/shared/utils/ssrfGuard.js";
import { requireAuth } from "@/lib/auth/requireAuth.js";

export const dynamic = "force-dynamic";

// Host allowlist for model-catalog fetches. Defense-in-depth on top of
// fetchPublic's DNS-resolution SSRF guard: even if a bypass were found in
// the generic guard, only these hosts can be hit through this endpoint.
// Derived from the FILTERS keys (openrouter, opencode, mimo, minimax, nous).
const ALLOWED_CATALOG_HOSTS = new Set([
  "openrouter.ai",
  "api.openrouter.ai",
  "opencode.ai",
  "api.opencode.ai",
  "models.dev",
  "api.models.dev",
  "minimax.chat",
  "api.minimax.chat",
  "api.minimaxi.com",
  "nousresearch.com",
  "api.nousresearch.com",
  "raw.githubusercontent.com",  // fallback catalog hosting
]);

export async function GET(request) {
  // Defense-in-depth: dashboard-only endpoint, must not be callable by
  // unauthenticated network clients. Closes the SSRF-as-a-service vector
  // where an attacker tricks a logged-in dashboard user's browser into
  // hitting internal services via this route.
  const authError = await requireAuth(request);
  if (authError) return authError;

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

  // Host allowlist + scheme check BEFORE any network call. Belt-and-suspenders
  // with fetchPublic below.
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ error: "Blocked URL scheme" }, { status: 400 });
  }
  if (parsed.username || parsed.password) {
    return NextResponse.json({ error: "Blocked URL: embedded credentials" }, { status: 400 });
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!ALLOWED_CATALOG_HOSTS.has(host)) {
    return NextResponse.json(
      { error: `Blocked URL host: ${host}` },
      { status: 400 }
    );
  }

  try {
    // fetchPublic: DNS-resolution SSRF guard (blocks private/link-local/
    // cloud-metadata IPs even when hidden behind attacker-controlled DNS)
    // + redirect-safe (manual redirect handling re-validates each hop).
    // AbortSignal.timeout bounds the network call at 10s so a slowloris
    // target can't pin the handler.
    const res = await fetchPublic(url, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json({ data: [] });
    }
    const json = await res.json();
    const raw = json.data ?? json.models ?? json;
    // Object-shaped catalogs (minimax-code's {providers:[…]}) ride in as a
    // single-element array so every filter keeps an array input contract.
    const data = filter(Array.isArray(raw) ? raw : typeof raw === "object" && raw !== null ? [raw] : []);
    return NextResponse.json({ data });
  } catch (err) {
    // SSRF block surfaces as 400 so the dashboard can show a meaningful
    // message rather than silently returning empty. Other network errors
    // still return empty data (non-security failures).
    const msg = err?.message || String(err);
    if (msg.startsWith("Blocked URL")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ data: [] });
  }
}
