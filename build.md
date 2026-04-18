# HappyText — Project Brief

## What It Is
A free Chrome Extension that lets you select text on **any webpage**, and instantly get AI-powered proofreading or rewriting in a sleek floating panel — no copy-pasting, no switching tabs, no API keys.

Think: Apple Intelligence Writing Tools, but for Chrome, completely free, and beautifully designed.

---

## Core User Flow
1. User highlights text on **any webpage** (Gmail, Twitter, Docs, Reddit, anywhere)
2. A small **yellow smiley button** appears near the selection
   - Or user **right-clicks** and selects "HappyText: Proofread" / "HappyText: Rewrite"
   - Or user presses **`Alt+Shift+H`** (Chrome reserves `Ctrl+D` for bookmarks)
3. Floating dark panel appears with two options:
   - **Proofread** — fix grammar, spelling, punctuation
   - **Rewrite** — rephrase for clarity and flow
4. Result shown with **diff highlighting** (removed text struck through in red, added text highlighted in gold)
5. User clicks **Replace** (in editable fields) or **Copy** — done

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Platform | Chrome Extension (Manifest V3) | Widest reach, direct DOM access, no install friction |
| AI — Proofread | LanguageTool public API | Free, no API key, production-grade grammar checking |
| AI — Rewrite | Chrome Built-in AI (Prompt API) | Free, runs Gemini Nano locally, zero network |
| AI — Fallback | Cross-fallback between both | LanguageTool down? Use Chrome AI. Chrome AI unavailable? Use LanguageTool |
| UI Isolation | Shadow DOM | Styles never conflict with host page CSS |
| Design | Dark glassmorphism + yellow accents | Bold, premium feel matching the smiley brand |
| Storage | chrome.storage.sync | Settings persist across devices via Chrome account |
| Shortcut | Alt+Shift+H | Avoids Chrome's reserved Ctrl+D (bookmark) |

---

## AI Strategy — Free, No Keys

### Proofread
- **Primary**: [LanguageTool public API](https://api.languagetool.org/v2/check) — POST with `text` and `language`, no auth needed, 20 req/min
- **Fallback**: Chrome Built-in AI with proofreading prompt

### Rewrite
- **Primary**: Chrome Built-in AI (Gemini Nano via `self.ai.languageModel`) — fully local, no network
- **Fallback**: LanguageTool corrections (not true rewrite, but improves text)

### Detection
```javascript
// Check Chrome AI availability
if ('ai' in self && 'languageModel' in self.ai) {
  const caps = await self.ai.languageModel.capabilities();
  // caps.available === 'readily' | 'after-download' | 'no'
}
```

---

## Project Structure
```
CleanWriteAI/                    (repo name — extension displays as "HappyText")
├── manifest.json                 Chrome Extension Manifest V3
├── background/
│   └── service-worker.js         Context menus, commands, AI routing
├── content/
│   ├── content.js                Selection detection, floating UI, replace/copy
│   └── content.css               All floating UI styles (Shadow DOM isolated)
├── popup/
│   ├── popup.html                Browser action popup (settings + about)
│   ├── popup.css                 Popup styles
│   └── popup.js                  Settings logic + status checks
├── lib/
│   ├── languagetool.js           LanguageTool API client
│   ├── chrome-ai.js              Chrome Built-in AI wrapper
│   ├── ai-router.js              Fallback chain orchestrator
│   └── text-utils.js             Word diff algorithm, helpers
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── styles/
    └── design-tokens.css         Shared CSS custom properties
```

---

## UI Design

### Design Language
**Dark glassmorphism with yellow accents.** The dark background makes the gold pop. Glass blur effects create depth. The smiley face is the visual anchor.

### Color Palette
| Token | Value | Usage |
|---|---|---|
| Primary Yellow | `#FFD700` | Buttons, accents, brand |
| Light Yellow | `#FFF3B0` | Subtle highlights, added text |
| Dark BG | `#1A1A2E` | Panel background |
| Card BG | `#16213E` | Elevated surfaces |
| Text Primary | `#EAEAEA` | Main content |
| Text Secondary | `#A0A0B0` | Labels, hints |
| Success | `#4ADE80` | Confirmations |
| Error | `#F87171` | Errors, removed text |

### Typography
- **Font**: Inter (Google Fonts)
- **Body**: 13px / weight 400
- **Headers**: 14px / weight 600

### Floating UI States
1. **Trigger**: 36px yellow smiley circle, spring animation on appear, yellow glow shadow
2. **Action Panel**: 340px dark glass panel, Proofread + Rewrite buttons, morphs from trigger
3. **Loading**: Bouncing smiley, sliding yellow progress bar
4. **Result**: Diff-highlighted text, Replace (solid gold) + Copy (outline) buttons
5. **Error**: Red message + Retry button

---

## MVP Feature Scope (v1.0)

### In scope
- [ ] Selection detection (mouseup)
- [ ] Mini smiley trigger button near selection
- [ ] Context menu integration (right-click)
- [ ] Keyboard shortcut (Alt+Shift+H)
- [ ] Floating action panel (dark glassmorphism)
- [ ] Proofread via LanguageTool API
- [ ] Rewrite via Chrome Built-in AI
- [ ] Fallback chain between AI backends
- [ ] Word-level diff highlighting in results
- [ ] Replace text in editable fields
- [ ] Copy to clipboard
- [ ] Shadow DOM isolation (no style conflicts)
- [ ] Popup page with settings
- [ ] Settings persistence (chrome.storage.sync)
- [ ] Language selection
- [ ] AI status indicators
- [ ] Spring/morph animations
- [ ] Chrome Web Store listing

### Out of scope for v1
- [ ] Tone selector (Professional/Casual/Concise)
- [ ] History/backup of corrections
- [ ] Firefox/Edge/Safari ports
- [ ] Offline-only mode
- [ ] Self-hosted LanguageTool
- [ ] Monetization / ads

---

## Known Limitations

| Limitation | Reason |
|---|---|
| Google Docs — Replace won't work | Canvas-based rendering, not standard DOM. Copy still works. |
| Chrome AI requires experimental flags | Users must enable `chrome://flags/#prompt-api-for-gemini-nano`. Falls back to LanguageTool. |
| LanguageTool rate limit | 20 requests/minute on public API. Falls back to Chrome AI if exceeded. |
| `Alt+Shift+H` instead of `Ctrl+D` | Chrome reserves `Ctrl+D` for bookmarks. Cannot be overridden. |
| `chrome://` pages blocked | Chrome extensions cannot inject into browser internal pages. |

---

## Notes / Decisions Log
- **2026-04-13**: Project kicked off as Windows desktop app (Python + Hugging Face local models)
- **2026-04-17**: Pivoted to Chrome Extension. Renamed from "CleanWriteAI" to **HappyText**. Switched from local Hugging Face models to hybrid LanguageTool + Chrome Built-in AI strategy. Complete UI redesign with dark glassmorphism + yellow smiley brand.
