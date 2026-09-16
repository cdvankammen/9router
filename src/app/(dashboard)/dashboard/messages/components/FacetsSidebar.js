"use client";

import { cn } from "@/shared/utils/cn";

/**
 * FacetsSidebar — filter sidebar with counts per dimension (plan M6).
 *
 * Reads the `facets` object from GET /api/messages:
 *   {
 *     provider: [{ value, count }],
 *     model: [...],
 *     status: [...],
 *     errorCategory: [...],
 *     sourceApp: [...],
 *     clientTool: [...],
 *     ide: [...],
 *     hasTools: [{ value: 1|0, count }],
 *     hasThinking: [...],
 *     truncated: [...],
 *   }
 *
 * Each facet value is clickable → toggles the corresponding filter param.
 * Active filters are highlighted; counts always reflect the FULL filtered set
 * (computed in SQL GROUP BY, not the page window).
 *
 * Props:
 *   facets: object from the API
 *   filters: { provider, model, status, errorCategory, sourceApp, clientTool,
 *             ide, hasTools, hasThinking, truncated }
 *   onToggle: (key, value) => void
 */
export default function FacetsSidebar({ facets = {}, filters = {}, onToggle }) {
  if (!facets || Object.keys(facets).length === 0) return null;

  const sections = [
    { key: "provider", label: "Provider" },
    { key: "model", label: "Model" },
    { key: "status", label: "Status" },
    { key: "errorCategory", label: "Error category" },
    { key: "sourceApp", label: "Source app" },
    { key: "clientTool", label: "Client tool" },
    { key: "ide", label: "IDE" },
  ];

  const flagSections = [
    { key: "hasTools", label: "Has tools", trueLabel: "Yes", falseLabel: "No" },
    { key: "hasThinking", label: "Has thinking", trueLabel: "Yes", falseLabel: "No" },
    { key: "truncated", label: "Truncated", trueLabel: "Yes", falseLabel: "No" },
  ];

  const isActive = (key, value) => {
    const cur = filters[key];
    if (cur === undefined || cur === null || cur === "") return false;
    return String(cur) === String(value);
  };

  return (
    <div className="flex w-52 shrink-0 flex-col gap-3 overflow-auto rounded-lg border border-black/5 dark:border-white/5 p-2">
      <div className="text-xs font-semibold text-text-muted">Facets</div>

      {sections.map(({ key, label }) => {
        const items = facets[key] || [];
        if (items.length === 0) return null;
        return (
          <div key={key}>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
            <div className="flex flex-col gap-0.5">
              {items.map((f) => (
                <button
                  key={`${key}:${f.value}`}
                  type="button"
                  onClick={() => onToggle(key, f.value)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded px-1.5 py-0.5 text-left text-[11px] transition-colors",
                    isActive(key, f.value)
                      ? "bg-primary/10 text-primary"
                      : "text-text-main hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                  )}
                >
                  <span className="min-w-0 truncate">{f.value === null || f.value === undefined ? "(none)" : String(f.value)}</span>
                  <span className="shrink-0 rounded bg-black/5 dark:bg-white/5 px-1 text-[10px] text-text-muted">{f.count}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {flagSections.map(({ key, label, trueLabel, falseLabel }) => {
        const items = facets[key] || [];
        if (items.length === 0) return null;
        return (
          <div key={key}>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">{label}</div>
            <div className="flex flex-col gap-0.5">
              {items.map((f) => {
                const val = Number(f.value);
                const display = val === 1 ? trueLabel : val === 0 ? falseLabel : String(f.value);
                return (
                  <button
                    key={`${key}:${f.value}`}
                    type="button"
                    onClick={() => onToggle(key, val)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded px-1.5 py-0.5 text-left text-[11px] transition-colors",
                      isActive(key, val)
                        ? "bg-primary/10 text-primary"
                        : "text-text-main hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                    )}
                  >
                    <span>{display}</span>
                    <span className="shrink-0 rounded bg-black/5 dark:bg-white/5 px-1 text-[10px] text-text-muted">{f.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}