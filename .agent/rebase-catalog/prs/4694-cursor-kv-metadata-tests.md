# PR #4694 — test(cursor): lock KV ack metadata echo with round-trip tests

- **Author:** mannnrachman
- **Merged:** 2026-10-15 (v0.5.104)
- **Files changed:** 2
- **Status:** Closed / Merged

## What this does
Adds regression coverage for AgentService KV blob protocol metadata echo. `encodeKvClientMessage` must echo server's field 4 verbatim.

## Tests
6 passed in cursor-kv-metadata-roundtrip (new). Sibling cursor suites: 60/61 pass.

## Relevance to our branch
- **LOW**: Test-only, no behavior change. Exports encodeKvClientMessage for testing.
