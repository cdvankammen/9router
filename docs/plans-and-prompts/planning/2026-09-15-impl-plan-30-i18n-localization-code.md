# Implementation Plan 30 — i18n & Localization — Code-Bearing

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (awaiting user go-ahead)
**Tags:** #plan #i18n #localization #translations #language-detection #milestones #code

> **Note to implementing agents (READ FIRST):**
> The reference code in this plan is a **starting point for review, not a final implementation**. It was written from research + codebase inspection without running the app. Before (and while) implementing each milestone:
> 1. **Review the reference code critically** — check it against the actual codebase (imports, function signatures, existing `src/app/i18n/`, `public/i18n/`, `cli/src/` i18n usage, README.zh-CN.md pattern).
> 2. **Decide if there is a better way** — if you find a cleaner pattern, a more idiomatic approach, or a bug in the reference code, **make that change happen**. Do not blindly copy.
> 3. **Verify** — run the app, switch locales, confirm acceptance criteria.
> 4. **Update this plan** — mark milestones done, note deviations, link commits.
>
> Research foundation: `../research/9router/impl-plan-30-i18n-localization.md`, `../research/9router/45-branch-i18n-and-localization.md`

## Scope

**In scope:** key-based framework with English fallback; per-locale pluralization + date/number formatting; language detection (browser/settings/URL param) + switcher + persistence; translation files per-locale JSON; coverage check script.
**Out of scope:** machine translation pipeline; RTL layout overhaul (support RTL keys).

## Milestones

### M1 — i18n framework

**Reference code (`src/app/i18n/core.js`):**

```js
// Key-based lookup with English fallback.
export class I18n {
  constructor({ locale = "en", translations = {} } = {}) {
    this.locale = locale;
    this.translations = translations; // { en: {...}, zh-CN: {...} }
  }

  t(key, params = {}) {
    const table = this.translations[this.locale] ?? this.translations.en ?? {};
    let str = table[key] ?? this.translations.en?.[key] ?? key;
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
    return str;
  }

  // Pluralization: {key_one, key_other} per locale.
  plural(key, count, params = {}) {
    const table = this.translations[this.locale] ?? this.translations.en ?? {};
    const form = count === 1 ? `${key}_one` : `${key}_other`;
    return this.t(table[form] ? form : key, { ...params, count });
  }

  // Date/number formatting via Intl.
  formatDate(ts, opts) {
    return new Intl.DateTimeFormat(this.locale, opts).format(new Date(ts));
  }

  formatNumber(n, opts) {
    return new Intl.NumberFormat(this.locale, opts).format(n);
  }
}
```

**Acceptance criteria:** key lookup with fallback; pluralization; Intl formatting.

### M2 — Language detection + switcher

**Reference code (`src/app/i18n/detect.js`):**

```js
// Detection order: URL param > settings > browser > default 'en'.
export function detectLocale({ urlParam, settingsLocale, browserLocales }) {
  if (urlParam && isSupported(urlParam)) return urlParam;
  if (settingsLocale && isSupported(settingsLocale)) return settingsLocale;
  for (const bl of browserLocales ?? []) {
    const base = bl.split("-")[0];
    if (isSupported(bl)) return bl;
    if (isSupported(base)) return base;
  }
  return "en";
}

export function isSupported(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

export const SUPPORTED_LOCALES = ["en", "zh-CN", "ja-JP", "fr", "de", "es", "pt-BR", "ru", "th", "vi", "id-ID", "fa-IR"];
```

**Reference code (`src/app/i18n/switcher.jsx`):**

```jsx
export function LocaleSwitcher({ current, onChange }) {
  return (
    <select value={current} onChange={(e) => onChange(e.target.value)} aria-label="Language">
      {SUPPORTED_LOCALES.map((l) => (
        <option key={l} value={l}>{l}</option>
      ))}
    </select>
  );
}
```

**Acceptance criteria:** detection order; switcher; persistence (localStorage + settings).

### M3 — Translation files + coverage check

**Reference code (`public/i18n/zh-CN.json`):**

```json
{
  "nav.dashboard": "仪表盘",
  "nav.providers": "提供商",
  "nav.combos": "组合",
  "nav.usage": "用量",
  "nav.settings": "设置",
  "common.save": "保存",
  "common.cancel": "取消",
  "common.delete": "删除",
  "common.confirm": "确认",
  "common.search": "搜索",
  "errors.rate_limit": "速率限制",
  "errors.auth": "认证失败",
  "errors.timeout": "超时"
}
```

**Reference code (`scripts/check-i18n-coverage.mjs`):**

```js
// Check every locale has all keys of en.json.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "public/i18n";
const en = JSON.parse(readFileSync(join(dir, "en.json"), "utf8"));
const enKeys = flattenKeys(en);
let failed = false;
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json")) {
  const locale = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const missing = enKeys.filter((k) => !hasKey(locale, k));
  if (missing.length) {
    failed = true;
    console.error(`[i18n] ${f}: missing ${missing.length} keys: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "…" : ""}`);
  }
}
process.exit(failed ? 1 : 0);
```

**Acceptance criteria:** translation files per locale; coverage script fails on missing keys.

### M4 — Integration + tests

**Files touched:** dashboard pages use `t()`; CLI messages via i18n; `tests/unit/i18n.test.js` (new).

**Acceptance criteria:** dashboard + CLI localized; tests pass.

## Dependencies & Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Translation drift | Coverage check in CI |
| RTL locales | RTL-aware layout keys |
| Key explosion | Namespaced keys; review |

## Verification

- Unit: fallback, pluralization, detection
- Manual: switch locale → verify dashboard + persistence
- CI: coverage check passes