# CleanWriteAI

A lightweight Windows desktop app that lets you highlight text anywhere on your screen, press **Ctrl+D**, and instantly get AI-powered proofreading or rewriting in a small floating popup — no copy-pasting, no switching apps, no API key.

Think: Apple Intelligence Writing Tools, but for Windows, completely free, and system-wide.

---

## Features

- **Global hotkey** (`Ctrl+D`) — works in any app
- **Proofread** — fix grammar, spelling, and punctuation
- **Rewrite** — rephrase for clarity and flow
- **Replace** the original text in-place, or **Copy** result to clipboard
- **System tray** — runs quietly in the background
- **Fully local AI** — no API key, no account, no internet after first launch

## How It Works

AI runs entirely on your device using Hugging Face Transformers. Models download once on first use (~300 MB) and are cached locally. No data ever leaves your machine.

| Feature | Model |
|---|---|
| Proofread | `pszemraj/flan-t5-large-grammar-synthesis` |
| Rewrite | `Vamsi/T5_Paraphrase_Paws` |

## Setup

1. Download `CleanWriteAI.exe` from Releases
2. Run it
3. Highlight any text → press `Ctrl+D` → done
4. First use downloads the AI model (one-time, ~300 MB)

## Build from Source

```bash
pip install -r requirements.txt
build.bat
```

Output: `dist/CleanWriteAI.exe`

## Hotkey Reference

| Hotkey | App | Status |
|---|---|---|
| `Ctrl+D` | CleanWriteAI | ✅ Assigned |
| `Ctrl+Alt+Space` | SuperFlow AI (voice dictation) | ❌ Reserved |
| `Alt+Space` | Windows system menu | ⚠️ Avoided |

## Tech Stack

- Python 3.11+, customtkinter UI
- Hugging Face Transformers (local inference)
- keyboard, pyperclip, pystray, pyautogui

## License

MIT
