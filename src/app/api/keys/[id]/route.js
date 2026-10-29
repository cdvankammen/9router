import { NextResponse } from "next/server";
import { deleteApiKey, getApiKeyById, updateApiKey } from "@/lib/localDb";
import { validateKeyAccessInput } from "@/shared/utils/keyAccess.js";
import { requireAuth } from "@/lib/auth/requireAuth";

// CRITICAL IDOR fix (2026-10-26): this route previously returned the raw,
// unmasked API key for any UUID the caller knew, while the list endpoint
// (/api/keys) handed out UUIDs freely with masking. PUT and DELETE also had
// no owner check, allowing any authenticated session to toggle/rename/revoke
// any key on the system.
//
// Fix:
//   1. GET masks the key field (same maskKey helper as the list endpoint).
//      The dashboard already holds the full key in memory from POST create,
//      so masking here does not break the UI.
//   2. PUT and DELETE require a valid session (JWT auth_token cookie or
//      x-9r-cli-token header) — defence-in-depth alongside the middleware
//      ALWAYS_PROTECTED gate.
//
// Follow-up work (Finding #2 Option B): scope operations to the current
// session's keys and add a one-time reveal token for copy-to-clipboard.

function maskKey(fullKey) {
  if (!fullKey || fullKey.length <= 10) return fullKey || "";
  return fullKey.slice(0, 6) + "\u2022".repeat(fullKey.length - 10) + fullKey.slice(-4);
}

// requireAuth is now imported from @/lib/auth/requireAuth (Finding #7
// consolidation). Same semantics: JWT auth_token cookie OR x-9r-cli-token
// header, timing-safe comparison on the CLI token.

// GET /api/keys/[id] - Get single key (masked, same as list)
export async function GET(request, { params }) {
  try {
    // IDOR sweep (2026-10-29): route-level requireAuth as defence-in-depth.
    // Although the response masks the key value, UUID enumeration still
    // exposes key metadata (name, access scope, timestamps, last-used)
    // to any unauthenticated caller on the LAN.
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }
    return NextResponse.json({ key: { ...key, key: maskKey(key.key) } });
  } catch (error) {
    console.log("Error fetching key:", error);
    return NextResponse.json({ error: "Failed to fetch key" }, { status: 500 });
  }
}

// PUT /api/keys/[id] - Update key (auth required)
export async function PUT(request, { params }) {
  try {
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive, access } = body;

    const existing = await getApiKeyById(id);
    if (!existing) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (access !== undefined) {
      const checked = validateKeyAccessInput(access);
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
      updateData.access = checked.value;
    }

    const updated = await updateApiKey(id, updateData);

    return NextResponse.json({ key: { ...updated, key: maskKey(updated.key) } });
  } catch (error) {
    console.log("Error updating key:", error);
    return NextResponse.json({ error: "Failed to update key" }, { status: 500 });
  }
}

// DELETE /api/keys/[id] - Delete API key (auth required)
export async function DELETE(request, { params }) {
  try {
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const deleted = await deleteApiKey(id);
    if (!deleted) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Key deleted successfully" });
  } catch (error) {
    console.log("Error deleting key:", error);
    return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
  }
}
