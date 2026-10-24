# PR #4784 — fix(opencode-zen): use attested free-tier identity for -free models on keyed lane
- **Author:** alwaghani, **Merged:** 2026-10-15 (v0.5.104), **Files:** 3
- Keyed opencode-zen connections get 403 FreeTierError on free-tier models (mimo-v2.6-flash-free, muse-spark-1.3-contributor-free). Upstream gates free tier behind attested identity even on keyed lane.
- Fix: helpers.js adds isOpencodeFreeTierModel() (naming-rule *-free). opencode-zen.js for free-tier models only: Bearer public + x-opencode-request + stable time-based session (stableFreeTierSessionId). Paid models unchanged.
- 8 new tests (opencode-zen-free-tier.test.js).
- **NOTE:** Our branch REMOVED isOpencodeFreeTierModel from helpers.js (we saw this diff earlier!). This is a direct conflict — we must RESTORE upstream's helper or our opencode-free tests will fail.
- Relevance: **CRITICAL DIRECT CONFLICT** — our branch deletion vs upstream addition of isOpencodeFreeTierModel.
