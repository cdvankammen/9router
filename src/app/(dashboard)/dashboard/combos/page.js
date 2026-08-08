"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { Card, Button, Modal, Input, CardSkeleton, ModelSelectModal, ProviderSelectModal, ConfirmModal, CapacityBadges, Select, Toggle } from "@/shared/components";
import { toDraftText, parseDraftText } from "@/lib/fallbackTextFormat";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { useModelCaps } from "@/shared/hooks/useModelCaps";
import { aggregateComboCapabilities } from "open-sse/providers/capabilities.js";
import { isOpenAICompatibleProvider, isAnthropicCompatibleProvider } from "@/shared/constants/providers";
import { isValidModel } from "@/shared/constants/models";

// Validate combo name: only a-z, A-Z, 0-9, -, _
const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

// Capacity adapter: global fallback pools of models per input-modality capability.
// A request needing a capability the target model/combo lacks switches straight
// to the first enabled model here instead of erroring or dropping the data.
const CAPACITY_ADAPTER_CAPS = [
  { key: "vision", label: "Vision", icon: "visibility", desc: "images (png, jpg, webp, …)" },
  // pdf, videoInput temporarily hidden — no translator support yet for those blocks.
  { key: "audioInput", label: "Audio", icon: "graphic_eq", desc: "audio input" },
];
const DEFAULT_FALLBACK_MODEL = "oc/mimo-v2.6-flash-free";
const EMPTY_CAP_ENTRY = { enabled: true, roundRobin: false, models: [] };
const EMPTY_CAPACITY_ADAPTER = {
  vision: { ...EMPTY_CAP_ENTRY },
  pdf: { ...EMPTY_CAP_ENTRY },
  audioInput: { ...EMPTY_CAP_ENTRY },
  videoInput: { ...EMPTY_CAP_ENTRY },
};
const upgradeLegacyModel = (m) => (m === "oc/mimo-v2.5-free" ? DEFAULT_FALLBACK_MODEL : m);

// Backward-compat: legacy stored form was an array of {model, enabled}.
function normalizeCapEntry(entry) {
  if (Array.isArray(entry)) {
    return { enabled: true, roundRobin: false, models: entry.map((e) => upgradeLegacyModel(e?.model || e)).filter(Boolean) };
  }
  if (entry && typeof entry === "object") {
    return {
      enabled: entry.enabled !== false,
      roundRobin: !!entry.roundRobin,
      models: Array.isArray(entry.models) ? entry.models.map(upgradeLegacyModel).filter(Boolean) : [],
    };
  }
  return { ...EMPTY_CAP_ENTRY };
}

const STRATEGY_OPTIONS = [
  { value: "fallback", label: "Fallback — try in order" },
  { value: "round-robin", label: "Round Robin — rotate" },
  { value: "fusion", label: "Fusion — panel + judge" },
];

