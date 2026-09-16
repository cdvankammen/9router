# Webhook Implementation Plan — M5: Dashboard UI (P2)

**Date:** 2026-09-15
**Author:** GitHub Copilot agent (main session)
**Status:** draft (code ready for agent review)
**Tags:** #plan #webhook #implementation #code #m5 #dashboard #ui

---

## ⚠️ AGENT REVIEW NOTE (READ FIRST)

> **The code in this plan is a starting point, not a final decision.**
> Every agent that reads this plan MUST review the code below and make a decision:
> is there a better way to implement this? If yes, **make those changes happen** —
> update the code, note the improvement, and proceed. Do not treat this code as
> sacred. It follows 9router's existing dashboard conventions, but the agent is
> the final arbiter of implementation quality.

---

## Objective

Implement M5 of the webhook system: the dashboard UI for managing webhook endpoints, rules, and the event log. This is the human-facing layer that makes the whole system usable.

## Scope

**In scope:**
- `src/app/dashboard/webhooks/page.js` — webhook config + rules editor
- `src/app/dashboard/webhooks/events/page.js` — event log viewer
- `src/components/webhooks/` — RuleEditor, WebhookForm, EventTable components

**Out of scope (v1):**
- Visual workflow editor (n8n-style) — JSON rules only
- Real-time SSE feed in the UI (dashboard action M3 provides the feed; UI wiring is P2)

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/app/dashboard/webhooks/page.js` | new | Webhook config + rules editor |
| `src/app/dashboard/webhooks/events/page.js` | new | Event log viewer |
| `src/components/webhooks/WebhookForm.js` | new | Create/edit webhook form |
| `src/components/webhooks/RuleEditor.js` | new | JSON rules editor |
| `src/components/webhooks/EventTable.js` | new | Event log table |

## Code

### 1. `src/app/dashboard/webhooks/page.js` — Main page

```jsx
// src/app/dashboard/webhooks/page.js
"use client";

import { useEffect, useState } from "react";
import { WebhookForm } from "@/components/webhooks/WebhookForm";
import { RuleEditor } from "@/components/webhooks/RuleEditor";

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/settings");
      const settings = await res.json();
      setWebhooks(settings.webhooks || []);
      setRules(settings.webhookRules || []);
    } finally {
      setLoading(false);
    }
  }

  async function save(nextWebhooks, nextRules) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhooks: nextWebhooks, webhookRules: nextRules }),
    });
    await load();
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Webhooks</h1>

      <section>
        <h2 className="text-lg font-semibold mb-2">Endpoints</h2>
        <WebhookForm
          webhooks={webhooks}
          onChange={(next) => save(next, rules)}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Rules (TCA)</h2>
        <RuleEditor
          rules={rules}
          onChange={(next) => save(webhooks, next)}
        />
      </section>
    </div>
  );
}
```

### 2. `src/components/webhooks/WebhookForm.js` — Create/edit webhook

```jsx
// src/components/webhooks/WebhookForm.js
"use client";

import { useState } from "react";

