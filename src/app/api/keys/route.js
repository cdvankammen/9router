import { NextResponse } from "next/server";
import { getApiKeys, createApiKey } from "@/lib/localDb";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import { requireAuth } from "@/lib/auth/requireAuth";

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
export async function GET(request) {
  try {
    // Finding #7 follow-up (2026-10-29): route-level requireAuth on the list
    // endpoint. Even though key VALUES are masked, the response leaks every
    // key's UUID, name, access scope, timestamps, and last-used metadata to
    // any unauthenticated LAN peer on requireLogin=false deployments. This
    // data is useful for targeted IDOR probes against the [id] routes.
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    // Defence-in-depth: symmetric with GET/PUT/DELETE on [id]. Creating a key
    // is a privileged mutation — any unauthenticated peer could mint gateway
    // credentials on open deployments.
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
