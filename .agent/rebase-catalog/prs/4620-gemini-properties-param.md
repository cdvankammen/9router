# PR #4620 — fix(gemini): do not treat properties map as schema node when tool param named properties

- **Author:** vesslina
- **Merged:** 2026-10-08 (v0.5.99) by decolua
- **Commits:** 1
- **Files changed:** 1
- **Status:** Closed / Merged

## Problem
Using models through Antigravity OAuth, any request with certain MCP tools fails:
```
API Error: 400 ... Invalid value at 'request.tools[0].function_declarations[131].parameters.properties[6].value'
(type.googleapis.com/google.cloud.aiplatform.master.Schema), "object"
```

## Root cause
`ensureObjectType()` in `open-sse/translator/formats/gemini.js` walks the schema and treats every object with a `properties` key but no `type` as a schema node. If a tool has a parameter literally named `properties` (free-form object), the outer `properties` map itself looks like a typeless schema, and the function adds `type: "object"` into it — which Google reads as a parameter called `type` with schema string `"object"`.

## Fix
```js
function ensureObjectType(obj) {
  if (!obj || typeof obj !== "object") return;
  if (obj.properties && !obj.type) obj.type = "object";
  for (const [key, v] of Object.entries(obj)) {
    if (!v || typeof v !== "object") continue;
    if (key === "properties" && !Array.isArray(v)) {
      for (const sub of Object.values(v)) ensureObjectType(sub);
    } else {
      ensureObjectType(v);
    }
  }
}
```

Recurse into the VALUES of a `properties` map, not the map itself.

## Verification
All 280 Breakpoint tool schemas come out clean (0 bogus entries, 2 before).

## Files touched
- `open-sse/translator/formats/gemini.js` (ensureObjectType function)

## Relevance to our branch
- **HIGH OVERLAP**: Our branch touched `open-sse/translator/formats/gemini.js` (translator work, gemini cursor commandcode bugs). Must verify our branch has this fix or apply it. This is a correctness fix that should be preferred over any divergent branch version.
