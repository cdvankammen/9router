# PR #4761 — fix(capabilities): advertise PDF input for current Claude models
- **Author:** mj10612, **Merged:** 2026-10-15 (v0.5.104), **Files:** 4, **Fixes:** #4670
- Built-in Claude capability entries omit pdf=true → /v1/models reports pdf=false.
- Fix: add pdf=true to exact entries for current Claude models + family patterns (Haiku 4/5, Opus 4, Sonnet 4).
- 70 tests passed (claude-pdf-capabilities, claude-pdf-models, capabilities, combo-capabilities, v1-models-combo-context).
- Relevance: **HIGH** — capabilities.js is in 53 overlapping files (17 upstream commits). Must preserve.
