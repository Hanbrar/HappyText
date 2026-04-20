/**
 * HappyText — Background Service Worker
 * Handles context menus, keyboard commands, and proofreading via LanguageTool.
 */

import { processText } from '../lib/ai-router.js';

// ── Context Menus ──

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'happytext-proofread',
    title: 'HappyText: Proofread',
    contexts: ['selection']
  });

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

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const text = info.selectionText;
  if (!text || text.trim().length < 2) return;

  chrome.tabs.sendMessage(tab.id, {
    type: 'HAPPYTEXT_CONTEXT_MENU',
    action: 'proofread',
    text
  });
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'trigger-happytext' || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'HAPPYTEXT_TRIGGER_SHORTCUT' });
});

// ── Message Handling ──

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'HAPPYTEXT_PROCESS') {
    const { text } = message;
    processText(text, 'proofread')
      .then(result => sendResponse({ success: true, ...result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'HAPPYTEXT_GET_SETTINGS') {
    chrome.storage.sync.get(['settings'], (result) => {
      sendResponse(result.settings || { showTrigger: true, defaultAction: 'ask', language: 'auto' });
    });
    return true;
  }
});
