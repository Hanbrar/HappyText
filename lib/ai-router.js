import { proofread as ltProofread } from './languagetool.js';

export async function processText(text) {
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
