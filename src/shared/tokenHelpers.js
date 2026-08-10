/**
 * Token-count helpers shared between the Usage page (RequestDetailsTab) and
 * unit tests. Pure functions — no React, no browser APIs — so they can be
 * imported from anywhere (client components, server code, vitest).
 *
 * Canonical storage keeps prompt cache-inclusive. Legacy Claude rows may have
 * stored prompt cache-exclusive; the fallbacks below keep old rows from
 * under-reporting input.
 */

export function getCachedTokens(tokens) {
  return tokens?.cached_tokens || tokens?.cache_read_input_tokens || 0;
}

export function getCacheCreationTokens(tokens) {
  return tokens?.cache_creation_input_tokens || 0;
}

export function getInputTokens(tokens) {
  const prompt = tokens?.prompt_tokens || tokens?.input_tokens || 0;
  const cache = getCachedTokens(tokens);
  return prompt < cache ? cache : prompt;
}