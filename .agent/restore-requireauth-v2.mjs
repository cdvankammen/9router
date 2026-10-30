#!/usr/bin/env node
// v2: Careful requireAuth restoration that handles import patterns correctly.
// Adds import AFTER the last `import` statement (including multi-line blocks),
// and ensures handlers have a `request` parameter.

import fs from "fs";
import path from "path";

const REPO = path.resolve(import.meta.dirname, "..");
const IMPORT_LINE = 'import { requireAuth } from "@/lib/auth/requireAuth";';

const AUTH_GATE = `    // IDOR sweep (2026-10-29): route-level requireAuth as defence-in-depth.\n    if (!(await requireAuth(request))) {\n      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n    }\n`;

// [filePath, { GET: bool, POST: bool, PUT: bool, DELETE: bool }]
const TARGETS = [
  ["src/app/api/providers/[id]/route.js", { GET: true, PUT: true, DELETE: true }],
  ["src/app/api/proxy-pools/[id]/route.js", { GET: true, PUT: true, DELETE: true }],
  ["src/app/api/combos/[id]/route.js", { GET: true, PUT: true, DELETE: true }],
  ["src/app/api/keys/[id]/route.js", { GET: true, PUT: true, DELETE: true }],
  ["src/app/api/keys/route.js", { GET: true, POST: true }],
  ["src/app/api/provider-nodes/[id]/route.js", { PUT: true, DELETE: true }],
  ["src/app/api/providers/[id]/test/route.js", { POST: true }],
  ["src/app/api/providers/[id]/test-models/route.js", { POST: true }],
  ["src/app/api/providers/[id]/overrides/route.js", { GET: true, PUT: true }],
  ["src/app/api/providers/[id]/models/route.js", { GET: true }],
  ["src/app/api/providers/suggested-models/route.js", { GET: true }],
  ["src/app/api/providers/test-batch/route.js", { POST: true }],
  ["src/app/api/proxy-pools/[id]/test/route.js", { POST: true }],
  ["src/app/api/mcp/[plugin]/message/route.js", { POST: true }],
  ["src/app/api/mcp/[plugin]/sse/route.js", { GET: true }],
  ["src/app/api/oauth/codex/bulk-import/route.js", { POST: true }],
  ["src/app/api/oauth/codex/import-token/route.js", { POST: true }],
  ["src/app/api/oauth/cursor/import/route.js", { POST: true, GET: true }],
  ["src/app/api/oauth/gitlab/pat/route.js", { POST: true }],
  ["src/app/api/oauth/grok-cli/bulk-import/route.js", { POST: true }],
  ["src/app/api/oauth/iflow/cookie/route.js", { POST: true }],
  ["src/app/api/oauth/kiro/api-key/route.js", { POST: true }],
  ["src/app/api/oauth/kiro/import-cli-proxy/route.js", { POST: true }],
  ["src/app/api/oauth/kiro/import/route.js", { POST: true, GET: true }],
  ["src/app/api/oauth/xiaomi-mimo/api-key/route.js", { POST: true }],
  ["src/app/api/oauth/xiaomi-mimo/login/start/route.js", { POST: true }],
  ["src/app/api/oauth/xiaomi-mimo/login/status/route.js", { GET: true }],
  ["src/app/api/oauth/zed/import/route.js", { POST: true, GET: true }],
  ["src/app/api/usage/[connectionId]/route.js", { GET: true }],
];

function findLastImportLine(content) {
  // Walk line by line; track whether we're inside a multi-line import.
  const lines = content.split("\n");
  let lastImportEnd = -1;
  let inImport = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimStart();
    if (!inImport && line.startsWith("import ")) {
      // Single-line import: import ... from "...";
      if (line.includes(";") || line.includes(" from ")) {
        lastImportEnd = i;
      } else {
        // Start of multi-line import
        inImport = true;
      }
    } else if (inImport) {
      // Look for closing of multi-line import: } from "...";
      if (line.includes("from ") && (line.includes(";") || line.endsWith('"') || line.endsWith("'"))) {
        lastImportEnd = i;
        inImport = false;
      } else if (line.includes("}") && line.includes("from")) {
        lastImportEnd = i;
        inImport = false;
      }
    }
  }
  return lastImportEnd;
}

function addImport(content) {
  if (content.includes("requireAuth")) return content; // already present
  const lastImport = findLastImportLine(content);
  if (lastImport < 0) return content; // no imports found
  const lines = content.split("\n");
  lines.splice(lastImport + 1, 0, IMPORT_LINE);
  return lines.join("\n");
}

function addGateToHandler(content, handlerName) {
  // Match: export async function HANDLER(request, { params }) { or
  //        export async function HANDLER(request) { or
  //        export async function HANDLER() {
  // We need to:
  //   1. Ensure `request` is a parameter
  //   2. Insert the auth gate as first statement in the body

  const handlerRe = new RegExp(
    `(export async function ${handlerName}\\s*\\()([^)]*?)(\\)\\s*\\{)`,
    "g"
  );

  return content.replace(handlerRe, (match, prefix, params, suffix) => {
    // Check if this handler body already has requireAuth
    const bodyStart = content.indexOf(match) + match.length;
    const bodySnippet = content.substring(bodyStart, bodyStart + 500);
    if (bodySnippet.includes("requireAuth")) return match;

    // Ensure `request` is in the parameter list
    let newParams = params.trim();
    if (!newParams.includes("request")) {
      if (newParams === "") {
        newParams = "request";
      } else {
        newParams = "request, " + newParams;
      }
    }

    // Build the new handler signature + gate
    return `${prefix}${newParams}${suffix}\n${AUTH_GATE}`;
  });
}

let patched = 0;
let skipped = 0;

for (const [relPath, handlers] of TARGETS) {
  const filePath = path.join(REPO, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP (not found): ${relPath}`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  // Add import
  const withImport = addImport(content);
  if (withImport !== content) {
    content = withImport;
    changed = true;
  }

  // Add gate to each handler
  for (const [handlerName, enabled] of Object.entries(handlers)) {
    if (!enabled) continue;
    const withGate = addGateToHandler(content, handlerName);
    if (withGate !== content) {
      content = withGate;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    const handlerCount = Object.values(handlers).filter(Boolean).length;
    console.log(`PATCHED: ${relPath} (${handlerCount} handlers)`);
    patched++;
  } else {
    console.log(`SKIP (no changes): ${relPath}`);
    skipped++;
  }
}

console.log(`\n--- Summary ---`);
console.log(`Patched: ${patched}`);
console.log(`Skipped: ${skipped}`);
