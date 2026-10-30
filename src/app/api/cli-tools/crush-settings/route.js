"use server";

import { NextResponse } from "next/server";
import { resolveCliApiKey } from "../resolveApiKey.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { checkCrushInstalled as checkCrushInstalledProbe } from "@/lib/cliTools/cliBinProbe.js";

const getCrushConfigPath = () => {
  const configDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configDir, "crush", "crush.json");
};

const getCrushDir = () => path.dirname(getCrushConfigPath());

// SECURITY (GAP-P2-17): filesystem-only install detection.
const checkCrushInstalled = async () => {
  const { installed } = await checkCrushInstalledProbe();
  return installed;
};

const has9RouterConfig = (settings) => {
  if (!settings || !settings.providers) return false;
  const p = settings.providers["9router"];
  if (p && p.base_url) return true;
  for (const prov of Object.values(settings.providers)) {
    if (prov.base_url && prov.base_url.includes("20128")) return true;
  }
  return false;
};

const readConfig = async () => {
  try {
    const content = await fs.readFile(getCrushConfigPath(), "utf-8");
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
    const installed = await checkCrushInstalled();
    if (!installed) {
      return NextResponse.json({
        installed: false,
        config: null,
        message: "Crush CLI is not installed",
      });
    }

    const config = await readConfig();

    return NextResponse.json({
      installed: true,
      config,
      has9Router: has9RouterConfig(config),
      configPath: getCrushConfigPath(),
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

    const configPath = getCrushConfigPath();
    await fs.mkdir(getCrushDir(), { recursive: true });

    let existing = {};
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      existing = JSON.parse(raw);
    } catch {
      /* No existing config */
    }

    if (!existing.providers) existing.providers = {};

    const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
    const modelId = model || "provider/model-id";

    existing.providers["9router"] = {
      type: "openai-compat",
      base_url: normalizedBaseUrl,
      api_key: await resolveCliApiKey(apiKey),
      models: [
        {
          id: modelId,
          name: modelId,
          context_window: 128000,
        },
      ],
    };

    await fs.writeFile(configPath, JSON.stringify(existing, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: "Crush settings applied successfully!",
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
    const configPath = getCrushConfigPath();
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

    return NextResponse.json({ success: true, message: "9Router removed from Crush" });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}