export default function CombosPage() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [activeProviders, setActiveProviders] = useState([]);
  const [comboStrategies, setComboStrategies] = useState({});
  const [capacityAdapter, setCapacityAdapter] = useState(EMPTY_CAPACITY_ADAPTER);
  const [smartRouter, setSmartRouter] = useState({ enabled: false, names: ["modelRouter"], allowedProviders: [], allowedModels: [], costQualityTradeoff: 5, maxCandidates: 3 });
  const [srComboCleanup, setSrComboCleanup] = useState({ enabled: false, ttlHours: 24, intervalHours: 12 });
  const [markdownLog, setMarkdownLog] = useState({ enabled: false, intervalMin: 5 });
  const [modelFallbacks, setModelFallbacks] = useState({});
  const { getCaps } = useModelCaps();
  const [confirmState, setConfirmState] = useState(null);
  const [presetLoading, setPresetLoading] = useState(null); // "cursor" | "claude" | null
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drop stale selection when the combo list changes (delete / refresh).
  useEffect(() => {
    const alive = new Set(combos.map((c) => c.id));
    setSelectedIds((prev) => prev.filter((id) => alive.has(id)));
  }, [combos]);

  const selectedCombos = combos.filter((c) => selectedIds.includes(c.id));
  const allSelected = combos.length > 0 && selectedIds.length === combos.length;
  const someSelected = selectedIds.length > 0;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : combos.map((c) => c.id));
  };

  const clearSelection = () => setSelectedIds([]);

  const handleGeneratePresets = async (source) => {
    const label = source === "cursor" ? "Cursor Default" : "Claude Default";
    setPresetLoading(source);
    try {
      const previewRes = await fetch(`/api/combos/presets?source=${source}`);
      const preview = await previewRes.json();
      if (!previewRes.ok) {
        alert(preview.error || `Failed to preview ${label}`);
        return;
      }

      const toCreate = preview.toCreate ?? (preview.items || []).filter((i) => !i.exists).length;
      const toSkip = preview.toSkip ?? (preview.items || []).filter((i) => i.exists).length;
      const total = (preview.items || []).length;

      if (total === 0) {
        alert(`No ${label} models available to generate.`);
        return;
      }

      if (toCreate === 0) {
        alert(`All ${total} ${label} combos already exist. Nothing to create.`);
        return;
      }

      setConfirmState({
        title: `Generate ${label}`,
        message: `Create ${toCreate} combo${toCreate === 1 ? "" : "s"} named like ${source === "cursor" ? "Cursor" : "Claude"} model IDs (seeded with cu/… or cc/…). ${toSkip} already exist and will be skipped. You can edit any combo afterward to add fallbacks.`,
        confirmText: "Generate",
        variant: "primary",
        onConfirm: async () => {
          setConfirmState((prev) => prev ? { ...prev, loading: true } : null);
          try {
            const res = await fetch("/api/combos/presets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ source }),
            });
            const data = await res.json();
            if (!res.ok) {
              alert(data.error || `Failed to generate ${label}`);
              return;
            }
            await fetchData();
            setConfirmState(null);
          } catch (error) {
            console.log(`Error generating ${label}:`, error);
            alert(`Failed to generate ${label}`);
            setConfirmState((prev) => prev ? { ...prev, loading: false } : null);
          }
        },
      });
    } catch (error) {
      console.log(`Error previewing ${label}:`, error);
      alert(`Failed to preview ${label}`);
    } finally {
      setPresetLoading(null);
    }
  };

  const fetchData = async () => {
    try {
      const [combosRes, providersRes, settingsRes] = await Promise.all([
        fetch("/api/combos"),
        fetch("/api/providers"),
        fetch("/api/settings"),
      ]);
      const combosData = await combosRes.json();
      const providersData = await providersRes.json();
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};

      // Only LLM combos here - webSearch/webFetch combos belong to media-providers/web
      if (combosRes.ok) setCombos((combosData.combos || []).filter(c => !c.kind || c.kind === "llm"));
      if (providersRes.ok) {
        setActiveProviders(providersData.connections || []);
      }
      setComboStrategies(settingsData.comboStrategies || {});
      const rawAdapter = settingsData.capacityAdapter || {};
      const normalized = {};
      for (const cap of CAPACITY_ADAPTER_CAPS) {
        normalized[cap.key] = normalizeCapEntry(rawAdapter[cap.key]);
      }
      setCapacityAdapter(normalized);
      setSmartRouter({
        enabled: !!settingsData.smartRouter?.enabled,
        names: settingsData.smartRouter?.names?.length ? settingsData.smartRouter.names : ["modelRouter"],
        allowedProviders: settingsData.smartRouter?.allowedProviders || [],
        allowedModels: settingsData.smartRouter?.allowedModels || [],
        costQualityTradeoff: settingsData.smartRouter?.costQualityTradeoff ?? 5,
        maxCandidates: settingsData.smartRouter?.maxCandidates ?? 3,
      });
      setSrComboCleanup({
        enabled: !!settingsData.srComboCleanup?.enabled,
        ttlHours: settingsData.srComboCleanup?.ttlHours ?? 24,
        intervalHours: settingsData.srComboCleanup?.intervalHours ?? 12,
      });
      setMarkdownLog({
        enabled: !!settingsData.markdownLogEnabled,
        intervalMin: settingsData.markdownLogFlushIntervalMin ?? 5,
      });
      setModelFallbacks(settingsData.modelFallbacks || {});
    } catch (error) {
      console.log("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCapacityAdapter = async (next) => {
    setCapacityAdapter(next);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacityAdapter: next }),
      });
    } catch (error) {
      console.log("Error updating capacity adapter:", error);
    }
  };

  const handleSetSmartRouter = async (next) => {
    setSmartRouter(next);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smartRouter: next }),
      });
    } catch (error) {
      console.log("Error updating smart router:", error);
    }
  };

  const handleSetSrComboCleanup = async (next) => {
    setSrComboCleanup(next);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srComboCleanup: next }),
      });
    } catch (error) {
      console.log("Error updating sr combo cleanup:", error);
    }
  };

  const handleSetMarkdownLog = async (next) => {
    setMarkdownLog(next);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdownLogEnabled: next.enabled, markdownLogFlushIntervalMin: next.intervalMin }),
      });
    } catch (error) {
      console.log("Error updating markdown log:", error);
    }
  };

  const handleSetModelFallbacks = async (next) => {
    setModelFallbacks(next);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelFallbacks: next }),
      });
    } catch (error) {
      console.log("Error updating model fallbacks:", error);
    }
  };

  const handleCreate = async (data) => {
    try {
      const res = await fetch("/api/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchData();
        setShowCreateModal(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create combo");
      }
    } catch (error) {
      console.log("Error creating combo:", error);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      const res = await fetch(`/api/combos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchData();
        setEditingCombo(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update combo");
      }
    } catch (error) {
      console.log("Error updating combo:", error);
    }
  };

  const pruneStrategiesForNames = (names, base = comboStrategies) => {
    const updated = { ...base };
    for (const name of names) delete updated[name];
    return updated;
  };

  const persistComboStrategies = async (updated) => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comboStrategies: updated }),
    });
    setComboStrategies(updated);
  };

  const handleDelete = async (id) => {
    const combo = combos.find((c) => c.id === id);
    setConfirmState({
      title: "Delete Combo",
      message: combo ? `Delete combo "${combo.name}"?` : "Delete this combo?",
      onConfirm: async () => {
        setConfirmState((prev) => prev ? { ...prev, loading: true } : null);
        try {
          const res = await fetch(`/api/combos/${id}`, { method: "DELETE" });
          if (res.ok) {
            if (combo?.name) {
              await persistComboStrategies(pruneStrategiesForNames([combo.name]));
            }
            setCombos((prev) => prev.filter((c) => c.id !== id));
            setSelectedIds((prev) => prev.filter((x) => x !== id));
          }
          setConfirmState(null);
        } catch (error) {
          console.log("Error deleting combo:", error);
          setConfirmState((prev) => prev ? { ...prev, loading: false } : null);
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedCombos.length === 0) return;
    const count = selectedCombos.length;
    setConfirmState({
      title: "Delete Selected Combos",
      message: `Delete ${count} selected combo${count === 1 ? "" : "s"}? This cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setConfirmState((prev) => prev ? { ...prev, loading: true } : null);
        setBulkBusy(true);
        try {
          const ids = selectedCombos.map((c) => c.id);
          const names = selectedCombos.map((c) => c.name);
          const results = await Promise.all(
            ids.map((id) => fetch(`/api/combos/${id}`, { method: "DELETE" }))
          );
          const failed = results.filter((r) => !r.ok).length;
          await persistComboStrategies(pruneStrategiesForNames(names));
          setCombos((prev) => prev.filter((c) => !ids.includes(c.id)));
          clearSelection();
          setConfirmState(null);
          if (failed > 0) alert(`Deleted with ${failed} failure${failed === 1 ? "" : "s"}.`);
        } catch (error) {
          console.log("Error bulk deleting combos:", error);
          alert("Failed to delete selected combos");
          setConfirmState((prev) => prev ? { ...prev, loading: false } : null);
        } finally {
          setBulkBusy(false);
        }
      },
    });
  };

  // Merge a per-combo strategy patch into settings.comboStrategies. Passing an empty
  // patch (strategy back to default "fallback") drops the entry entirely.
  const handleSetComboStrategy = async (comboName, patch) => {
    try {
      const updated = { ...comboStrategies };
      const next = { ...(updated[comboName] || {}), ...patch };
      // Prune to keep settings clean: default fallback with no extras = no entry.
      if (!next.fallbackStrategy || next.fallbackStrategy === "fallback") {
        delete updated[comboName];
      } else {
        updated[comboName] = next;
      }

      await persistComboStrategies(updated);
    } catch (error) {
      console.log("Error updating combo strategy:", error);
    }
  };

  const handleBulkSetStrategy = async (strategy) => {
    if (selectedCombos.length === 0 || !strategy) return;
    setBulkBusy(true);
    try {
      const updated = { ...comboStrategies };
      for (const combo of selectedCombos) {
        if (!strategy || strategy === "fallback") {
          delete updated[combo.name];
        } else {
          updated[combo.name] = {
            ...(updated[combo.name] || {}),
            fallbackStrategy: strategy,
          };
        }
      }
      await persistComboStrategies(updated);
    } catch (error) {
      console.log("Error bulk updating combo strategy:", error);
      alert("Failed to update strategy for selected combos");
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-text-muted mt-1">
            Group models under one name, then pick a strategy per combo:
          </p>
          <ul className="text-sm text-text-muted mt-2 flex flex-col gap-1">
            <li><span className="font-medium text-text-main">Fallback</span> — tries models in order (next on failure)</li>
            <li><span className="font-medium text-text-main">Round Robin</span> — rotates models across requests to spread load</li>
            <li><span className="font-medium text-text-main">Fusion</span> — queries all models in parallel, then a judge synthesizes one answer. Best quality, but costs the most: every request bills all panel models + the judge (N+1 calls)</li>
          </ul>
          <p className="hidden text-xs text-text-muted mt-3 max-w-2xl">
            <span className="font-medium text-text-main">Cursor / Claude Default</span> create combos named exactly like those clients&apos; model IDs (e.g. <code className="font-mono">composer-2.5</code>, <code className="font-mono">opus</code>), seeded with the matching <code className="font-mono">cu/…</code> or <code className="font-mono">cc/…</code> route so traffic can hit 9router without the prefix.
            {" "}Note: Cursor IDE itself often blocks built-in Composer / Grok from Override OpenAI Base URL (&quot;model does not support custom API&quot;); add them via Cursor&apos;s <span className="font-medium text-text-main">Add Custom Model</span> using the combo name, or pick a model Cursor allows through the custom endpoint.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-stretch">
          <Button icon="add" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto whitespace-nowrap">
            Create Combo
          </Button>
          <div className="hidden">
            <Button
              variant="secondary"
              size="sm"
              icon="edit_note"
              loading={presetLoading === "cursor"}
              disabled={!!presetLoading}
              onClick={() => handleGeneratePresets("cursor")}
              className="w-full whitespace-nowrap"
            >
              Cursor Default
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon="smart_toy"
              loading={presetLoading === "claude"}
              disabled={!!presetLoading}
              onClick={() => handleGeneratePresets("claude")}
              className="w-full whitespace-nowrap"
            >
              Claude Default
            </Button>
          </div>
        </div>
      </div>

      {/* Combos List */}
      {combos.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">layers</span>
            </div>
            <p className="text-text-main font-medium mb-1">No combos yet</p>
            <p className="text-sm text-text-muted mb-4">Create model combos with fallback support</p>
            <Button icon="add" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
              Create Combo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Selection toolbar */}
          <div className="flex min-w-0 flex-col gap-2 rounded-lg border border-black/5 bg-black/[0.015] px-3 py-2 dark:border-white/5 dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted hover:text-primary select-none">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>
                {someSelected
                  ? `${selectedIds.length} selected`
                  : `Select all (${combos.length})`}
              </span>
            </label>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {someSelected && (
                <>
                  <div className="w-full min-w-[160px] sm:w-[200px]">
                    <Select
                      options={STRATEGY_OPTIONS}
                      value=""
                      placeholder="Set strategy…"
                      disabled={bulkBusy}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v) handleBulkSetStrategy(v);
                      }}
                      selectClassName="py-1.5 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    icon="delete"
                    disabled={bulkBusy}
                    loading={bulkBusy}
                    onClick={handleBulkDelete}
                    className="whitespace-nowrap"
                  >
                    Delete ({selectedIds.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearSelection}
                    disabled={bulkBusy}
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {(() => {
              const comboByName = Object.fromEntries(combos.map((c) => [c.name, c.models]));
              return combos.map((combo) => (
                <ComboCard
                  key={combo.id}
                  combo={combo}
                  getCaps={getCaps}
                  comboByName={comboByName}
                  activeProviders={activeProviders}
                  copied={copied}
                  onCopy={copy}
                  onEdit={() => setEditingCombo(combo)}
                  onDelete={() => handleDelete(combo.id)}
                  strategy={comboStrategies[combo.name] || {}}
                  onSetStrategy={(patch) => handleSetComboStrategy(combo.name, patch)}
                  selected={selectedIds.includes(combo.id)}
                  onToggleSelect={() => toggleSelect(combo.id)}
                />
              ));
            })()}
          </div>
        </div>
      )}

      {/* Capacity Adapter */}
      <CapacityAdapterSection
        capacityAdapter={capacityAdapter}
        onChange={handleSetCapacityAdapter}
        activeProviders={activeProviders}
        getCaps={getCaps}
      />

      {/* Smart Router */}
      <SmartRouterSection
        smartRouter={smartRouter}
        onChange={handleSetSmartRouter}
        srComboCleanup={srComboCleanup}
        onSrComboCleanupChange={handleSetSrComboCleanup}
      />

      {/* Markdown Log */}
      <MarkdownLogSection
        markdownLog={markdownLog}
        onChange={handleSetMarkdownLog}
      />

      {/* Per-Model / Per-Provider Fallbacks */}
      <ModelFallbacksSection
        modelFallbacks={modelFallbacks}
        onChange={handleSetModelFallbacks}
        activeProviders={activeProviders}
      />

      {/* Create Modal - Use key to force remount and reset state */}
      {showCreateModal && (
        <ComboFormModal
          key="create"
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
          activeProviders={activeProviders}
        />
      )}

      {editingCombo && (
        <ComboFormModal
          key={editingCombo.id}
          isOpen={!!editingCombo}
          combo={editingCombo}
          onClose={() => setEditingCombo(null)}
          onSave={(data) => handleUpdate(editingCombo.id, data)}
          activeProviders={activeProviders}
        />
      )}

      {/* Confirm (delete / generate presets) */}
      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => !confirmState?.loading && setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        confirmText={confirmState?.confirmText || "Confirm"}
        variant={confirmState?.variant || "danger"}
        loading={!!confirmState?.loading}
      />
    </div>
  );
}

