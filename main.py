"""
CleanWriteAI — entry point
Registers the global hotkey and runs the system tray icon.
"""
import os
import sys
import threading
import tkinter as tk
from tkinter import simpledialog, messagebox

import keyboard
import pystray
from PIL import Image, ImageDraw

from clipboard_utils import get_selected_text
from config import get_api_key, set_api_key
import popup


# ---------------------------------------------------------------------------
# System tray icon
# ---------------------------------------------------------------------------

def _make_icon_image() -> Image.Image:
    """Create a simple coloured icon if no .ico asset is present."""
    assets_ico = os.path.join(os.path.dirname(__file__), "assets", "icon.ico")
    if os.path.exists(assets_ico):
        return Image.open(assets_ico).convert("RGBA")

    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([4, 4, 60, 60], fill=(52, 120, 246))
    draw.text((18, 18), "CW", fill="white")
    return img


def _on_quit(icon, _item):
    icon.stop()
    keyboard.unhook_all()
    os._exit(0)


def _on_set_key(icon, _item):
    # Run on main thread via a tiny Tk root
    def ask():
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        key = simpledialog.askstring(
            "API Key",
            "Paste your Anthropic API key:",
            parent=root,
        )
        root.destroy()
        if key:
            set_api_key(key)
            messagebox.showinfo("CleanWriteAI", "API key saved.")

    threading.Thread(target=ask, daemon=True).start()


def _build_tray() -> pystray.Icon:
    menu = pystray.Menu(
        pystray.MenuItem("Set API Key", _on_set_key),
        pystray.MenuItem("Quit CleanWriteAI", _on_quit),
    )
    icon = pystray.Icon("CleanWriteAI", _make_icon_image(), "CleanWriteAI", menu)
    return icon


# ---------------------------------------------------------------------------
# Hotkey handler
# ---------------------------------------------------------------------------

_popup_lock = threading.Lock()


def _on_hotkey():
    """Triggered on Alt+Space — grabs selected text and shows popup."""
    if not _popup_lock.acquire(blocking=False):
        return  # popup already open
    try:
        text = get_selected_text()
        if not text or not text.strip():
            return
        popup.show_popup(text)  # blocks until window closed
    finally:
        _popup_lock.release()


# ---------------------------------------------------------------------------
# First-launch API key setup
# ---------------------------------------------------------------------------

def _prompt_for_key_if_missing():
    if get_api_key():
        return
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    messagebox.showinfo(
        "Welcome to CleanWriteAI",
        "To get started, you need a free Anthropic API key.\n\n"
        "1. Go to console.anthropic.com\n"
        "2. Create an account and copy your key\n"
        "3. Paste it in the next dialog",
        parent=root,
    )
    key = simpledialog.askstring(
        "API Key Setup",
        "Paste your Anthropic API key:",
        parent=root,
    )
    root.destroy()
    if key:
        set_api_key(key)
    else:
        messagebox.showwarning(
            "No Key Set",
            "You can add your key later via the system tray icon.",
        )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    _prompt_for_key_if_missing()

    # Register global hotkey
    keyboard.add_hotkey("alt+space", lambda: threading.Thread(
        target=_on_hotkey, daemon=True
    ).start())

    print("CleanWriteAI running. Press Alt+Space over selected text.")
    print("Right-click the system tray icon to set API key or quit.")

    tray = _build_tray()
    tray.run()  # blocks — handles SIGINT / tray quit


if __name__ == "__main__":
    main()
