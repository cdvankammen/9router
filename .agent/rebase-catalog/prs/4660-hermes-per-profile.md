# PR #4660 — feat(hermes): per-profile configuration across API, Dashboard and CLI

- **Author:** vergiLgood1
- **Merged:** 2026-10-08 (v0.5.99)
- **Commits:** 5
- **Files changed:** 11
- **Status:** Closed / Merged

## Commits
1. fix(hermes): handle model:"" sentinel when writing config block
2. feat(hermes): profile-aware settings API (?profile= query param)
3. feat(dashboard): per-profile Hermes config UI (profile chips, Apply/Reset scoped)
4. feat(cli): Hermes quick setup profile selection
5. chore(hermes): sync auxiliary role list with current Hermes (adds tts_audio_tags, triage_specifier, kanban_decomposer, profile_describer, review, goal_judge; drops web_extract)

## Security notes
- Profile names validated: ^[A-Za-z0-9_-]{1,64}$ — no traversal possible
- No shell interpolation — pure fs calls
- .env handling: only OPENAI_API_KEY line upserted; bot tokens preserved
- Bulk endpoint guard: Apply to All refuses unless endpoint is known 9router endpoint

## Testing
30 new unit tests. E2E dashboard exercised in browser. CLI flow via non-TTY harness.

## Relevance to our branch
- **MEDIUM OVERLAP**: New feature, likely no direct conflict unless our branch also modified Hermes integration. Check if branch has Hermes work.
