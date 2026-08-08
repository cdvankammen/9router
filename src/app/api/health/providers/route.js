import { NextResponse } from "next/server";
import { getProviderConnections } from "@/lib/db/repos/connectionsRepo.js";
import { getEarliestModelLockUntil } from "open-sse/services/accountFallback.js";
import { getCredentialExpiryMs } from "open-sse/services/oauthCredentialManager.js";

/**
 * GET /api/health/providers
 * Aggregate per-provider health for the dashboard:
 * - connection count (active / total)
 * - auth status: ok | expired | needs-reauth (refresh failures) | none
 * - lock state: is any model lock active right now?
 * - last error (message + code + time) if the connection is in a bad state
 *
 * Never exposes secrets — apiKey/refreshToken are omitted.
 */
export async function GET() {
  try {
    const connections = await getProviderConnections();

    const byProvider = new Map();
    for (const conn of connections) {
      if (!conn) continue;
      const entry = byProvider.get(conn.provider) || {
        provider: conn.provider,
        total: 0,
        active: 0,
        auth: "ok", // ok | expired | needs-reauth | none
        locked: 0,
        lastError: null,
        lastErrorAt: null,
        lastErrorCode: null,
      };
      entry.total += 1;
      if (conn.isActive !== false) entry.active += 1;

      // Auth status
      const authType = String(conn.authType || "").toLowerCase().replace(/_/g, "");
      if (authType === "oauth") {
        const expiresMs = getCredentialExpiryMs(conn);
        if (expiresMs !== null && expiresMs <= Date.now()) entry.auth = "expired";
        else if (entry.auth !== "expired" && !conn.refreshToken) entry.auth = "needs-reauth";
      } else if (!conn.apiKey) {
        if (entry.auth === "ok") entry.auth = "none";
      }

      // Auto-disabled by repeated refresh failures → needs re-auth
      if (conn.needsReauthReason) {
        entry.auth = "needs-reauth";
        entry.reauthReason = String(conn.needsReauthReason).slice(0, 160);
      }

      // Lock state — ANY active model lock (per-model or account-level)
      if (getEarliestModelLockUntil(conn) !== null) entry.locked += 1;

      // Last error (only surface recent/meaningful ones)
      if (conn.lastError && conn.lastError !== "success") {
        const at = conn.lastErrorAt ? new Date(conn.lastErrorAt).getTime() : 0;
        // Prefer the most recent error across connections
        if (!entry.lastErrorAt || at > new Date(entry.lastErrorAt).getTime()) {
          entry.lastError = String(conn.lastError).slice(0, 120);
          entry.lastErrorAt = conn.lastErrorAt || null;
          entry.lastErrorCode = conn.lastErrorCode || conn.errorCode || null;
        }
      }

      byProvider.set(conn.provider, entry);
    }

    const providers = [...byProvider.values()].sort((a, b) => a.provider.localeCompare(b.provider));
    const needsAttention = providers.filter(
      (p) => p.auth === "expired" || p.auth === "needs-reauth" || p.locked === p.active || p.lastError
    );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      providers,
      needsAttention: needsAttention.map((p) => p.provider),
      summary: {
        providerCount: providers.length,
        totalConnections: connections.length,
        attentionCount: needsAttention.length,
      },
    });
  } catch (error) {
    console.error("[health/providers] failed:", error);
    return NextResponse.json({ error: "Failed to read provider health" }, { status: 500 });
  }
}
