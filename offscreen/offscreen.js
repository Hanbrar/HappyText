/**
 * HappyText — Offscreen Document
 * Runs Transformers.js for local AI paraphrasing.
 * Model downloads once (~20MB) and is cached in the browser.
 */

import { pipeline, env } from '../lib/transformers/transformers.min.js';

// Point WASM files to our bundled copies
env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('lib/transformers/');
// Use Cache API for model caching (works in extension contexts)
env.useBrowserCache = true;
env.allowLocalModels = false;

let paraphraser = null;
let loading = false;
let loadError = null;

/**
 * Lazy-load the paraphrase model on first use.
 */
async function getParaphraser() {
  if (paraphraser) return paraphraser;
  if (loadError) throw loadError;
  if (loading) {
    while (loading) {
      await new Promise(r => setTimeout(r, 200));
    }
    if (loadError) throw loadError;
    return paraphraser;
  }

  loading = true;
  try {
    console.log('[HappyText] Loading paraphrase model...');
    paraphraser = await pipeline(
      'text2text-generation',
      'Xenova/LaMini-Flan-T5-77M',
      { quantized: true }
    );
    console.log('[HappyText] Model loaded successfully');
    return paraphraser;
  } catch (err) {
    console.error('[HappyText] Model load failed:', err);
    loadError = err;
    throw err;
  } finally {
    loading = false;
  }
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'HAPPYTEXT_OFFSCREEN_REWRITE') return;

  const text = message.text;
  console.log('[HappyText] Rewrite request received, text length:', text.length);

  (async () => {
    try {
      const model = await getParaphraser();

      // Instruction prompt for LaMini-Flan-T5 paraphrasing
      const prompt = `Paraphrase the following text completely, using different words and sentence structure:\n${text}`;

      const result = await model(prompt, {
        max_new_tokens: Math.max(80, Math.min(text.length * 3, 512)),
        num_beams: 4,
        early_stopping: true,
        no_repeat_ngram_size: 2,
        length_penalty: 1.5
      });

      const rewritten = result[0]?.generated_text?.trim() || '';
      console.log('[HappyText] Rewrite result:', rewritten.substring(0, 80) + '...');

      if (!rewritten || rewritten.length < 2) {
        sendResponse({ success: false, error: 'Model returned empty result' });
      } else {
        sendResponse({ success: true, result: rewritten });
      }
    } catch (err) {
      console.error('[HappyText] Rewrite error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});

console.log('[HappyText] Offscreen document loaded');
