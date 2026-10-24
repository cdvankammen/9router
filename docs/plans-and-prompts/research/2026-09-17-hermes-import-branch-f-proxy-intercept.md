# Branch F: Proxy/Intercept Patterns — Hermes Message Import

**Date:** 2026-09-17
**Author:** GitHub Copilot agent (6-level binary tree expansion)
**Status:** active
**Tags:** research, hermes-import, proxy, intercept, binary-tree, branch-f

## L0 Root: Hermes Message Import & External Agent Traffic Recording

## L1 Branch F: PROXY/INTERCEPT PATTERNS

Transparently capture agent traffic by routing it through 9Router as a proxy, without requiring agent configuration changes.

### L2 F1: HTTP PROXY (HTTP_PROXY env var)

#### L3 F1a: Standard HTTP Proxy
- **L4 F1a1: Agent Configuration**
  - L5: Set `HTTP_PROXY=http://localhost:20128` in agent environment
  - L6: Agent sends all HTTP requests to 9Router, which forwards to provider
- **L4 F1a2: 9Router Proxy Mode**
  - L5: 9Router listens on port 20128, accepts CONNECT requests for HTTPS
  - L6: Log request/response, forward to provider, return response

#### L3 F1b: HTTPS Interception
- **L4 F1b1: MITM Proxy**
  - L5: 9Router generates CA cert, agent trusts CA → 9Router decrypts HTTPS
  - L6: Full request/response visibility, but requires cert installation
- **L4 F1b2: TLS Termination**
  - L5: 9Router terminates TLS, logs plaintext, re-encrypts to provider
  - L6: Requires agent to trust 9Router's CA cert

### L2 F2: DNS HIJACK (Redirect Provider Domains)

#### L3 F2a: /etc/hosts Override
- **L4 F2a1: Local Redirect**
  - L5: Add `127.0.0.1 api.openai.com` to `/etc/hosts`
  - L6: Requires root, breaks other apps — **NOT RECOMMENDED**
- **L4 F2a2: Scoped Override**
  - L5: Use `dnsmasq` to redirect only for specific network interface
  - L6: Less invasive, but still requires system config

#### L3 F2b: Local DNS Server
- **L4 F2b1: dnsmasq Configuration**
  - L5: Configure dnsmasq to resolve `*.openai.com` → localhost
  - L6: 9Router listens on port 443, accepts HTTPS requests
- **L4 F2b2: Certificate Trust**
  - L5: Agent must trust 9Router's CA cert for HTTPS
  - L6: Same MITM requirement as proxy mode

### L2 F3: LIBRARY INTERCEPTION (Monkey-Patch HTTP Clients)

#### L3 F3a: Node.js http/https Modules
- **L4 F3a1: require() Hook**
  - L5: Intercept `require('http')` and `require('https')` → return wrapped modules
  - L6: Log all requests made by agent code
- **L4 F3a2: Proxy-Agent Library**
  - L5: Use `proxy-agent` npm package to route all HTTP through proxy
  - L6: Agent code unchanged, but requires `proxy-agent` in dependencies

#### L3 F3b: Python requests Library
- **L4 F3b1: requests.Session Hook**
  - L5: Monkey-patch `requests.Session.send` → log request, call original
  - L6: Log all requests made by Python agent code
- **L4 F3b2: Environment Variable**
  - L5: Set `HTTP_PROXY` / `HTTPS_PROXY` → `requests` library respects it
  - L6: Same as HTTP proxy method above

### L2 F4: SDK WRAPPING (Wrap Provider SDKs)

#### L3 F4a: OpenAI SDK Wrapper
- **L4 F4a1: Custom Client**
  - L5: Create `9router.OpenAI` class that wraps `openai.OpenAI`
  - L6: Log request/response, call original SDK method
- **L4 F4a2: Drop-In Replacement**
  - L5: Agent imports `from ninerouter import OpenAI` instead of `from openai import OpenAI`
  - L6: Zero code changes except import statement

#### L3 F4b: Anthropic SDK Wrapper
- **L4 F4b1: Custom Client**
  - L5: Create `9router.Anthropic` class that wraps `anthropic.Anthropic`
  - L6: Same pattern as OpenAI wrapper
- **L4 F4b2: Environment Variable**
  - L5: Set `ANTHROPIC_BASE_URL=http://localhost:20128` → SDK uses 9Router
  - L6: Zero code changes, just env var

### L2 F5: COMPARISON OF METHODS

| Method | Agent Changes | Visibility | Complexity | Recommended |
|--------|--------------|------------|------------|-------------|
| HTTP Proxy | Set `HTTP_PROXY` env var | Full (if HTTPS MITM) | Medium | ✅ Yes |
| DNS Hijack | System config | Full (if HTTPS MITM) | High | ⚠️ Advanced users only |
| Library Interception | Code change or dependency | Full | Medium | ⚠️ If agent code accessible |
| SDK Wrapper | Import change or env var | Full | Low | ✅ Best for known SDKs |
| Hermes Hook | Config change | Full | Low | ✅ Best for Hermes |

## Implementation Priority

1. **HTTP Proxy Mode in 9Router** (core) — 3 days
2. **SDK Wrappers for OpenAI/Anthropic** — 2 days
3. **Hermes Hook Integration** — 1 day
4. **DNS Hijack Documentation** (advanced) — 1 day

## Open Questions

- Should 9Router support both proxy and hook modes simultaneously?
- How to handle agents that don't respect `HTTP_PROXY`?
- Should the SDK wrappers be published as separate npm/pip packages?

## Updated Access Points (2026-09-17)

- Config: `open-sse/providers/registry/*.js` → getProxyTargets / getSdkWrappers
- README: `skills/9router-web-fetch` → curl-through-proxy examples
- COMBO docs: `docs/plans-and-prompts/research/42-branch-cascades-and-fallbacks.md` → proxy-fallback patterns
## Related Implementation Plans

- `9router/impl-plan-import-17-agent-adapters.md` — transparent-proxy recipes: `ANTHROPIC_BASE_URL`, `OPENAI_BASE_URL`, `OPENAI_API_BASE` (A3 proxy pattern) — when traffic goes *through* 9Router it is captured natively, no import needed
- `9router/impl-plan-import-04-log-file-tail.md` — log file tailing for agents that can't be proxied (A2)
- `9router/impl-plan-import-03-import-api.md` — the ingest endpoint for agents that can only post-hoc report (A1/A4)
- `9router/impl-plan-import-06-error-reconstruction.md` — error categorization + fallback suggestions for proxied failures
