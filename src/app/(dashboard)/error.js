"use client";

/**
 * Dashboard-level error boundary (backlog #3).
 *
 * Catches any uncaught render error inside the (dashboard) route group and
 * shows a retry UI instead of Next.js's default white-screen crash. Sits
 * INSIDE DashboardLayout so the sidebar/header stay visible — users can
 * navigate away from a broken page without reloading.
 *
 * Design notes:
 * - Self-contained: no shared-component imports, so the boundary itself
 *   cannot be taken down by the same failure it is catching.
 * - Detects transient HTTP errors (429 / 5xx) surfaced via Error.message
 *   or digest, and offers a "Try again" button that calls reset().
 * - For non-transient errors, still offers reset + a link back to /dashboard.
 */
export default function DashboardError({ error, reset }) {
  const message = typeof error?.message === "string" ? error.message : "";
  const digest = typeof error?.digest === "string" ? error.digest : "";
  const combined = `${message} ${digest}`;

  const statusMatch = combined.match(/\b(4\d{2}|5\d{2})\b/);
  const statusCode = statusMatch ? Number(statusMatch[1]) : null;
  const isTransient = statusCode === 429 || (statusCode >= 500 && statusCode < 600);

  const title = isTransient
    ? statusCode === 429
      ? "Rate limited"
      : "Server error"
    : "Something went wrong";

  const description = isTransient
    ? statusCode === 429
      ? "Too many requests. Wait a moment and try again."
      : "The server returned an unexpected error. This is usually temporary."
    : "This page hit an unexpected error. Try again, or return to the dashboard.";

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface-2 border border-border-subtle">
        <span className="material-symbols-outlined text-3xl text-text-muted">
          {isTransient ? "cloud_off" : "error"}
        </span>
      </div>
      <h2 className="text-xl font-semibold text-text-main mb-2">{title}</h2>
      <p className="text-sm text-text-muted max-w-md mb-8">{description}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-semibold rounded-[10px] bg-brand-500 hover:bg-brand-600 text-white shadow-sm transition-all active:scale-[0.97] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Try again
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-semibold rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-main border border-border transition-all active:scale-[0.97] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">home</span>
          Dashboard
        </a>
      </div>
      {process.env.NODE_ENV === "development" && message && (
        <pre className="mt-8 max-w-lg overflow-auto rounded-lg bg-surface-2 border border-border-subtle p-4 text-left text-xs text-text-muted">
          {message}
        </pre>
      )}
    </div>
  );
}