export function WebhookForm({ webhooks, onChange }) {
  const [name, setName] = useState("");

  async function create() {
    const next = [
      ...webhooks,
      {
        id: crypto.randomUUID(),
        secret: crypto.randomUUID(),
        name: name || "Untitled webhook",
        description: "",
        enabled: true,
        createdAt: new Date().toISOString(),
      },
    ];
    await onChange(next);
    setName("");
  }

  function toggle(webhook) {
    onChange(webhooks.map((w) => (w.id === webhook.id ? { ...w, enabled: !w.enabled } : w)));
  }

  function remove(webhook) {
    onChange(webhooks.map((w) => (w.id === webhook.id ? { ...w, enabled: false } : w)));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Webhook name"
          className="border rounded px-3 py-1"
        />
        <button onClick={create} className="bg-blue-600 text-white rounded px-3 py-1">
          Create
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th>Name</th>
            <th>URL</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {webhooks.map((w) => (
            <tr key={w.id} className="border-b">
              <td>{w.name}</td>
              <td className="font-mono text-xs">/api/webhooks/{w.id}</td>
              <td>{w.enabled ? "✅" : "⛔"}</td>
              <td className="space-x-2">
                <button onClick={() => toggle(w)} className="text-blue-600">
                  {w.enabled ? "Disable" : "Enable"}
                </button>
                <button onClick={() => remove(w)} className="text-red-600">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 3. `src/components/webhooks/RuleEditor.js` — JSON rules editor

```jsx
// src/components/webhooks/RuleEditor.js
"use client";

import { useState } from "react";

const DEFAULT_RULE = {
  id: "",
  trigger: { event: "provider.error", filter: "" },
  condition: { and: [{ field: "provider", op: "eq", value: "openai" }] },
  actions: [{ type: "notify", url: "ntfy://mytopic" }],
};

export function RuleEditor({ rules, onChange }) {
  const [draft, setDraft] = useState(JSON.stringify(DEFAULT_RULE, null, 2));
  const [error, setError] = useState(null);

  function addRule() {
    try {
      const rule = JSON.parse(draft);
      rule.id = crypto.randomUUID();
      onChange([...rules, rule]);
      setDraft(JSON.stringify(DEFAULT_RULE, null, 2));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  function removeRule(rule) {
    onChange(rules.filter((r) => r.id !== rule.id));
  }

  return (
    <div className="space-y-3">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={10}
        className="w-full font-mono text-xs border rounded p-2"
      />
      {error && <div className="text-red-600 text-sm">Invalid JSON: {error}</div>}
      <button onClick={addRule} className="bg-blue-600 text-white rounded px-3 py-1">
        Add Rule
      </button>

      <div className="space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="border rounded p-3 text-sm">
            <div className="flex justify-between">
              <span className="font-mono text-xs">
                {r.trigger?.event} → {r.actions?.map((a) => a.type).join(", ")}
              </span>
              <button onClick={() => removeRule(r)} className="text-red-600">
                Remove
              </button>
            </div>
            <pre className="text-xs mt-2 bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(r, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. `src/app/dashboard/webhooks/events/page.js` — Event log viewer

```jsx
// src/app/dashboard/webhooks/events/page.js
"use client";

import { useEffect, useState } from "react";
import { EventTable } from "@/components/webhooks/EventTable";

export default function WebhookEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/webhooks/events");
      const data = await res.json();
      setEvents(data.events || []);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading…</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Webhook Events</h1>
      <EventTable events={events} onRefresh={load} />
    </div>
  );
}
```

### 5. `src/components/webhooks/EventTable.js` — Event log table

```jsx
// src/components/webhooks/EventTable.js
"use client";

export function EventTable({ events, onRefresh }) {
  return (
    <div>
      <button onClick={onRefresh} className="mb-3 bg-gray-200 rounded px-3 py-1 text-sm">
        Refresh
      </button>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th>Event ID</th>
            <th>Webhook</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Created</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.event_id} className="border-b">
              <td className="font-mono text-xs">{e.event_id}</td>
              <td className="font-mono text-xs">{e.webhook_id}</td>
              <td>{e.status}</td>
              <td>{e.attempts}</td>
              <td className="text-xs">{e.created_at}</td>
              <td className="text-xs text-red-600">{e.last_error || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 6. `src/app/api/webhooks/events/route.js` — Event log API

```js
// src/app/api/webhooks/events/route.js
// GET /api/webhooks/events — list recent events (for the event log viewer).
import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver.js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const status = searchParams.get("status");

  const db = await getAdapter();
  let rows;
  if (status) {
    rows = await db.all(
      "SELECT * FROM webhook_events WHERE status = ? ORDER BY created_at DESC LIMIT ?",
      [status, limit]
    );
  } else {
    rows = await db.all(
      "SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT ?",
      [limit]
    );
  }
  return NextResponse.json({ events: rows });
}
```

## Acceptance Criteria

- [ ] Create/edit/delete webhook endpoints (generate secret UUID)
- [ ] Create/edit/delete rules (JSON editor)
- [ ] View event log with status/attempts/retry
- [ ] Test button (send sample event) — TODO: wire to a `POST /api/webhooks/test` route

## Related Docs

- Research: `../research/2026-09-15-webhook-exp-01-receiver-transport.md` (endpoint lifecycle section)
- Plan: `../planning/2026-09-15-webhook-receive-act-plan.md` (M5)
- Interpretation: `../interpretation/2026-09-15-webhook-interpretation-guide.md`