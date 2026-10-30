// Shared helpers for image provider adapters

import { assertPublicUrlResolved } from "../../../src/shared/utils/ssrfGuard.js";

export const POLL_INTERVAL_MS = 1500;
export const POLL_TIMEOUT_MS = 120000;

// SECURITY (#292): cap fetched image bytes so a provider-returned URL that
// points at a multi-GB payload cannot DoS the process by exhausting RAM.
// 16 MB is generous for any real generated image (most are <4 MB).
export const MAX_IMAGE_FETCH_BYTES = 16 * 1024 * 1024;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Map OpenAI size to provider-specific aspect ratio
export function sizeToAspectRatio(size) {
  if (!size || typeof size !== "string") return "1:1";
  const map = {
    "1024x1024": "1:1",
    "1024x1792": "9:16",
    "1792x1024": "16:9",
    "1024x1536": "2:3",
    "1536x1024": "3:2",
  };
  return map[size] || "1:1";
}

// Fetch URL → base64 (for providers returning image URLs)
//
// SECURITY (#292): harden against SSRF + memory DoS.
//
// Prior to this fix the URL was fetched with zero validation — a provider
// response (or an upstream model output that surfaces image URLs) that
// carried `http://169.254.169.254/latest/meta-data/` would exfiltrate cloud
// metadata into the returned base64 and on to the client. A malicious URL
// pointing at a multi-GB payload could also OOM the process.
//
// Now:
//   1. Scheme must be http(s) (blocks file://, gopher://, etc.).
//   2. assertPublicUrlResolved resolves the hostname and rejects link-local,
//      loopback, and cloud-metadata IPs (DNS-rebinding safe).
//   3. Stream-read with a hard byte cap so a malicious response can't OOM us.
//   4. redirect:"manual" prevents a public URL redirecting to a private one.
export async function urlToBase64(url) {
  if (typeof url !== "string" || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    throw new Error("urlToBase64: only http(s) URLs are allowed");
  }
  await assertPublicUrlResolved(url, { allowLoopback: false });

  const res = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error(`urlToBase64: redirects are not followed (got ${res.status})`);
  }
  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch image: ${res.status}`);
  }

  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_FETCH_BYTES) {
      try { await reader.cancel(); } catch { /* ignore */ }
      throw new Error(`urlToBase64: response exceeded ${MAX_IMAGE_FETCH_BYTES} bytes`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("base64");
}

export function nowSec() {
  return Math.floor(Date.now() / 1000);
}
