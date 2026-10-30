"use server";

import { NextResponse } from "next/server";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { checkDevinInstalled as checkDevinInstalledProbe } from "@/lib/cliTools/cliBinProbe.js";

// SECURITY (GAP-P2-17): filesystem-only install detection via cliBinProbe.
const checkDevinInstalled = async () => {
  const { installed, source } = await checkDevinInstalledProbe();
  return { installed, source };
};

// Version read uses absolute path from detection (no PATH lookup).
const readDevinVersion = async () => {
  const { installed, source } = await checkDevinInstalled();
  if (!installed || !source) return null;
  try {
    const stdout = execFileSync(source, ["--version"], { windowsHide: true, timeout: 3000, encoding: "utf8" });
    return stdout.trim().split("\n")[0] || null;
  } catch {
    return null;
  }
};

// GET — install detection only. No config to write: the binary handles its own auth.
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { installed, source } = await checkDevinInstalled();
    if (!installed) {
      return NextResponse.json({
        installed: false,
        message: "Devin CLI is not installed. Install it from https://cli.devin.ai and run `devin auth login`.",
        installUrl: "https://cli.devin.ai",
      });
    }
    const version = await readDevinVersion();
    return NextResponse.json({
      installed: true,
      source,
      version,
      message: "Devin CLI detected. Make sure `devin auth login` has been run.",
    });
  } catch (error) {
    console.log("Error checking devin settings:", error);
    return NextResponse.json({ error: "Failed to check devin settings" }, { status: 500 });
  }
}
