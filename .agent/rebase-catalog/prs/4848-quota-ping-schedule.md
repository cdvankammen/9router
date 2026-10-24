# PR #4848 — feat(quota): anchored auto-ping schedule at fixed local times
- **Author:** XFairesV1, **Merged:** last week (v0.5.104), **Files:** 8
- Existing auto-ping only reacts to quota resets. Windows drift away from work hours. Adds optional anchored ping schedule per connection: anchor time + N windows per day. Example: anchor 09:30 + 5h window + 3 pings/day → 09:30/14:30/19:30.
- Pure module src/shared/services/quotaPingSchedule.js (used by scheduler + UI). Handles timezone + anchor parsing, caps slots/day, 30-min grace period.
- Scheduler (quotaAutoPing.js): connections with schedule fire due slots on each tick. Each slot pinged once, skipped if quota exhausted. Reactive path unchanged, runs alongside.
- Storage: <provider>AutoPing.schedules[connectionId] in settings. No migration.
- UI: AutoPingScheduleModal (anchor, timezone, window, pings/day, enable toggle) via clock button on connection row.
- Tests: quota-ping-schedule.test.js + new anchored schedule suite in quota-auto-ping.test.js.
- Relevance: **LOW** — new feature, unlikely to conflict with branch.
