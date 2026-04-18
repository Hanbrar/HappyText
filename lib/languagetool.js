/**
 * LanguageTool API client for proofreading.
 * Uses the free public API — no API key required.
 */

const API_URL = 'https://api.languagetool.org/v2/check';

/**
 * Apply LanguageTool matches to produce corrected text.
 * Applies replacements in reverse offset order to preserve indices.
 */
function applyCorrections(text, matches) {
  const sorted = [...matches]
    .filter(m => m.replacements && m.replacements.length > 0)
    .sort((a, b) => b.offset - a.offset);

  let corrected = text;
  const changes = [];

  for (const match of sorted) {
    const original = corrected.substring(match.offset, match.offset + match.length);
    const replacement = match.replacements[0].value;

    corrected =
      corrected.substring(0, match.offset) +
      replacement +
      corrected.substring(match.offset + match.length);

    changes.unshift({
      original,
      replacement,
      offset: match.offset,
      length: match.length,
      message: match.message,
      rule: match.rule?.id
    });
  }

  return { corrected, changes };
}

/**
 * Proofread text using LanguageTool public API.
 * @param {string} text - Text to proofread
 * @param {string} language - Language code (default: 'auto')
 * @returns {Promise<{corrected: string, changes: Array}>}
 */
export async function proofread(text, language = 'auto') {
  const body = new URLSearchParams({
    text,
    language,
    enabledOnly: 'false'
  });

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`LanguageTool API error: ${response.status}`);
  }

  const data = await response.json();
  const { corrected, changes } = applyCorrections(text, data.matches || []);

  return { corrected, changes };
}

/**
 * Enhanced check using LanguageTool's "picky" level.
 * Enables additional style, redundancy, and typography rules
 * for a more thorough text improvement (used as rewrite fallback).
 * @param {string} text - Text to improve
 * @param {string} language - Language code (default: 'auto')
 * @returns {Promise<{corrected: string, changes: Array}>}
 */
export async function enhance(text, language = 'auto') {
  const body = new URLSearchParams({
    text,
    language,
    enabledOnly: 'false',
    level: 'picky'
  });

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`LanguageTool API error: ${response.status}`);
  }

  const data = await response.json();
  const { corrected, changes } = applyCorrections(text, data.matches || []);

  return { corrected, changes };
}
