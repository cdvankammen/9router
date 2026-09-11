"use client";

import { useParams, notFound, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Button, Input, Toggle, ModelSelectModal, Select } from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";
import { AI_PROVIDERS, MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";

const STRATEGY_OPTIONS = [
  { value: "fallback", label: "Fallback — try in order" },
  { value: "round-robin", label: "Round Robin — rotate" },
  { value: "fusion", label: "Fusion — panel + judge" },
];

const FUSION_DEFAULTS = {
  minPanel: 2,
  stragglerGraceMs: 8000,
  panelHardTimeoutMs: 90000,
};

// Parse "providerId/model" or just "providerId" → { providerId, model }
function parseModelEntry(entry) {
  if (typeof entry !== "string") return { providerId: "", model: "" };
  const idx = entry.indexOf("/");
  if (idx < 0) return { providerId: entry, model: "" };
  return { providerId: entry.slice(0, idx), model: entry.slice(idx + 1) };
}

const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

const KIND_LABELS = {
  webSearch: "Web Search",
  webFetch: "Web Fetch",
  image: "Text to Image",
  tts: "Text To Speech",
};

const EXAMPLE_PATHS = {
  webSearch: "/v1/search",
  webFetch: "/v1/web/fetch",
  image: "/v1/images/generations",
  tts: "/v1/audio/speech",
};

const EXAMPLE_BODIES = {
  webSearch: (n) => ({ model: n, query: "What is the latest news about AI?", search_type: "web", max_results: 5 }),
  webFetch: (n) => ({ model: n, url: "https://example.com", format: "markdown" }),
  image: (n) => ({ model: n, prompt: "A cute cat playing piano", n: 1, size: "1024x1024" }),
  tts: (n) => ({ model: n, input: "Hello, this is a test.", voice: "alloy" }),
};

// Map combo.kind → listing route to go back to
function getListingHref(kind) {
  if (kind === "webSearch" || kind === "webFetch") return "/dashboard/media-providers/web";
  return `/dashboard/media-providers/${kind}`;
}

export default function ComboDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [combo, setCombo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [providers, setProviders] = useState([]);
  const [strategy, setStrategy] = useState("fallback");
  const [judgeModel, setJudgeModel] = useState("");
  const [fusionTuning, setFusionTuning] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [showJudgePicker, setShowJudgePicker] = useState(false);
  const [logs, setLogs] = useState([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [connections, setConnections] = useState([]);
  const [modelAliases, setModelAliases] = useState({});

  const fetchAll = async () => {
    try {
      const [comboRes, settingsRes, logsRes, keysRes, connsRes, aliasesRes] = await Promise.all([
        fetch(`/api/combos/${id}`, { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/usage/logs", { cache: "no-store" }),
        fetch("/api/keys", { cache: "no-store" }),
        fetch("/api/providers", { cache: "no-store" }),
        fetch("/api/models/alias", { cache: "no-store" }),
      ]);
      if (aliasesRes.ok) setModelAliases((await aliasesRes.json()).aliases || {});
      if (keysRes.ok) {
        const k = await keysRes.json();
        setApiKey((k.keys || []).find((x) => x.isActive !== false)?.key || "");
      }
      if (connsRes.ok) setConnections((await connsRes.json()).connections || []);
      if (!comboRes.ok) { setCombo(null); setLoading(false); return; }
      const c = await comboRes.json();
      setCombo(c);
      setName(c.name);
      setProviders(c.models || []);
      const s = settingsRes.ok ? await settingsRes.json() : {};
      const cs = s.comboStrategies?.[c.name] || {};
      setStrategy(cs.fallbackStrategy || "fallback");
      setJudgeModel(cs.judgeModel || "");
      setFusionTuning(cs.fusionTuning || {});
      const allLogs = logsRes.ok ? await logsRes.json() : [];
      setLogs(allLogs.filter((l) => typeof l === "string" && l.includes(c.name)).slice(0, 50));
    } catch { /* noop */ }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAll(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateName = (v) => {
    if (!v.trim()) { setNameError("Name is required"); return false; }
    if (!VALID_NAME_REGEX.test(v)) { setNameError("Only letters, numbers, -, _ and ."); return false; }
    setNameError("");
    return true;
  };

  const saveCombo = async (patch) => {
    const res = await fetch(`/api/combos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) { const err = await res.json(); alert(err.error || "Failed to save"); return false; }
    return true;
  };

  const handleSaveName = async () => {
    if (!validateName(name)) return;
    if (name === combo.name) return;
    const ok = await saveCombo({ name });
    if (ok) await fetchAll();
  };

  const handleAddModel = async (model) => {
    const value = model?.value || model;
    if (!value || providers.includes(value)) return;
    const next = [...providers, value];
    setProviders(next);
    await saveCombo({ models: next });
  };

  const handleDeselectModel = async (model) => {
    const value = model?.value || model;
    if (!value || !providers.includes(value)) return;
    const next = providers.filter((p) => p !== value);
    setProviders(next);
    await saveCombo({ models: next });
  };

  const handleRemoveProvider = async (idx) => {
    const next = providers.filter((_, i) => i !== idx);
    setProviders(next);
    await saveCombo({ models: next });
  };

  const handleMove = async (idx, dir) => {
    const next = [...providers];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setProviders(next);
    await saveCombo({ models: next });
  };

  const handleSetStrategy = async (patch) => {
    try {
      const settingsRes = await fetch("/api/settings", { cache: "no-store" });
      const s = settingsRes.ok ? await settingsRes.json() : {};
      const updated = { ...(s.comboStrategies || {}) };
      const next = { ...(updated[combo.name] || {}), ...patch };
      // Prune default fallback with no extras
      if ((!next.fallbackStrategy || next.fallbackStrategy === "fallback") && !next.judgeModel && !next.fusionTuning) {
        delete updated[combo.name];
      } else {
        updated[combo.name] = next;
      }
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboStrategies: updated }),
      });
      // Update local state from patch
      if (patch.fallbackStrategy !== undefined) setStrategy(patch.fallbackStrategy);
      if (patch.judgeModel !== undefined) setJudgeModel(patch.judgeModel);
      if (patch.fusionTuning !== undefined) setFusionTuning(patch.fusionTuning);
    } catch (error) {
      console.log("Error updating combo strategy:", error);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete combo "${combo.name}"?`)) return;
    const res = await fetch(`/api/combos/${id}`, { method: "DELETE" });
    if (res.ok) router.push(getListingHref(combo.kind));
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError("");
    if (testResult?.audioUrl) { try { URL.revokeObjectURL(testResult.audioUrl); } catch {} }
    if (testResult?.imageUrl?.startsWith("blob:")) { try { URL.revokeObjectURL(testResult.imageUrl); } catch {} }
    const start = Date.now();
    try {
      const path = EXAMPLE_PATHS[combo.kind];
      const body = EXAMPLE_BODIES[combo.kind](combo.name);
      const headers = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      const res = await fetch(`/api${path}`, { method: "POST", headers, body: JSON.stringify(body) });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setTestError(d?.error?.message || d?.error || `HTTP ${res.status}`);
        setTestResult({ json: JSON.stringify(d, null, 2), latencyMs });
        return;
      }
      const ctype = res.headers.get("content-type") || "";
      // Binary image
      if (ctype.startsWith("image/")) {
        const blob = await res.blob();
        setTestResult({ imageUrl: URL.createObjectURL(blob), latencyMs });
        return;
      }
      // Binary audio
      if (ctype.startsWith("audio/") || ctype === "application/octet-stream") {
        const blob = await res.blob();
        setTestResult({ audioUrl: URL.createObjectURL(blob), latencyMs });
        return;
      }
      // JSON — could be image (data[0].b64_json/url) or generic
      const data = await res.json();
      const first = data?.data?.[0];
      const imageUrl = first?.b64_json
        ? `data:image/png;base64,${first.b64_json}`
        : (first?.url || "");
      setTestResult({ json: JSON.stringify(maskB64(data), null, 2), imageUrl, latencyMs });
    } catch (e) {
      setTestError(e.message || "Network error");
    }
    setTesting(false);
  };

  // Mask large b64_json strings to keep JSON view readable
  function maskB64(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(maskB64);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = (k === "b64_json" && typeof v === "string" && v.length > 100)
        ? `<${v.length} chars base64>`
        : maskB64(v);
    }
    return out;
  }

  if (loading) return <div className="text-text-muted text-sm">Loading...</div>;
  if (!combo) return notFound();

  const kindLabel = KIND_LABELS[combo.kind] || MEDIA_PROVIDER_KINDS.find((k) => k.id === combo.kind)?.label || "Combo";
  const examplePath = EXAMPLE_PATHS[combo.kind];
  const exampleBody = combo.kind && EXAMPLE_BODIES[combo.kind] ? EXAMPLE_BODIES[combo.kind](combo.name) : null;
  const curlExample = examplePath
    ? `curl -X POST http://localhost:20128${examplePath} \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${apiKey || "YOUR_KEY"}" \\\n  -d '${JSON.stringify(exampleBody)}'`
    : "";
  const backHref = getListingHref(combo.kind);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={backHref} className="text-text-muted hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">layers</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-muted">{kindLabel} Combo</p>
            <code className="text-lg font-semibold font-mono">{combo.name}</code>
          </div>
        </div>
        <Button variant="outline" icon="delete" onClick={handleDelete} className="text-red-500 border-red-200 hover:bg-red-50">
          Delete
        </Button>
      </div>

      {/* Settings Card */}
      <Card>
        <h2 className="text-lg font-semibold mb-3">Settings</h2>
        <div className="flex flex-col gap-4">
          <div>
            <Input label="Combo Name" value={name} onChange={(e) => { setName(e.target.value); validateName(e.target.value); }} onBlur={handleSaveName} error={nameError} />
            <p className="text-[10px] text-text-muted mt-0.5">Only letters, numbers, -, _ and .</p>
          </div>
          {/* Strategy */}
          <div>
            <label className="text-sm font-medium mb-1 block">Strategy</label>
            <Select
              options={STRATEGY_OPTIONS}
              value={strategy}
              onChange={(e) => handleSetStrategy({ fallbackStrategy: e.target.value })}
              selectClassName="py-1.5 text-sm"
            />
            <p className="text-[10px] text-text-muted mt-0.5">
              {strategy === "fusion" ? "Queries all models in parallel, judge synthesizes one answer (N+1 calls)." : strategy === "round-robin" ? "Rotates models across requests to spread load." : "Tries models in order; next on failure."}
            </p>
          </div>

          {/* Fusion: Judge Model */}
          {strategy === "fusion" && (
            <div>
              <label className="text-sm font-medium mb-1 block">Judge Model</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowJudgePicker(true)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded border border-dashed border-primary/40 px-2 py-1.5 font-mono text-xs text-primary hover:border-primary hover:bg-primary/5 transition-colors flex-1 min-w-0"
                  title="Pick the model that fuses panel answers"
                >
                  <span className="material-symbols-outlined text-[14px]">gavel</span>
                  <span className="truncate">{judgeModel || `Auto — ${providers[0] || "first model"}`}</span>
                </button>
                {judgeModel && (
                  <button
                    onClick={() => handleSetStrategy({ judgeModel: "" })}
                    className="p-1.5 rounded text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Reset judge to Auto"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-text-muted mt-0.5">Model that synthesizes the final answer from panel responses.</p>
            </div>
          )}

          {/* Fusion: Tuning Overrides */}
          {strategy === "fusion" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">Fusion Tuning</label>
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-3">
                <label className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-text-muted">Min Panel</span>
                  <input type="number" min="2" max="20" value={fusionTuning.minPanel || FUSION_DEFAULTS.minPanel}
                    onChange={(e) => {
                      const v = Math.max(2, parseInt(e.target.value, 10) || 2);
                      const next = { ...fusionTuning, minPanel: v === FUSION_DEFAULTS.minPanel ? undefined : v };
                      if (!next.minPanel) delete next.minPanel;
                      handleSetStrategy({ fusionTuning: Object.keys(next).length ? next : undefined });
                    }}
                    className="w-16 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 px-1.5 py-1 font-mono text-xs text-text-main outline-none focus:border-primary" />
                  <span className="text-[9px] text-text-muted">Answers before grace</span>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-text-muted">Grace (ms)</span>
                  <input type="number" min="1000" max="60000" step="1000" value={fusionTuning.stragglerGraceMs || FUSION_DEFAULTS.stragglerGraceMs}
                    onChange={(e) => {
                      const v = Math.max(1000, parseInt(e.target.value, 10) || 8000);
                      const next = { ...fusionTuning, stragglerGraceMs: v === FUSION_DEFAULTS.stragglerGraceMs ? undefined : v };
                      if (!next.stragglerGraceMs) delete next.stragglerGraceMs;
                      handleSetStrategy({ fusionTuning: Object.keys(next).length ? next : undefined });
                    }}
                    className="w-20 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 px-1.5 py-1 font-mono text-xs text-text-main outline-none focus:border-primary" />
                  <span className="text-[9px] text-text-muted">Straggler wait</span>
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-text-muted">Timeout (ms)</span>
                  <input type="number" min="10000" max="300000" step="5000" value={fusionTuning.panelHardTimeoutMs || FUSION_DEFAULTS.panelHardTimeoutMs}
                    onChange={(e) => {
                      const v = Math.max(10000, parseInt(e.target.value, 10) || 90000);
                      const next = { ...fusionTuning, panelHardTimeoutMs: v === FUSION_DEFAULTS.panelHardTimeoutMs ? undefined : v };
                      if (!next.panelHardTimeoutMs) delete next.panelHardTimeoutMs;
                      handleSetStrategy({ fusionTuning: Object.keys(next).length ? next : undefined });
                    }}
                    className="w-24 rounded border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 px-1.5 py-1 font-mono text-xs text-text-main outline-none focus:border-primary" />
                  <span className="text-[9px] text-text-muted">Hard cap</span>
                </label>
                {(fusionTuning.minPanel || fusionTuning.stragglerGraceMs || fusionTuning.panelHardTimeoutMs) && (
                  <button onClick={() => handleSetStrategy({ fusionTuning: undefined })}
                    className="text-[11px] text-text-muted hover:text-red-500 transition-colors px-1" title="Reset to defaults">
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Providers Card */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Providers</h2>
            <p className="text-xs text-text-muted">Tried in order (top-down) or rotated when round-robin is on.</p>
          </div>
          <Button size="sm" icon="add" onClick={() => setShowPicker(true)}>Add Provider</Button>
        </div>
        {providers.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-lg text-text-muted text-sm">
            No providers yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {providers.map((entry, idx) => {
              const { providerId, model } = parseModelEntry(entry);
              const p = AI_PROVIDERS[providerId];
              return (
                <div key={`${entry}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                  <span className="text-xs text-text-muted w-5 text-center">{idx + 1}</span>
                  <ProviderIcon
                    src={`/providers/${providerId}.png`}
                    alt={p?.name || providerId}
                    size={24}
                    className="object-contain rounded shrink-0"
                    fallbackText={p?.textIcon || providerId.slice(0, 2).toUpperCase()}
                    fallbackColor={p?.color}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p?.name || providerId}</div>
                    {model && <code className="text-[10px] text-text-muted font-mono truncate block">{model}</code>}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => handleMove(idx, -1)} disabled={idx === 0} className={`p-1 rounded ${idx === 0 ? "text-text-muted/20" : "text-text-muted hover:text-primary hover:bg-black/5"}`} title="Move up">
                      <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                    </button>
                    <button onClick={() => handleMove(idx, 1)} disabled={idx === providers.length - 1} className={`p-1 rounded ${idx === providers.length - 1 ? "text-text-muted/20" : "text-text-muted hover:text-primary hover:bg-black/5"}`} title="Move down">
                      <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                    </button>
                    <button onClick={() => handleRemoveProvider(idx)} className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-500/10" title="Remove">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Test Example Card */}
      {combo.kind && examplePath && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <h2 className="text-lg font-semibold">Test Example</h2>
            <Button size="sm" icon="play_arrow" onClick={handleTest} disabled={testing || providers.length === 0}>
              {testing ? "Running..." : "Run"}
            </Button>
          </div>
          <pre className="text-xs font-mono bg-black/[0.03] dark:bg-white/[0.03] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
            {curlExample}
          </pre>
          {testError && (
            <p className="mt-3 text-xs text-red-500 break-words">{testError}</p>
          )}
          {testResult && (
            <div className="mt-3 flex flex-col gap-3">
              {testResult.latencyMs != null && (
                <span className="text-[11px] text-text-muted">⚡ {testResult.latencyMs}ms</span>
              )}
              {testResult.imageUrl && (
                <div>
                  <div className="flex items-center justify-end mb-1.5">
                    <a href={testResult.imageUrl} download="image.png" className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Download
                    </a>
                  </div>
                  <img src={testResult.imageUrl} alt="Generated" className="max-w-full rounded-lg border border-border" loading="lazy" decoding="async" />
                </div>
              )}
              {testResult.audioUrl && (
                <div>
                  <div className="flex items-center justify-end mb-1.5">
                    <a href={testResult.audioUrl} download="speech.mp3" className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Download
                    </a>
                  </div>
                  <audio controls src={testResult.audioUrl} className="w-full" />
                </div>
              )}
              {testResult.json && (
                <pre className="text-xs font-mono bg-black/[0.03] dark:bg-white/[0.03] p-3 rounded-lg overflow-auto max-h-[300px] whitespace-pre-wrap break-all">
                  {testResult.json}
                </pre>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Usage Logs Card */}
      <Card>
        <h2 className="text-lg font-semibold mb-3">Usage Logs</h2>
        {logs.length === 0 ? (
          <p className="text-xs text-text-muted italic">No usage yet.</p>
        ) : (
          <pre className="text-[11px] font-mono bg-black/[0.03] dark:bg-white/[0.03] p-3 rounded-lg overflow-auto max-h-[400px] whitespace-pre-wrap">
            {logs.join("\n")}
          </pre>
        )}
      </Card>

      {showPicker && (
        <ModelSelectModal
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={handleAddModel}
          onDeselect={handleDeselectModel}
          activeProviders={connections}
          modelAliases={modelAliases}
          title={`Add ${kindLabel} Model`}
          kindFilter={combo.kind}
          addedModelValues={providers}
          closeOnSelect={false}
        />
      )}

      {showJudgePicker && (
        <ModelSelectModal
          isOpen={showJudgePicker}
          onClose={() => setShowJudgePicker(false)}
          onSelect={(m) => { handleSetStrategy({ judgeModel: m?.value || "" }); setShowJudgePicker(false); }}
          activeProviders={connections}
          modelAliases={modelAliases}
          title="Select Judge Model"
          addedModelValues={judgeModel ? [judgeModel] : []}
          closeOnSelect={true}
        />
      )}
    </div>
  );
}
