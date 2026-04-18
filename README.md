# HappyText

A free Chrome Extension that lets you select text on any webpage and instantly get AI-powered proofreading or rewriting in a sleek floating panel — no API keys, no accounts, completely free.

Think: Apple Intelligence Writing Tools, but for Chrome.

---

## Features

- **Select & fix** — highlight text on any webpage, click the smiley or press `Alt+Shift+H`
- **Proofread** — fix grammar, spelling, and punctuation
- **Rewrite** — rephrase for clarity and flow
- **Replace** text in-place (editable fields) or **Copy** to clipboard
- **Right-click** context menu integration
- **Diff highlighting** — see exactly what changed (red strikethrough / gold additions)
- **Free forever** — no API keys, no accounts, no subscriptions

## How It Works

HappyText uses a hybrid AI approach — both backends are free:

| Feature | Primary | Fallback |
|---|---|---|
| Proofread | LanguageTool public API (free) | Chrome Built-in AI |
| Rewrite | Chrome Built-in AI (local Gemini Nano) | LanguageTool corrections |

No data is stored. No accounts required.

## Install

### Chrome Web Store
Coming soon.

### Developer Mode
1. Clone this repo
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder
5. The smiley icon appears in your extensions bar

## Usage

1. Highlight text on any webpage
2. Click the yellow **smiley button** that appears, or press **`Alt+Shift+H`**, or right-click
3. Choose **Proofread** or **Rewrite**
4. Click **Replace** or **Copy**

## Shortcuts

| Shortcut | Action |
|---|---|
| `Alt+Shift+H` | Trigger HappyText on selected text |
| Right-click | Context menu with Proofread / Rewrite options |
| `Esc` | Dismiss the panel |

## Tech Stack

- Chrome Extension (Manifest V3)
- LanguageTool public API (proofreading)
- Chrome Built-in AI / Prompt API (rewriting)
- Shadow DOM for style isolation
- Dark glassmorphism UI with Inter font

## License

MIT
