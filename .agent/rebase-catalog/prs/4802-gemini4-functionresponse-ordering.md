# Issue #4802 / PR #4882 — fix(gemini): drop sampling params and order functionResponse-last for Gemini 4

- **Reporter:** daniadasaya
- **Merged:** 2026-10-15 (v0.5.104)
- **Affects:** vertex/gemini-4-argon and all Gemini 4 family

## Problem
OpenAI→Vertex translator merges consecutive same-role turns. Tool result (role:user with functionResponse) immediately followed by user text produces `[functionResponse, text]` — Gemini 4 rejects with 400 "Requests ending with a model turn are not supported". Gemini 3.x/2.5 accept it.

## Fix
- Keep functionResponse parts at END of merged user turn (stable sort)
- Also drops sampling params Gemini 4 rejects

## Verification
- vertex/gemini-4-argon tool-call flow: 200 (was 400)
- vertex/gemini-3.1-pro-preview / gemini-3-flash-preview: regression 200

## Relevance to our branch
- **MEDIUM**: Our branch touched open-sse/translator/formats/gemini.js. Must verify we have the functionResponse-last ordering fix.
