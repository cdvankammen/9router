"use server";

import { NextResponse } from "next/server";
import { resolveCliApiKey } from "../resolveApiKey.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { checkPiInstalled as checkPiInstalledProbe } from "@/lib/cliTools/cliBinProbe.js";

const getPiModelsJsonPath = () => {
  const agentPath = path.join(os.homedir(), ".pi", "agent", "models.json");
  return agentPath;
};

const getPiDir = () => path.dirname(getPiModelsJsonPath());

// SECURITY (GAP-P2-17): filesystem-only install detection (no PATH lookup).
const checkPiInstalled = async () => {
  const { installed } = await checkPiInstalledProbe();
  return installed;
};

const has9RouterConfig = (settings) => {
  if (!settings || !settings.providers) return false;
  const p = settings.providers["9router"];
  if (p && p.baseUrl) return true;
  for (const prov of Object.values(settings.providers)) {
    if (prov.baseUrl && prov.baseUrl.includes("20128")) return true;
  }
  return false;
};

const resolveModelsJsonPath = async () => {
  const agentPath = path.join(os.homedir(), ".pi", "agent", "models.json");
  const rootPath = path.join(os.homedir(), ".pi", "models.json");
  try {
    await fs.access(agentPath);
    return agentPath;
  } catch {
    try {
      await fs.access(rootPath);
      return rootPath;
    } catch {
      return agentPath;
    }
  }
};

const readConfig = async () => {
  try {
    const targetPath = await resolveModelsJsonPath();
    const content = await fs.readFile(targetPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
};

import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const installed = await checkPiInstalled();
    if (!installed) {
      return NextResponse.json({
        installed: false,
        config: null,
        message: "Pi CLI is not installed",
      });
    }

    const config = await readConfig();
    const configPath = await resolveModelsJsonPath();

    return NextResponse.json({
      installed: true,
      config,
      has9Router: has9RouterConfig(config),
      configPath,
    });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body" } }, { status: 400 });
  }

  try {
    const { baseUrl, apiKey, model } = rawBody || {};
    if (!baseUrl) {
      return NextResponse.json({ error: { message: "baseUrl is required" } }, { status: 400 });
    }

    const configPath = await resolveModelsJsonPath();
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    let existing = {};
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      existing = JSON.parse(raw);
    } catch {
      /* No existing config */
    }

    if (!existing.providers) existing.providers = {};

    const existingProvider = existing.providers["9router"] || {};
    const prevModels = new Map(
      (Array.isArray(existingProvider.models) ? existingProvider.models : [])
        .map((m) => (typeof m === "string" ? { id: m } : m))
        .filter((m) => m?.id)
        .map((m) => [m.id, m])
    );

    const cap = (v, fallback, max) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 && n <= max ? n : fallback;
    };

    const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
    const withDefaults = (m) => {
      const prev = prevModels.get(m.id) || {};
      return {
        ...prev,
        ...m,
        // The card always sends name === id, so treat that as "unset" and keep
        // a display name the user set by hand in models.json.
        name: m.name && m.name !== m.id ? m.name : (prev.name || m.id),
        contextWindow: cap(m.contextWindow ?? prev.contextWindow, 200000, 2000000),
        maxTokens: cap(m.maxTokens ?? prev.maxTokens, 64000, 200000),
      };
    };

    let modelList = [];
    if (Array.isArray(rawBody.models) && rawBody.models.length > 0) {
      modelList = rawBody.models.map((m) =>
        typeof m === "string"
          ? withDefaults({ id: m })
          : withDefaults({ ...m, id: m.id || "provider/model-id" })
      );
    } else {
      const modelId = model || "provider/model-id";
      modelList = [withDefaults({ id: modelId })];
    }

    existing.providers["9router"] = {
      ...existingProvider,
      baseUrl: normalizedBaseUrl,
      apiKey: apiKey || existingProvider.apiKey || await resolveCliApiKey(null),
      api: existingProvider.api || "openai-completions",
      models: modelList,
    };

    await fs.writeFile(configPath, JSON.stringify(existing, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: "Pi settings applied! Use /model in Pi to select the 9Router model.",
      configPath,
    });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const configPath = await resolveModelsJsonPath();
    let existing = {};
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      existing = JSON.parse(raw);
    } catch {
      return NextResponse.json({ success: true, message: "No config file to reset" });
    }

    if (existing.providers && existing.providers["9router"]) {
      delete existing.providers["9router"];
      if (Object.keys(existing.providers).length === 0) delete existing.providers;
      await fs.writeFile(configPath, JSON.stringify(existing, null, 2), "utf-8");
    }

    return NextResponse.json({ success: true, message: "9Router removed from Pi" });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}