const fmtK = (n) => {
  if (!n) return "?";
  if (n >= 1000000) {
    const m = n / 1000000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  return `${Math.round(n / 1000)}k`;
};

function ComboCard({ combo, getCaps, comboByName = {}, activeProviders = [], copied, onCopy, onEdit, onDelete, strategy = {}, onSetStrategy, selected = false, onToggleSelect }) {
  const [showJudgeSelect, setShowJudgeSelect] = useState(false);
  const current = strategy.fallbackStrategy || "fallback";
  const judge = strategy.judgeModel || "";
  const isFusion = current === "fusion";
  // The synced catalog is server-only, so resolving here would fall back to the
  // generic patterns and under-report the limits. getCaps carries the server's
  // answer for /api/models.
  const comboCaps = aggregateComboCapabilities(combo.models, comboByName, getCaps);

  return (
    <Card padding="sm" className={`group ${selected ? "ring-1 ring-primary/40 bg-primary/[0.03]" : ""}`}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <label className="flex shrink-0 items-center pt-1 sm:pt-0 cursor-pointer" title="Select combo">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              aria-label={`Select ${combo.name}`}
            />
          </label>
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]">layers</span>
          </div>
          <div className="min-w-0 flex-1">
            <code className="block truncate font-mono text-sm font-medium">{combo.name}</code>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
              {combo.models.length === 0 ? (
                <span className="text-xs text-text-muted italic">No models</span>
              ) : (
                combo.models.slice(0, 3).map((model, index) => (
                  <code key={index} className="inline-flex items-center gap-1 rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs text-text-muted dark:bg-white/5">
                    <span>{model}</span>
                    <CapacityBadges caps={
                      comboByName[model]
                        ? aggregateComboCapabilities(comboByName[model], comboByName, getCaps)
                        : getCaps?.(model)
                    } />
                  </code>
                ))
              )}
              {combo.models.length > 3 && (
                <span className="text-[10px] text-text-muted">+{combo.models.length - 3} more</span>
              )}
            </div>
            {comboCaps && (
              <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">
                <span>ctx {fmtK(comboCaps.contextWindow)}</span>
                <span className="opacity-40">·</span>
                <span>max {fmtK(comboCaps.maxOutput)}</span>
              </div>
            )}
            {/* Fusion: judge picker (Auto = first model) */}
            {isFusion && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-text-muted">Judge</span>
                <button
                  onClick={() => setShowJudgeSelect(true)}
                  className="inline-flex max-w-full items-center gap-1 rounded border border-dashed border-primary/40 px-1.5 py-0.5 font-mono text-[11px] text-primary hover:border-primary hover:bg-primary/5 transition-colors"
                  title="Pick the model that fuses panel answers"
                >
                  <span className="material-symbols-outlined text-[13px]">gavel</span>
                  <span className="truncate">{judge || `Auto — ${combo.models[0] || "first model"}`}</span>
                </button>
                {judge && (
                  <button
                    onClick={() => onSetStrategy({ judgeModel: "" })}
                    className="p-0.5 rounded text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Reset judge to Auto"
                  >
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:shrink-0">
          {/* Strategy selector — always visible */}
          <div className="w-full sm:w-[200px]">
            <Select
              options={STRATEGY_OPTIONS}
              value={current}
              onChange={(e) => onSetStrategy({ fallbackStrategy: e.target.value })}
              selectClassName="py-1.5 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 sm:flex">
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(combo.name, `combo-${combo.id}`); }}
              className="flex flex-col items-center rounded px-2 py-1 text-text-muted transition-colors hover:bg-black/5 hover:text-primary dark:hover:bg-white/5"
              title="Copy combo name"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied === `combo-${combo.id}` ? "check" : "content_copy"}
              </span>
              <span className="text-[10px] leading-tight">Copy</span>
            </button>
            <button
              onClick={onEdit}
              className="flex flex-col items-center rounded px-2 py-1 text-text-muted transition-colors hover:bg-black/5 hover:text-primary dark:hover:bg-white/5"
              title="Edit"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span className="text-[10px] leading-tight">Edit</span>
            </button>
            <button
              onClick={onDelete}
              className="flex flex-col items-center rounded px-2 py-1 text-red-500 transition-colors hover:bg-red-500/10"
              title="Delete"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              <span className="text-[10px] leading-tight">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Judge model picker (single-select; combo members make natural judges too) */}
      {showJudgeSelect && (
        <ModelSelectModal
          isOpen={showJudgeSelect}
          onClose={() => setShowJudgeSelect(false)}
          onSelect={(m) => { onSetStrategy({ judgeModel: m?.value || "" }); setShowJudgeSelect(false); }}
          activeProviders={activeProviders}
          title="Select Judge Model"
          addedModelValues={judge ? [judge] : []}
          closeOnSelect={true}
        />
      )}
    </Card>
  );
}

function CapacityAdapterSection({ capacityAdapter, onChange, activeProviders, getCaps }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">Vision Adapter</p>
          <p className="text-xs text-text-muted mt-0.5">
            Your model can&apos;t read image/audio? Auto-switches to a model in the pool below.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {CAPACITY_ADAPTER_CAPS.map((cap) => (
          <CapacityAdapterCap
            key={cap.key}
            cap={cap}
            entry={capacityAdapter[cap.key] || EMPTY_CAP_ENTRY}
            onChange={(entry) => onChange({ ...capacityAdapter, [cap.key]: entry })}
            activeProviders={activeProviders}
            getCaps={getCaps}
          />
        ))}
      </div>
    </div>
  );
}

