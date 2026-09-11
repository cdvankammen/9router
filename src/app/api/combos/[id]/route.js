import { NextResponse } from "next/server";
import { getComboById, updateCombo, deleteCombo, getComboByName } from "@/lib/localDb";
import { resetComboRotation } from "open-sse/services/combo.js";
import { isValidModel } from "@/shared/constants/models";
import { PROVIDER_ID_TO_ALIAS } from "open-sse/config/providerModels.js";

// Soft-validate model ids against the registry (same logic as POST route).
function findUnknownModels(models) {
  if (!Array.isArray(models)) return [];
  const unknown = [];
  const aliases = Object.values(PROVIDER_ID_TO_ALIAS);
  for (const raw of models) {
    if (typeof raw !== "string" || !raw) continue;
    const slash = raw.indexOf("/");
    const provider = slash > 0 ? raw.slice(0, slash) : null;
    const model = slash > 0 ? raw.slice(slash + 1) : raw;
    if (!provider) continue;
    const alias = PROVIDER_ID_TO_ALIAS[provider] || provider;
    if (aliases.includes(alias) || aliases.includes(provider)) {
      if (!isValidModel(alias, model) && !isValidModel(provider, model)) {
        unknown.push(raw);
      }
    }
  }
  return unknown;
}

// Validate combo name: only a-z, A-Z, 0-9, -, _
const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

// GET /api/combos/[id] - Get combo by ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const combo = await getComboById(id);
    
    if (!combo) {
      return NextResponse.json({ error: "Combo not found" }, { status: 404 });
    }
    
    return NextResponse.json(combo);
  } catch (error) {
    console.log("Error fetching combo:", error);
    return NextResponse.json({ error: "Failed to fetch combo" }, { status: 500 });
  }
}

// PUT /api/combos/[id] - Update combo
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate name format if provided
    if (body.name) {
      if (!VALID_NAME_REGEX.test(body.name)) {
        return NextResponse.json({ error: "Name can only contain letters, numbers, -, _ and ." }, { status: 400 });
      }
      
      // Check if name already exists (exclude current combo)
      const existing = await getComboByName(body.name);
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "Combo name already exists" }, { status: 400 });
      }
    }
    
    // Capture previous name to invalidate rotation state on rename
    const prev = await getComboById(id);
    const combo = await updateCombo(id, body);
    
    if (!combo) {
      return NextResponse.json({ error: "Combo not found" }, { status: 404 });
    }

    // Invalidate rotation state (models/strategy/name may have changed)
    if (prev?.name) resetComboRotation(prev.name);
    if (combo.name && combo.name !== prev?.name) resetComboRotation(combo.name);

    const unknownModels = findUnknownModels(combo.models || body.models);
    const warnings = unknownModels.length
      ? [`Unrecognized model(s): ${unknownModels.join(", ")} — saved anyway (custom provider?)`]
      : [];

    return NextResponse.json({ ...combo, warnings });
  } catch (error) {
    console.log("Error updating combo:", error);
    return NextResponse.json({ error: "Failed to update combo" }, { status: 500 });
  }
}

// DELETE /api/combos/[id] - Delete combo
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const prev = await getComboById(id);
    const success = await deleteCombo(id);
    
    if (!success) {
      return NextResponse.json({ error: "Combo not found" }, { status: 404 });
    }

    if (prev?.name) resetComboRotation(prev.name);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.log("Error deleting combo:", error);
    return NextResponse.json({ error: "Failed to delete combo" }, { status: 500 });
  }
}
