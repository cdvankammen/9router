#!/usr/bin/env node
// Restore requireAuth gates to routes that lost them during the merge.
// These routes had requireAuth added during session-25/26 security hardening
// but the bulk `git checkout --theirs` conflict resolution dropped them.
//
// Strategy: For each file, add the import and gate each exported handler.

import fs from "fs";
import path from "path";

const REPO = path.resolve(import.meta.dirname, "..");

const IMPORT_LINE = 'import { requireAuth } from "@/lib/auth/requireAuth";';

// Auth gate to insert at the top of each handler body
const AUTH_GATE = `    if (!(await requireAuth(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }`;

// Files to patch: [filePath, handlerNames[]]
// handlerNames: which exported functions need the gate
const TARGETS = [
  // Core IDOR-sensitive [id] routes (GET/PUT/DELETE all need gates)
  ["src/app/api/providers/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["src/app/api/proxy-pools/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["src/app/api/combos/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["src/app/api/keys/[id]/route.js", ["GET", "PUT", "DELETE"]],
  ["src/app/api/keys/route.js", ["GET", "POST"]],
  ["src/app/api/provider-nodes/[id]/route.js", ["GET", "PUT", "DELETE"]],

  // Provider sub-routes
  ["src/app/api/providers/[id]/test/route.js", ["POST"]],
  ["src/app/api/providers/[id]/test-models/route.js", ["POST"]],
  ["src/app/api/providers/[id]/overrides/route.js", ["GET", "PUT", "DELETE"]],
  ["src/app/api/providers/[id]/models/route.js", ["GET", "POST"]],
  ["src/app/api/providers/suggested-models/route.js", ["GET"]],
  ["src/app/api/providers/test-batch/route.js", ["POST"]],

  // Proxy-pool sub-routes
  ["src/app/api/proxy-pools/[id]/test/route.js", ["POST"]],

  // MCP plugin routes (stored credentials)
  ["src/app/api/mcp/[plugin]/message/route.js", ["POST"]],
  ["src/app/api/mcp/[plugin]/sse/route.js", ["GET"]],

  // OAuth import routes (stored credentials + token extraction)
  ["src/app/api/oauth/codex/bulk-import/route.js", ["POST"]],
  ["src/app/api/oauth/codex/import-token/route.js", ["POST"]],
  ["src/app/api/oauth/cursor/import/route.js", ["POST"]],
  ["src/app/api/oauth/gitlab/pat/route.js", ["POST"]],
  ["src/app/api/oauth/grok-cli/bulk-import/route.js", ["POST"]],
  ["src/app/api/oauth/iflow/cookie/route.js", ["POST"]],
  ["src/app/api/oauth/kiro/api-key/route.js", ["POST"]],
  ["src/app/api/oauth/kiro/import-cli-proxy/route.js", ["POST"]],
  ["src/app/api/oauth/kiro/import/route.js", ["POST"]],
  ["src/app/api/oauth/xiaomi-mimo/api-key/route.js", ["POST"]],
  ["src/app/api/oauth/xiaomi-mimo/login/start/route.js", ["POST"]],
  ["src/app/api/oauth/xiaomi-mimo/login/status/route.js", ["GET", "POST"]],
  ["src/app/api/oauth/zed/import/route.js", ["POST"]],

  // Usage per-connection (contains stored credentials for refresh)
  ["src/app/api/usage/[connectionId]/route.js", ["GET", "POST"]],
];

let patched = 0;
let skipped = 0;
let errors = 0;

for (const [relPath, handlers] of TARGETS) {
  const filePath = path.join(REPO, relPath);

  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${relPath}`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(filePath, "utf8");

  // Check if requireAuth is already imported
  if (content.includes("requireAuth")) {
    console.log(`SKIP (already has requireAuth): ${relPath}`);
    skipped++;
    continue;
  }

  // Step 1: Add import after the last existing import line
  const importLines = content.match(/^import\s.+$/gm);
  if (!importLines || importLines.length === 0) {
    console.log(`ERROR (no imports found): ${relPath}`);
    errors++;
    continue;
  }
  const lastImport = importLines[importLines.length - 1];
  content = content.replace(lastImport, `${lastImport}\n${IMPORT_LINE}`);

  // Step 2: Add auth gate to each handler
  for (const handler of handlers) {
    // Match: export async function HANDLER(request, ... or export async function HANDLER(request)
    const handlerRegex = new RegExp(
      `(export async function ${handler}\\(request[^)]*\\)\\s*\\{[\\s\\n]*)`,
      "g"
    );
    const match = content.match(handlerRegex);
    if (!match) {
      // Try without request param (some GETs use just (request, { params }))
      const altRegex = new RegExp(
        `(export async function ${handler}\\([^)]*\\)\\s*\\{[\\s\\n]*)`,
        "g"
      );
      const altMatch = content.match(altRegex);
      if (!altMatch) {
        console.log(`  WARN: handler ${handler} not found in ${relPath}`);
        continue;
      }
      const insertPoint = altMatch[0];
      // Only insert if this handler doesn't already have requireAuth
      const handlerBody = content.substring(
        content.indexOf(insertPoint),
        content.indexOf(insertPoint) + 500
      );
      if (!handlerBody.includes("requireAuth")) {
        content = content.replace(insertPoint, `${insertPoint}${AUTH_GATE}\n`);
      }
    } else {
      const insertPoint = match[0];
      const handlerBody = content.substring(
        content.indexOf(insertPoint),
        content.indexOf(insertPoint) + 500
      );
      if (!handlerBody.includes("requireAuth")) {
        content = content.replace(insertPoint, `${insertPoint}${AUTH_GATE}\n`);
      }
    }
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`PATCHED: ${relPath} (${handlers.length} handlers)`);
  patched++;
}

console.log(`\n--- Summary ---`);
console.log(`Patched: ${patched}`);
console.log(`Skipped: ${skipped}`);
console.log(`Errors: ${errors}`);
