import { NextResponse } from "next/server";
import { sendToChild, findPlugin } from "@/lib/mcp/stdioSseBridge";
import { getConsistentMachineId } from "@/shared/utils/machineId";

const CLI_TOKEN_HEADER = "x-9r-cli-token";
const CLI_TOKEN_SALT = "9r-cli-auth";

let cachedCliToken = null;
async function getCliToken() {
  if (!cachedCliToken) cachedCliToken = await getConsistentMachineId(CLI_TOKEN_SALT);
  return cachedCliToken;
}

async function hasValidCliToken(request) {
  const token = request.headers.get(CLI_TOKEN_HEADER);
  if (!token) return false;
  return token === await getCliToken();
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  // SECURITY: Require CLI-token auth for MCP endpoints (issue #3674)
  if (!await hasValidCliToken(request)) {
    return NextResponse.json({ error: "CLI token required" }, { status: 401 });
  }

  const { plugin } = await params;
  if (!findPlugin(plugin)) {
    return NextResponse.json({ error: `Unknown plugin: ${plugin}` }, { status: 404 });
  }
  try {
    const body = await request.json();
    sendToChild(plugin, body);
    return new Response(null, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
