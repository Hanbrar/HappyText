/**
 * HappyText — Popup Script
 * Handles settings persistence and status checks.
 */

document.addEventListener('DOMContentLoaded', () => {
  const defaultAction = document.getElementById('defaultAction');
  const showTrigger = document.getElementById('showTrigger');
  const language = document.getElementById('language');
  const ltStatus = document.getElementById('ltStatus');
  const ltLabel = document.getElementById('ltLabel');
  const aiStatus = document.getElementById('aiStatus');
  const aiLabel = document.getElementById('aiLabel');

  // Load saved settings
  chrome.storage.sync.get(['settings'], (result) => {
    const s = result.settings || {};
    if (s.defaultAction) defaultAction.value = s.defaultAction;
    if (s.showTrigger !== undefined) showTrigger.checked = s.showTrigger;
    if (s.language) language.value = s.language;
  });

  // Save settings on change
  function saveSettings() {
    chrome.storage.sync.set({
      settings: {
        defaultAction: defaultAction.value,
        showTrigger: showTrigger.checked,
        language: language.value
      }
    });
  }

  defaultAction.addEventListener('change', saveSettings);
  showTrigger.addEventListener('change', saveSettings);
  language.addEventListener('change', saveSettings);

  // Check LanguageTool connectivity
  checkLanguageTool();

  // Local AI is always available (Transformers.js, bundled)
  aiStatus.className = 'status-dot status-connected';
  aiLabel.textContent = 'Bundled';

  async function checkLanguageTool() {
    try {
      const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'text=test&language=en-US'
      });

      if (response.ok) {
        ltStatus.className = 'status-dot status-connected';
        ltLabel.textContent = 'Connected';
      } else {
        ltStatus.className = 'status-dot status-disconnected';
        ltLabel.textContent = 'Error ' + response.status;
      }
    } catch {
      ltStatus.className = 'status-dot status-disconnected';
      ltLabel.textContent = 'Offline';
    }
  }
});
