/**
 * Pure text-extraction helpers — server-safe (no "use client").
 *
 * `extractText` was originally defined in `src/shared/messageFormats.js`,
 * which is marked "use client" for the Messages page. The requestDetails
 * repo (server) needs the same extraction for the FTS index, but Next.js
 * refuses to call client-module functions from the server. This module is
 * the shared, framework-neutral home; the client module re-exports it.
 */

/** Extract plain text from a content value of any shape (string/array/blocks). */
export function extractText(content, depth = 0) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (depth > 10) return ""; // guard against deep/circular structures
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        if (typeof b === "string") return b;
        if (b?.text) return b.text;
        if (b?.content) return extractText(b.content, depth + 1);
        return "";
      })
      .join("\n");
  }
  return "";
}
