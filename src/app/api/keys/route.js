import { NextResponse } from "next/server";
import { getApiKeys, createApiKey } from "@/lib/localDb";
import { getConsistentMachineId } from "@/shared/utils/machineId";

export const dynamic = "force-dynamic";

// Mask API keys server-side to prevent credential leakage to unauthenticated
// LAN peers (e.g. when requireLogin=false). Shows first 6 + last 4 chars with
// bullet fill. The full key is returned only on POST (create) — the dashboard
// stores it in memory for reveal/copy. Mirrors client-side maskKey in
// EndpointPageClient.js.
function maskKey(fullKey) {
  if (!fullKey || fullKey.length <= 10) return fullKey || "";
  return fullKey.slice(0, 6) + "\u2022".repeat(fullKey.length - 10) + fullKey.slice(-4);
}

// GET /api/keys - List API keys (masked)
export async function GET() {
  try {
    const keys = await getApiKeys();
    const maskedKeys = keys.map(k => ({ ...k, key: maskKey(k.key) }));
    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    console.log("Error fetching keys:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// POST /api/keys - Create new API key
export async function POST(request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Always get machineId from server
    const machineId = await getConsistentMachineId();
    const apiKey = await createApiKey(name, machineId);

    return NextResponse.json({
      key: apiKey.key,
      name: apiKey.name,
      id: apiKey.id,
      machineId: apiKey.machineId,
    }, { status: 201 });
  } catch (error) {
    console.log("Error creating key:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
