import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { PROVIDERS } from "open-sse/config/providers.js";
import { resolveProviderAlias } from "open-sse/services/model.js";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  MAX_HEADERS,
  MAX_HEADER_VALUE_LENGTH,
  HEADER_NAME_RE,
  BLOCKED_HEADERS,
} from "@/lib/auth/providerOverridesValidator";

export const dynamic = "force-dynamic";

/**
 * Validate + normalize an override payload. Returns { override } or { error }.
 * An override with no headers is normalized to null (= delete).
 *
 * Validation constants (BLOCKED_HEADERS, HEADER_NAME_RE, limits) are shared
 * with PATCH /api/settings via src/lib/auth/providerOverridesValidator.js so
 * the two write paths can never drift apart (Row 19 remediation).
 */
function normalizeOverride({ headers }) {
  const out = {};

  if (headers !== undefined && headers !== null) {
    if (typeof headers !== "object" || Array.isArray(headers)) {
      return { error: "headers must be an object" };
    }
    const entries = Object.entries(headers).filter(([, v]) => v !== "" && v != null);
    if (entries.length > MAX_HEADERS) {
      return { error: `Too many headers (max ${MAX_HEADERS})` };
    }
    const clean = {};
    for (const [name, value] of entries) {
      if (!HEADER_NAME_RE.test(name)) {
        return { error: `Invalid header name: ${name}` };
      }
      if (typeof value !== "string" || /[\r\n]/.test(value)) {
        return { error: `Invalid value for header ${name}` };
      }
      if (value.length > MAX_HEADER_VALUE_LENGTH) {
        return { error: `Header ${name} value too long (max ${MAX_HEADER_VALUE_LENGTH})` };
      }
      if (BLOCKED_HEADERS.has(name.toLowerCase())) {
        return { error: `Header ${name} cannot be overridden` };
      }
      clean[name] = value;
    }
    if (Object.keys(clean).length) out.headers = clean;
  }

  return { override: Object.keys(out).length ? out : null };
}

async function readOverrides() {
  const settings = await getSettings();
  return settings.providerOverrides || {};
}

/**
 * GET /api/providers/[id]/overrides — user override for this provider
 */
export async function GET(request, { params }) {
  try {
    // IDOR sweep (2026-10-29): route-level requireAuth as defence-in-depth.
    // Provider overrides contain model-cap overrides, context-window limits,
    // and per-provider tuning that should not be enumerable by unauthed peers.
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    // URL may use an alias (gcli, cc…) — key everything by canonical registry id
    const canonical = resolveProviderAlias(id);
    const override = (await readOverrides())[canonical] || {};
    // Built-in headers come straight from the registry transport — single source of
    // truth, so the UI pre-fills exactly what this provider sends upstream.
    return NextResponse.json({
      headers: override.headers || {},
      builtinHeaders: PROVIDERS[canonical]?.headers || {},
    });
  } catch (error) {
    console.log("Error getting provider overrides:", error);
    return NextResponse.json({ error: "Failed to get overrides" }, { status: 500 });
  }
}

/**
 * PUT /api/providers/[id]/overrides — body: { headers: {name: value} }
 * Empty payload clears the override.
 *
 * Finding #7 (2026-10-26): route-level requireAuth — this writes to GLOBAL
 * settings.providerOverrides via updateSettings. An unauthenticated peer
 * could inject headers (incl. x-* tracking headers) that would be sent on
 * every user's upstream requests for that provider system-wide.
 */
export async function PUT(request, { params }) {
  try {
    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const canonical = resolveProviderAlias(id);
    const body = await request.json().catch(() => ({}));
    const { override, error } = normalizeOverride(body);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    const current = await readOverrides();
    const next = { ...current };
    if (override) next[canonical] = override;
    else delete next[canonical];
    await updateSettings({ providerOverrides: next });
    return NextResponse.json({ headers: override?.headers || {} });
  } catch (error) {
    console.log("Error saving provider overrides:", error);
    return NextResponse.json({ error: "Failed to save overrides" }, { status: 500 });
  }
}
