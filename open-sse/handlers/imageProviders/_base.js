// Shared helpers for image provider adapters

export const POLL_INTERVAL_MS = 1500;
export const POLL_TIMEOUT_MS = 120000;

// Hard ceiling on bytes consumed by urlToBase64. A malicious or buggy provider
// returning a multi-GB payload would otherwise exhaust process memory. 16 MB
// is generous for any real generated image (most are <4 MB). Restored
// 2026-10-30: upstream merge dropped this const wholesale.
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
export async function urlToBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

export function nowSec() {
  return Math.floor(Date.now() / 1000);
}
