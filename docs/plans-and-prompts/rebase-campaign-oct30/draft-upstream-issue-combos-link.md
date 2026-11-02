 "# Draft: Upstream issue for combos page missing Link import

**Target repo:** `decolua/9router`
**Status:** DRAFT — not yet submitted. Operator reviews and submits via GitHub UI.
**Prepared:** 2026-11-02 during v5-vscode-works rebase campaign round 34

---

## Issue title

`fix(dashboard): missing Link import in combos page causes ReferenceError on Smart Router unconfigured state`

## Body

### Describe the bug

`src/app/(dashboard)/dashboard/combos/page.js` uses `<Link>` at line 760 but never imports it from `next/link`. This is a latent `ReferenceError` that triggers when the Smart Router feature is unconfigured and the user views the empty-state UI path.

### Reproduction

1. Fresh install with no Smart Router configuration
2. Navigate to `/dashboard/combos`
3. The empty-state branch renders `<Link href=\"/dashboard/providers\">` for the "configure providers" CTA
4. React throws `ReferenceError: Link is not defined`

The bug is silent in the common case because most users have at least one combo configured, which takes a different render branch that doesn't use `<Link>`.

### Expected behavior

The "configure providers" link in the empty state should navigate without error.

### Root cause

Missing import at the top of `src/app/(dashboard)/dashboard/combos/page.js`:

\`\`\`diff
 "use client";

 import { useState, useEffect } from "react";
+import Link from "next/link";
 import { DndContext, closestCenter, ... } from "@dnd-kit/core";
\`\`\`

### Detection

This would be caught by `eslint-plugin-react` with `react/jsx-no-undef` enabled, or by any static type check. Currently neither is wired to fail the build on this file.

### Environment

- Present on `master` as of 2026-11-02
- Discovered during rebase-campaign audit of `v5-vscode-works` fork

### Suggested fix

One-line import addition. No behavioral change, no test surface needed beyond verifying the page renders.

---

## Submission notes for operator

- Verify line numbers haven't shifted on current master before submitting
- Consider whether to add an ESLint rule to prevent recurrence project-wide (`react/jsx-no-undef` is already in `eslint-config-next` — check why it didn't fire here)
- Submit via https://github.com/decolua/9router/issues/new
