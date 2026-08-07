export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initConsoleLogCapture } = await import("@/lib/consoleLogBuffer");
    initConsoleLogCapture();

    // Server-only: lets capabilities.js read the synced catalog without pulling
    // node:fs into the dashboard's browser bundle.
    const { installCatalogSource } = await import("open-sse/providers/catalogOverride.js");
    await installCatalogSource();

    const { startModelCatalogSync } = await import("@/lib/modelCatalog/sync.js");
    startModelCatalogSync();

    // Markdown log auto-flush (fail-open; enabled via settings)
    const { startMarkdownLogFlusher } = await import("@/lib/markdownLog");
    startMarkdownLogFlusher();
    // Optional stale smart-router (sr-*) combo sweep — OFF unless the user
    // enables settings.srComboCleanup.enabled. Started here (not via the
    // layout bootstrap) because instrumentation.js IS loaded in standalone
    // builds, while the bootstrap chunk gets tree-shaken in Next.js 16.
    // See learnings/2026-08-07-sr-cleanup-scheduler-standalone.md
    try {
      const { getSettings } = await import("@/lib/db/repos/settingsRepo.js");
      const settings = await getSettings();
      const srCleanup = settings.srComboCleanup || {};
      if (srCleanup.enabled) {
        const { startSrComboCleanup } = await import("@/sse/services/srComboCleanup.js");
        startSrComboCleanup({
          enabled: true,
          ttlHours: srCleanup.ttlHours,
          intervalHours: srCleanup.intervalHours,
        });
      }
    } catch (err) {
      console.error("[SrComboCleanup] instrumentation start failed:", err?.message || err);
    }
  }
}
