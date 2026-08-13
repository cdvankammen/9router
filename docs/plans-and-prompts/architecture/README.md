# Architecture

**Date:** 2026-08-13
**Author:** Claude Code agent (main session, v1 branch)
**Status:** active
**Tags:** #architecture #index

System design docs, diagrams, data-flow descriptions, and component relationships that are broader than a single feature.

## Contents

| File | Covers |
|------|--------|
| `ARCHITECTURE.md` | Map/index into this repo's architecture docs — start here |
| `smart-router-observability.md` | Smart-router-specific design: task classification, stickiness, observability hooks |

## Relationship to `docs/ARCHITECTURE.md`

The **authoritative, whole-system** architecture doc is `docs/ARCHITECTURE.md` at the repo root (referenced directly by `CLAUDE.md`). It is out of scope for this knowledge base and is not duplicated here — `ARCHITECTURE.md` in this folder is a map that links into it by section, plus narrower design notes that don't belong in the whole-system doc.

## Conventions

Same as the parent [`../README.md`](../README.md): kebab-case filenames, date-prefix when chronological, frontmatter block (Title/Date/Author/Status/Tags) at the top of every doc.
