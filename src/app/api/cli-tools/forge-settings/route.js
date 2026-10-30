"use server";

import { NextResponse } from "next/server";
import { resolveCliApiKey } from "../resolveApiKey.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { parseTOML, stringifyTOML } from "confbox";
import { checkForgeInstalled as checkForgeInstalledProbe } from "@/lib/cliTools/cliBinProbe.js";

const getForgeDir = () => path.join(os.homedir(), ".forge");
const getForgeConfigPath = () => path.join(getForgeDir(), "config.toml");

// SECURITY (GAP-P2-17): filesystem-only install detection (no PATH lookup).
const checkForgeInstalled = async () => {
  const { installed } = await checkForgeInstalledProbe();
  return installed;
};

const has9RouterConfig = (content) => {
  if (!content) return false;
  return content.includes("managed by 9Router") || content.includes("localhost:20128");
};

const readConfig = async () => {
  try {
    return await fs.readFile(getForgeConfigPath(), "utf-8");
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
    const installed = await checkForgeInstalled();
    if (!installed) {
      return NextResponse.json({
        installed: false,
        config: null,
        message: "ForgeCode CLI is not installed",
      });
    }

    const content = await readConfig();
    let config = null;
    try {
      if (content) config = parseTOML(content);
    } catch {}

    return NextResponse.json({
      installed: true,
      config,
      has9Router: has9RouterConfig(content),
      configPath: getForgeConfigPath(),
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

    const configPath = getForgeConfigPath();
    await fs.mkdir(getForgeDir(), { recursive: true });

    let existing = {};
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      existing = parseTOML(raw);
    } catch {}

    const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;

    existing.openai = {
      api_key: await resolveCliApiKey(apiKey),
      base_url: normalizedBaseUrl,
      model: model || "provider/model-id",
    };

    const header = "# Forge config — managed by 9Router\n\n";
    const content = header + stringifyTOML(existing);

    await fs.writeFile(configPath, content, "utf-8");

    return NextResponse.json({
      success: true,
      message: "ForgeCode settings applied successfully!",
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
    const configPath = getForgeConfigPath();
    let existing = {};
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      existing = parseTOML(raw);
    } catch {
      return NextResponse.json({ success: true, message: "No config file to reset" });
    }

    delete existing.openai;

    if (Object.keys(existing).length === 0) {
      await fs.rm(configPath, { force: true });
    } else {
      await fs.writeFile(configPath, stringifyTOML(existing), "utf-8");
    }

    return NextResponse.json({ success: true, message: "9Router removed from ForgeCode" });
  } catch (err) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}
