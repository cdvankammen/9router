import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR } from "@/lib/dataDir";
import { getSettings } from "@/lib/localDb";

const DEFAULT_PASSWORD = "123456";
const SESSION_MAX_AGE_SEC = 24 * 60 * 60;

function loadJwtSecret() {
  // Production: JWT_SECRET must be set explicitly — fail fast if missing
  const isProd = process.env.NODE_ENV === "production";

  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  const file = path.join(DATA_DIR, "jwt-secret");

  // Dev mode: reuse a persisted secret if present, else generate one.
  // A failed read is logged (not swallowed) so a broken secret file is
  // visible instead of silently rotating sessions.
  if (!isProd) {
    try {
      const existing = fs.readFileSync(file, "utf8").trim();
      if (existing) return existing;
    } catch (e) {
      console.warn("[JWT] secret file unreadable (%s), regenerating:", e.code);
    }
    console.warn(
      "⚠️  [DEV] JWT_SECRET not set — generating ephemeral secret. " +
      "Set JWT_SECRET in .env for stable sessions across restarts."
    );
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const generated = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(file, generated, { mode: 0o600 });
    return generated;
  }

  // Production: hard fail without JWT_SECRET
  throw new Error(
    "JWT_SECRET is required in production. Set it in your environment or .env file. " +
    "Generate one with: openssl rand -hex 32"
  );
}

const SECRET = new TextEncoder().encode(loadJwtSecret());

export function shouldUseSecureCookie(request) {
  const forceSecureCookie = process.env.AUTH_COOKIE_SECURE === "true";
  const forwardedProto = request?.headers?.get?.("x-forwarded-proto");
  const isHttpsRequest = forwardedProto === "https";
  return forceSecureCookie || isHttpsRequest;
}

export async function createDashboardAuthToken(claims = {}) {
  return new SignJWT({ authenticated: true, ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET);
}

export async function verifyDashboardAuthToken(token) {
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch (e) {
    if (e.code !== "ERR_JWS_INVALID" && e.code !== "ERR_JWT_EXPIRED" && !String(e.message || "").toLowerCase().includes("invalid")) {
      console.warn("[dashboardSession] verifyDashboardAuthToken unexpected error:", e.message);
    }
    return false;
  }
}

export async function getDashboardAuthSession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch (e) {
    if (e.code !== "ERR_JWS_INVALID" && e.code !== "ERR_JWT_EXPIRED" && !String(e.message || "").toLowerCase().includes("invalid")) {
      console.warn("[dashboardSession] getDashboardAuthSession unexpected error:", e.message);
    }
    return null;
  }
}

export async function setDashboardAuthCookie(cookieStore, request, claims = {}) {
  const token = await createDashboardAuthToken(claims);
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export function clearDashboardAuthCookie(cookieStore) {
  cookieStore.delete("auth_token");
}

// Verify the current dashboard password (re-auth for sensitive actions).
export async function verifyDashboardPassword(password) {
  if (typeof password !== "string" || !password) return false;
  const settings = await getSettings();
  const storedHash = settings?.password;
  if (storedHash) return bcrypt.compare(password, storedHash);
  const initialPassword = process.env.INITIAL_PASSWORD || DEFAULT_PASSWORD;
  return password === initialPassword;
}
