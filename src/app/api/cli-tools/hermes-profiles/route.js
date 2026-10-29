import { NextResponse } from "next/server";
import { listProfiles } from "../hermes-settings/hermesProfiles.js";

export const dynamic = "force-dynamic";

// GET - List every Hermes profile on this machine (default home + ~/.hermes/profiles/*).
// Discovery is filesystem-based: a directory only counts as a profile when it carries one of
// Hermes' identity files, mirroring what `hermes profile list` accepts.
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const profiles = await listProfiles();
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Error listing hermes profiles:", error);
    return NextResponse.json({ error: "Failed to list hermes profiles" }, { status: 500 });
  }
}
