# Decisions Index

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #tracking #decisions #index

Index of all ADRs in `decisions/`, newest first. Update this list when adding a new ADR — don't let it drift.

| ADR | Title |
|---|---|
| `ADR-010` | Message-driven tool-building — hybrid facet + JSON-path design |
| `ADR-011` | v3 is the sole write branch — v2 frozen, master off-limits |
| `ADR-009` | API key metadata + usage attribution schema |
| `ADR-008` | Provider page observability reuse (System B error history over System A chip) |
| `ADR-007` | Messages JSON blob vs. messages table |
| `ADR-006` | Drop indicator approach |
| `ADR-005` | SSE done-tracking passthrough |
| `ADR-004` | Fallback configuration |
| `ADR-003` | AI error analyst |
| `ADR-002` | Observability conversation tracking |
| `ADR-001` | Smart router pre-combo interception |

## When to write a new one

Any decision with real alternatives considered, where the rationale isn't obvious from the code. Format: Context → Decision → Consequences, per `../AGENTS.md`.
