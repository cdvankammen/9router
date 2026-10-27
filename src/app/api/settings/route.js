import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import { applyOutboundProxyEnv } from "@/lib/network/outboundProxy";
import { validateOidcConfigForSave } from "@/lib/auth/oidc";
import { validatePeerNodes } from "@/lib/network/peerNodesValidator";
import { validateProviderOverrides } from "@/lib/auth/providerOverridesValidator";
import { resetComboRotation } from "open-sse/services/combo.js";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SETTINGS_RESPONSE_HEADERS = {
  "Cache-Control": "no-store"
};

// Secrets must never be mass-assigned from request body (CWE-915)
const PROTECTED_SETTING_KEYS = ["password", "mitmSudoEncrypted"];

export async function GET() {
  try {
    const settings = await getSettings();
    const { password, oidcClientSecret, ...safeSettings } = settings;
    safeSettings.oidcConfigured = !!(safeSettings.oidcIssuerUrl && safeSettings.oidcClientId && oidcClientSecret);
    
    const enableRequestLogs = process.env.ENABLE_REQUEST_LOGS === "true";
    const enableTranslator = process.env.ENABLE_TRANSLATOR === "true";
    
    return NextResponse.json({ 
      ...safeSettings, 
      enableRequestLogs,
      enableTranslator,
      hasPassword: !!password
    }, { headers: SETTINGS_RESPONSE_HEADERS });
  } catch (error) {
    console.log("Error getting settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    // Strip protected secrets before any internal handling sets them
    for (const key of PROTECTED_SETTING_KEYS) delete body[key];

    // SECURITY: peerNodes URL validation (peerNodes-injection remediation).
    // The L1 failover consumer (cli/app/custom-server.js l1MaybeForward)
    // forwards /v1* traffic — prompts, API keys, responses — to whatever URL
    // is stored in settings.peerNodes when the local node is degraded. An
    // attacker-controlled entry turns the proxy into a traffic-forwarding
    // MITM; l1Probe also makes blind HTTP GETs to each entry (SSRF vector).
    // Reject the PATCH early if any entry fails validation. Empty array
    // (feature off) always passes.
    if (Object.prototype.hasOwnProperty.call(body, "peerNodes")) {
      const result = validatePeerNodes(body.peerNodes);
      if (!result.ok) {
        return NextResponse.json(
          {
            error: "Invalid peerNodes entry",
            peerNodesValidation: { ok: false, errors: result.errors },
            hint: "Each peerNodes entry must be an http(s) URL with no embedded credentials. Loopback, link-local (169.254.x.x), and cloud-metadata IPs are rejected.",
          },
          { status: 400 },
        );
      }
      // Replace with the normalized form (trimmed, trailing-slash stripped,
      // scheme/host lowercased, IPv4-mapped IPv6 unwrapped to plain v4).
      body.peerNodes = result.entries;
    }

    // If updating password, hash it
    if (body.newPassword) {
      const settings = await getSettings();
      const currentHash = settings.password;

      // Verify current password if it exists
      if (currentHash) {
        if (!body.currentPassword) {
          return NextResponse.json({ error: "Current password required" }, { status: 400 });
        }
        const isValid = await bcrypt.compare(body.currentPassword, currentHash);
        if (!isValid) {
          return NextResponse.json({ error: "Invalid current password" }, { status: 401 });
        }
      } else {
        // First time setting password, no current password needed
        // Allow empty currentPassword or default "123456"
        if (body.currentPassword && body.currentPassword !== "123456") {
           return NextResponse.json({ error: "Invalid current password" }, { status: 401 });
        }
      }

      const salt = await bcrypt.genSalt(10);
      body.password = await bcrypt.hash(body.newPassword, salt);
      delete body.newPassword;
      delete body.currentPassword;
    }

    if (Object.prototype.hasOwnProperty.call(body, "oidcClientSecret")) {
      if (!body.oidcClientSecret || !String(body.oidcClientSecret).trim()) {
        delete body.oidcClientSecret;
      }
    }

    // SECURITY: OIDC save-time validation (Finding #13 remediation).
    // Prevent persisting an unreachable/malformed issuer that would brick
    // password-disabled logins. Escape hatch: `skipOidcValidation: true`
    // for air-gapped or not-yet-reachable IdP setups.
    const skipOidcValidation = body.skipOidcValidation === true;
    delete body.skipOidcValidation; // never persist the flag itself

    const oidcFieldsTouched =
      Object.prototype.hasOwnProperty.call(body, "oidcIssuerUrl") ||
      Object.prototype.hasOwnProperty.call(body, "oidcClientId") ||
      Object.prototype.hasOwnProperty.call(body, "oidcClientSecret");
    const authTouched =
      oidcFieldsTouched ||
      Object.prototype.hasOwnProperty.call(body, "authMode") ||
      Object.prototype.hasOwnProperty.call(body, "ssoType");

    if (!skipOidcValidation && authTouched) {
      const existing = await getSettings();
      // When OIDC fields are touched, validate the new value. When only
      // authMode is switching to password-disabled, validate the stored
      // issuer so we don't lock the operator out of an unreachable IdP.
      const issuerToValidate = Object.prototype.hasOwnProperty.call(body, "oidcIssuerUrl")
        ? body.oidcIssuerUrl
        : existing.oidcIssuerUrl;

      // Effective auth mode after this PATCH. OIDC discovery validation only
      // applies when password login would be BLOCKED by the new mode. Per
      // src/app/api/auth/login/route.js, only "oidc", "saml", and "sso"
      // (with matching ssoType) disable password login — and only when the
      // respective SSO is fully configured. "both" always keeps password
      // login enabled, so it gets the soft probe (no lockout risk).
      const ssoType = body.ssoType || existing.ssoType || "oidc";
      const effectiveMode = Object.prototype.hasOwnProperty.call(body, "authMode")
        ? body.authMode
        : existing.authMode;
      const oidcFieldsComplete = !!(issuerToValidate && String(issuerToValidate).trim());
      const isPasswordDisabled =
        (effectiveMode === "oidc" && oidcFieldsComplete) ||
        (effectiveMode === "sso" && ssoType === "oidc" && oidcFieldsComplete);
      // Note: "saml" mode is excluded entirely — it has its own config
      // surface and does not use OIDC discovery.

      if (isPasswordDisabled) {
        // Hard gate: full discovery validation with network call. A bad issuer
        // here means the operator cannot log in at all.
        const result = await validateOidcConfigForSave({ issuerUrl: issuerToValidate });
        if (!result.ok) {
          return NextResponse.json(
            {
              error: result.message,
              oidcValidation: { ok: false, reason: result.reason },
              hint: "Pass `skipOidcValidation: true` to save anyway (e.g. the IdP is not yet reachable).",
            },
            { status: 400 },
          );
        }
      } else if (oidcFieldsTouched && issuerToValidate && String(issuerToValidate).trim()) {
        // Soft probe: only validate URL format and HTTPS (no network call).
        // Password login is still enabled, so an unreachable issuer is merely
        // inert — not a lockout risk. We still reject obviously-malformed URLs
        // to catch typos early.
        try {
          const parsed = new URL(String(issuerToValidate).trim());
          const isLocalDev = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
          if (parsed.protocol !== "https:" && !isLocalDev) {
            return NextResponse.json(
              { error: `Issuer URL must use HTTPS (got ${parsed.protocol}).`, oidcValidation: { ok: false, reason: "insecure" } },
              { status: 400 },
            );
          }
        } catch {
          return NextResponse.json(
            { error: `Issuer URL is not a valid URL: ${String(issuerToValidate).trim()}`, oidcValidation: { ok: false, reason: "invalid-url" } },
            { status: 400 },
          );
        }
      }
    }

    // SECURITY (Row 19, 2026-10-27): providerOverrides header-injection gate.
    // The dedicated /api/providers/[id]/overrides route already validates
    // headers, but PATCH /api/settings previously passed providerOverrides
    // straight to updateSettings() -> deepMergeObject with zero validation,
    // letting an authenticated user persist arbitrary headers (incl.
    // Authorization, Host, Cookie, forwarding headers) that would be sent
    // on every subsequent upstream request via base.js:132
    // `Object.assign(headers, providerOverrides.headers)`.
    //
    // Both write paths now share the same validator module so the two
    // surfaces can never drift apart.
    if (Object.prototype.hasOwnProperty.call(body, "providerOverrides")) {
      const result = validateProviderOverrides(body.providerOverrides);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    }

    const settings = await updateSettings(body);

    // Apply outbound proxy settings immediately (no restart required)
    if (
      Object.prototype.hasOwnProperty.call(body, "outboundProxyEnabled") ||
      Object.prototype.hasOwnProperty.call(body, "outboundProxyUrl") ||
      Object.prototype.hasOwnProperty.call(body, "outboundNoProxy")
    ) {
      applyOutboundProxyEnv(settings);
    }

    // Invalidate combo rotation state when strategy settings change
    if (
      Object.prototype.hasOwnProperty.call(body, "comboStrategy") ||
      Object.prototype.hasOwnProperty.call(body, "comboStickyRoundRobinLimit") ||
      Object.prototype.hasOwnProperty.call(body, "comboStrategies")
    ) {
      resetComboRotation();
    }

    if (
      Object.prototype.hasOwnProperty.call(body, "claudeAutoPing") ||
      Object.prototype.hasOwnProperty.call(body, "codexAutoPing")
    ) {
      // Keep the scheduler absent when no account opted in; load its provider graph only on demand.
      import("@/shared/services/quotaAutoPing")
        .then(({ configureQuotaAutoPing }) => {
          configureQuotaAutoPing(settings);
        })
        .catch((error) => console.warn("[AutoPing] settings update failed:", error.message));
    }

    const { password, oidcClientSecret, ...safeSettings } = settings;
    safeSettings.oidcConfigured = !!(safeSettings.oidcIssuerUrl && safeSettings.oidcClientId && oidcClientSecret);
    return NextResponse.json(safeSettings, { headers: SETTINGS_RESPONSE_HEADERS });
  } catch (error) {
    console.log("Error updating settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
