# PR #4537 — feat(elevenlabs): add Scribe speech-to-text support

- **Author:** zayyid123
- **Merged:** 2026-10-08 (v0.5.99) by decolua
- **Commits:** 7
- **Files changed:** 7
- **Status:** Closed / Merged

## Commits
1. `fix(models): derive PROVIDER_ID_TO_ALIAS from REGISTRY not PROVIDERS`
2. `feat(elevenlabs): add Scribe speech-to-text models`
3. `feat(stt): add the ElevenLabs Scribe transport`
4. `feat(dashboard): expose the Scribe-only params on the STT example card`
5. `test(stt): cover the ElevenLabs Scribe transport contract`
6. `chore(tests): re-snapshot the alias baseline`
7. `docs(stt): document the Scribe provider quirks`

## Files touched (inferred)
- `open-sse/providers/registry/elevenlabs.js` (Scribe model entries)
- `open-sse/providers/models/helpers.js` (PROVIDER_ID_TO_ALIAS derivation fix)
- New STT transport file (likely `open-sse/executors/elevenlabs-stt.js` or similar)
- `src/app/(dashboard)/dashboard/*/stt*` (dashboard example card)
- `tests/translator/__snapshots__/alias-baseline.test.js.snap` (re-snapshotted)

## Relevance to our branch
- **MEDIUM OVERLAP**: `helpers.js` PROVIDER_ID_TO_ALIAS derivation — our branch removed `isOpencodeFreeTierModel` from helpers.js. Need to verify our changes don't conflict with this fix.
- STT transport is new — likely no branch overlap unless we also added STT work.
- Alias baseline snapshot re-taken — our branch may have its own baseline changes.
