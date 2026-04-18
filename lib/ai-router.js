/**
 * AI Router — orchestrates the fallback chain for proofreading and rewriting.
 *
 * Proofread: LanguageTool API (default level) — fixes grammar/spelling/punctuation.
 * Rewrite:   Chrome AI is attempted from the content script's main-world bridge.
 *            If that fails, this router is called as fallback and uses LanguageTool
 *            with level=picky (style, redundancy, typography rules) to produce a
 *            meaningfully different result from proofread.
 */

import { proofread as ltProofread, enhance as ltEnhance } from './languagetool.js';

/**
 * Proofread text via LanguageTool (default level).
 */
export async function proofread(text) {
  try {
    const result = await ltProofread(text);
    return {
      corrected: result.corrected,
      changes: result.changes,
      source: 'languagetool'
    };
  } catch (err) {
    console.warn('[HappyText] LanguageTool proofread failed:', err.message);
    throw new Error('Proofreading failed. Check your internet connection.');
  }
}

/**
 * Rewrite text via LanguageTool picky mode (fallback when Chrome AI is unavailable).
 * Uses level=picky which enables style, redundancy, and typography rules —
 * produces more improvements than basic proofread.
 */
export async function rewrite(text) {
  try {
    const result = await ltEnhance(text);
    if (result.changes.length > 0) {
      return {
        corrected: result.corrected,
        changes: result.changes,
        source: 'languagetool-enhanced'
      };
    }
    return {
      corrected: text,
      changes: [],
      source: 'none'
    };
  } catch (err) {
    console.warn('[HappyText] LanguageTool enhance failed:', err.message);
    throw new Error('Rewriting failed. Check your internet connection.');
  }
}

/**
 * Process text with the specified action.
 * @param {string} text - Text to process
 * @param {'proofread'|'rewrite'} action - Action to perform
 */
export async function processText(text, action) {
  if (action === 'proofread') {
    return await proofread(text);
  } else {
    return await rewrite(text);
  }
}
