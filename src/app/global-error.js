"use client";

/**
 * Root error boundary (backlog #3).
 *
 * Catches errors that escape the (dashboard) group boundary — e.g. failures
 * in DashboardLayout itself, the login page, or the landing page. Renders a
 * minimal self-contained fallback with NO layout dependencies so it cannot
 * be taken down by the same failure it is catching.
 */
export default function GlobalError({ error, reset }) {
  const message = typeof error?.message === "string" ? error.message : "";

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: "#0a0a0a",
          color: "#e5e5e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", opacity: 0.7, maxWidth: "28rem", margin: "0 auto 2rem" }}>
            The application encountered an unrecoverable error. Try reloading the page.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                background: "#3b82f6",
                color: "#fff",
              }}
            >
              Try again
            </button>
            {/* Deliberately a plain <a>, not next/link: global-error renders
                outside the app router context it is catching failures of. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                borderRadius: "8px",
                border: "1px solid #333",
                cursor: "pointer",
                background: "transparent",
                color: "#e5e5e5",
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
          {process.env.NODE_ENV === "development" && message && (
            <pre
              style={{
                marginTop: "2rem",
                padding: "1rem",
                borderRadius: "8px",
                background: "#1a1a1a",
                border: "1px solid #333",
                fontSize: "0.75rem",
                textAlign: "left",
                overflow: "auto",
                maxWidth: "32rem",
                margin: "2rem auto 0",
                opacity: 0.6,
              }}
            >
              {message}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
