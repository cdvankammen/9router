// Security hardening tests for MITM subsystem (findings #308, #309, #310, #312)
// Verifies the invariants established in the security audit remediation.
import { describe, expect, it } from "vitest";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);

function loadRootCAWithDataDir(dataDir) {
  const rootCAPath = require.resolve("../../src/mitm/cert/rootCA.js");
  const pathsPath = require.resolve("../../src/mitm/paths.js");
  delete require.cache[rootCAPath];
  delete require.cache[pathsPath];

  const oldDataDir = process.env.DATA_DIR;
  process.env.DATA_DIR = dataDir;
  try {
    return require("../../src/mitm/cert/rootCA.js");
  } finally {
    if (oldDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = oldDataDir;
  }
}

describe("Finding #312: Root CA private key permissions", () => {
  it("writes the private key file with 0600 (owner-only), not world-readable", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-mitm-312-"));
    try {
      const { generateRootCA } = loadRootCAWithDataDir(dataDir);
      generateRootCA();

      const keyPath = path.join(dataDir, "mitm", "rootCA.key");
      const certPath = path.join(dataDir, "mitm", "rootCA.crt");

      // Private key must be 0600 (owner read+write only)
      const keyStat = fs.statSync(keyPath);
      const keyMode = keyStat.mode & 0o777;
      expect(keyMode).toBe(0o600);

      // Cert can be world-readable (it's public by nature)
      const certStat = fs.statSync(certPath);
      const certMode = certStat.mode & 0o777;
      expect(certMode).toBe(0o644);
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

describe("Finding #309: MITM body size bound", () => {
  it("collectBodyRaw rejects bodies exceeding MITM_MAX_BODY_BYTES", async () => {
    // Read the server.js source to verify the constant and bound logic
    const serverSrc = fs.readFileSync(
      require.resolve("../../src/mitm/server.js"),
      "utf8"
    );
    expect(serverSrc).toMatch(/MITM_MAX_BODY_BYTES\s*=\s*\d+\s*\*\s*1024\s*\*\s*1024/);
    expect(serverSrc).toMatch(/if\s*\(\s*total\s*>\s*MITM_MAX_BODY_BYTES\s*\)/);
    expect(serverSrc).toMatch(/req\.destroy\(\)/);
  });
});

describe("Finding #310: MITM cert cache bound", () => {
  it("certCache has a maximum size and evicts oldest entries", () => {
    const serverSrc = fs.readFileSync(
      require.resolve("../../src/mitm/server.js"),
      "utf8"
    );
    expect(serverSrc).toMatch(/MITM_CERT_CACHE_MAX\s*=\s*\d+/);
    expect(serverSrc).toMatch(/if\s*\(\s*certCache\.size\s*>=\s*MITM_CERT_CACHE_MAX\s*\)/);
    expect(serverSrc).toMatch(/certCache\.delete\(oldest\)/);
  });
});

describe("Finding #308: MITM binds loopback only", () => {
  it("server.listen binds 127.0.0.1, not 0.0.0.0", () => {
    const serverSrc = fs.readFileSync(
      require.resolve("../../src/mitm/server.js"),
      "utf8"
    );
    // Must bind 127.0.0.1 explicitly
    expect(serverSrc).toMatch(/server\.listen\([^,]+,\s*["']127\.0\.0\.1["']/);
    // Must NOT bind 0.0.0.0
    expect(serverSrc).not.toMatch(/server\.listen\([^,]+,\s*["']0\.0\.0\.0["']/);
  });
});
