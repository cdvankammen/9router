# PR #4763 — feat(cli-tools): Hermes audio transcription via 9router (per-profile Audio STT toggle)
- **Author:** vergiLgood1, **Merged:** 2026-10-15 (v0.5.104), **Files:** 5
- Per-profile Audio STT toggle on Hermes card. Points profile's stt.openai.base_url at 9router's /v1/audio/transcriptions.
- hermesYaml.js: new surgical stt helpers (parseSttBlock, upsertStt9Router, removeStt9Router, is9RouterStt, buildSttBlock). Ownership fingerprint = provider:"openai" + api_key:${OPENAI_API_KEY}.
- hermes-settings route: GET→settings.stt+has9RouterStt; POST→optional audio:{enabled,model}; DELETE→removes our wiring only.
- HermesToolCard: checkbox + STT-model input (kindFilter="stt").
- Security: only writes stt.* keys + existing OPENAI_API_KEY line. No traversal (profile name regex validated).
- 10 new unit tests. E2E verified with throwaway HERMES_HOME.
- Relevance: **MEDIUM** — new Hermes feature, likely no branch conflict unless we touched Hermes.
