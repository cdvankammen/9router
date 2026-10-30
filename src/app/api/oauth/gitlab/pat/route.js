import { NextResponse } from "next/server";
import { createProviderConnection } from "@/models";
import { assertHostNotLinkLocalResolved } from "@/shared/utils/ssrfGuard.js";

const GITLAB_DEFAULT_BASE = "https://gitlab.com";

/**
 * POST /api/oauth/gitlab/pat
 * Authenticate GitLab Duo with a Personal Access Token (PAT)
 */
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { token, baseUrl } = body;
    if (!token?.trim()) {
      return NextResponse.json({ error: "Personal Access Token is required" }, { status: 400 });
    }

    const base = (baseUrl?.trim() || GITLAB_DEFAULT_BASE).replace(/\/$/, "");

    // SECURITY (#253 / #287): SSRF guard on the user-supplied GitLab base URL.
    // A `baseUrl` of `http://169.254.169.254` would let an authenticated
    // attacker make the server fetch cloud metadata and leak it via the
    // user-info response body or stored providerSpecificData. Using
    // assertHostNotLinkLocalResolved (the softer DNS-aware variant) so
    // self-hosted GitLab at RFC1918 addresses still works — it still blocks
    // link-local (169.254.x.x), cloud-metadata hosts (169.254.169.254,
    // 100.100.100.200, metadata.google.internal), and loopback.
    try {
      const host = new URL(base).hostname;
      await assertHostNotLinkLocalResolved(host);
    } catch (err) {
      return NextResponse.json(
        { error: "GitLab base URL resolves to a disallowed host", detail: err.message },
        { status: 400 }
      );
    }

    // Verify token by fetching current user
    const userRes = await fetch(`${base}/api/v4/user`, {
      headers: { "Private-Token": token.trim(), Accept: "application/json" },
    });

    if (!userRes.ok) {
      const err = await userRes.text();
      return NextResponse.json({ error: `GitLab token verification failed: ${err}` }, { status: 401 });
    }

    const user = await userRes.json();
    const email = user.email || user.public_email || "";

    await createProviderConnection({
      provider: "gitlab",
      authType: "oauth",
      accessToken: token.trim(),
      refreshToken: null,
      expiresAt: null,
      email,
      displayName: user.name || user.username || email,
      testStatus: "active",
      providerSpecificData: {
        username: user.username || "",
        email,
        name: user.name || "",
        baseUrl: base,
        authKind: "personal_access_token",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("GitLab PAT auth error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
