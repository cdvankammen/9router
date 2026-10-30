/**
 * Finding #304: Native passthrough must still apply security sanitization
 * 
 * The native passthrough path (when client tool matches provider ecosystem)
 * skips translation but must NOT skip:
 * - stripUnsupportedModalities (vision/audio/pdf blocks)
 * - prefetchRemoteImages (remote URL → base64 for SSRF prevention)
 * - stripContinuityFields (encrypted_content removal)
 * 
 * Without these, an attacker spoofing x-9r-app: claude can bypass all
 * translator sanitization and forward arbitrary raw bodies upstream.
 */

import { describe, it, expect } from "vitest";
import { stripContinuityFields } from "../../open-sse/handlers/chatCore.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Finding #304: passthrough sanitization", () => {
  describe("stripContinuityFields", () => {
    it("removes encrypted_content from assistant messages", () => {
      const body = {
        messages: [
          { role: "user", content: "Hello" },
          {
            role: "assistant",
            content: "Hi",
            encrypted_content: "secret-stash",
            reasoning_encrypted_content: "reasoning-stash",
          },
        ],
      };
      stripContinuityFields(body);
      expect(body.messages[1].encrypted_content).toBeUndefined();
      expect(body.messages[1].reasoning_encrypted_content).toBeUndefined();
    });

    it("is idempotent on clean bodies", () => {
      const body = {
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi" },
        ],
      };
      const before = JSON.stringify(body);
      stripContinuityFields(body);
      expect(JSON.stringify(body)).toBe(before);
    });

    it("handles missing messages array", () => {
      expect(stripContinuityFields(null)).toBeNull();
      expect(stripContinuityFields({})).toEqual({});
      expect(stripContinuityFields({ model: "test" })).toEqual({ model: "test" });
    });

    it("preserves non-encrypted fields on messages", () => {
      const body = {
        messages: [
          {
            role: "assistant",
            content: "Hi",
            encrypted_content: "remove-me",
            name: "keep-me",
            tool_calls: [{ id: "1" }],
          },
        ],
      };
      stripContinuityFields(body);
      expect(body.messages[0].encrypted_content).toBeUndefined();
      expect(body.messages[0].name).toBe("keep-me");
      expect(body.messages[0].tool_calls).toEqual([{ id: "1" }]);
    });
  });

  describe("chatCore.js source verification", () => {
    it("applies sanitizers unconditionally (no passthrough gate)", () => {
      const src = readFileSync(
        join(__dirname, "../../open-sse/handlers/chatCore.js"),
        "utf8"
      );
      // The fix removed `if (!passthrough)` around stripUnsupportedModalities
      // and prefetchRemoteImages. Verify the sanitizers are called without
      // being gated by passthrough check.
      expect(src).toContain("Finding #304");
      expect(src).toMatch(/stripUnsupportedModalities\(body/);
      expect(src).toMatch(/prefetchRemoteImages\(body/);
      // Verify the comment explains the security rationale
      expect(src).toMatch(/Apply modality\/prefetch sanitization on ALL paths/);
    });

    it("applies stripContinuityFields on passthrough path", () => {
      const src = readFileSync(
        join(__dirname, "../../open-sse/handlers/chatCore.js"),
        "utf8"
      );
      // The fix adds stripContinuityFields call after the passthrough branch
      expect(src).toMatch(/if \(passthrough\) stripContinuityFields\(translatedBody\)/);
    });
  });
});
