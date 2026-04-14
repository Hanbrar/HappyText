# CleanWriteAI

A lightweight Windows desktop app that lets you highlight text anywhere on your screen, hit **Alt + Space**, and instantly get AI-powered proofreading or rewriting in a small floating popup — no copy-pasting, no switching apps.

Think: Apple Intelligence Writing Tools, but for Windows, free, and system-wide.

---

## Features

- **Global hotkey** (`Alt + Space`) — works in any app
- **Proofread** — fix grammar, spelling, and punctuation
- **Rewrite** — rephrase for clarity and flow
- **Replace** the original text in-place, or **Copy** result to clipboard
- **System tray** — runs quietly in the background
- First-launch API key setup wizard

## Setup

1. Download `CleanWriteAI.exe` from Releases
2. Run it — enter your Anthropic API key on first launch
3. Highlight any text → press `Alt + Space` → done

**Get a free API key at [console.anthropic.com](https://console.anthropic.com)**

## Build from Source

```bash
pip install -r requirements.txt
build.bat
```

Output: `dist/CleanWriteAI.exe`

## Tech Stack

- Python 3.11+, customtkinter UI
- Anthropic Claude Haiku (fast + cheap)
- keyboard, pyperclip, pystray, pyautogui

## License

MIT
