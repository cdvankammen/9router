# MASTER CODING RULE — MANDATORY FOR ALL 9ROUTER CARDS

**Effective:** 2026-09-10 | **Scope:** Every card on the `9router` kanban board
**Authority:** Chris (csnoopy35) directive — non-negotiable, no exceptions
**Thread:** 1544031399110119588

---

## THE RULE (verbatim from user directive)

Every card that touches code MUST follow these 6 requirements. Failure to follow ANY of them = card is NOT complete.

### 1. USE ALL APPLICABLE CODING SKILLS
Before writing a single line of code, the executing agent MUST:
- Run `skills_list` and `skill_view` for every skill applicable to the task
- Load: code-review-and-quality, clean-code-principles, tdd, testing-fundamentals, incremental-implementation, codebase-design, systematic-debugging, and any other relevant skill
- Document which skills were loaded in the card's completion summary
- Apply every relevant principle from those skills to the implementation

### 2. FULL APPLICATION BUILD ON EVERY COMMIT
"Full application" = the Swift macOS app (menu bar / tray application).
- Every commit MUST result in a buildable, runnable full application
- No partial commits that break the build
- After each commit: `npm run build` + verify the .app bundle builds and launches
- If the build fails, the commit is reverted or fixed BEFORE proceeding

### 3. CLEAN PROCESS STATE FOR TESTING
When testing the full Swift app:
- KILL all running 9router processes on the test machine first: `pkill -f 9router` / `pkill -f custom-server` / `launchctl bootout` the plist
- Start the app FRESH (not resuming a stale process)
- VERIFY it's actually running via the menu bar icon (screenshot via ocu or screencapture)
- Do NOT test against a zombie/stale process and claim success

### 4. CROSS-NODE TESTING PROTOCOL
When testing features that involve peer nodes (failover, L1 forwarding, multi-peer):
- Kill ALL 9router processes on ALL involved machines (mini2, mini, smox, etc.)
- Start each node fresh in controlled order
- Verify connectivity between nodes before testing the feature
- Document which nodes were restarted and their health status

### 5. CROSS-MACHINE DEPLOYMENT CYCLE
After every few commits (minimum every 3-5 commits):
- Build the full application
- Send/deploy it to ANOTHER computer (mini2 → this Mac, or vice versa)
- Test it working on that other machine end-to-end
- Document: which machine sent, which received, what was tested, pass/fail

### 6. QA AND TESTING — MINIMUM 3 FORMATS + UI VERIFICATION
All changes require testing in minimum 3 different formats:
- **Format A:** Unit tests (vitest) — must actually assert behavior, not just import modules
- **Format B:** Integration/E2E tests — real HTTP requests to real endpoints, real DB operations
- **Format C:** Manual/runtime smoke test — start the app, hit endpoints with curl, verify responses
- **Anti-false-positive check:** Intentionally break one assertion per test file to confirm the test FAILS when it should. If a test passes even when the code is broken, the test is worthless.
- **UI Verification (MANDATORY):** Use ocu or headless browser control to:
  - Open the dashboard at http://localhost:20128/dashboard
  - Take screenshots of affected pages
  - Analyze screenshots via vision_analyze to verify UI renders correctly
  - Verify menu bar icon appears and responds to clicks
  - Document screenshot paths in the card completion summary

---

## GAP ANALYSIS OF THIS RULE (what was missing, now added)

Research into potential gaps in the above rule set:

### Gap R1: No explicit rollback procedure
**Risk:** If a commit breaks the build, agents might keep going instead of reverting.
**Addition:** Rule 2 now explicitly states "revert or fix BEFORE proceeding."

### Gap R2: No definition of "few commits" for cross-machine deploy
**Risk:** Agents interpret "every few" as "never."
**Addition:** Rule 5 now specifies "minimum every 3-5 commits."

### Gap R3: No anti-false-positive requirement for tests
**Risk:** Tests that always pass (empty assertions, wrong mocks) give false confidence.
**Addition:** Rule 6 now requires intentionally breaking assertions to prove tests catch failures.

### Gap R4: No process verification method specified
**Risk:** Agent claims "process is running" without checking menu bar.
**Addition:** Rule 3 now requires screenshot evidence of menu bar icon.

### Gap R5: No documentation requirement for cross-node tests
**Risk:** Agent tests across nodes but doesn't record which nodes or their state.
**Addition:** Rule 4 now requires documenting node restart order and health.

### Gap R6: No skill-loading evidence requirement
**Risk:** Agent says "I used skills" without proving it.
**Addition:** Rule 1 now requires listing loaded skills in completion summary.

### Gap R7: No handling for cards that DON'T touch code
**Resolution:** Research-only cards (MERGE-01 through MERGE-07, TRAY-02, GAP-DOC) are exempt from build/test rules but MUST still follow thread subscription and guardrail inheritance.

---

## ENFORCEMENT

This rule is stamped onto EVERY card body via batch comment. Cards that complete without following all 6 requirements will be REOPENED and marked as failed verification.

The rule itself lives at: `docs/plans-and-prompts/research/9router/33-master-coding-rule.md`
Copied to: `~/Documents/hermesResearch/9router/V2/research/33-master-coding-rule.md`
