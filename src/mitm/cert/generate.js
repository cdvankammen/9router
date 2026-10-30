const path = require("path");
const fs = require("fs");
const { MITM_DIR } = require("../paths");
const { TARGET_HOSTS } = require("../config");
const { generateRootCA, loadRootCA, generateLeafCert } = require("./rootCA");

/**
 * Generate Root CA certificate (one-time setup)
 * This replaces the old static wildcard cert approach
 */
function generateCert() {
  return generateRootCA();
}

// SECURITY (audit finding: generateLeafCert signs for ANY hostname):
// allowlist of SNI hostnames the MITM will issue leaf certs for. Without
// this, any TLS client probing the MITM with SNI `attacker.com` would
// get a leaf cert signed by our Root CA for that domain. If the Root CA
// is installed system-wide (Finding #344 remediation installs it into
// the OS trust store), the resulting cert is trusted machine-wide —
// effectively a free CA for arbitrary domains.
//
// Allowlist rules:
//   - Exact match on TARGET_HOSTS entries (covers all 7 known intercept
//     domains: cloudcode-pa, githubcopilot, aws, kiro, cursor).
//   - Trailing-dot normalization (some TLS clients send `example.com.`).
//   - Lowercased comparison (SNI is case-insensitive per RFC 6066).
const ALLOWED_LEAF_HOSTS = new Set(
  TARGET_HOSTS.map((h) => String(h).toLowerCase().replace(/\.$/, ""))
);

function isAllowedLeafHost(hostname) {
  if (typeof hostname !== "string" || !hostname) return false;
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (ALLOWED_LEAF_HOSTS.has(normalized)) return true;
  // Subdomain match: allow `*.target-host` for any entry in TARGET_HOSTS
  // so a future upstream that uses a subdomain of a known target
  // (e.g., `prod.cloudcode-pa.googleapis.com`) still gets a cert.
  for (const allowed of ALLOWED_LEAF_HOSTS) {
    if (normalized.endsWith(`.${allowed}`)) return true;
  }
  return false;
}

/**
 * Get certificate for a specific domain (dynamic generation)
 * Used by SNICallback in server.js.
 * Returns null if the domain is not in the allowlist — SNICallback then
 * fails the handshake rather than minting a cert for an attacker-chosen host.
 */
function getCertForDomain(domain) {
  if (!isAllowedLeafHost(domain)) {
    console.error(`[mitm cert] Refusing to sign leaf cert for disallowed SNI host: ${domain}`);
    return null;
  }
  try {
    const rootCA = loadRootCA();
    const leafCert = generateLeafCert(domain, rootCA);
    return {
      key: leafCert.key,
      cert: leafCert.cert
    };
  } catch (error) {
    console.error(`Failed to generate cert for ${domain}:`, error.message);
    return null;
  }
}

module.exports = { generateCert, getCertForDomain, isAllowedLeafHost, ALLOWED_LEAF_HOSTS };
