# Dialagram Provider Credentials

**Date:** 2026-08-07
**Author:** User (Chris)
**Status:** active
**Tags:** #credentials #dialagram #provider

> ⚠️ This file is in `docs/plans-and-prompts/` which is gitignored.
> Do NOT commit secrets to git.

## Connection Details

- **Base URL:** `https://dialagram.me/router/v1`
- **API Key:** `dgr_live_mxjv4glj6n5FQlaB4xR6WlgS0b9MQBmuodUsI1pnMQfYJlrT57`
- **Type:** OpenAI-compatible router
- **Prefix:** `dialagram`

## Notes

- Dialagram is itself a router — it routes to multiple models behind the scenes
- Can be used as a fallback provider or as the primary upstream for 9router's smart router
- The `/v1` suffix is the OpenAI-compatible endpoint
- Supports `/models` listing for auto-discovery

## Usage in 9router

- Configured as custom provider node: `openai-compatible` type
- Prefix: `dialagram` (models appear as `dialagram/<model-id>`)
- Smart router can include `dialagram/*` in `allowedModels`
