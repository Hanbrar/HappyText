/**
 * HappyText — Background Service Worker
 * Handles context menus, keyboard commands, and AI routing.
 *
 * Proofread: LanguageTool API (service worker handles directly)
 * Rewrite:   Offscreen document running Transformers.js (local AI paraphrasing)
 */

import { processText } from '../lib/ai-router.js';

// ── Offscreen Document Management ──

let offscreenCreating = null;

async function ensureOffscreen() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existingContexts.length > 0) return;

  if (offscreenCreating) {
    await offscreenCreating;
    return;
  }

  offscreenCreating = chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Run Transformers.js for local AI text paraphrasing'
  });
  await offscreenCreating;
  offscreenCreating = null;
}

/**
 * Rewrite text using the offscreen Transformers.js model.
 */
async function rewriteViaOffscreen(text) {
  await ensureOffscreen();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'HAPPYTEXT_OFFSCREEN_REWRITE', text },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.success) {
          resolve(response.result);
        } else {
          reject(new Error(response?.error || 'Rewrite failed'));
        }
      }
    );
  });
}

// ── Context Menus ──

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'happytext-proofread',
    title: 'HappyText: Proofread',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'happytext-rewrite',
    title: 'HappyText: Rewrite',
    contexts: ['selection']
  });

  // Set default settings
  chrome.storage.sync.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({
        settings: {
          showTrigger: true,
          defaultAction: 'ask',
          language: 'auto'
        }
      });
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const action = info.menuItemId === 'happytext-proofread' ? 'proofread' : 'rewrite';
  const text = info.selectionText;
  if (!text || text.trim().length < 2) return;

  // Tell content script to show panel + loading
  chrome.tabs.sendMessage(tab.id, {
    type: 'HAPPYTEXT_CONTEXT_MENU',
    action,
    text
  });
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'trigger-happytext' || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'HAPPYTEXT_TRIGGER_SHORTCUT' });
});

// ── Message Handling ──

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HAPPYTEXT_PROCESS') {
    const { text, action } = message;

    if (action === 'rewrite') {
      // Rewrite via offscreen Transformers.js
      rewriteViaOffscreen(text)
        .then(result => sendResponse({
          success: true,
          corrected: result,
          changes: [],
          source: 'transformers-js'
        }))
        .catch(err => {
          // Fallback: LanguageTool picky mode
          processText(text, 'rewrite')
            .then(result => sendResponse({ success: true, ...result }))
            .catch(err2 => sendResponse({ success: false, error: err2.message }));
        });
    } else {
      // Proofread via LanguageTool
      processText(text, action)
        .then(result => sendResponse({ success: true, ...result }))
        .catch(err => sendResponse({ success: false, error: err.message }));
    }
    return true; // Keep channel open for async response
  }

  if (message.type === 'HAPPYTEXT_GET_SETTINGS') {
    chrome.storage.sync.get(['settings'], (result) => {
      sendResponse(result.settings || { showTrigger: true, defaultAction: 'ask', language: 'auto' });
    });
    return true;
  }

  // Ignore messages from offscreen document
  if (message.type === 'HAPPYTEXT_OFFSCREEN_READY') return;
});
