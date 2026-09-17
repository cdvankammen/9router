import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// L2 failover proxy port. The proxy is a SEPARATE process (cli/failover-proxy.cjs)
// that owns the client-facing port and routes to local/peer nodes. This route
// surfaces its live state so the dashboard can show failover health.
const FAILOVER_PORT = Number(process.env.FAILOVER_PROXY_PORT) || 20140;
const STATUS_PATH = "/api/failover-status";
const TIMEOUT_MS = 3000;

export async function GET() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`http://127.0.0.1:${FAILOVER_PORT}${STATUS_PATH}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `failover proxy responded ${res.status}` },
        { status: 502, headers: CORS_HEADERS }
      );
    }
    const body = await res.json();
    return NextResponse.json(
      { ok: true, port: FAILOVER_PORT, ...body },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    const detail = err?.name === "AbortError" ? "timeout" : err?.message || String(err);
    return NextResponse.json(
      { ok: false, error: `failover proxy unreachable: ${detail}` },
      { status: 503, headers: CORS_HEADERS }
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}