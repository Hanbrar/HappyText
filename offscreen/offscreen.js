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

/**
 * Lazy-load the paraphrase model on first use.
 * Uses Xenova/LaMini-Flan-T5-77M — small (~20MB), fast, good quality.
 */
async function getParaphraser() {
  if (paraphraser) return paraphraser;
  if (loading) {
    // Wait for ongoing load
    while (loading) {
      await new Promise(r => setTimeout(r, 100));
    }
    return paraphraser;
  }

  loading = true;
  try {
    paraphraser = await pipeline(
      'text2text-generation',
      'Xenova/LaMini-Flan-T5-77M',
      { quantized: true }
    );
    return paraphraser;
  } finally {
    loading = false;
  }
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'HAPPYTEXT_OFFSCREEN_REWRITE') return;

  (async () => {
    try {
      const model = await getParaphraser();
      const result = await model(
        `paraphrase: ${message.text}`,
        {
          max_new_tokens: 256,
          num_beams: 4,
          early_stopping: true
        }
      );
      const rewritten = result[0]?.generated_text?.trim() || '';
      sendResponse({ success: true, result: rewritten });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep channel open for async response
});

// Signal ready
chrome.runtime.sendMessage({ type: 'HAPPYTEXT_OFFSCREEN_READY' });
