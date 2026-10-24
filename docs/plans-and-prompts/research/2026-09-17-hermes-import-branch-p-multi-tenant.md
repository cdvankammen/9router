# Branch P: Multi-Tenant & Multi-User Import — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, multi-tenant, multi-user, binary-tree, branch-p

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch P: MULTI-TENANT & MULTI-USER IMPORT

Support importing messages for multiple users, agents, machines, and workspaces — with clear separation, attribution, and access control.

### L2 P1: TENANT MODELS

#### L3 P1a: Single-User (Current)
- **L4 P1a1: Default Tenant**
  - L5: All imported messages belong to the single local user
  - L6: No tenant column needed; `source_app` provides attribution

#### L3 P1b: Multi-User
- **L4 P1b1: User Column**
  - L5: Add `user_id` column to `imported_messages`
  - L6: Import API accepts `user_id` in payload; UI filters by user
- **L4 P1b2: Per-User API Keys**
  - L5: Each user gets their own import API key
  - L6: Key → user mapping in `apiKeys` table

#### L3 P1c: Multi-Machine
- **L4 P1c1: Machine ID**
  - L5: Add `machine_id` column; import payload includes machine identifier
  - L6: Useful for fleet monitoring (multiple dev machines)

#### L3 P1d: Multi-Workspace
- **L4 P1d1: Workspace Column**
  - L5: Add `workspace_id` column; import payload includes workspace path/name
  - L6: Group by project/repo

### L2 P2: ATTRIBUTION DIMENSIONS

#### L3 P2a: Agent Attribution
- **L4 P2a1: Agent Name**
  - L5: `agent_name` column (hermes, claude-code, cursor, codex, custom)
  - L6: Populated from source or payload
- **L4 P2a2: Agent Version**
  - L5: `agent_version` column for debugging agent-specific issues
  - L6: From payload metadata

#### L3 P2b: Session Attribution
- **L4 P2b1: Session ID**
  - L5: `source_session_id` already exists — enforce uniqueness per tenant
  - L6: Prevents cross-tenant session confusion

### L2 P3: ACCESS CONTROL

#### L3 P3a: Read Access
- **L4 P3a1: User-Scoped Queries**
  - L5: GET /api/messages filters by authenticated user's tenant
  - L6: Server-side enforcement, never client-side only

#### L3 P3b: Write Access
- **L4 P3b1: Import Key Scoping**
  - L5: Import API key is bound to a tenant; payload tenant must match
  - L6: Reject mismatches with 403

### L2 P4: SHARED VS PRIVATE

#### L3 P4a: Shared Messages
- **L4 P4a1: Team Visibility**
  - L5: Optional `visibility: shared` flag for team-wide messages
  - L6: UI shows shared badge

#### L3 P4b: Private Messages
- **L4 P4b1: Default Private**
  - L5: Default `visibility: private` — only owner sees
  - L6: Privacy by default

### L2 P5: TENANT-LEVEL CONFIG

#### L3 P5a: Per-Tenant Settings
- **L4 P5a1: Retention Override**
  - L5: Per-tenant retention policy (see Branch R)
  - L6: Stored in settings JSON

#### L3 P5b: Per-Tenant Sanitization
- **L4 P5b1: Sanitization Rules**
  - L5: Per-tenant sensitive header lists
  - L6: Extends Branch I config

## Open Questions

1. Is multi-user a real requirement or single-user local tool?
2. Should tenant separation be enforced at DB level (row-level) or app level?
3. Does the user need fleet monitoring across machines?

## Related Implementation Plans

- `9router/impl-plan-import-10-multi-tenant-import.md` — tenant columns, key scoping, scoped queries with code