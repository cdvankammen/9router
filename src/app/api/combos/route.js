import { NextResponse } from "next/server";
import { getCombos, createCombo, getComboByName } from "@/lib/localDb";
import { isValidModel } from "@/shared/constants/models";
import { PROVIDER_ID_TO_ALIAS } from "open-sse/config/providerModels.js";

export const dynamic = "force-dynamic";

// Validate combo name: only a-z, A-Z, 0-9, -, _
const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

// Soft-validate model ids: returns array of unrecognized strings (warnings, not errors).
// Splits "provider/model" and checks against the registry. Custom/OpenAI-compat
// providers pass through so user-defined endpoints aren't flagged.
function findUnknownModels(models) {
  if (!Array.isArray(models)) return [];
  const unknown = [];
  const aliases = Object.values(PROVIDER_ID_TO_ALIAS);
  for (const raw of models) {
    if (typeof raw !== "string" || !raw) continue;
    const slash = raw.indexOf("/");
    const provider = slash > 0 ? raw.slice(0, slash) : null;
    const model = slash > 0 ? raw.slice(slash + 1) : raw;
    // No provider prefix — can't validate, skip (likely custom)
    if (!provider) continue;
    // Known provider alias or id — check its model list
    const alias = PROVIDER_ID_TO_ALIAS[provider] || provider;
    if (aliases.includes(alias) || aliases.includes(provider)) {
      if (!isValidModel(alias, model) && !isValidModel(provider, model)) {
        unknown.push(raw);
      }
    }
    // Unknown provider prefix — skip (custom provider, can't validate)
  }
  return unknown;
}

// GET /api/combos - Get all combos
export async function GET() {
  try {
    const combos = await getCombos();
    return NextResponse.json({ combos });
  } catch (error) {
    console.log("Error fetching combos:", error);
    return NextResponse.json({ error: "Failed to fetch combos" }, { status: 500 });
  }
}

// POST /api/combos - Create new combo
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, models, kind } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate name format
    if (!VALID_NAME_REGEX.test(name)) {
      return NextResponse.json({ error: "Name can only contain letters, numbers, -, _ and ." }, { status: 400 });
    }

    // Check if name already exists
    const existing = await getComboByName(name);
    if (existing) {
      return NextResponse.json({ error: "Combo name already exists" }, { status: 400 });
    }

    const combo = await createCombo({ name, models: models || [], kind: kind || null });
    const unknownModels = findUnknownModels(models);
    const warnings = unknownModels.length
      ? [`Unrecognized model(s): ${unknownModels.join(", ")} — saved anyway (custom provider?)`]
      : [];

    return NextResponse.json({ ...combo, warnings }, { status: 201 });
  } catch (error) {
    console.log("Error creating combo:", error);
    return NextResponse.json({ error: "Failed to create combo" }, { status: 500 });
  }
}
