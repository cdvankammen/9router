# Learnings — OpenRouter "Refresh Models" appeared to hang

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #learnings #bugfix #providers #openrouter #frontend

## The report

Clicking "Refresh Models" on the OpenRouter provider page left the button stuck
disabled with a spinner ("Fetching..."), indefinitely. The user pushed back hard
on a first-pass "add a fetch timeout" fix, correctly pointing out that the same
API key pulls the full OpenRouter model list instantly through VSCode Copilot's
BYOK model picker — so the key, the upstream, and 9Router's HTTP client were
all proven fine. The bug had to be in 9Router's own mechanism, not the network
call itself.

## Don't diagnose a live-symptom bug from static review alone

The first pass (timeout/AbortController additions) was a defensible safety net
but never identified as *the* cause — it was added on hypothesis, not evidence.
The actual root cause only surfaced by **exercising the running dev server
directly**: `curl`ing `/api/providers` for the stored connection id, then
`curl`ing `/api/providers/{id}/models?refresh=1` and timing it. That one curl
returned all 410 OpenRouter models in about a second — which immediately ruled
out the backend route, the stored key, and the upstream, and reframed the
question as "where does the frontend spend the other several minutes."

**Takeaway:** when a user reports a stuck-forever UI state but says the
underlying credential/API demonstrably works elsewhere, curl the actual backend
route the button calls before touching frontend code. It's the fastest way to
bisect "network/backend" vs. "frontend logic" — and it's what actually found
this bug, not the timeout guess.

## Root cause: O(n) redundant refetch inside a serial per-item loop

`handleImportModels` (`page.js`) looped over every model OpenRouter returned
and called `handleAddCustomModel` for each one. That helper does three things,
all awaited:

1. `POST /api/models/custom` (add one model)
2. `await fetchCustomModels()` — refetches the **entire** custom-models list
3. `window.dispatchEvent(new CustomEvent("customModelChanged"))`

With 410 models, that's 410 × 2 sequential network round trips (POST + a GET
whose response body grows every iteration), fully serial, before
`setImportingModels(false)` in the `finally` block ever runs. Nothing was
actually hung — it was a legitimately slow O(n²)-ish operation with **zero
progress feedback**, so a static "Fetching..." label was indistinguishable
from a real infinite hang from the user's point of view.

A second, independent finding: the `alreadyExists` de-dupe check inside the
loop reads `customModels`/`modelAliases` from the closure captured when
`handleImportModels` was invoked. The mid-loop `fetchCustomModels()` calls
inside `handleAddCustomModel` never updated that closure — so all those
refetches weren't even buying fresher de-dupe data. They were pure waste,
100% of the time, for this call site specifically.

**Takeaway:** a helper designed for one-at-a-time interactive use (click "add
model" → refetch → re-render) silently becomes an O(n) accidental complexity
trap when reused inside a bulk-import loop. Check what a shared helper does
internally before calling it in a loop over provider-scale data (some
providers return 400+ models).

## Fix shape

- Compute the to-add list once, up front, against the click-time snapshot.
- POST each new model directly (bypassing `handleAddCustomModel`) with an
  8-way bounded-concurrency worker pool — not full parallel (410 at once)
  and not serial.
- Refetch `customModels` and dispatch `customModelChanged` **once**, after
  the whole batch settles — not per item.
- Surface real progress (`Importing 123/410...`) on the button instead of a
  static label, so a slow-but-working operation doesn't read as broken.

`handleAddCustomModel` itself was left untouched — it's still correct and
used for its original one-at-a-time call sites (Qoder import, manual "Add
Custom Model" modal, `ModelSelectModal` selection).

## Related
- `../CHANGELOG.md` UPDATE 2026-08-13
- `src/app/(dashboard)/dashboard/providers/[id]/page.js` (`handleImportModels`)
- Contrast with `2026-08-12-provider-observability-and-usage-fixes.md`
  (same file, same session's-worth-later bug — different root cause class:
  that one was a missing feature/data flow, this one is an accidental
  quadratic-ish loop)
