"use client";

import { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import Modal from "./Modal";
import ProviderIcon from "./ProviderIcon";
import { OAUTH_PROVIDERS, APIKEY_PROVIDERS, FREE_PROVIDERS, FREE_TIER_PROVIDERS, AI_PROVIDERS } from "@/shared/constants/providers";

// Provider order: OAuth first, then Free Tier, then API Key (matches dashboard/providers)
const PROVIDER_ORDER = [
  ...Object.keys(OAUTH_PROVIDERS),
  ...Object.keys(FREE_PROVIDERS),
  ...Object.keys(FREE_TIER_PROVIDERS),
  ...Object.keys(APIKEY_PROVIDERS),
];

/**
 * Visual provider picker — same feel as ModelSelectModal but returns
 * provider IDs ("openai", "anthropic", …) instead of model strings.
 * Users never need to remember a provider id: they pick the name/icon.
 */
export default function ProviderSelectModal({
  isOpen,
  onClose,
  onSelect,
  activeProviders = [],
  title = "Select Provider",
  selectedProvider,
  closeOnSelect = true,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [providerNodes, setProviderNodes] = useState([]);

  const fetchProviderNodes = async () => {
    try {
      const res = await fetch("/api/provider-nodes");
      if (!res.ok) throw new Error(`Failed to fetch provider nodes: ${res.status}`);
      const data = await res.json();
      setProviderNodes(data.nodes || []);
    } catch (error) {
      console.error("Error fetching provider nodes:", error);
      setProviderNodes([]);
    }
  };

  useEffect(() => {
    if (isOpen) fetchProviderNodes();
  }, [isOpen]);

  const allProviders = useMemo(() => ({ ...OAUTH_PROVIDERS, ...FREE_PROVIDERS, ...FREE_TIER_PROVIDERS, ...APIKEY_PROVIDERS }), []);

  // Connected provider ids (from active connections incl. custom compatible nodes)
  const activeConnectionIds = useMemo(
    () => new Set((activeProviders || []).map((p) => p.provider)),
    [activeProviders]
  );

  // Merge static registry + custom provider nodes (openai/anthropic-compatible).
  // Custom nodes use their id as the target provider key — exactly what the
  // backend matches against (fbMap[provider]).
  const providers = useMemo(() => {
    const map = new Map();
    for (const id of PROVIDER_ORDER) {
      if (allProviders[id]?.hidden) continue;
      map.set(id, {
        id,
        name: allProviders[id]?.name || id,
        color: allProviders[id]?.color || "#666",
        connected: activeConnectionIds.has(id),
        custom: false,
      });
    }
    // Custom compatible nodes (openai-compatible-chat-*, anthropic-compatible-*, custom-*)
    for (const node of providerNodes || []) {
      if (map.has(node.id)) {
        map.get(node.id).connected = true;
        map.get(node.id).name = node.name || map.get(node.id).name;
        continue;
      }
      map.set(node.id, {
        id: node.id,
        name: node.name || node.id,
        color: "#8B5CF6",
        connected: true,
        custom: true,
      });
    }
    return [...map.values()].sort((a, b) => {
      const ia = PROVIDER_ORDER.indexOf(a.id);
      const ib = PROVIDER_ORDER.indexOf(b.id);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [allProviders, providerNodes, activeConnectionIds]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) =>
      p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }, [providers, searchQuery]);

  const handlePick = (p) => {
    onSelect({ value: p.id, label: p.name });
    if (closeOnSelect) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        <p className="text-[11px] text-text-muted">
          Click a provider to target <span className="font-medium text-text-main">every model</span> from it. Connected providers are marked; the full catalog is always available.
        </p>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search providers…"
          className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        <div className="flex max-h-[45vh] flex-col gap-0.5 overflow-y-auto pr-1 custom-scrollbar">
          {filtered.length === 0 && (
            <p className="text-center text-xs text-text-muted py-6">No providers match &quot;{searchQuery}&quot;.</p>
          )}
          {filtered.map((p) => {
            const isSelected = selectedProvider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handlePick(p)}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  isSelected
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <ProviderIcon provider={p.id} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-main">{p.name}</span>
                  <code className="block truncate font-mono text-[10px] text-text-muted">{p.id}</code>
                </span>
                {p.custom && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">custom node</span>
                )}
                {p.connected ? (
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">connected</span>
                ) : (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">not connected</span>
                )}
                {isSelected && (
                  <span className="material-symbols-outlined text-[16px] text-primary">check</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

ProviderSelectModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  activeProviders: PropTypes.array,
  title: PropTypes.string,
  selectedProvider: PropTypes.string,
  closeOnSelect: PropTypes.bool,
};
