"use client";

import { useParams, notFound, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, Button, Input, Toggle, ModelSelectModal, Select, ConfirmModal, CapacityBadges } from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";
import { AI_PROVIDERS } from "@/shared/constants/providers";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { useModelCaps } from "@/shared/hooks/useModelCaps";

const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

const STRATEGY_OPTIONS = [
  { value: "fallback", label: "Fallback — try in order" },
  { value: "round-robin", label: "Round Robin — rotate" },
  { value: "fusion", label: "Fusion — panel + judge" },
];

// Parse "providerId/model" → { providerId, model }
function parseModelEntry(entry) {
  if (typeof entry !== "string") return { providerId: "", model: "" };
  const idx = entry.indexOf("/");
  if (idx < 0) return { providerId: entry, model: "" };
  return { providerId: entry.slice(0, idx), model: entry.slice(idx + 1) };
}

export default function LLMComboDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { copied, copy } = useCopyToClipboard();
  const { getCaps } = useModelCaps();

  const [combo, setCombo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [models, setModels] = useState([]);
  const [strategy, setStrategy] = useState("fallback");
  const [judgeModel, setJudgeModel] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [logs, setLogs] = useState([]);
  const [connections, setConnections] = useState([]);
  const [modelAliases, setModelAliases] = useState({});
  const [apiKey, setApiKey] = useState("");

  // Test state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState("");
  const [testPrompt, setTestPrompt] = useState("Explain quantum computing in one sentence.");

  // Confirm delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchAll = useCallback(async () => {
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
      setModels(c.models || []);
      const s = settingsRes.ok ? await settingsRes.json() : {};
      const comboStrategy = s.comboStrategies?.[c.name] || {};
      setStrategy(comboStrategy.fallbackStrategy || "fallback");
      setJudgeModel(comboStrategy.judgeModel || "");
      const allLogs = logsRes.ok ? await logsRes.json() : [];
      setLogs(allLogs.filter((l) => typeof l === "string" && l.includes(c.name)).slice(0, 50));
    } catch { /* noop */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error || "Failed to save"); return false; }
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
    if (!value || models.includes(value)) return;
    const next = [...models, value];
    setModels(next);
    await saveCombo({ models: next });
  };

  const handleDeselectModel = async (model) => {
    const value = model?.value || model;
    if (!value || !models.includes(value)) return;
    const next = models.filter((p) => p !== value);
    setModels(next);
    await saveCombo({ models: next });
  };

  const handleRemoveModel = async (idx) => {
    const next = models.filter((_, i) => i !== idx);
    setModels(next);
    await saveCombo({ models: next });
  };

  const handleMove = async (idx, dir) => {
    const next = [...models];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setModels(next);
    await saveCombo({ models: next });
  };

  const handleStrategyChange = async (newStrategy) => {
    setStrategy(newStrategy);
    const settingsRes = await fetch("/api/settings", { cache: "no-store" });
    const s = settingsRes.ok ? await settingsRes.json() : {};
    const updated = { ...(s.comboStrategies || {}) };
    if (newStrategy === "fallback") {
      delete updated[combo.name];
    } else {
      updated[combo.name] = { ...updated[combo.name], fallbackStrategy: newStrategy };
    }
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comboStrategies: updated }),
    });
  };

  const handleJudgeChange = async (newJudge) => {
    setJudgeModel(newJudge);
    const settingsRes = await fetch("/api/settings", { cache: "no-store" });
    const s = settingsRes.ok ? await settingsRes.json() : {};
    const updated = { ...(s.comboStrategies || {}) };
    updated[combo.name] = { ...updated[combo.name], fallbackStrategy: strategy, judgeModel: newJudge || undefined };
    if (!newJudge) delete updated[combo.name].judgeModel;
    if (strategy === "fallback" && !newJudge) delete updated[combo.name];
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comboStrategies: updated }),
    });
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/combos/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/combos");
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError("");
    const start = Date.now();
    try {
      const headers = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      const body = {
        model: combo.name,
        messages: [{ role: "user", content: testPrompt }],
        max_tokens: 100,
        stream: false,
      };
      const res = await fetch("/v1/chat/completions", { method: "POST", headers, body: JSON.stringify(body) });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setTestError(d?.error?.message || d?.error || `HTTP ${res.status}`);
        setTestResult({ json: JSON.stringify(d, null, 2), latencyMs });
        setTesting(false);
        return;
      }
      const data = await res.json();
      const selectedModel = data?.model || data?.headers?.["x-9router-selected-model"] || "";
      const content = data?.choices?.[0]?.message?.content || "";
      const usage = data?.usage || {};
      setTestResult({ json: JSON.stringify(data, null, 2), latencyMs, selectedModel, content, usage });
    } catch (e) {
      setTestError(e.message || "Network error");
    }
    setTesting(false);
  };

  if (loading) return <div className="text-text-muted text-sm p-6">Loading...</div>;
  if (!combo) return notFound();

  const curlExample = `curl -X POST http://localhost:20128/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer YOUR_KEY" \\\n  -d '{"model": "${combo.name}", "messages": [{"role": "user", "content": "Hello"}]}'`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/combos" className="text-text-muted hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">layers</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-text-muted">LLM Combo</p>
            <code className="text-lg font-semibold font-mono">{combo.name}</code>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={copied === "name" ? "check" : "content_copy"} onClick={() => copy(combo.name, "name")} size="sm">
            Copy Name
          </Button>
          <Button variant="outline" icon="delete" onClick={() => setShowDeleteConfirm(true)} className="text-red-500 border-red-200 hover:bg-red-50" size="sm">
            Delete
          </Button>
        </div>
      </div>

      {/* Settings Card */}
      <Card>
        <h2 className="text-lg font-semibold mb-3">Settings</h2>
        <div className="flex flex-col gap-4">
          <div>
            <Input label="Combo Name" value={name} onChange={(e) => { setName(e.target.value); validateName(e.target.value); }} onBlur={handleSaveName} error={nameError} />
            <p className="text-[10px] text-text-muted mt-0.5">Only letters, numbers, -, _ and .</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Strategy</label>
            <Select options={STRATEGY_OPTIONS} value={strategy} onChange={(e) => handleStrategyChange(e.target.value)} />
          </div>
          {strategy === "fusion" && (
            <div>
              <label className="text-sm font-medium mb-1 block">Judge Model</label>
              <Input
                value={judgeModel}
                onChange={(e) => handleJudgeChange(e.target.value)}
                placeholder={`Auto — ${models[0] || "first model"}`}
              />
              <p className="text-[10px] text-text-muted mt-0.5">Model that synthesizes panel answers. Empty = first model in list.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Models Card */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Models</h2>
            <p className="text-xs text-text-muted">Tried in order (top-down) or rotated when round-robin is on.</p>
          </div>
          <Button size="sm" icon="add" onClick={() => setShowPicker(true)}>Add Model</Button>
        </div>
        {models.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border rounded-lg text-text-muted text-sm">
            No models yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {models.map((entry, idx) => {
              const { providerId, model } = parseModelEntry(entry);
              const p = AI_PROVIDERS[providerId];
              const caps = getCaps?.(entry);
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{p?.name || providerId}</span>
                      {caps && <CapacityBadges caps={caps} />}
                    </div>
                    {model && <code className="text-[10px] text-text-muted font-mono truncate block">{model}</code>}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => handleMove(idx, -1)} disabled={idx === 0} className={`p-1 rounded ${idx === 0 ? "text-text-muted/20" : "text-text-muted hover:text-primary hover:bg-black/5"}`} title="Move up">
                      <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                    </button>
                    <button onClick={() => handleMove(idx, 1)} disabled={idx === models.length - 1} className={`p-1 rounded ${idx === models.length - 1 ? "text-text-muted/20" : "text-text-muted hover:text-primary hover:bg-black/5"}`} title="Move down">
                      <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                    </button>
                    <button onClick={() => handleRemoveModel(idx)} className="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-500/10" title="Remove">
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
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <h2 className="text-lg font-semibold">Test Combo</h2>
          <Button size="sm" icon="play_arrow" onClick={handleTest} disabled={testing || models.length === 0}>
            {testing ? "Running..." : "Run Test"}
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-text-main mb-1 block">Test prompt</label>
            <Input value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} placeholder="Enter a test message..." />
          </div>
          <pre className="text-xs font-mono bg-black/[0.03] dark:bg-white/[0.03] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
            {curlExample}
          </pre>
        </div>
        {testError && (
          <p className="mt-3 text-xs text-red-500 break-words">{testError}</p>
        )}
        {testResult && (
          <div className="mt-3 flex flex-col gap-3">
            {testResult.latencyMs != null && (
              <div className="flex items-center gap-3 text-[11px] text-text-muted">
                <span>⚡ {testResult.latencyMs}ms</span>
                {testResult.selectedModel && (
                  <span className="font-mono">→ {testResult.selectedModel}</span>
                )}
                {testResult.usage?.total_tokens && (
                  <span>{testResult.usage.total_tokens} tokens</span>
                )}
              </div>
            )}
            {testResult.content && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
                {testResult.content}
              </div>
            )}
            {testResult.json && (
              <details className="text-xs">
                <summary className="cursor-pointer text-text-muted hover:text-primary">Raw JSON response</summary>
                <pre className="mt-2 font-mono bg-black/[0.03] dark:bg-white/[0.03] p-3 rounded-lg overflow-auto max-h-[300px] whitespace-pre-wrap break-all">
                  {testResult.json}
                </pre>
              </details>
            )}
          </div>
        )}
      </Card>

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

      {/* Modals */}
      {showPicker && (
        <ModelSelectModal
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={handleAddModel}
          onDeselect={handleDeselectModel}
          activeProviders={connections}
          modelAliases={modelAliases}
          title="Add Model to Combo"
          kindFilter="llm"
          addedModelValues={models}
          closeOnSelect={false}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Combo"
        message={`Are you sure you want to delete "${combo.name}"? This cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
