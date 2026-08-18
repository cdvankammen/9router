import PropTypes from "prop-types";
import { useState } from "react";
import { CapacityBadges } from "@/shared/components";
import ErrorGroupList from "./ErrorGroupList";

export default function ModelRow({ model, fullModel, alias, copied, onCopy, testStatus, isCustom, isFree, onDeleteAlias, onTest, isTesting, onDisable, caps, thinkingSuffix, onToggleCap, errorGroups }) {
  const displayModel = thinkingSuffix ? `${fullModel}(${thinkingSuffix})` : fullModel;
  const [showErrors, setShowErrors] = useState(false);
  const errorCount = (errorGroups || []).reduce((sum, g) => sum + (g.count || 0), 0);
  const borderColor = testStatus === "ok"
    ? "border-green-500/40"
    : testStatus === "error"
    ? "border-red-500/40"
    : "border-border";

  const iconColor = testStatus === "ok"
    ? "#22c55e"
    : testStatus === "error"
    ? "#ef4444"
    : undefined;

  // Capability toggles — let the user mark a model vision/audio-capable (or
  // revoke a wrong static flag). Persisted via settings.modelCapOverrides.
  const capToggles = onToggleCap ? [
    { key: "vision", label: "Vision", icon: "visibility" },
    { key: "audioInput", label: "Audio", icon: "graphic_eq" },
  ] : [];

  return (
    <div className={`group min-w-0 max-w-full rounded-lg border px-3 py-2 ${borderColor} hover:bg-sidebar/50`}>
      <div className="flex min-w-0 items-start gap-2 sm:items-center">
        <span
          className="material-symbols-outlined shrink-0 text-base"
          style={iconColor ? { color: iconColor } : undefined}
        >
          {testStatus === "ok" ? "check_circle" : testStatus === "error" ? "cancel" : "smart_toy"}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <code className="max-w-[72vw] truncate rounded bg-sidebar px-1.5 py-0.5 font-mono text-xs text-text-muted sm:max-w-[360px]">{displayModel}</code>
          <span className="flex min-w-0 items-center text-[9px] gap-1 pl-1">
            {model.name && <span className="truncate text-[9px] italic text-text-muted/70">{model.name}</span>}
            <CapacityBadges caps={caps} colorOverride="text-text-muted/70" size={12} />
            {errorCount > 0 && (
              <button
                onClick={() => setShowErrors((v) => !v)}
                className="flex shrink-0 items-center gap-0.5 rounded bg-red-500/10 px-1 py-0.5 text-[9px] font-semibold text-red-500 hover:bg-red-500/20"
                title="Show errors for this model"
              >
                <span className="material-symbols-outlined text-[11px]">error</span>
                {errorCount}
                <span className="material-symbols-outlined text-[11px]">
                  {showErrors ? "expand_less" : "expand_more"}
                </span>
              </button>
            )}
          </span>
        </div>
        {onTest && (
          <div className="relative shrink-0 group/btn">
            <button
              onClick={onTest}
              disabled={isTesting}
              className={`rounded p-0.5 text-text-muted transition-opacity hover:bg-sidebar hover:text-primary ${isTesting ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"}`}
            >
              <span className="material-symbols-outlined text-sm" style={isTesting ? { animation: "spin 1s linear infinite" } : undefined}>
                {isTesting ? "progress_activity" : "science"}
              </span>
            </button>
            <span className="pointer-events-none absolute mt-1 top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
              {isTesting ? "Testing..." : "Test"}
            </span>
          </div>
        )}
        <div className="relative shrink-0 group/btn">
          <button
            onClick={() => onCopy(displayModel, `model-${model.id}`)}
            className="rounded p-0.5 text-text-muted hover:bg-sidebar hover:text-primary"
          >
            <span className="material-symbols-outlined text-sm">
              {copied === `model-${model.id}` ? "check" : "content_copy"}
            </span>
          </button>
          <span className="pointer-events-none absolute mt-1 top-5 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
            {copied === `model-${model.id}` ? "Copied!" : "Copy"}
          </span>
        </div>
        {isCustom ? (
          <button
            onClick={onDeleteAlias}
            className="ml-auto rounded p-0.5 text-text-muted opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
            title="Remove custom model"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        ) : onDisable ? (
          <button
            onClick={onDisable}
            className="ml-auto rounded p-0.5 text-text-muted opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
            title="Disable this model"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        ) : null}
        {/* Capability toggles (vision/audio) — right side, always visible when onToggleCap provided */}
        {capToggles.length > 0 && (
          <div className="flex shrink-0 items-center gap-0.5" title="Toggle model capabilities (affects combo vision/audio pickers)">
            {capToggles.map(({ key, label, icon }) => {
              const on = caps?.[key] === true;
              return (
                <button
                  key={key}
                  onClick={() => onToggleCap(key, !on)}
                  className={`rounded p-0.5 transition-colors ${on ? "text-primary" : "text-text-muted/40 hover:text-text-muted"}`}
                  title={`${label}: ${on ? "capable (click to revoke)" : "not capable (click to mark)"}`}
                >
                  <span className="material-symbols-outlined text-sm">{icon}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {showErrors && errorCount > 0 && (
        <div className="mt-2 border-t border-border/60 pt-2">
          <ErrorGroupList groups={errorGroups} emptyMessage="No errors recorded for this model." />
        </div>
      )}
    </div>
  );
}

ModelRow.propTypes = {
  model: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  fullModel: PropTypes.string.isRequired,
  alias: PropTypes.string,
  copied: PropTypes.string,
  onCopy: PropTypes.func.isRequired,
  testStatus: PropTypes.oneOf(["ok", "error"]),
  isCustom: PropTypes.bool,
  isFree: PropTypes.bool,
  onDeleteAlias: PropTypes.func,
  onTest: PropTypes.func,
  isTesting: PropTypes.bool,
  onDisable: PropTypes.func,
  caps: PropTypes.object,
  thinkingSuffix: PropTypes.string,
  onToggleCap: PropTypes.func,
  errorGroups: PropTypes.array,
};