function CapacityAdapterCap({ cap, entry, onChange, activeProviders, getCaps }) {
  const [showModelSelect, setShowModelSelect] = useState(false);
  const { enabled, roundRobin, models } = entry;

  const patch = (p) => onChange({ ...entry, ...p });

  const handleAdd = (model) => {
    const value = model?.value || model?.name || model;
    if (!value || models.includes(value)) return;
    patch({ models: [...models, value] });
  };

  const handleDeselect = (model) => {
    const value = model?.value || model?.name || model;
    const next = models.filter((m) => m !== value);
    patch({ models: next.length === 0 ? [DEFAULT_FALLBACK_MODEL] : next });
  };

  const handleRemove = (index) => {
    const next = models.filter((_, i) => i !== index);
    patch({ models: next.length === 0 ? [DEFAULT_FALLBACK_MODEL] : next });
  };

  const handleMove = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= models.length) return;
    const next = [...models];
    [next[index], next[target]] = [next[target], next[index]];
    patch({ models: next });
  };

  return (
    <Card padding="sm" className={`group ${!enabled ? "opacity-50" : ""}`}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Master toggle + icon + label */}
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
          <Toggle
            checked={enabled}
            onChange={(v) => patch({ enabled: v })}
            aria-label={`Enable ${cap.label} adapter`}
          />
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[18px]">{cap.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <code className="font-mono text-sm font-medium">{cap.label}</code>
              <span className="text-[10px] text-text-muted">— {cap.desc}</span>
            </div>
          </div>
        </div>

        {/* Actions: Round-robin toggle + Add Model */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
            <Toggle
              checked={roundRobin}
              onChange={(v) => patch({ roundRobin: v })}
              disabled={!enabled}
              aria-label={`Round-robin ${cap.label} adapter`}
            />
            <span>Round</span>
          </label>
          <Button
            icon="add"
            variant="ghost"
            size="sm"
            onClick={() => setShowModelSelect(true)}
            disabled={!enabled}
            title={`Add ${cap.label} model`}
          >
            Add Model
          </Button>
        </div>
      </div>

      {/* Model pool list/table */}
      {models.length === 0 ? (
        <div className="mt-3 py-2 text-center text-xs text-text-muted italic">
          No models in pool (will fallback to {DEFAULT_FALLBACK_MODEL})
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-border/50">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-black/[0.02] text-text-muted dark:bg-white/[0.02]">
                <th className="w-12 px-3 py-1.5 font-medium text-center">#</th>
                <th className="px-3 py-1.5 font-medium">Model</th>
                <th className="w-24 px-3 py-1.5 font-medium text-center">Order</th>
                <th className="w-12 px-3 py-1.5 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-mono">
              {models.map((model, index) => (
                <tr key={`${model}-${index}`} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2 text-center text-text-muted text-[11px] font-sans">
                    #{index + 1}
                  </td>
                  <td className="px-3 py-2 text-text-main">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{model}</span>
                      <CapacityBadges caps={getCaps?.(model)} />
                      {model === DEFAULT_FALLBACK_MODEL && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-sans text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          free default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, -1)}
                        disabled={!enabled || index === 0}
                        className={`p-1 rounded transition-colors ${
                          !enabled || index === 0
                            ? "text-text-muted/20 cursor-not-allowed"
                            : "text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                        title="Move up"
                      >
                        <span className="material-symbols-outlined text-[16px] leading-none">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 1)}
                        disabled={!enabled || index === models.length - 1}
                        className={`p-1 rounded transition-colors ${
                          !enabled || index === models.length - 1
                            ? "text-text-muted/20 cursor-not-allowed"
                            : "text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                        title="Move down"
                      >
                        <span className="material-symbols-outlined text-[16px] leading-none">arrow_downward</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      disabled={!enabled}
                      className={`p-1 rounded transition-colors ${
                        !enabled
                          ? "text-text-muted/20 cursor-not-allowed"
                          : "text-text-muted hover:text-red-500 hover:bg-red-500/10"
                      }`}
                      title="Remove model"
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">close</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModelSelect && (
        <ModelSelectModal
          isOpen={showModelSelect}
          onClose={() => setShowModelSelect(false)}
          onSelect={handleAdd}
          onDeselect={handleDeselect}
          activeProviders={activeProviders}
          title={`Add ${cap.label} Model`}
          addedModelValues={models}
          capFilter={cap.key}
          closeOnSelect={false}
        />
      )}
    </Card>
  );
}

function SmartRouterSection({ smartRouter, onChange, srComboCleanup, onSrComboCleanupChange }) {
  const { enabled, names, allowedProviders, allowedModels, costQualityTradeoff, maxCandidates } = smartRouter;
  const cleanup = srComboCleanup || { enabled: false, ttlHours: 24, intervalHours: 12 };
  const patchCleanup = (p) => onSrComboCleanupChange({ ...cleanup, ...p });

  const patch = (p) => onChange({ ...smartRouter, ...p });

  return (
    <Card padding="md" className={!enabled ? "opacity-80" : ""}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">route</span>
            <p className="text-sm font-medium">Smart Router</p>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Virtual model that analyzes each request and picks the best model from your configured providers.
          </p>
          <ul className="mt-1.5 text-[11px] text-text-muted flex flex-col gap-0.5">
            <li><span className="font-medium text-text-main">How it works</span> — classify task (code, math, chat, …) → score your providers&apos; models → build a fallback combo → existing combo engine retries on failure</li>
            <li><span className="font-medium text-text-main">Use it as</span> — any model name listed below (e.g. <code className="font-mono">modelRouter</code>) in any OpenAI/Claude-compatible client</li>
            <li><span className="font-medium text-text-main">Fail-safe</span> — if no model scores, the request passes through unchanged to normal resolution</li>
          </ul>
        </div>
        <div className="shrink-0">
          <Toggle
            checked={enabled}
            onChange={(v) => patch({ enabled: v })}
            label={enabled ? "Enabled" : "Disabled"}
            size="md"
          />
        </div>
      </div>

      {enabled && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Trigger names */}
          <div>
            <label className="text-xs font-medium text-text-main mb-1 block">Trigger model names</label>
            <Input
              value={names.join(", ")}
              onChange={(e) =>
                patch({ names: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
              }
              placeholder="modelRouter, auto"
            />
            <p className="text-[10px] text-text-muted mt-0.5">
              Comma-separated. Use any of these as your model string.
            </p>
          </div>

          {/* Allowed providers */}
          <div>
            <label className="text-xs font-medium text-text-main mb-1 block">Allowed providers (optional)</label>
            <Input
              value={allowedProviders.join(", ")}
              onChange={(e) =>
                patch({ allowedProviders: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
              }
              placeholder="openai, anthropic, deepseek (empty = all)"
            />
            <p className="text-[10px] text-text-muted mt-0.5">
              Provider IDs to consider. Empty = all configured providers.
            </p>
          </div>

          {/* Allowed models — specific subset */}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-text-main mb-1 block">Allowed models (optional — exact or wildcard)</label>
            <Input
              value={allowedModels.join(", ")}
              onChange={(e) =>
                patch({ allowedModels: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
              }
              placeholder="openai/gpt-4o, anthropic/claude-*, */*-thinking"
            />
            <p className="text-[10px] text-text-muted mt-0.5">
              Restrict the router to a specific subset of models. Supports wildcards:{" "}
              <code className="font-mono">openai/*</code> (all OpenAI), <code className="font-mono">*/claude-*</code>{" "}
              (any claude model). Empty = all models from allowed providers.
            </p>
          </div>

          {/* Cost/quality tradeoff */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-text-main">Cost / Quality tradeoff</label>
              <span className="text-xs font-mono text-primary">{costQualityTradeoff}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={costQualityTradeoff}
              onChange={(e) => patch({ costQualityTradeoff: Number(e.target.value) })}
              className="w-full accent-[var(--primary,#6C5CE7)]"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
              <span>0 = best quality</span>
              <span>5 = balanced</span>
              <span>10 = cheapest</span>
            </div>
          </div>

          {/* Max candidates */}
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-text-main mb-1 block">Fallback chain size</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={String(maxCandidates)}
              onChange={(e) => patch({ maxCandidates: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
            />
            <p className="text-[10px] text-text-muted mt-0.5">
              How many top models to include in the automatic fallback combo (tried in score order).
            </p>
          </div>

          {/* Auto-cleanup of sr-* combos (optional, off by default) */}
          <div className="sm:col-span-2 rounded-xl border border-black/5 dark:border-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-text-muted">delete_sweep</span>
                  <p className="text-xs font-medium">Auto-cleanup of temporary combos</p>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  The router creates temporary <code className="font-mono">sr-*</code> combos as it routes. When enabled, combos
                  unused for the TTL below are deleted automatically. <span className="font-medium text-text-main">Off by default</span> — opt in.
                </p>
              </div>
              <div className="shrink-0">
                <Toggle
                  checked={cleanup.enabled}
                  onChange={(v) => patchCleanup({ enabled: v })}
                  label={cleanup.enabled ? "On" : "Off"}
                  size="sm"
                />
              </div>
            </div>

            {cleanup.enabled && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-text-main mb-1 block">Delete after (hours)</label>
                  <Input
                    type="number"
                    min={1}
                    max={8760}
                    value={String(cleanup.ttlHours)}
                    onChange={(e) => patchCleanup({ ttlHours: Math.max(1, Math.min(8760, Number(e.target.value) || 24)) })}
                  />
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Combos not used for this long get deleted.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-main mb-1 block">Sweep every (hours)</label>
                  <Input
                    type="number"
                    min={1}
                    max={720}
                    value={String(cleanup.intervalHours)}
                    onChange={(e) => patchCleanup({ intervalHours: Math.max(1, Math.min(720, Number(e.target.value) || 12)) })}
                  />
                  <p className="text-[10px] text-text-muted mt-0.5">
                    How often the background sweep runs.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function MarkdownLogSection({ markdownLog, onChange }) {
  const { enabled, intervalMin } = markdownLog;
  const patch = (p) => onChange({ ...markdownLog, ...p });

  return (
    <Card padding="md" className={!enabled ? "opacity-80" : ""}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">description</span>
            <p className="text-sm font-medium">Markdown Request Log</p>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Periodically writes captured request details to a per-day markdown report grouped by conversation.
          </p>
          <ul className="mt-1.5 text-[11px] text-text-muted flex flex-col gap-0.5">
            <li><span className="font-medium text-text-main">Location</span> — <code className="font-mono">~/.9router/logs/YYYY-MM-DD.md</code></li>
            <li><span className="font-medium text-text-main">Behavior</span> — each flush <span className="font-medium text-amber-600">overwrites</span> the day's file with the latest 24h of captured requests. It is a snapshot, not an append log.</li>
            <li><span className="font-medium text-text-main">Requires</span> — request detail capture (Settings → Observability) to have data</li>
          </ul>
        </div>
        <div className="shrink-0">
          <Toggle
            checked={enabled}
            onChange={(v) => patch({ enabled: v })}
            label={enabled ? "Enabled" : "Disabled"}
            size="md"
          />
        </div>
      </div>

      {enabled && (
        <div className="mt-4 max-w-[220px]">
          <label className="text-xs font-medium text-text-main mb-1 block">Flush interval (minutes)</label>
          <Input
            type="number"
            min={1}
            max={1440}
            value={String(intervalMin)}
            onChange={(e) => patch({ intervalMin: Math.max(1, Math.min(1440, Number(e.target.value) || 5)) })}
          />
          <p className="text-[10px] text-text-muted mt-0.5">
            How often the daily markdown file is <span className="font-medium">rewritten (overwritten)</span> with the latest 24h of requests.
          </p>
        </div>
      )}
    </Card>
  );
}

function ModelFallbacksSection({ modelFallbacks, onChange, activeProviders }) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [view, setView] = useState("table"); // "table" | "chains" | "cards"

  // Normalize each rule value into { models, retries, perModelRetries }
  const rules = useMemo(() => {
    const out = [];
    for (const [target, raw] of Object.entries(modelFallbacks || {})) {
      let models, retries, perModelRetries;
      if (Array.isArray(raw)) { models = raw; retries = 1; perModelRetries = {}; }
      else if (raw && typeof raw === "object") {
        models = Array.isArray(raw.models) ? raw.models : [];
        retries = Number.isFinite(Number(raw.retries)) ? Math.max(1, Number(raw.retries)) : 1;
        perModelRetries = raw.perModelRetries && typeof raw.perModelRetries === "object" ? raw.perModelRetries : {};
      }
      out.push({ target, models, retries, perModelRetries });
    }
    return out;
  }, [modelFallbacks]);

  const handleDeleteRule = (target) => {
    const next = { ...modelFallbacks };
    delete next[target];
    onChange(next);
  };

  const handleUpsertRule = (rule) => {
    onChange({ ...modelFallbacks, [rule.target]: { models: rule.models, retries: rule.retries, perModelRetries: rule.perModelRetries } });
  };

  const viewTabs = [
    { key: "table", label: "Table", icon: "table" },
    { key: "chains", label: "Chain Flow", icon: "account_tree" },
    { key: "cards", label: "Simple + Advanced", icon: "dashboard_customize" },
    { key: "wizard", label: "Guided Wizard", icon: "rocket_launch" },
    { key: "text", label: "Expert Text", icon: "code" },
  ];

  return (
    <Card padding="md">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">swap_horiz</span>
            <p className="text-sm font-medium">Per-Model / Per-Provider Fallbacks</p>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Attach an ordered fallback chain directly to any model or provider — no combo needed. When the requested model fails, 9Router retries down the chain automatically.
          </p>
          <p className="text-[10px] text-text-muted mt-1">
            Five ways to manage rules — pick the one that fits how you think. All five edit the same underlying rules.
          </p>
        </div>
        <div className="shrink-0">
          <Button icon="add" onClick={() => setShowBuilder(true)} className="whitespace-nowrap">
            Add Fallback Rule
          </Button>
        </div>
      </div>

      {/* View switcher */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {viewTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              view === t.key
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {view === "table" && (
        <FallbackRulesTable rules={rules} onDelete={handleDeleteRule} />
      )}
      {view === "chains" && (
        <FallbackChainFlow rules={rules} onChange={handleUpsertRule} onDelete={handleDeleteRule} activeProviders={activeProviders} />
      )}
      {view === "cards" && (
        <FallbackRuleCards rules={rules} onChange={handleUpsertRule} onDelete={handleDeleteRule} activeProviders={activeProviders} />
      )}
      {view === "wizard" && (
        <FallbackWizard rules={rules} onUpsert={handleUpsertRule} onDelete={handleDeleteRule} activeProviders={activeProviders} />
      )}
      {view === "text" && (
        <FallbackTextEditor
          key={JSON.stringify(modelFallbacks)}
          modelFallbacks={modelFallbacks}
          onChange={onChange}
          rules={rules}
          onDelete={handleDeleteRule}
        />
      )}

      {showBuilder && (
        <FallbackRuleModal
          onClose={() => setShowBuilder(false)}
          onSave={(rule) => {
            handleUpsertRule(rule);
            setShowBuilder(false);
          }}
          activeProviders={activeProviders}
        />
      )}
    </Card>
  );
}

/** Approach 1: table view (the original modal + table). */
function FallbackRulesTable({ rules, onDelete }) {
  // Precedence: a model-level rule ("provider/model") beats a provider-level
  // rule ("provider") when both exist — the model rule wins silently today.
  // Surface both directions so the user can see the conflict.
  const providerTargets = new Set(
    rules.filter((r) => !r.target.includes("/")).map((r) => r.target)
  );
  const conflictInfo = (target) => {
    if (target.includes("/")) {
      const provider = target.split("/")[0];
      if (providerTargets.has(provider)) {
        return { kind: "model-over-provider", text: `Provider rule for "${provider}" also exists — this model rule takes precedence` };
      }
    } else {
      const modelRules = rules.filter((r) => r.target.startsWith(target + "/"));
      if (modelRules.length > 0) {
        return {
          kind: "provider-overlaps-models",
          text: `Also applies to ${modelRules.length} model rule${modelRules.length === 1 ? "" : "s"} (${modelRules.map((r) => r.target).join(", ")}) — those take precedence`,
        };
      }
    }
    return null;
  };

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-black/5 dark:border-white/5">
            <th className="text-left p-2 text-xs font-semibold text-text-muted">Target</th>
            <th className="text-left p-2 text-xs font-semibold text-text-muted">Fallback Chain (in order)</th>
            <th className="text-center p-2 text-xs font-semibold text-text-muted">Retries</th>
            <th className="text-center p-2 text-xs font-semibold text-text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 ? (
            <tr>
              <td colSpan="4" className="p-4 text-center text-xs text-text-muted">
                No fallback rules yet. Click &quot;Add Fallback Rule&quot; to create one.
              </td>
            </tr>
          ) : rules.map((rule) => {
            const conflict = conflictInfo(rule.target);
            return (
            <tr key={rule.target} className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
              <td className="p-2 font-mono text-xs text-text-main whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <span>{rule.target}</span>
                  {conflict && (
                    <span
                      className={`inline-flex max-w-[260px] items-start gap-1 rounded px-1.5 py-0.5 text-[10px] leading-snug ${
                        conflict.kind === "model-over-provider"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-primary/10 text-primary"
                      }`}
                      title={conflict.text}
                    >
                      <span className="material-symbols-outlined text-[12px] shrink-0">warning</span>
                      {conflict.text}
                    </span>
                  )}
                </div>
              </td>
              <td className="p-2">
                <div className="flex flex-wrap items-center gap-1">
                  {rule.models.map((m, i) => (
                    <span key={m} className="inline-flex items-center gap-0.5 rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
                      {m}
                      {i < rule.models.length - 1 && <span className="text-primary">→</span>}
                    </span>
                  ))}
                  {rule.perModelRetries && Object.keys(rule.perModelRetries).length > 0 && (
                    <span className="text-[10px] text-text-muted italic ml-1">
                      ({Object.entries(rule.perModelRetries).map(([m, r]) => `${m}:${r}`).join(", ")})
                    </span>
                  )}
                </div>
              </td>
              <td className="p-2 text-center font-mono text-xs">{rule.retries}</td>
              <td className="p-2 text-center">
                <Button variant="ghost" size="sm" onClick={() => onDelete(rule.target)} title="Delete rule">
                  <span className="material-symbols-outlined text-[16px] text-red-500">delete</span>
                </Button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Approach 2: fluid drag-and-drop chain flow — rules as connected nodes. */
function FallbackChainFlow({ rules, onChange, onDelete, activeProviders }) {
  const [pickerFor, setPickerFor] = useState(null); // { target, index } — add at index

  // insertIndex is computed live during the drag (see SortableChain) so the
  // drop lands EXACTLY where the indicator bar is showing.
  const handleDragEnd = (target, event, insertIndex) => {
    const { active, over } = event;
    if (!active) return;
    const rule = rules.find((r) => r.target === target);
    if (!rule) return;
    const oldIndex = rule.models.findIndex((m) => m === active.id);
    if (oldIndex < 0) return;
    // Prefer the indicator-computed slot; fall back to the droppable under
    // the pointer (dnd-kit's `over`) when no live computation happened.
    let newIndex = insertIndex;
    if (typeof newIndex !== "number" || newIndex < 0) {
      if (!over || over.id === active.id) return;
      newIndex = rule.models.findIndex((m) => m === over.id);
      if (newIndex < 0) return;
    }
    if (newIndex === oldIndex) return;
    const models = arrayMove(rule.models, oldIndex, newIndex);
    onChange({ target, models, retries: rule.retries, perModelRetries: rule.perModelRetries });
  };

  const handleRemoveModel = (target, idx) => {
    const rule = rules.find((r) => r.target === target);
    if (!rule) return;
    onChange({ target, models: rule.models.filter((_, i) => i !== idx), retries: rule.retries, perModelRetries: rule.perModelRetries });
  };

  const handleAddModel = (model) => {
    const { target } = pickerFor;
    const rule = rules.find((r) => r.target === target);
    if (!rule) return;
    const models = [...rule.models];
    if (models.includes(model.value)) { setPickerFor(null); return; }
    models.push(model.value);
    onChange({ target, models, retries: rule.retries, perModelRetries: rule.perModelRetries });
    setPickerFor(null);
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      {rules.length === 0 && (
        <p className="text-center text-xs text-text-muted py-4">No fallback rules yet. Use &quot;Add Fallback Rule&quot; to create one.</p>
      )}
      {rules.map((rule) => (
        <div key={rule.target} className="rounded-xl border border-black/5 dark:border-white/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <code className="font-mono text-xs font-medium">{rule.target}</code>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-muted">retries ×{rule.retries}</span>
              <button onClick={() => onDelete(rule.target)} className="p-0.5 rounded text-text-muted hover:text-red-500">
                <span className="material-symbols-outlined text-[14px]">delete</span>
              </button>
            </div>
          </div>
          {/* Chain: target node → sortable fallback nodes (drag to reorder) */}
          <SortableChain
            target={rule.target}
            models={rule.models}
            onDragEnd={handleDragEnd}
            onRemove={handleRemoveModel}
            onAdd={() => setPickerFor({ target: rule.target })}
          />
          {/* Per-model retry overrides inline */}
          {rule.models.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-text-muted">per-model retries:</span>
              {rule.models.map((m) => (
                <label key={m} className="flex items-center gap-1">
                  <code className="text-[10px] font-mono text-text-muted max-w-[120px] truncate">{m.split("/").pop()}</code>
                  <input
                    type="number" min={1} max={10}
                    value={rule.perModelRetries[m] !== undefined ? String(rule.perModelRetries[m]) : ""}
                    placeholder="inherit"
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Math.max(1, Math.min(10, Number(e.target.value) || 1));
                      const perModelRetries = { ...rule.perModelRetries };
                      if (v === undefined) delete perModelRetries[m]; else perModelRetries[m] = v;
                      onChange({ target: rule.target, models: rule.models, retries: rule.retries, perModelRetries });
                    }}
                    className="w-14 rounded border border-black/10 dark:border-white/10 bg-surface px-1 py-0.5 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {pickerFor && (
        <ModelSelectModal
          isOpen={!!pickerFor}
          onClose={() => setPickerFor(null)}
          onSelect={handleAddModel}
          activeProviders={activeProviders}
          title="Add Fallback Model"
          closeOnSelect={true}
        />
      )}
    </div>
  );
}

/**
 * Sortable chain row for one rule (own hook scope per rule).
 *
 * Drop indicator: while dragging, a vertical accent bar shows the exact slot
 * where the held chip will land if released. The bar position is computed on
 * every pointer move from the LIVE on-screen rects of the sibling chips
 * (which dnd-kit shifts aside), so it tracks correctly even when the chips
 * wrap onto multiple rows. The computed insert index is reused on drop so the
 * final order matches where the bar was.
 */
function SortableChain({ target, models, onDragEnd, onRemove, onAdd }) {
  const containerRef = useRef(null);
  const insertIndexRef = useRef(null);
  const [bar, setBar] = useState(null); // { left, top, height } container-relative
  const [draggingId, setDraggingId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /** Compute insert index + bar geometry from the dragged chip's translated rect. */
  const computeInsertion = (event) => {
    const containerEl = containerRef.current;
    if (!containerEl) return null;
    const activeId = event.active?.id;
    if (typeof activeId !== "string") return null;

    // The dragged chip's CURRENT viewport rect = initial rect + drag delta.
    // (dnd-kit's `translated` rect is content-relative inside scrolled
    // containers, while getBoundingClientRect() is viewport-relative — mixing
    // them breaks the comparison when the dashboard's inner scroller is used.)
    const initial = event.active?.rect?.current?.initial;
    const delta = event.delta || { x: 0, y: 0 };
    if (!initial) return null;
    const pointerX = initial.left + delta.x + initial.width / 2;
    const pointerY = initial.top + delta.y + initial.height / 2;

    // Live rects of the OTHER chips (dragged chip excluded). dnd-kit applies
    // transforms to siblings during the drag, so getBoundingClientRect() gives
    // their current visual slot — exactly where the gap is.
    const nodes = Array.from(containerEl.querySelectorAll("[data-chain-node]"))
      .filter((el) => el.getAttribute("data-model") !== activeId)
      .map((el) => ({ id: el.getAttribute("data-model"), rect: el.getBoundingClientRect() }));

    if (nodes.length === 0) return null;

    // Reading-order comparison handles flex-wrap rows: a chip counts as
    // "before the pointer" when it sits above the pointer's row, or on the
    // same row with its center left of the pointer.
    let insertIndex = 0;
    for (const { rect } of nodes) {
      const cy = rect.top + rect.height / 2;
      const cx = rect.left + rect.width / 2;
      const sameRow = Math.abs(cy - pointerY) <= rect.height / 2;
      if (cy < pointerY - rect.height / 4 || (sameRow && cx < pointerX)) insertIndex += 1;
    }

    // Bar geometry: before the first chip, or just after the previous chip.
    let left, top, height;
    if (insertIndex === 0) {
      const r = nodes[0].rect;
      left = r.left - 1;
      top = r.top;
      height = r.height;
    } else {
      const r = nodes[insertIndex - 1].rect;
      left = r.right + 1;
      top = r.top;
      height = r.height;
    }

    const containerRect = containerEl.getBoundingClientRect();
    return {
      insertIndex,
      left: left - containerRect.left,
      top: top - containerRect.top,
      height,
    };
  };

  const handleDragStart = (event) => {
    setDraggingId(event.active?.id ?? null);
    setBar(null);
  };

  const handleDragMove = (event) => {
    let info = null;
    try {
      info = computeInsertion(event);
    } catch {
      return;
    }
    if (!info) return;
    insertIndexRef.current = info.insertIndex;
    setBar({ left: info.left, top: info.top, height: info.height });
  };

  const handleDragEnd = (event) => {
    onDragEnd(target, event, insertIndexRef.current);
    setDraggingId(null);
    setBar(null);
    insertIndexRef.current = null;
  };

  const handleDragCancel = () => {
    setDraggingId(null);
    setBar(null);
    insertIndexRef.current = null;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={models} strategy={rectSortingStrategy}>
        <div ref={containerRef} className="relative flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">
            {target}
            <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
          </span>
          {models.map((m, idx) => (
            <SortableChainNode
              key={m}
              model={m}
              isLast={idx === models.length - 1}
              onRemove={() => onRemove(target, idx)}
            />
          ))}
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-0.5 rounded-lg border border-dashed border-primary/40 px-2 py-1 text-[11px] text-primary hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[12px]">add</span>
            Add
          </button>

          {/* Drop indicator: vertical accent bar at the insertion slot */}
          {bar && (
            <div
              className="pointer-events-none absolute z-40 rounded-full"
              style={{
                left: bar.left,
                top: bar.top,
                height: bar.height,
                width: 3,
                background: "var(--primary, #6C5CE7)",
                boxShadow: "0 0 8px rgba(108,92,231,0.7)",
                transition: "left 70ms ease-out, top 70ms ease-out",
              }}
            />
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/** Sortable node chip inside a chain flow rule. */
function SortableChainNode({ model, isLast, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: model });
  return (
    <span
      ref={setNodeRef}
      data-chain-node
      data-model={model}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined }}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-mono text-[11px] ${
        isDragging
          ? "bg-primary/20 text-primary ring-1 ring-primary/40 shadow-lg"
          : "bg-black/5 dark:bg-white/5 text-text-main cursor-grab active:cursor-grabbing"
      }`}
      {...attributes}
      {...listeners}
      title="Drag to reorder the chain"
    >
      <span className="material-symbols-outlined text-[12px] text-text-muted/60">drag_indicator</span>
      {model}
      {!isLast && <span className="text-primary pointer-events-none">→</span>}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="leading-none text-text-muted hover:text-red-500 pointer-events-auto"
      >
        <span className="material-symbols-outlined text-[12px]">close</span>
      </button>
    </span>
  );
}

/** Approach 3: simple rule cards with an expandable "advanced" section. */
function FallbackRuleCards({ rules, onChange, onDelete, activeProviders }) {
  const [expanded, setExpanded] = useState(null); // target of expanded card
  const [pickerFor, setPickerFor] = useState(null); // { target }

  const handleAdd = (model) => {
    const rule = rules.find((r) => r.target === pickerFor.target);
    if (!rule) return;
    if (rule.models.includes(model.value)) { setPickerFor(null); return; }
    onChange({ target: rule.target, models: [...rule.models, model.value], retries: rule.retries, perModelRetries: rule.perModelRetries });
    setPickerFor(null);
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      {rules.length === 0 && (
        <p className="text-center text-xs text-text-muted py-4">No fallback rules yet. Use &quot;Add Fallback Rule&quot; to create one.</p>
      )}
      {rules.map((rule) => {
        const isOpen = expanded === rule.target;
        return (
          <div key={rule.target} className="rounded-xl border border-black/5 dark:border-white/5">
            {/* Simple header */}
            <div className="flex items-center justify-between p-3">
              <div className="flex min-w-0 items-center gap-2">
                <button onClick={() => setExpanded(isOpen ? null : rule.target)} className="material-symbols-outlined text-text-muted transition-transform duration-200" style={{ transform: isOpen ? "rotate(90deg)" : "none" }}>
                  chevron_right
                </button>
                <code className="truncate font-mono text-xs font-medium">{rule.target}</code>
                <span className="text-[10px] text-text-muted">
                  → {rule.models.length} fallback{rule.models.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-muted">retries ×{rule.retries}</span>
                <button onClick={() => onDelete(rule.target)} className="p-0.5 rounded text-text-muted hover:text-red-500">
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                </button>
              </div>
            </div>

            {/* Simple view: chain chips */}
            {!isOpen && (
              <div className="px-3 pb-3 flex flex-wrap items-center gap-1">
                {rule.models.map((m, i) => (
                  <span key={m} className="inline-flex items-center gap-0.5 rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
                    {m}
                    {i < rule.models.length - 1 && <span className="text-primary">→</span>}
                  </span>
                ))}
                <button onClick={() => setPickerFor({ target: rule.target })} className="inline-flex items-center gap-0.5 rounded border border-dashed border-primary/40 px-1.5 py-0.5 text-[11px] text-primary hover:border-primary hover:bg-primary/5 transition-colors">
                  <span className="material-symbols-outlined text-[12px]">add</span>
                </button>
              </div>
            )}

            {/* Advanced view: reuses combo-style strategy + retries */}
            {isOpen && (
              <div className="border-t border-black/5 dark:border-white/5 p-3 flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium text-text-main mb-1 block">Fallback chain (in order)</label>
                  <div className="flex flex-wrap items-center gap-1">
                    {rule.models.map((m, idx) => (
                      <span key={m} className="inline-flex items-center gap-1 rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
                        {m}
                        <button onClick={() => onChange({ target: rule.target, models: rule.models.filter((_, i) => i !== idx), retries: rule.retries, perModelRetries: rule.perModelRetries })} className="leading-none text-text-muted hover:text-red-500">
                          <span className="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      </span>
                    ))}
                    <button onClick={() => setPickerFor({ target: rule.target })} className="inline-flex items-center gap-0.5 rounded border border-dashed border-primary/40 px-1.5 py-0.5 text-[11px] text-primary hover:border-primary hover:bg-primary/5 transition-colors">
                      <span className="material-symbols-outlined text-[12px]">add</span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-text-main mb-1 block">Retries (universal)</label>
                    <Input
                      type="number" min={1} max={10}
                      value={String(rule.retries)}
                      onChange={(e) => onChange({ target: rule.target, models: rule.models, retries: Math.max(1, Math.min(10, Number(e.target.value) || 1)), perModelRetries: rule.perModelRetries })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-main mb-1 block">Per-model retries (override)</label>
                    <div className="flex flex-col gap-1">
                      {rule.models.map((m) => (
                        <label key={m} className="flex items-center gap-2">
                          <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-muted">{m}</code>
                          <Input
                            type="number" min={1} max={10}
                            value={rule.perModelRetries[m] !== undefined ? String(rule.perModelRetries[m]) : ""}
                            placeholder="inherit"
                            className="w-20"
                            onChange={(e) => {
                              const v = e.target.value === "" ? undefined : Math.max(1, Math.min(10, Number(e.target.value) || 1));
                              const perModelRetries = { ...rule.perModelRetries };
                              if (v === undefined) delete perModelRetries[m]; else perModelRetries[m] = v;
                              onChange({ target: rule.target, models: rule.models, retries: rule.retries, perModelRetries });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted">
                  Advanced option: this rule runs through the same combo engine as named combos — strategy and cooldown behavior match the existing combo engine.
                </p>
              </div>
            )}
          </div>
        );
      })}

      {pickerFor && (
        <ModelSelectModal
          isOpen={!!pickerFor}
          onClose={() => setPickerFor(null)}
          onSelect={handleAdd}
          activeProviders={activeProviders}
          title="Add Fallback Model"
          closeOnSelect={true}
        />
      )}
    </div>
  );
}

/** Form modal for building a fallback rule visually. */
function FallbackRuleModal({ onClose, onSave, activeProviders }) {
  const [target, setTarget] = useState("");                 // "provider/model" or "provider"
  const [targetIsProvider, setTargetIsProvider] = useState(false); // true = whole provider
  const [fallbacks, setFallbacks] = useState([]);           // ordered model strings
  const [retries, setRetries] = useState(1);                // universal retries
  const [perModelRetries, setPerModelRetries] = useState({}); // per-model overrides
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [showTargetSelect, setShowTargetSelect] = useState(false);
  const [showProviderSelect, setShowProviderSelect] = useState(false);
  const [nodePrefixes, setNodePrefixes] = useState([]);     // custom node prefixes (valid providers)

  // Custom provider nodes (openai/anthropic-compatible) use a prefix (e.g.
  // "mockreal") that is NOT in the static catalog — their models are valid.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/provider-nodes")
      .then((r) => (r.ok ? r.json() : { nodes: [] }))
      .then((d) => {
        if (cancelled) return;
        setNodePrefixes(
          (d.nodes || [])
            .map((n) => n.prefix || n.id)
            .filter((p) => typeof p === "string" && p)
        );
      })
      .catch(() => { if (!cancelled) setNodePrefixes([]); });
    return () => { cancelled = true; };
  }, []);

  const chainSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Drag to reorder the fallback chain (same as the Chain Flow view).
  const handleChainDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fallbacks.findIndex((m) => m === active.id);
    const newIndex = fallbacks.findIndex((m) => m === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setFallbacks(arrayMove(fallbacks, oldIndex, newIndex));
  };

  // Switching between "specific model" and "whole provider" swaps the target
  // box to match. Deliberately simple:
  //   model → provider: keep the provider part of "openai/gpt-4o" → "openai"
  //   provider → model: clear the box (you'll pick a model anyway)
  const handleTargetModeChange = (providerMode) => {
    if (providerMode === targetIsProvider) return;
    setTargetIsProvider(providerMode);
    if (providerMode) {
      // Strip any "/model" suffix so the box shows just the provider id.
      setTarget((t) => (t.includes("/") ? t.split("/")[0] : t));
    } else {
      setTarget("");
    }
  };

  const handleAddFallback = (model) => {
    if (!fallbacks.includes(model.value)) setFallbacks([...fallbacks, model.value]);
  };

  const handleMove = (idx, delta) => {
    const t = idx + delta;
    if (t < 0 || t >= fallbacks.length) return;
    const next = [...fallbacks];
    [next[idx], next[t]] = [next[t], next[idx]];
    setFallbacks(next);
  };

  // Validate fallback strings against the known catalog. Warn, don't block:
  // custom nodes and passthrough providers accept arbitrary model ids, so
  // "unknown" is a hint, not an error.
  const unknownFallbacks = fallbacks.filter((m) => {
    if (!m || typeof m !== "string") return true;
    const slash = m.indexOf("/");
    if (slash <= 0) return true; // not provider/model form
    const provider = m.slice(0, slash);
    const modelId = m.slice(slash + 1);
    if (!modelId) return true;
    if (nodePrefixes.includes(provider)) return false; // custom node — valid
    return !isValidModel(provider, modelId);
  });

  const canSave = target.trim() && fallbacks.length > 0;

  return (
    <Modal isOpen onClose={onClose} title="Add Fallback Rule">
      <div className="flex flex-col gap-4">
        {/* Unknown-model warning */}
        {unknownFallbacks.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
            <span>
              Not in the model catalog (may still work if it&apos;s a passthrough/custom
              model): <code className="font-mono">{unknownFallbacks.join(", ")}</code>
            </span>
          </div>
        )}
        {/* Target: model or provider */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Target</label>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
              <Toggle checked={!targetIsProvider} onChange={() => handleTargetModeChange(false)} size="sm" aria-label="Target is a specific model" />
              <span>Specific model</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
              <Toggle checked={targetIsProvider} onChange={() => handleTargetModeChange(true)} size="sm" aria-label="Target is a whole provider" />
              <span>Whole provider</span>
            </label>
          </div>
          {targetIsProvider ? (
            <div className="flex gap-2">
              <Input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="openai, anthropic, deepseek (provider id)"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => setShowProviderSelect(true)}>Pick provider…</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="openai/gpt-4o"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={() => setShowTargetSelect(true)}>Pick…</Button>
            </div>
          )}
          <p className="text-[10px] text-text-muted mt-0.5">
            {targetIsProvider
              ? "Provider-level: applies to every model from this provider. Use Pick provider… to browse by name."
              : "Model-level: applies only to this exact model."}
          </p>
        </div>

        {/* Ordered fallback chain */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Fallback chain (tried in order)</label>
          {fallbacks.length === 0 ? (
            <div className="text-center py-3 border border-dashed border-black/10 dark:border-white/10 rounded-lg text-xs text-text-muted">
              No fallbacks yet — add at least one model
            </div>
          ) : (
            <DndContext
              sensors={chainSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChainDragEnd}
            >
              <SortableContext items={fallbacks} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1">
                  {fallbacks.map((m, idx) => (
                    <SortableFallbackChainItem
                      key={m}
                      model={m}
                      idx={idx}
                      isFirst={idx === 0}
                      isLast={idx === fallbacks.length - 1}
                      onMove={handleMove}
                      onRemove={() => setFallbacks(fallbacks.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <button
            onClick={() => setShowModelSelect(true)}
            className="w-full mt-2 py-1.5 border border-dashed border-black/10 dark:border-white/10 rounded-lg text-xs text-primary font-medium hover:border-primary/50 transition-colors"
          >
            + Add Fallback Model
          </button>
        </div>

        {/* Retries */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-text-main mb-1 block">Retries (universal)</label>
            <Input
              type="number" min={1} max={10}
              value={String(retries)}
              onChange={(e) => setRetries(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
            />
            <p className="text-[10px] text-text-muted mt-0.5">Times each model is retried on transient errors before moving down the chain.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-text-main mb-1 block">Per-model overrides (optional)</label>
            {fallbacks.length === 0 ? (
              <p className="text-[10px] text-text-muted italic pt-2">Add fallbacks first to set per-model retries.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {fallbacks.map((m) => (
                  <div key={m} className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-muted">{m}</code>
                    <Input
                      type="number" min={1} max={10}
                      value={perModelRetries[m] !== undefined ? String(perModelRetries[m]) : ""}
                      placeholder="inherit"
                      className="w-20"
                      onChange={(e) => {
                        const v = e.target.value === "" ? undefined : Math.max(1, Math.min(10, Number(e.target.value) || 1));
                        const next = { ...perModelRetries };
                        if (v === undefined) delete next[m]; else next[m] = v;
                        setPerModelRetries(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" fullWidth size="sm" onClick={onClose}>Cancel</Button>
          <Button fullWidth size="sm" disabled={!canSave} onClick={() => onSave({ target: target.trim(), models: fallbacks, retries, perModelRetries })}>
            Save Rule
          </Button>
        </div>
      </div>

      {showModelSelect && (
        <ModelSelectModal
          isOpen={showModelSelect}
          onClose={() => setShowModelSelect(false)}
          onSelect={handleAddFallback}
          activeProviders={activeProviders}
          title="Add Fallback Model"
          addedModelValues={fallbacks}
          closeOnSelect={true}
        />
      )}
      {showTargetSelect && (
        <ModelSelectModal
          isOpen={showTargetSelect}
          onClose={() => setShowTargetSelect(false)}
          onSelect={(m) => { setTarget(m.value); setShowTargetSelect(false); }}
          activeProviders={activeProviders}
          title="Pick Target Model"
          closeOnSelect={true}
        />
      )}
      {showProviderSelect && (
        <ProviderSelectModal
          isOpen={showProviderSelect}
          onClose={() => setShowProviderSelect(false)}
          onSelect={(p) => { setTarget(p.value); setShowProviderSelect(false); }}
          activeProviders={activeProviders}
          title="Pick Target Provider"
          selectedProvider={targetIsProvider ? target : undefined}
          closeOnSelect={true}
        />
      )}
    </Modal>
  );
}

/** Sortable fallback-chain row inside the FallbackRuleModal. Drag the handle
 * (or the row itself) to reorder; arrow buttons remain as an exact alternative. */
function SortableFallbackChainItem({ model, idx, isFirst, isLast, onMove, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: model });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined }}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${
        isDragging
          ? "bg-primary/10 ring-1 ring-primary/40 shadow-lg"
          : "bg-black/[0.02] dark:bg-white/[0.02] cursor-grab active:cursor-grabbing"
      }`}
      {...attributes}
      {...listeners}
      title="Drag to reorder, or use the arrows"
    >
      <span className="material-symbols-outlined text-[14px] text-text-muted/50 shrink-0">drag_indicator</span>
      {/* key={idx}: force a fresh text node when the row moves — without it,
          the number can stay stale after a drag reorder (React reuses the old
          text node while dnd-kit's transform is still being committed) */}
      <span key={idx} className="text-[10px] font-medium text-text-muted w-4 text-center shrink-0">{idx + 1}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs">{model}</code>
      <button
        onClick={(e) => { e.stopPropagation(); onMove(idx, -1); }}
        disabled={isFirst}
        className={`p-0.5 rounded shrink-0 ${isFirst ? "text-text-muted/20" : "text-text-muted hover:text-primary"}`}
      >
        <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onMove(idx, 1); }}
        disabled={isLast}
        className={`p-0.5 rounded shrink-0 ${isLast ? "text-text-muted/20" : "text-text-muted hover:text-primary"}`}
      >
        <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="p-0.5 rounded text-text-muted hover:text-red-500 shrink-0"
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>
    </div>
  );
}

/** Approach 4: guided wizard — one step at a time, picks not typing. */
function FallbackWizard({ rules, onUpsert, onDelete, activeProviders }) {
  const [step, setStep] = useState(1); // 1 target, 2 chain, 3 retries
  const [targetIsProvider, setTargetIsProvider] = useState(false);
  const [target, setTarget] = useState("");
  const [fallbacks, setFallbacks] = useState([]);
  const [retries, setRetries] = useState(1);
  const [perModelRetries, setPerModelRetries] = useState({});
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [showProviderSelect, setShowProviderSelect] = useState(false);
  const [showTargetSelect, setShowTargetSelect] = useState(false);
  const [saved, setSaved] = useState(false);

  const reset = () => {
    setStep(1);
    setTargetIsProvider(false);
    setTarget("");
    setFallbacks([]);
    setRetries(1);
    setPerModelRetries({});
    setSaved(false);
  };

  const handleSave = () => {
    if (!target.trim() || fallbacks.length === 0) return;
    onUpsert({ target: target.trim(), models: fallbacks, retries, perModelRetries });
    setSaved(true);
    setTimeout(reset, 1200);
  };

  const steps = [
    { n: 1, label: "Who fails?" },
    { n: 2, label: "What tries next?" },
    { n: 3, label: "How many retries?" },
  ];

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                step === s.n ? "bg-primary/10 text-primary" : step > s.n ? "bg-emerald-500/10 text-emerald-600" : "text-text-muted bg-black/5 dark:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">{step > s.n ? "check" : String(s.n)}</span>
              {s.label}
            </div>
            {i < steps.length - 1 && <span className="text-text-muted/40 text-[10px]">→</span>}
          </div>
        ))}
        <span className="ml-auto text-[10px] text-text-muted">{rules.length} rule{rules.length === 1 ? "" : "s"} saved</span>
      </div>

      {saved && (
        <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          ✓ Rule saved — it will apply on the next request.
        </div>
      )}

      {/* Step 1: target */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-muted">Which model or provider should get the fallback chain?</p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
              <Toggle checked={!targetIsProvider} onChange={() => { setTargetIsProvider(false); setTarget(""); }} size="sm" />
              <span>Specific model</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
              <Toggle checked={targetIsProvider} onChange={() => { setTargetIsProvider(true); setTarget(""); }} size="sm" />
              <span>Whole provider</span>
            </label>
          </div>
          {targetIsProvider ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowProviderSelect(true)} className="w-full">
                <span className="material-symbols-outlined text-[16px]">dns</span>
                Pick a provider…
              </Button>
              <Input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="or type provider id (openai, anthropic…)"
                className="flex-1"
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTargetSelect(true)} className="w-full">
                <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                Pick a model…
              </Button>
              <Input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="or type provider/model"
                className="flex-1"
              />
            </div>
          )}
          <div className="flex justify-end">
            <Button size="sm" disabled={!target.trim()} onClick={() => setStep(2)}>Next →</Button>
          </div>
        </div>
      )}

      {/* Step 2: chain */}
      {step === 2 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-muted">
            If <code className="font-mono">{target}</code> fails, try these in order:
          </p>
          {fallbacks.length === 0 ? (
            <div className="text-center py-3 border border-dashed border-black/10 dark:border-white/10 rounded-lg text-xs text-text-muted">
              No fallbacks yet
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {fallbacks.map((m, idx) => (
                <div key={m} className="flex items-center gap-1.5 rounded-md px-2 py-1 bg-black/[0.02] dark:bg-white/[0.02]">
                  <span className="text-[10px] font-medium text-text-muted w-4 text-center">{idx + 1}</span>
                  <code className="min-w-0 flex-1 truncate font-mono text-xs">{m}</code>
                  <button onClick={() => setFallbacks(fallbacks.filter((_, i) => i !== idx))} className="p-0.5 rounded text-text-muted hover:text-red-500">
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowModelSelect(true)} className="w-full">
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add fallback model
          </Button>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>← Back</Button>
            <Button size="sm" disabled={fallbacks.length === 0} onClick={() => setStep(3)}>Next →</Button>
          </div>
        </div>
      )}

      {/* Step 3: retries */}
      {step === 3 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-muted">How many times should each model retry on transient errors before moving down the chain?</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-text-main mb-1 block">Retries (universal)</label>
              <Input
                type="number" min={1} max={10}
                value={String(retries)}
                onChange={(e) => setRetries(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-main mb-1 block">Per-model overrides (optional)</label>
              {fallbacks.length === 0 ? (
                <p className="text-[10px] text-text-muted italic pt-2">Add fallbacks first.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {fallbacks.map((m) => (
                    <div key={m} className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-muted">{m}</code>
                      <Input
                        type="number" min={1} max={10}
                        value={perModelRetries[m] !== undefined ? String(perModelRetries[m]) : ""}
                        placeholder="inherit"
                        className="w-20"
                        onChange={(e) => {
                          const v = e.target.value === "" ? undefined : Math.max(1, Math.min(10, Number(e.target.value) || 1));
                          const next = { ...perModelRetries };
                          if (v === undefined) delete next[m]; else next[m] = v;
                          setPerModelRetries(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(2)}>← Back</Button>
            <Button size="sm" onClick={handleSave}>
              <span className="material-symbols-outlined text-[16px]">save</span>
              Save Rule
            </Button>
          </div>
        </div>
      )}

      {/* Existing rules summary */}
      {rules.length > 0 && (
        <div className="border-t border-black/5 dark:border-white/5 pt-3">
          <p className="text-[11px] font-medium text-text-muted mb-1.5">Current rules</p>
          <div className="flex flex-col gap-1">
            {rules.map((rule) => (
              <div key={rule.target} className="flex items-center gap-2 rounded-md px-2 py-1 bg-black/[0.02] dark:bg-white/[0.02]">
                <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{rule.target}</code>
                <span className="text-[10px] text-text-muted shrink-0">→ {rule.models.length} fallback{rule.models.length === 1 ? "" : "s"} ×{rule.retries}</span>
                <button onClick={() => onDelete(rule.target)} className="p-0.5 rounded text-text-muted hover:text-red-500 shrink-0">
                  <span className="material-symbols-outlined text-[13px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModelSelect && (
        <ModelSelectModal
          isOpen={showModelSelect}
          onClose={() => setShowModelSelect(false)}
          onSelect={(m) => { if (!fallbacks.includes(m.value)) setFallbacks([...fallbacks, m.value]); setShowModelSelect(false); }}
          activeProviders={activeProviders}
          title="Add Fallback Model"
          addedModelValues={fallbacks}
          closeOnSelect={true}
        />
      )}
      {showProviderSelect && (
        <ProviderSelectModal
          isOpen={showProviderSelect}
          onClose={() => setShowProviderSelect(false)}
          onSelect={(p) => { setTarget(p.value); setShowProviderSelect(false); }}
          activeProviders={activeProviders}
          title="Pick Target Provider"
          closeOnSelect={true}
        />
      )}
      {showTargetSelect && (
        <ModelSelectModal
          isOpen={showTargetSelect}
          onClose={() => setShowTargetSelect(false)}
          onSelect={(m) => { setTarget(m.value); setShowTargetSelect(false); }}
          activeProviders={activeProviders}
          title="Pick Target Model"
          closeOnSelect={true}
        />
      )}
    </div>
  );
}

/** Approach 5: expert text — edit rules as lines: target:model1,model2 */
function FallbackTextEditor({ modelFallbacks, onChange, rules, onDelete }) {
  // Draft initializes from current rules. The parent remounts us with a
  // `key={JSON.stringify(modelFallbacks)}` when saved rules change, so the
  // draft refreshes without a prop-sync effect.
  const [draft, setDraft] = useState(() => toDraftText(modelFallbacks));
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const parsed = useMemo(() => parseDraftText(draft, modelFallbacks), [draft, modelFallbacks]);

  const handleApply = () => {
    setError("");
    onChange(parsed);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const handleExample = () => {
    setDraft([
      "# Format: target:model1,model2  (target = provider/model or just provider)",
      "# Lines starting with # are ignored.",
      "openai/gpt-4o:openai/gpt-4o-mini,anthropic/claude-sonnet-4.6",
      "anthropic:openai/gpt-4o,deepseek/deepseek-chat",
    ].join("\n"));
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-text-muted">
          One rule per line: <code className="font-mono">target:fallback1,fallback2</code>. The target is a
          provider/model pair or a whole provider id.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleExample}>Load example</Button>
          <Button size="sm" onClick={handleApply}>
            <span className="material-symbols-outlined text-[15px]">check</span>
            Apply text
          </Button>
        </div>
      </div>

      <textarea
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setError(""); }}
        spellCheck={false}
        rows={8}
        placeholder={"# openai/gpt-4o:openai/gpt-4o-mini,anthropic/claude-sonnet-4.6\n# anthropic:openai/gpt-4o"}
        className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-surface p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/30"
      />

      {savedFlash && (
        <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          ✓ Applied {Object.keys(parsed).length} rule{Object.keys(parsed).length === 1 ? "" : "s"}.
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="rounded-lg border border-black/5 dark:border-white/5 p-3">
        <p className="text-[11px] font-medium text-text-muted mb-1.5">Parsed preview ({Object.keys(parsed).length} rules)</p>
        {Object.keys(parsed).length === 0 ? (
          <p className="text-xs text-text-muted italic">Nothing to apply yet.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {Object.entries(parsed).map(([target, models]) => (
              <div key={target} className="flex items-center gap-2 rounded-md px-2 py-1 bg-black/[0.02] dark:bg-white/[0.02]">
                <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{target}</code>
                <span className="text-[10px] text-text-muted shrink-0">→ {models.length} fallback{models.length === 1 ? "" : "s"}</span>
                <button
                  onClick={() => {
                    const next = { ...parsed };
                    delete next[target];
                    setDraft(toDraftText(next));
                  }}
                  className="p-0.5 rounded text-text-muted hover:text-red-500 shrink-0"
                >
                  <span className="material-symbols-outlined text-[13px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-black/5 dark:border-white/5 pt-3">
        <p className="text-[11px] font-medium text-text-muted mb-1.5">Saved rules ({rules.length})</p>
        {rules.length === 0 ? (
          <p className="text-xs text-text-muted italic">No saved rules.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {rules.map((rule) => (
              <div key={rule.target} className="flex items-center gap-2 rounded-md px-2 py-1 bg-black/[0.02] dark:bg-white/[0.02]">
                <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{rule.target}</code>
                <span className="text-[10px] text-text-muted shrink-0">→ {rule.models.join(", ")}</span>
                <button onClick={() => onDelete(rule.target)} className="p-0.5 rounded text-text-muted hover:text-red-500 shrink-0">
                  <span className="material-symbols-outlined text-[13px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModelItem({ id, index, model, isFirst, isLast, onEdit, onMoveUp, onMoveDown, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    // no transition — prevents the CSS settle animation fighting React's re-render on drop
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(model);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== model) onEdit(trimmed);
    else setDraft(model);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setDraft(model); setEditing(false); }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/[0.02] dark:hover:bg-white/[0.04] transition-colors ${isDragging ? "shadow-md ring-1 ring-primary/30" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab touch-none p-0.5 rounded text-text-muted hover:text-primary active:cursor-grabbing shrink-0"
        title="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="4" r="2"/><circle cx="15" cy="4" r="2"/>
          <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
          <circle cx="9" cy="20" r="2"/><circle cx="15" cy="20" r="2"/>
        </svg>
      </button>

      {/* Index badge */}
      <span className="text-[10px] font-medium text-text-muted w-3 text-center shrink-0">{index + 1}</span>

      {/* Inline editable model value */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 rounded border border-primary/40 bg-white px-1.5 py-0.5 font-mono text-xs text-text-main outline-none dark:bg-black/20"
        />
      ) : (
        <div
          className="min-w-0 flex-1 cursor-text truncate rounded px-1.5 py-0.5 font-mono text-xs text-text-main hover:bg-black/5 dark:hover:bg-white/5"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {model}
        </div>
      )}

      {/* Priority arrows */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className={`p-0.5 rounded ${isFirst ? "text-text-muted/20 cursor-not-allowed" : "text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"}`}
          title="Move up"
        >
          <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className={`p-0.5 rounded ${isLast ? "text-text-muted/20 cursor-not-allowed" : "text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"}`}
          title="Move down"
        >
          <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
        </button>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="p-0.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-500 transition-all"
        title="Remove"
      >
        <span className="material-symbols-outlined text-[12px]">close</span>
      </button>
    </div>
  );
}

function ComboFormModal({ isOpen, combo, onClose, onSave, activeProviders, kindFilter = null }) {
  // Initialize state with combo values - key prop on parent handles reset on remount
  const [name, setName] = useState(combo?.name || "");
  const [models, setModels] = useState(combo?.models || []);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [modelAliases, setModelAliases] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Use stable index-based IDs so duplicates and similar names are handled correctly
  const modelItems = models.map((model, i) => ({ uid: `item-${i}`, model }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = modelItems.findIndex((m) => m.uid === active.id);
      const newIndex = modelItems.findIndex((m) => m.uid === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setModels((prev) => arrayMove(prev, oldIndex, newIndex));
      }
    }
  };

  const fetchModalData = async () => {
    try {
      const aliasesRes = await fetch("/api/models/alias");
      if (!aliasesRes.ok) return;
      const aliasesData = await aliasesRes.json();
      setModelAliases(aliasesData.aliases || {});
    } catch (error) {
      console.error("Error fetching modal data:", error);
    }
  };

  useEffect(() => {
    if (isOpen) fetchModalData();
  }, [isOpen]);

  const validateName = (value) => {
    if (!value.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (!VALID_NAME_REGEX.test(value)) {
      setNameError("Only letters, numbers, -, _ and . allowed");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (value) validateName(value);
    else setNameError("");
  };

  const handleAddModel = (model) => {
    if (!models.includes(model.value)) {
      setModels([...models, model.value]);
    }
  };

  const handleDeselectModel = (model) => {
    setModels(models.filter((m) => m !== model.value));
  };

  const handleRemoveModel = (index) => {
    setModels(models.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newModels = [...models];
    [newModels[index - 1], newModels[index]] = [newModels[index], newModels[index - 1]];
    setModels(newModels);
  };

  const handleMoveDown = (index) => {
    if (index === models.length - 1) return;
    const newModels = [...models];
    [newModels[index], newModels[index + 1]] = [newModels[index + 1], newModels[index]];
    setModels(newModels);
  };

  const handleSave = async () => {
    if (!validateName(name)) return;
    setSaving(true);
    await onSave({ name: name.trim(), models });
    setSaving(false);
  };

  const isEdit = !!combo;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? "Edit Combo" : "Create Combo"}
      >
        <div className="flex flex-col gap-3">
          {/* Name */}
          <div>
            <Input
              label="Combo Name"
              value={name}
              onChange={handleNameChange}
              placeholder="my-combo"
              error={nameError}
            />
            <p className="text-[10px] text-text-muted mt-0.5">
              Only letters, numbers, -, _ and . allowed
            </p>
          </div>

          {/* Models */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Models</label>

            {models.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-black/10 dark:border-white/10 rounded-lg bg-black/[0.01] dark:bg-white/[0.01]">
                <span className="material-symbols-outlined text-text-muted text-xl mb-1">layers</span>
                <p className="text-xs text-text-muted">No models added yet</p>
              </div>
            ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
              <SortableContext items={modelItems.map((m) => m.uid)} strategy={verticalListSortingStrategy}>
                <div className="flex max-h-[55vh] min-w-0 flex-col gap-1 overflow-y-auto sm:max-h-[350px]">
                  {modelItems.map(({ uid, model }, index) => (
                    <ModelItem
                      key={uid}
                      id={uid}
                      index={index}
                      model={model}
                      isFirst={index === 0}
                      isLast={index === modelItems.length - 1}
                      onEdit={(newVal) => {
                        const updated = [...models];
                        updated[index] = newVal;
                        setModels(updated);
                      }}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                      onRemove={() => handleRemoveModel(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            )}

            {/* Add Model button */}
            <button
              onClick={() => setShowModelSelect(true)}
              className="w-full mt-2 py-2 border border-dashed border-black/10 dark:border-white/10 rounded-lg text-xs text-primary font-medium hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Model
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Button onClick={onClose} variant="ghost" fullWidth size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              fullWidth
              size="sm"
              disabled={!name.trim() || !!nameError || saving}
            >
              {saving ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Model Select Modal */}
      {showModelSelect && (
        <ModelSelectModal
          isOpen={showModelSelect}
          onClose={() => setShowModelSelect(false)}
          onSelect={handleAddModel}
          onDeselect={handleDeselectModel}
          activeProviders={activeProviders}
          modelAliases={modelAliases}
          title="Add Model to Combo"
          kindFilter={kindFilter}
          addedModelValues={models}
          closeOnSelect={false}
        />
      )}
    </>
  );
}
