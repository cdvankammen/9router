# PR #5026 — fix(usage): support /api/balance for ollama cloud quota tracking
- **Author:** vfh-tech, **Merged:** 2 days ago (v0.5.109), **Files:** 3
- Ollama Cloud migrated active quota limits from /api/usage to /api/balance. /api/usage now only reports activity history.
- Fix: Fall back to /api/balance when /api/usage limits are missing. Support session (5h) + weekly (7d) remaining percentages + reset timestamps. Support allowance_usd + purchased credits. Pass through balance metadata (isCreditBalance, currency, unit, unlimited) to QuotaTable. Comprehensive vitest coverage for /api/balance parsing.
- Reviewer note: Number(undefined) is NaN, so balance entry missing remaining_percent silently renders as 100% remaining — may be worse than skipping the row.
- Relevance: **LOW** — ollama-specific quota path, likely no branch conflict.
