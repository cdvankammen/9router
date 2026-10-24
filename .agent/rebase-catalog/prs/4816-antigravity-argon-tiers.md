# Issue #4816 — Update gemini 4.0 argon for Antigravity
- **Status:** Open (issue), fixed via commits in v0.5.109
- Fix commits: f172c3c "fix(antigravity): use hub/2.24.0 User-Agent and add Gemini 4 Argon medium/low tiers (#4816)"
- Changes: Update Antigravity User-Agent to hub/2.24.0 (resolves HTTP 404 on Gemini 4 Argon). Register gemini-4-argon-medium + gemini-4-argon-low tiers. Include gemini-4-argon-* in quota monitoring.
- Quota side: previous collapsing patterns (`/gemini/` + `/claude|gpt/`) silently dropped Argon allowance groups. New pattern + keys needed.
- Discovery URL was stale (daily-cloudcode-pa.sandbox.googleapis.com → 404). Production endpoint v1internal:fetchAvailableModels requires Antigravity IDE User-Agent.
- Relevance: **MEDIUM** — antigravity.js is in our 53-file overlap (4 upstream commits). Our branch may have touched antigravity. Must verify UA + tier registration.
