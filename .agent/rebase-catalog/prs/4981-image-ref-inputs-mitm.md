# PR #4981 — feat(image, mitm): support reference image inputs for Gemini and ensure MITM directory
- **Author:** dangphuc2470, **Merged:** 2 days ago (v0.5.109), **Files:** 5
- Reference image support: open-sse/handlers/imageProviders/gemini.js adds resolveImageInput() for base64 + data URIs from body.image/body.images. Attaches inlineData to contents payload (image editing/inpainting). antigravity.js preserves inlineData alongside text parts in contents filtering.
- Accurate quota reset cooldown: antigravity.js extracts quotaResetTimeStamp from Google API error details → resetsAtMs. imageGenerationCore.js forwards error.status + error.resetsAtMs to createErrorResult() (precise cooldown timers instead of generic 502).
- MITM directory init: src/mitm/paths.js adds recursive mkdirSync for MITM_DIR (prevents runtime crashes).
- Relevance: **MEDIUM** — antigravity.js is in our 53-file overlap. Our branch may have touched image generation. Must verify.
