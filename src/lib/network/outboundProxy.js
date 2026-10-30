import { isLinkLocalOrMetadataHost } from "@/shared/utils/ssrfGuard.js";

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

const ALLOWED_PROXY_SCHEMES = ["http:", "https:", "socks5:", "socks4:", "socks5h:", "socks4a:"];

// SECURITY (Finding #316 / exfil chain #3): validate proxy URLs against
// link-local and cloud-metadata targets. An authenticated user setting
// `outboundProxyUrl` previously only had to pass scheme + no-newline checks —
// `http://169.254.169.254/latest/meta-data/` (AWS), `http://169.254.170.2`
// (ECS task metadata), or `http://[fe80::...]/...` (IPv6 link-local) all
// passed. Once written to `process.env.HTTP_PROXY`, every outbound provider
// call (OAuth token refresh, smart-router probe, webhook, quota auto-ping)
// traverses the metadata endpoint and leaks credentials to the attacker.
//
// Layer 1 (this function, synchronous): reject literal link-local/metadata
// IPs at apply time. Layer 2 (settings PATCH route, async):
// `assertNotLinkLocalResolved` adds DNS resolution so a wildcard-DNS domain
// (e.g. nip.io/sslip.io pointed at 169.254.169.254) is also rejected.
//
// RFC1918 private ranges (10.x, 172.16.x, 192.168.x), Tailscale CGNAT
// (100.64/10), and loopback are intentionally NOT blocked — legitimate
// outbound proxies run on LAN (corporate forward proxy) or loopback
// (local mitmproxy for debugging).
function validateProxyUrl(url) {
  if (!url) return null;
  if (/[\n\r`$]/.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROXY_SCHEMES.includes(parsed.protocol)) return null;
    // Block link-local and cloud-metadata targets (169.254/16, fe80::/10,
    // plus IPv4-mapped and NAT64-wrapped forms via ssrfGuard's parser).
    // Uses the host-only primitive (not assertNotLinkLocal) because the
    // scheme allowlist above already covers proxy schemes — socks5:/socks4:
    // are legitimate proxy schemes and must not be rejected.
    if (isLinkLocalOrMetadataHost(parsed.hostname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function applyOutboundProxyEnv(
  { outboundProxyEnabled, outboundProxyUrl, outboundNoProxy } = {}
) {
  if (typeof process === "undefined" || !process.env) return;
  const enabled = Boolean(outboundProxyEnabled);
  const proxyUrl = normalizeString(outboundProxyUrl);
  const noProxy = normalizeString(outboundNoProxy);

  // If disabled, only clear env vars we previously managed.
  if (!enabled) {
    if (process.env.NINE_ROUTER_PROXY_MANAGED === "1") {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
      delete process.env.ALL_PROXY;
      delete process.env.NO_PROXY;
      delete process.env.NINE_ROUTER_PROXY_MANAGED;
      delete process.env.NINE_ROUTER_PROXY_URL;
      delete process.env.NINE_ROUTER_NO_PROXY;
    }
    return;
  }

  // When enabled:
  // - If values are provided, write them and mark as managed
  // - If values are empty, do not touch externally-provided env,
  //   but do clear values we previously managed.
  const wasManaged = process.env.NINE_ROUTER_PROXY_MANAGED === "1";
  let managed = false;

  if (wasManaged) {
    if (!proxyUrl) {
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
      delete process.env.ALL_PROXY;
      delete process.env.NINE_ROUTER_PROXY_URL;
    }
    if (!noProxy) {
      delete process.env.NO_PROXY;
      delete process.env.NINE_ROUTER_NO_PROXY;
    }
  }

  if (proxyUrl) {
    const validated = validateProxyUrl(proxyUrl);
    if (validated) {
      process.env.HTTP_PROXY = validated;
      process.env.HTTPS_PROXY = validated;
      process.env.ALL_PROXY = validated;
      process.env.NINE_ROUTER_PROXY_URL = validated;
      managed = true;
    }
  }

  if (noProxy) {
    process.env.NO_PROXY = noProxy;
    process.env.NINE_ROUTER_NO_PROXY = noProxy;
    managed = true;
  }

  if (managed) {
    process.env.NINE_ROUTER_PROXY_MANAGED = "1";
  } else if (wasManaged) {
    // If we previously managed env but now cleared everything, drop the marker.
    delete process.env.NINE_ROUTER_PROXY_MANAGED;
  }
}
