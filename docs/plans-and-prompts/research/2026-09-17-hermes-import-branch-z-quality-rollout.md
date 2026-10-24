# Branch Z: Quality, Verification & Rollout — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, quality, verification, rollout, binary-tree, branch-z

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch Z: QUALITY, VERIFICATION & ROLLOUT

How to prove the import system works: acceptance criteria, verification harness, rollout stages, and success metrics.

### L2 Z1: ACCEPTANCE CRITERIA

#### L3 Z1a: Functional Criteria
- **L4 Z1a1: Import Fidelity**
  - L5: ≥99% of valid messages in a log file are imported with correct model/provider/status
  - L6: Measured against a hand-labeled fixture set
- **L4 Z1a2: Matching Accuracy**
  - L5: ≥95% of known models matched to correct provider
  - L6: Measured against a labeled model list

#### L3 Z1b: Non-Functional Criteria
- **L4 Z1b1: Performance**
  - L5: ≥1000 messages/sec import throughput; p95 query < 200ms
  - L6: On reference hardware
- **L4 Z1b2: Reliability**
  - L5: Zero data loss on crash (buffer flush + WAL)
  - L6: Verified by kill-during-import test

### L2 Z2: VERIFICATION HARNESS

#### L3 Z2a: Fixture Corpus
- **L4 Z2a1: Golden Files**
  - L5: `tests/fixtures/import/*.jsonl` — real log samples with expected outputs
  - L6: One fixture per format adapter
- **L4 Z2a2: Expected Outputs**
  - L5: `*.expected.json` — the exact rows that should be produced
  - L6: Diff-based assertions

#### L3 Z2b: Round-Trip Tests
- **L4 Z2b1: Export → Import**
  - L5: Export messages, re-import, assert no duplicates and identical data
  - L6: Validates Branch O + S together

#### L3 Z2c: Property Tests
- **L4 Z2c1: Fuzz Payloads**
  - L5: Random/malformed payloads never crash the importer
  - L6: Fail-open, record errors

### L2 Z3: ROLLOUT STAGES

#### L3 Z3a: Stage 1 — Manual Only
- **L4 Z3a1: Manual Import**
  - L5: Ship manual JSON import first (lowest risk)
  - L6: Validates schema + matcher + UI

#### L3 Z3b: Stage 2 — Log Tail
- **L4 Z3b1: Opt-In Log Watching**
  - L5: Enable log file watching behind a setting
  - L6: Validates parsers + dedupe

#### L3 Z3c: Stage 3 — Hook/Proxy
- **L4 Z3c1: Real-Time Ingestion**
  - L5: Enable hook + proxy capture
  - L6: Validates streaming + idempotency

#### L3 Z3d: Stage 4 — Automation
- **L4 Z3d1: Scheduling + Retention**
  - L5: Enable cron, retention, archival
  - L6: Validates lifecycle

### L2 Z4: SUCCESS METRICS

#### L3 Z4a: Adoption
- **L4 Z4a1: Coverage**
  - L5: % of agent traffic captured (target: 100% of configured agents)
  - L6: Dashboard widget

#### L3 Z4b: Value
- **L4 Z4b1: Insights Generated**
  - L5: Unknown models resolved, errors categorized, costs attributed
  - L6: Counts over time

### L2 Z5: REGRESSION PROTECTION

#### L3 Z5a: Baseline Tests
- **L4 Z5a1: Import Baseline**
  - L5: Add import tests to `tests/__baseline__/` verification scripts
  - L6: Matches existing regression baseline pattern
- **L4 Z5a2: Schema Guard**
  - L5: Test asserts `imported_messages` columns match the documented schema
  - L6: Catches accidental drift

### L2 Z6: DOCUMENTATION DELIVERABLES

#### L3 Z6a: User Docs
- **L4 Z6a1: Setup Guide**
  - L5: How to configure each agent to feed 9Router
  - L6: Per-agent snippets

#### L3 Z6b: Agent Docs
- **L4 Z6b1: Skill Update**
  - L5: Update `skills/9router-message-import/SKILL.md` with final API
  - L6: Keep skill in sync with implementation

## Open Questions

1. What's the reference hardware for performance targets?
2. Should rollout stages be feature-flagged individually?
3. Who labels the fixture corpus (user or agent)?

## Related Implementation Plans

- `9router/impl-plan-import-20-quality-rollout.md` — fixture harness, acceptance tests, staged rollout checklist with code