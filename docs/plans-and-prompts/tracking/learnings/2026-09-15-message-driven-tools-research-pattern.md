# Learnings — Message-Driven Tool-Building: the "everything is a dimension" research pattern

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** active
**Tags:** #learnings #research #messages #observability #identity #filter

## The situation

The user asked to "look at messages per conversation" and "use everything in a message request for filter/build/record/more options" — i.e., make every field of a captured message a first-class dimension. The research session produced a doc, a plan, and an ADR. The key learning is the **research pattern** that made it work, plus the **gaps that remain**.

## Root cause / pattern

The captured `requestDetails.data` blob is a rich structured event (~30+ fields) but only ~10 fixed dimensions are filterable server-side. The research identified 9 gaps and 4 design options. The recommended hybrid (extract-and-index hot path + JSON-path long tail) mirrors the existing `requestDetails` columns + `data` JSON pattern (ADR-007).

## Detection / prevention

- **Verify companion docs exist.** The research doc linked to `planning/message-driven-tools-plan.md` which did NOT exist — a dangling link. Always check that referenced docs are created in the same pass.
- **Update indexes in the same commit.** `research/README.md`, `planning/README.md`, `tracking/DECISIONS.md`, `tracking/CHANGELOG.md`, `tracking/TASKS.md`, `tracking/SESSION-HISTORY.md`, `tracking/SESSION-NARRATIVE.md` all need rows when a new doc lands (per `../AGENTS.md` discipline).
- **ADR for design decisions.** Option 4 (hybrid) is a recommendation, not a decision — it needs an ADR (ADR-010) to record the alternatives rejected and the reversibility.
- **Flag unverified dependencies.** `src/lib/sourceApps.js` existence was flagged Medium confidence in the research — verify before implementing M3.

## Links

- Research: `../research/9router/38-message-driven-tools-research.md`
- Plan: `../planning/message-driven-tools-plan.md`
- ADR: `../tracking/decisions/ADR-010-message-driven-tools-hybrid-design.md`
- Prior capture research: `../research/message-capture-deep-research-v2.md`, `../research/message-capture-v4-deep-pass.md`