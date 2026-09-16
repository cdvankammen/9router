"use client";

import { cn } from "@/shared/utils/cn";

/**
 * isTruncated — true when any captured blob carries the `_truncated` flag
 * (request / providerRequest / response). Mirrors extractFacets() in
 * requestDetailsRepo.js so the UI and the facet index agree.
 */
export function isTruncated(detail) {
  if (!detail) return false;
  return !!(detail.request?._truncated || detail.providerRequest?._truncated || detail.response?._truncated);
}

/**
 * TruncatedBadge — surfaces the `_truncated` capture flag (plan M6).
 * The flag means the captured payload was clamped at capture time (token
 * budget / size cap), so the stored request/response is NOT the full wire
 * content. Shown in list rows, detail drawer, and view cards — never silent.
 */
export default function TruncatedBadge({ className, title }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
        "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        className
      )}
      title={title || "Captured payload was truncated at capture time — stored content is not the full wire content"}
    >
      truncated
    </span>
  );
}