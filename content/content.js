/**
 * HappyText — Content Script
 * Injected into every webpage. Detects text selection, renders floating UI
 * inside a Shadow DOM, handles Replace/Copy actions.
 */

(() => {
  'use strict';

  // ── SVG Icons ──

  const SMILEY_SVG = `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="16" fill="#FFD700" stroke="#2A2A2A" stroke-width="1.5"/>
    <ellipse cx="13" cy="15" rx="2" ry="2.5" fill="#2A2A2A"/>
    <ellipse cx="23" cy="15" rx="2" ry="2.5" fill="#2A2A2A"/>
    <path d="M11 21.5C12.5 25 15 26.5 18 26.5C21 26.5 23.5 25 25 21.5" stroke="#2A2A2A" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;

  const CLOSE_SVG = `<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;

  const CHECK_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  const PEN_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.5 2.5L13.5 4.5L5.5 12.5L2.5 13.5L3.5 10.5L11.5 2.5Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  // ── State ──

  let shadowHost = null;
  let shadowRoot = null;
  let currentPanel = null;
  let triggerBtn = null;
  let lastSelection = null;
  let lastRange = null;
  let lastActiveElement = null;
  let settings = { showTrigger: true, defaultAction: 'ask', language: 'auto' };
  let dismissTimeout = null;

  // ── Init ──

  function init() {
    loadSettings();
    createShadowHost();
    bindEvents();
  }

  function loadSettings() {
    chrome.runtime.sendMessage({ type: 'HAPPYTEXT_GET_SETTINGS' }, (res) => {
      if (res) settings = res;
    });
  }

  function createShadowHost() {
    shadowHost = document.createElement('div');
    shadowHost.id = 'happytext-root';
    shadowHost.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;';
    shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

    // Load Inter font via <link> (works in Shadow DOM unlike @import)
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
    shadowRoot.appendChild(fontLink);

    // Inject styles via <link> (synchronous extension resource load, no race condition)
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/content.css');
    shadowRoot.appendChild(link);

    (document.body || document.documentElement).appendChild(shadowHost);
  }

  // ── Event Binding ──

  let selectionDebounce = null;

  function bindEvents() {
    document.addEventListener('mouseup', onMouseUp, true);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('selectionchange', onSelectionChange);

    // Listen for messages from background
    chrome.runtime.onMessage.addListener(onMessage);
  }

  function onMouseUp(e) {
    // Ignore clicks inside our own UI
    if (e.target === shadowHost || shadowHost?.contains(e.target)) return;

    // Debounce selection detection
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();

      if (text && text.length >= 3 && settings.showTrigger) {
        lastSelection = text;
        try {
          lastRange = sel.getRangeAt(0).cloneRange();
        } catch { lastRange = null; }
        lastActiveElement = document.activeElement;
        showTrigger(e.clientX, e.clientY);
      }
    }, 10);
  }

  function onMouseDown(e) {
    // Check if click is inside shadow DOM
    const path = e.composedPath();
    if (path.some(el => el === shadowHost)) return;

    // Dismiss trigger and panel on outside click
    removeTrigger();
    removePanel();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      removeTrigger();
      removePanel();
    }
  }

  function onKeyUp(e) {
    // Detect keyboard-based selections (Ctrl+A, Shift+arrows, etc.)
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      checkKeyboardSelection();
    }
    if (e.shiftKey && (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End')) {
      checkKeyboardSelection();
    }
  }

  function onSelectionChange() {
    // Debounce selectionchange — it fires very frequently during drag/keyboard
    clearTimeout(selectionDebounce);
    selectionDebounce = setTimeout(() => {
      checkKeyboardSelection();
    }, 300);
  }

  function checkKeyboardSelection() {
    const sel = window.getSelection();
    const text = sel?.toString().trim();

    if (!text || text.length < 3 || !settings.showTrigger) {
      return;
    }

    lastSelection = text;
    try {
      lastRange = sel.getRangeAt(0).cloneRange();
    } catch { lastRange = null; }
    lastActiveElement = document.activeElement;

    // Position trigger near the selection's bounding rect
    let x, y;
    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect && rect.width > 0) {
        x = rect.left + rect.width / 2;
        y = rect.top;
      }
    } catch { /* ignore */ }

    // Fallback: position near the active element
    if (x === undefined || y === undefined) {
      const el = document.activeElement;
      if (el && el !== document.body) {
        const rect = el.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top;
      } else {
        x = window.innerWidth / 2;
        y = window.innerHeight / 3;
      }
    }

    showTrigger(x, y);
  }

  function onMessage(message) {
    switch (message.type) {
      case 'HAPPYTEXT_TRIGGER_SHORTCUT':
        handleShortcut();
        break;
      case 'HAPPYTEXT_CONTEXT_MENU':
        lastSelection = message.text;
        removeTrigger();
        // showPanel with an action triggers loading + processAction internally
        showPanel(message.action);
        break;
      case 'HAPPYTEXT_SHOW_RESULT':
        showResult(message);
        break;
      case 'HAPPYTEXT_SHOW_ERROR':
        showError(message.error);
        break;
    }
  }

  function handleShortcut() {
    const sel = window.getSelection();
    const text = sel?.toString().trim();

    if (!text || text.length < 2) return;

    lastSelection = text;
    try {
      lastRange = sel.getRangeAt(0).cloneRange();
    } catch { lastRange = null; }
    lastActiveElement = document.activeElement;

    removeTrigger();

    // Get position from selection rect
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;

    showPanel(null, x, y);
  }

  // ── Trigger Button ──

  function showTrigger(mouseX, mouseY) {
    removeTrigger();
    clearTimeout(dismissTimeout);

    const btn = document.createElement('button');
    btn.className = 'ht-trigger';
    btn.innerHTML = SMILEY_SVG;
    btn.style.pointerEvents = 'auto';

    // Position above the mouse
    let top = mouseY - 48;
    let left = mouseX - 18;

    // Keep on screen
    top = Math.max(4, Math.min(top, window.innerHeight - 44));
    left = Math.max(4, Math.min(left, window.innerWidth - 44));

    btn.style.top = top + 'px';
    btn.style.left = left + 'px';

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const btnRect = btn.getBoundingClientRect();
      removeTrigger();
      showPanel(null, btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);
    });

    shadowRoot.appendChild(btn);
    triggerBtn = btn;

    // Auto-dismiss after 5 seconds
    dismissTimeout = setTimeout(() => {
      removeTrigger();
    }, 5000);
  }

  function removeTrigger() {
    if (triggerBtn) {
      triggerBtn.style.animation = 'ht-pop-out 150ms ease forwards';
      const ref = triggerBtn;
      setTimeout(() => ref.remove(), 150);
      triggerBtn = null;
    }
    clearTimeout(dismissTimeout);
  }

  // ── Panel ──

  function showPanel(immediateAction, x, y) {
    removePanel();

    const panel = document.createElement('div');
    panel.className = 'ht-panel';
    panel.style.pointerEvents = 'auto';

    // Position
    if (x !== undefined && y !== undefined) {
      let top = y + 12;
      let left = x - 170;
      top = Math.max(8, Math.min(top, window.innerHeight - 300));
      left = Math.max(8, Math.min(left, window.innerWidth - 348));
      panel.style.top = top + 'px';
      panel.style.left = left + 'px';
    } else {
      // Center-ish on screen
      panel.style.top = '30%';
      panel.style.left = '50%';
      panel.style.transform = 'translateX(-50%)';
    }

    // Build header
    const header = document.createElement('div');
    header.className = 'ht-header';

    const icon = document.createElement('div');
    icon.className = 'ht-header-icon';
    icon.innerHTML = SMILEY_SVG;

    const textDiv = document.createElement('div');
    textDiv.className = 'ht-header-text';

    const title = document.createElement('div');
    title.className = 'ht-header-title';
    title.textContent = 'HappyText';

    const subtitle = document.createElement('div');
    subtitle.className = 'ht-header-subtitle';
    subtitle.textContent = truncate(lastSelection || '', 60);

    textDiv.appendChild(title);
    textDiv.appendChild(subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ht-close-btn';
    closeBtn.innerHTML = CLOSE_SVG;
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removePanel();
    });

    header.appendChild(icon);
    header.appendChild(textDiv);
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'ht-divider';
    panel.appendChild(divider);

    // Content area (swappable)
    const content = document.createElement('div');
    content.id = 'ht-content';
    panel.appendChild(content);

    shadowRoot.appendChild(panel);
    currentPanel = panel;

    // If immediate action, go straight to loading
    if (immediateAction) {
      showLoading(immediateAction);
      processAction(immediateAction);
    } else {
      showActions(content);
    }
  }

  function removePanel() {
    if (currentPanel) {
      currentPanel.remove();
      currentPanel = null;
    }
  }

  function getContentArea() {
    return shadowRoot.getElementById('ht-content');
  }

  // ── Action Selection State ──

  function showActions(container) {
    const content = container || getContentArea();
    if (!content) return;
    content.innerHTML = '';

    const actions = document.createElement('div');
    actions.className = 'ht-actions';

    const proofBtn = document.createElement('button');
    proofBtn.className = 'ht-action-btn';
    proofBtn.innerHTML = CHECK_SVG + ' Proofread';
    proofBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLoading('proofread');
      processAction('proofread');
    });

    const rewriteBtn = document.createElement('button');
    rewriteBtn.className = 'ht-action-btn';
    rewriteBtn.innerHTML = PEN_SVG + ' Rewrite';
    rewriteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLoading('rewrite');
      processAction('rewrite');
    });

    actions.appendChild(proofBtn);
    actions.appendChild(rewriteBtn);
    content.appendChild(actions);
  }

  // ── Loading State ──

  function showLoading(action) {
    const content = getContentArea();
    if (!content) return;
    content.innerHTML = '';

    const loading = document.createElement('div');
    loading.className = 'ht-loading';

    const icon = document.createElement('div');
    icon.className = 'ht-loading-icon';
    icon.innerHTML = SMILEY_SVG;

    const text = document.createElement('div');
    text.className = 'ht-loading-text';
    text.textContent = action === 'proofread' ? 'Proofreading...' : 'Rewriting...';

    const bar = document.createElement('div');
    bar.className = 'ht-progress-bar';
    bar.innerHTML = '<div class="ht-progress-fill"></div>';

    loading.appendChild(icon);
    loading.appendChild(text);
    loading.appendChild(bar);
    content.appendChild(loading);
  }

  // ── Result State ──

  function showResult(data) {
    const content = getContentArea();
    if (!content) return;
    content.innerHTML = '';

    const original = data.original || lastSelection || '';
    const corrected = data.corrected || '';
    const noChanges = original === corrected;

    // Result text area
    const resultDiv = document.createElement('div');
    resultDiv.className = 'ht-result';

    const resultText = document.createElement('div');
    resultText.className = 'ht-result-text';

    if (noChanges) {
      const noChange = document.createElement('div');
      noChange.className = 'ht-no-changes';
      noChange.textContent = 'Looks good! No changes needed.';
      resultText.appendChild(noChange);
    } else {
      // Show diff with staggered word animation
      const diffSegments = diffWords(original, corrected);
      let wordIndex = 0;
      for (const seg of diffSegments) {
        const span = document.createElement('span');
        if (seg.type === 'removed') {
          span.className = 'ht-diff-removed';
        } else if (seg.type === 'added') {
          span.className = 'ht-diff-added';
        }
        span.textContent = seg.text;
        span.style.animationDelay = (wordIndex * 20) + 'ms';
        resultText.appendChild(span);
        wordIndex++;
      }
    }

    resultDiv.appendChild(resultText);
    content.appendChild(resultDiv);

    // Action buttons
    if (!noChanges) {
      const actions = document.createElement('div');
      actions.className = 'ht-result-actions';

      const replaceBtn = document.createElement('button');
      replaceBtn.className = 'ht-btn-replace';
      replaceBtn.textContent = 'Replace';

      const canReplace = isEditableSelection();
      if (!canReplace) {
        replaceBtn.disabled = true;
        replaceBtn.title = 'Can only replace text in editable fields';
      }

      replaceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        replaceText(corrected);
        removePanel();
        showTooltip('Replaced!', e.clientX, e.clientY);
      });

      const copyBtn = document.createElement('button');
      copyBtn.className = 'ht-btn-copy';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(corrected).then(() => {
          showTooltip('Copied!', e.clientX, e.clientY);
        });
      });

      const closeBtn = document.createElement('button');
      closeBtn.className = 'ht-btn-close';
      closeBtn.textContent = 'Close';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removePanel();
      });

      actions.appendChild(replaceBtn);
      actions.appendChild(copyBtn);
      actions.appendChild(closeBtn);
      content.appendChild(actions);
    }

    // Update header subtitle
    const subtitle = shadowRoot.querySelector('.ht-header-subtitle');
    if (subtitle) {
      const actionLabel = data.action === 'proofread' ? 'Proofread' : 'Rewrite';
      subtitle.textContent = noChanges ? `${actionLabel} — Perfect!` : `${actionLabel} Complete`;
      subtitle.style.color = noChanges ? '#4ADE80' : '#FFD700';
    }
  }

  // ── Error State ──

  function showError(errorMsg) {
    const content = getContentArea();
    if (!content) return;
    content.innerHTML = '';

    const error = document.createElement('div');
    error.className = 'ht-error';

    const text = document.createElement('div');
    text.className = 'ht-error-text';
    text.textContent = errorMsg || 'Something went wrong. Please try again.';

    const retryBtn = document.createElement('button');
    retryBtn.className = 'ht-btn-retry';
    retryBtn.textContent = 'Try Again';
    retryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showActions();
    });

    error.appendChild(text);
    error.appendChild(retryBtn);
    content.appendChild(error);
  }

  // ── Process Action ──

  /**
   * All actions go through the service worker.
   * Proofread: service worker calls LanguageTool API directly.
   * Rewrite: service worker routes to offscreen Transformers.js (local AI paraphrasing).
   */
  function processAction(action) {
    chrome.runtime.sendMessage(
      { type: 'HAPPYTEXT_PROCESS', text: lastSelection, action },
      (response) => {
        if (chrome.runtime.lastError) {
          showError('Lost connection to HappyText. Refresh the page and try again.');
          return;
        }
        if (response?.success) {
          showResult({
            action,
            original: lastSelection,
            corrected: response.corrected,
            changes: response.changes,
            source: response.source
          });
        } else {
          showError(response?.error || 'Processing failed.');
        }
      }
    );
  }

  // ── Text Replacement ──

  function isEditableSelection() {
    if (!lastActiveElement) return false;
    const tag = lastActiveElement.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    if (lastActiveElement.isContentEditable) return true;
    // Check if the selection is inside a contenteditable ancestor
    if (lastRange) {
      let node = lastRange.commonAncestorContainer;
      while (node && node !== document.body) {
        if (node.isContentEditable) return true;
        node = node.parentNode;
      }
    }
    return false;
  }

  function replaceText(newText) {
    if (!lastActiveElement) return;
    const tag = lastActiveElement.tagName?.toLowerCase();

    if (tag === 'input' || tag === 'textarea') {
      replaceInInput(lastActiveElement, newText);
    } else if (lastActiveElement.isContentEditable || isInsideContentEditable()) {
      replaceInContentEditable(newText);
    }
  }

  function replaceInInput(el, newText) {
    el.focus();
    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (start !== null && end !== null) {
      el.setSelectionRange(start, end);
      // Use execCommand for compatibility with React/Vue controlled inputs
      document.execCommand('insertText', false, newText);
    } else {
      // Fallback: use the value property directly
      const val = el.value;
      const idx = val.indexOf(lastSelection);
      if (idx !== -1) {
        el.value = val.substring(0, idx) + newText + val.substring(idx + lastSelection.length);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  function replaceInContentEditable(newText) {
    if (!lastRange) return;

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(lastRange);

    document.execCommand('insertText', false, newText);
  }

  function isInsideContentEditable() {
    if (!lastRange) return false;
    let node = lastRange.commonAncestorContainer;
    while (node && node !== document.body) {
      if (node.isContentEditable) return true;
      node = node.parentNode;
    }
    return false;
  }

  // ── Tooltip ──

  function showTooltip(text, x, y) {
    const tooltip = document.createElement('div');
    tooltip.className = 'ht-tooltip';
    tooltip.textContent = text;
    tooltip.style.pointerEvents = 'none';
    tooltip.style.top = (y - 40) + 'px';
    tooltip.style.left = (x - 30) + 'px';
    shadowRoot.appendChild(tooltip);
    setTimeout(() => {
      tooltip.style.animation = 'ht-pop-out 200ms ease forwards';
      setTimeout(() => tooltip.remove(), 200);
    }, 1200);
  }

  // ── Word Diff (inline, no module import in content scripts) ──

  function diffWords(original, corrected) {
    if (original === corrected) {
      return [{ type: 'equal', text: original }];
    }

    const origWords = tokenize(original);
    const corrWords = tokenize(corrected);
    const lcs = lcsWords(origWords, corrWords);

    const result = [];
    let oi = 0, ci = 0, li = 0;

    while (oi < origWords.length || ci < corrWords.length) {
      if (li < lcs.length) {
        while (oi < origWords.length && origWords[oi] !== lcs[li]) {
          result.push({ type: 'removed', text: origWords[oi] });
          oi++;
        }
        while (ci < corrWords.length && corrWords[ci] !== lcs[li]) {
          result.push({ type: 'added', text: corrWords[ci] });
          ci++;
        }
        if (li < lcs.length) {
          result.push({ type: 'equal', text: lcs[li] });
          oi++; ci++; li++;
        }
      } else {
        while (oi < origWords.length) {
          result.push({ type: 'removed', text: origWords[oi++] });
        }
        while (ci < corrWords.length) {
          result.push({ type: 'added', text: corrWords[ci++] });
        }
      }
    }
    return result;
  }

  function tokenize(text) {
    return text.match(/\S+|\s+/g) || [];
  }

  function lcsWords(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
    const res = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i-1] === b[j-1]) { res.unshift(a[i-1]); i--; j--; }
      else if (dp[i-1][j] > dp[i][j-1]) { i--; }
      else { j--; }
    }
    return res;
  }

  function truncate(text, maxLen = 60) {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 1) + '\u2026';
  }

  // ── Start ──
  init();
})();
