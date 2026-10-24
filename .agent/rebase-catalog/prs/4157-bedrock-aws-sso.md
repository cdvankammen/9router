# PR #4157 — feat(bedrock): add AWS Bedrock provider with AWS SSO credential support

- **Author:** amirsalaar
- **Merged:** 2026-10-08 (v0.5.99) by decolua
- **Commits:** 12
- **Files changed:** 31
- **Status:** Closed / Merged

## Summary
Adds Amazon Bedrock as a provider with real AWS SSO support (not just pasted IAM keys).

## Credential modes
```
static  — apiKey = AWS secret access key
          providerSpecificData { accessKeyId, sessionToken? }

profile — providerSpecificData { profile, region }   (no apiKey)
          then: aws sso login --profile <profile>
```

Profile mode resolves through `@aws-sdk/credential-providers` `fromIni` — follows `sso_session`, reads token from `~/.aws/sso/cache`, calls `GetRoleCredentials`, handles `source_profile` role chaining.

## Design notes
- `transport.format` is `"claude"` — Bedrock's Anthropic models accept Anthropic Messages body verbatim (minus `model`, which lives in URL, plus `anthropic_version`). Reuses existing `*-to-claude` translators.
- SigV4 hand-rolled in `utils/awsSigv4.js` on `node:crypto` — no runtime dependency. Cross-verified byte-for-byte against `aws4` reference.
- Path segments escaped twice (`…v1%3A0` on wire, `…v253A0` in canonical request). Wrong escaping = opaque `SignatureDoesNotMatch`.
- `crc32` and `parseEventFrame` extracted from `kiro.js` to `utils/awsEventStream.js` (kiro loses 102 lines, frame loop unchanged).
- `passthroughModels: true` — which models an account can call varies by region.
- Region validated before use (interpolated into hostname; unvalidated = SSRF risk).
- `@aws-sdk/credential-providers` in `optionalDependencies`, imported lazily, added to `serverExternalPackages`.

## Adds `bedrock-xai` — xAI Grok on Bedrock
- Probed live AWS: `/invoke` with OpenAI body returns Chat Completions; Grok speaks OpenAI Chat Completions natively on Bedrock.
- No response translation needed — existing OpenAI path applies end to end.
- Registry entry omits `format` (defaults to `"openai"`).
- One `BedrockExecutor` serves both entries off the registry transport format.

## Structural fix: apiKeyOptionalWith
Registry declares `apiKeyOptionalWith: "profile"` — names the `providerSpecificData` field that stands in for a key. Both `/api/providers/route.js` and `validate/route.js` honor it generically.

## Structural fix: credentialForm: "aws"
Modal gates on `credentialForm` flag, not provider id. Test asserts every `bedrock*` id declares both `credentialForm` and `apiKeyOptionalWith`.

## Verification
- 60+ unit tests (21 regressions, one per defect).
- Full suite 2406 passing, failures unchanged at 119.
- Kiro 133 passing / 3 pre-existing — identical to before extraction.
- Provider, alias, OAuth baselines byte-identical.
- Build clean, SDK still traced.
- Live AWS re-verified green on streaming and non-streaming.

## Files touched (key ones)
- `open-sse/executors/bedrock.js` (new)
- `open-sse/executors/kiro.js` (EventStream extraction refactor)
- `open-sse/utils/awsSigv4.js` (new)
- `open-sse/utils/awsEventStream.js` (new)
- `open-sse/providers/registry/bedrock.js` (new)
- `open-sse/providers/registry/bedrock-xai.js` (new)
- `src/app/(dashboard)/dashboard/providers/[id]/AddApiKeyModal.js`
- `src/app/api/providers/route.js`
- `src/app/api/providers/validate/route.js`
- `public/providers/bedrock.png` (new, 3633b)
- `public/providers/bedrock-xai.png` (new, 4232b)

## Adversarial review findings (13, all triaged)
- **C1**: In-band Bedrock exceptions arrive inside HTTP 200 (kiro.js shares shape — not fixed, engine-wide)
- **C2**: No connect timeout or configured retry (engine-wide, 18/19 executors that override `execute()` have none)
- **C3**: `refreshCredentials` was dead code — removed
- **C4**: Profile resolution unbounded → one hung `GetRoleCredentials` blocked all traffic
- **C5**: Profile/SSO mode unconfigurable from API (400 for empty apiKey) → fixed via `apiKeyOptionalWith`
- **C6**: `anthropic_version` override by client body spread → fixed
- **C7**: Profile name reached AWS SDK unvalidated → allowlisted
- **C8**: Moot once C3 removed
- **C9**: Nova/Llama/Titan ids died mid-stream → `buildUrl` rejects upfront
- **C10**: DataView over frame buffer had no byteLength → bounded
- **C11**: Signed headers logged unmasked (pre-existing, not fixed here)
- **C12**: Orphaned comment in kiro.js → cleaned
- **forceStream**: Broke non-streaming (returned empty content with Claude-shaped usage in OpenAI envelope) → removed

## Relevance to our branch
- **HIGH OVERLAP**: Our branch touched `open-sse/executors/kiro.js` heavily (kiro-terminal-integrity, integrity gate). The EventStream extraction to `utils/awsEventStream.js` must be preserved when replaying our kiro.js changes.
- Our branch added `bedrock` and `bedrock-xai` executors to `open-sse/executors/index.js` (seen in step 1 conflict resolution) — those entries are from this PR, already in master.
- The `apiKeyOptionalWith` and `credentialForm` registry fields are new schema our branch's registry edits must respect.
