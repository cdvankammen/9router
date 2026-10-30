# Rebase/Merge Skill: Methodology & Procedures

**Date:** 2026-10-29
**Status:** living document (updated after each merge)
**Purpose:** Reusable procedures for integrating upstream changes while preserving local security hardening and feature work
**Source:** Extracted from session 4efa60a4 (Oct 23-27, v4→v5 merge) + session 20/21 (security findings + v0.5.112 planning)

---

## 1. When to Use This Skill

**Trigger conditions:**
- `origin/master` has new commits that we don't have
- Local branch has diverged significantly (100+ commits ahead)
- Security hardening or feature work must be preserved
- Upstream fixes should be adopted when compatible with our features

**Do NOT use when:**
- Simple fast-forward is possible (we're only behind, not ahead)
- Upstream has force-pushed (requires different strategy)
- Working tree is dirty (commit or stash first)

---

## 2. Pre-Merge Checklist (DO NOT SKIP)

### 2.1 Honest State Assessment
```bash
# Know where you are BEFORE touching anything
git branch --show-current
git log --oneline -3
git fetch origin
git rev-list --left-right --count HEAD...origin/master
# Expected output: N ahead, M behind
```

**Learned from session 4efa60a4:** Always verify the actual state. Don't trust assumptions from prior sessions — git state changes, branches move, upstream rebases happen.

### 2.2 Snapshot Baselines
```bash
# Preserve pre-merge state for diff comparison
cp tests/__baseline__/providers-baseline.json /tmp/providers-pre-merge.json
cp tests/__baseline__/alias-baseline.json /tmp/alias-pre-merge.json
git diff HEAD > /tmp/pre-merge-working-tree.patch  # if dirty
git log --oneline > /tmp/pre-merge-commit-log.txt
```

**Learned from MERGE-13:** Baselines change with new providers. Without a snapshot, you can't tell what the merge added vs what was already there.

### 2.3 Conflict Prediction
```bash
# Find files both sides touched
for f in $(git diff --name-only HEAD...origin/master); do
  if git log --oneline origin/master..HEAD -- "$f" | head -1 | grep -q .; then
    echo "CONFLICT-CANDIDATE: $f"
    git log --oneline origin/master..HEAD -- "$f" | head -3 | sed 's/^/  ours: /'
    git log --oneline HEAD..origin/master -- "$f" | head -3 | sed 's/^/  theirs: /'
  fi
done
```

**Learned from session 21:** Cross-reference BEFORE merging. Categorize by risk (HIGH/MED/LOW). Plan resolution strategy per file.

### 2.4 Write the Plan Document
Create `docs/plans-and-prompts/planning/YYYY-MM-DD-vX.Y.Z-merge-plan.md` with:
- Honest state assessment (ahead/behind counts)
- Upstream commit classification (ADDITIVE / KEEP+MERGE / SAME-FIX)
- Conflict candidate files with resolution strategies
- Verification gates (syntax, marker scan, security features, regression, build, runtime)
- Risk areas specific to this merge
- Learnings carried forward from prior merges

**Learned from MERGE-21 planning:** A written plan forces honest assessment. "I think there won't be conflicts" is not a plan.

---

## 3. Strategy Selection

### Option A: Single Merge Commit (RECOMMENDED for 100+ commit divergence)
```bash
git merge origin/master
# Resolve conflicts per plan
git add -A && git commit
```

**When to use:**
- Local branch has 100+ commits of unique work
- History preservation matters (audit trail, SHA references in docs)
- Conflicts are tractable (< 20 files)

**Learned from session 4efa60a4:** The v4→v5 merge used this strategy. 462 files changed, 21 conflicts, all resolved. History preserved intact.

### Option B: Cherry-Pick Upstream Commits
```bash
for sha in $(git log --pretty=format:'%h' HEAD..origin/master); do
  git cherry-pick $sha
  # Resolve conflicts per commit
done
```

**When to use:**
- Option A produces unresolvable conflicts
- Upstream commits are independent (no dependency chains)
- You need granular control over which commits to accept

**Learned from MERGE-13:** Cherry-picking loses merge topology. Use only when merge fails.

### Option C: Rebase Local onto Upstream
```bash
git rebase origin/master
# Resolve conflicts per commit
git push --force-with-lease
```

**When to use:**
- Local branch has < 20 commits
- Linear history is critical
- You control all downstream consumers (no shared SHAs)

**DO NOT USE when:**
- Local branch has 100+ commits (rewrites too many SHAs)
- SHAs are referenced in docs, audit logs, or session memory
- Force-push would break worktrees or collaborators

**Learned from session 21:** Rebase was explicitly rejected for v5-vscode-works (412 commits, every SHA referenced in audit doc).

---

## 4. Conflict Resolution Patterns

### 4.1 CHANGELOG.md — Concatenate
**Pattern:** Both sides add entries under different version headers.
**Resolution:**
```markdown
## Unreleased / Security Hardening (ours)
- #316 outboundProxyUrl SSRF guard
- #321 usage GET requireAuth

## v0.5.112 (theirs)
- feat(minimax-code): lease auth mode
- fix(deepseek): noble-hashes PoW
```

**Learned from MERGE-13:** Never drop entries from either side. Concatenate with clear section headers.

### 4.2 Import Sets — Union
**Pattern:** Both sides add imports to the same file.
**Resolution:**
```javascript
// Ours
import { requireAuth } from "@/lib/auth/requireAuth";
import { assertPublicUrlResolved } from "@/shared/utils/ssrfGuard";

// Theirs
import { MinimaxLeaseButton } from "./components/MinimaxLeaseButton";

// Merged: both import sets, alphabetized
import { MinimaxLeaseButton } from "./components/MinimaxLeaseButton";
import { assertPublicUrlResolved } from "@/shared/utils/ssrfGuard";
import { requireAuth } from "@/lib/auth/requireAuth";
```

**Learned from MERGE-13:** Union dedup. Never drop an import from either side. Alphabetize to reduce future conflicts.

### 4.3 Handler Signatures — Semantic Merge
**Pattern:** Both sides add parameters to the same function.
**Resolution:**
```javascript
// Ours: added conversationId, rtkEnabled
async function handleChatCore({ body, modelInfo, credentials, conversationId, rtkEnabled })

// Theirs: added customPrompt
async function handleChatCore({ body, modelInfo, credentials, customPrompt })

// Merged: union of parameters, documented in JSDoc
/**
 * @param {string} options.conversationId - Observability tracking (ours)
 * @param {boolean} options.rtkEnabled - Token compression (ours)
 * @param {string} options.customPrompt - Custom prompt injection (theirs)
 */
async function handleChatCore({ body, modelInfo, credentials, conversationId, rtkEnabled, customPrompt })
```

**Learned from session 4efa60a4:** The `handleChatCore` signature merge was a Stage-1 hazard. Document the union explicitly.

### 4.4 Provider Registry — Renumber + Union
**Pattern:** Both sides add entries to a numbered registry.
**Resolution:**
```javascript
// Ours: p120 = 9router virtual provider
{ id: 120, name: "9router", ... }

// Theirs: p120 = fish-audio
{ id: 120, name: "fish-audio", ... }

// Merged: renumber theirs to p121, keep ours at p120
{ id: 120, name: "9router", ... }
{ id: 121, name: "fish-audio", ... }
```

**Learned from MERGE-13:** Provider registry uses numeric IDs. Renumber to avoid collision. Run `scripts/migrate-registry.mjs` post-merge.

### 4.5 Security Features — NEVER DROP
**Pattern:** Upstream refactor accidentally removes our security fix.
**Resolution:**
- Inspect every file in the "security features" gate (see section 6.3)
- If upstream removed a security feature, re-add it in a follow-up commit
- Document the restoration in the conflict log

**Learned from session 20/21:** CORS Phase 3B moved `withCorsHeaders` from executors to route boundaries. If upstream adds it back inside executors, we must re-strip it.

---

## 5. Verification Gates (ALL MUST PASS)

### Gate 1: Syntax
```bash
for f in $(git diff --name-only HEAD^ HEAD | grep '\.js$'); do
  node --check "$f" || echo "SYNTAX FAIL: $f"
done
```
**Expected:** 0 failures

### Gate 2: Conflict Marker Scan
```bash
grep -rn '^<<<<<<< \|^>>>>>>> ' --include='*.js' --include='*.json' --include='*.md' .
```
**Expected:** 0 matches (loose `=======` in comments is OK per MERGE-13)

### Gate 3: Must-Keep Security Features
Create a checklist of security features that MUST survive the merge. Verify each with grep.

**Example from session 21:**
| Feature | File | Verification |
|---------|------|--------------|
| CORS Phase 3B | `open-sse/executors/*.js` | No `withCorsHeaders` in executors |
| rawHeaders allowlist | `open-sse/handlers/chatCore.js:190` | `ALLOWED_HEADER_KEYS` Set present |
| requireAuth gates | `src/app/api/health/providers/route.js` | `requireAuth(request)` call present |
| MITM 127.0.0.1 bind | `src/mitm/server.js` | `server.listen(PORT, "127.0.0.1", ...)` |

### Gate 4: Test Suite Regression
```bash
cd tests && npx vitest run
node __baseline__/verify-no-regression.mjs results.json
```
**Expected:** "✅ No regression." with fails ≤ baseline-known

**Learned from session 20:** NEVER claim "0 regressions" without honestly running verify-no-regression.mjs. The script accounts for expected-fails and snapshot failures correctly.

### Gate 5: Build
```bash
npm run build
```
**Expected:** exit 0, standalone output generated

### Gate 6: Runtime Smoke
```bash
PORT=20128 node custom-server.js &
curl -s http://localhost:20128/api/health | jq .
curl -s http://localhost:20128/api/version | jq .
kill %1
```
**Expected:** both return 200 with expected JSON shape

**Learned from MERGE-16:** Smoke test on a different port than production. Verify production is unaffected after smoke.

---

## 6. Post-Merge Documentation (REQUIRED)

### 6.1 Conflict Resolution Log
Fill in the plan document's conflict log section:
```markdown
| # | File | Strategy | Notes |
|---|------|----------|-------|
| 1 | CHANGELOG.md | Concatenate | Ours under "Unreleased / Security", theirs under "v0.5.112" |
| 2 | open-sse/handlers/chatCore/nonStreamingHandler.js | Semantic merge | Upstream SSE check FIRST, then our CORS wrap |
```

### 6.2 CHANGELOG Entry
Add an entry under "Unreleased / Integration":
```markdown
## Unreleased / Integration
- **2026-10-29:** Merged origin/master (v0.5.111 → v0.5.112, 14 commits)
  - 32 conflict candidates, 8 resolved manually
  - All security features verified intact
  - Test suite: 54 fails vs 56 baseline known = 0 regressions
```

### 6.3 Session Memory Update
Update `/memories/session/v5-vscode-works-session-N.md` with:
- Merge commit SHA
- Number of conflicts encountered
- Number of conflicts resolved manually vs auto
- Any surprises (files that conflicted unexpectedly, features that were lost and restored)
- Lessons learned (what went well, what to improve)

### 6.4 Retrospective (GATE 7)
After the merge is complete and verified, write a retrospective:
```markdown
# MERGE-21 Retrospective

## What Went Well
- Conflict prediction was accurate (8 HIGH/MED files, all resolved cleanly)
- Security features survived intact (all 8 gates passed)
- Test suite showed 0 regressions on first run

## What Went Wrong
- [Be honest — what surprised you? What took longer than expected?]

## What to Improve
- [Specific, actionable improvements for next merge]

## Time Tracking
- Planning: X hours
- Conflict resolution: Y hours
- Verification: Z hours
- Total: T hours

## Comparison to Prior Merges
- MERGE-13 (v0.5.75): 17 conflicts, 2 days
- MERGE-20 (v0.5.109): 21 conflicts, 5 days
- MERGE-21 (v0.5.112): 8 conflicts, ? hours
```

---

## 7. Learnings Carried Forward (Updated After Each Merge)

### From MERGE-13 (v0.5.75, 2026-09-10)
1. Always snapshot baselines pre-merge
2. Never trust "no conflict" from git — semantic conflicts don't produce markers
3. Regenerate registry after merge (`scripts/migrate-registry.mjs`)
4. zsh commit escaping: use multiple `-m` flags, never `\n` in double quotes

### From MERGE-20 (v0.5.109, session 4efa60a4, 2026-10-23-27)
5. Transparent follow-up commits > history rewriting (amend is dangerous)
6. Source edits via replace_string_in_file CAN fail silently — ALWAYS grep to verify
7. Multi-model scrutiny catches bugs a single model misses (3 distinct families, not 3 prompts to same model)
8. The CAR block loss: always verify critical code paths post-merge, not just tests

### From Session 20/21 (security findings + v0.5.112 planning, 2026-10-28-29)
9. Tests that mock translator/index.js need a `register` export (side-effect registration)
10. Loopback-only allowlists are STRONGER than DNS-resolved checks when legitimate source is always literal loopback
11. Source-ordering assertions are brittle — scope to function body via indexOf
12. Honest state assessment BEFORE planning — don't trust assumptions from prior sessions
13. Write the plan document BEFORE executing — forces honest assessment
14. Upstream fixes should be adopted when compatible — "willingness to access master branches fixes above our own"

### From Chat Log Analysis (session 4efa60a4 full transcript review, 2026-10-29)

**Pattern 1: User directive repetition indicates critical requirements**
- User repeated "continue till done" directive ~30 times in session 4efa60a4
- Repeated "triple-proof testing" (DOM + vitest + visual) ~15 times
- Repeated "multi-model scrutiny (3 distinct families)" ~10 times
- **Codified as:** Standing directives in resume-work skill + master-coding-rule.md section 6

**Pattern 2: Time sinks that delayed completion**
- **CAR block loss (4+ hours):** Critical code path lost during merge, not caught by tests. Discovered only when runtime smoke failed. **Fix:** Gate 3 (must-keep security features) now includes critical code paths, not just security features.
- **handleChatCore signature merge (8+ hours):** Both sides added parameters. Required manual union of 12 parameters. **Fix:** Handler signature merge pattern (section 4.3) now documents union strategy explicitly.
- **THE BIG DEDUP investigation (12+ hours):** Hypothesis that local commits were duplicates of upstream. Investigated and rejected — 13 fixes confirmed unique. **Fix:** Conflict prediction (section 2.3) now includes "check for SAME-FIX classification" to avoid wasting time on duplicates.
- **Absorption rate correction (2+ hours):** Initially reported 92.5% absorption, user challenged, re-verification found 100%. **Fix:** Honest state assessment (section 2.1) now includes "verify claims with grep, not assumptions."

**Pattern 3: Anti-patterns that caused user frustration**
- **Stopping work without explanation:** User asked "why did you stop?" 7 times in session 4efa60a4. **Fix:** Critical-path-solver skill + standing directive "never stop without explaining why and what's needed to continue."
- **Claiming completion prematurely:** User said "don't stop until it's done" 12 times. **Fix:** Auto-audit skill enforces "genuine completion on every platform."
- **Not using available scrutiny tools:** User directive at Turn 83: "use mimo 2.6 to scrutinize any plans, code changes." **Fix:** Cross-review skill + multi-model review in Gate 3.

**Pattern 4: Build/test machine constraints**
- User directive at Turn 118: "always build using mini4 or mini5, not mini2 (not enough RAM), not laptop."
- **Codified as:** Build-on-commit guardrail specifies "build on mini4/mini5 only."

**Pattern 5: Upstream adoption willingness**
- User directive: "willingness to access master branches fixes above our own as long as our own is still going to work or reprogrammed in a way to allow the features to work."
- **Codified as:** Strategy selection (section 3) now includes "prefer upstream when compatible" guidance.
- **Example:** MERGE-20 adopted upstream's smartRouter → systemoneRouter transition (da52d462 DROP decision). Local smartRouter code remained but inert.

**Pattern 6: Documentation as skill-building**
- User directive (session 21): "treat every merge as skill-building documentation. Analyze ENTIRE chat log. Build a comprehensive repertoire."
- **Codified as:** Gate 7 (retrospective & skill extraction) is now MANDATORY, not optional.
- **Deliverable:** This skill document itself, updated after every merge.

---

## 8. Anti-Patterns (DO NOT DO THESE)

### 8.1 Blind Merge
**Anti-pattern:** `git merge origin/master` without conflict prediction or plan.
**Why it fails:** Surprises during conflict resolution lead to rushed decisions, dropped features.
**Fix:** Always do section 2 (pre-merge checklist) first.

### 8.2 Claiming "0 Regressions" Without Verification
**Anti-pattern:** "Tests pass, no regressions" without running verify-no-regression.mjs.
**Why it fails:** The script accounts for expected-fails and snapshot failures. Raw pass/fail counts are misleading.
**Fix:** Always run the baseline verification script. Report its exact output.

### 8.3 History Rewriting
**Anti-pattern:** `git rebase -i` or `git commit --amend` to hide mistakes.
**Why it fails:** Breaks SHA references in docs, audit logs, session memory. Collaborators lose work.
**Fix:** Transparent follow-up commits. Document the mistake honestly.

### 8.4 Dropping Security Features
**Anti-pattern:** Accepting upstream's refactor that accidentally removes our security fix.
**Why it fails:** Security regression. Attack surface reopens.
**Fix:** Gate 3 (must-keep security features) is non-negotiable. Re-add in follow-up if lost.

### 8.5 Skipping Runtime Smoke
**Anti-pattern:** "Tests pass, build succeeds, we're done."
**Why it fails:** Tests don't catch runtime issues (missing env vars, DB migration failures, port conflicts).
**Fix:** Gate 6 (runtime smoke) on a different port than production.

---

## 9. Skill Evolution (Track Improvements Over Time)

| Merge | Date | Conflicts | Hours | Surprises | Lessons Added |
|-------|------|-----------|-------|-----------|---------------|
| MERGE-13 | 2026-09-10 | 17 | ~16h | usage.js split into sub-files | 1-4 |
| MERGE-20 | 2026-10-23-27 | 21 | ~120h | CAR block loss, handleChatCore signature | 5-8 |
| MERGE-21 | 2026-10-29 | _pending_ | _pending_ | _pending_ | 9-14 |

**Goal:** Each merge should be faster and have fewer surprises than the last. If not, the skill documentation is incomplete.

---

## 10. When to Update This Document

Update this skill document:
- **Before each merge:** Review the checklist, add any new pre-merge steps learned
- **During each merge:** Note surprises in the conflict log
- **After each merge:** Write the retrospective, update section 7 (learnings) and section 9 (evolution table)
- **When a pattern emerges:** If you do the same thing 3 times, codify it as a pattern (section 4)
- **When an anti-pattern bites you:** Document it in section 8

This is a living document. It grows with each merge.

---

## Appendix A: Quick Reference Checklist

**Pre-Merge:**
- [ ] Honest state assessment (ahead/behind counts)
- [ ] Snapshot baselines to /tmp
- [ ] Conflict prediction (cross-reference files)
- [ ] Write plan document
- [ ] Get user go-ahead

**During Merge:**
- [ ] `git merge origin/master`
- [ ] Resolve conflicts per plan (section 4 patterns)
- [ ] Syntax check all resolved JS files
- [ ] Conflict marker scan
- [ ] `git add -A && git commit`

**Post-Merge:**
- [ ] Gate 1: Syntax (all JS files parse)
- [ ] Gate 2: Conflict marker scan (0 matches)
- [ ] Gate 3: Must-keep security features (all present)
- [ ] Gate 4: Test suite + regression check
- [ ] Gate 5: Build (exit 0)
- [ ] Gate 6: Runtime smoke (health + version endpoints)
- [ ] Gate 7: Retrospective written
- [ ] Update CHANGELOG.md
- [ ] Update session memory
- [ ] Update this skill document (section 7, 9)

---

## Appendix B: Git Command Reference

```bash
# State assessment
git rev-list --left-right --count HEAD...origin/master
git diff --name-only HEAD...origin/master
git log --oneline HEAD..origin/master

# Baseline snapshot
cp tests/__baseline__/*.json /tmp/

# Conflict prediction
for f in $(git diff --name-only HEAD...origin/master); do
  git log --oneline origin/master..HEAD -- "$f" | head -1
  git log --oneline HEAD..origin/master -- "$f" | head -1
done

# Merge
git merge origin/master

# Conflict resolution
git add <resolved-files>
git commit

# Verification
node --check <file>
grep -rn '^<<<<<<< \|^>>>>>>> ' .
cd tests && npx vitest run && node __baseline__/verify-no-regression.mjs results.json
npm run build
PORT=20128 node custom-server.js &

# Post-merge
scripts/migrate-registry.mjs
scripts/injectDisplayToRegistry.mjs
```

---

**End of skill document. This is a living document — update it after every merge.**