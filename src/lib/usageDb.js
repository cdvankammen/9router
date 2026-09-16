// Shim → re-export from new SQLite-based DB layer (src/lib/db/)
export {
  statsEmitter, trackPendingRequest, getActiveRequests,
  saveRequestUsage, getUsageHistory, getUsageStats, getChartData,
  appendRequestLog, getRecentLogs,
  saveRequestDetail, getRequestDetails, getRequestDetailById,
  getRequestFacets, getDroppedRecordsCount,
  getConversationSummary, getConversationMessages, getErrorSummary,
  getAnnotations, addAnnotation, deleteAnnotation, toggleStar,
  getSavedViews, saveView, deleteSavedView,
} from "@/lib/db/index.js";
