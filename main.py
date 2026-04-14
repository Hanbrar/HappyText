"""
CleanWriteAI — entry point
Registers global hotkey Ctrl+D and runs the system tray icon.

Hotkey conflict reference:
  Ctrl+Alt+Space  — SuperFlow AI (voice dictation) — DO NOT USE
  Alt+Space       — Windows system menu            — avoided
  Ctrl+D          — CleanWriteAI                   — assigned
"""
import os
import threading

import keyboard
import pystray
from PIL import Image, ImageDraw

from clipboard_utils import get_selected_text
from config import is_first_launch, mark_launched
import popup


# ---------------------------------------------------------------------------
# System tray icon
# ---------------------------------------------------------------------------

def _make_icon_image() -> Image.Image:
    assets_ico = os.path.join(os.path.dirname(__file__), "assets", "icon.ico")
    if os.path.exists(assets_ico):
        return Image.open(assets_ico).convert("RGBA")

    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([4, 4, 60, 60], fill=(52, 120, 246))
    draw.text((16, 20), "CW", fill="white")
    return img


def _on_quit(icon, _item):
    icon.stop()
    keyboard.unhook_all()
    os._exit(0)


def _build_tray() -> pystray.Icon:
    menu = pystray.Menu(
        pystray.MenuItem("CleanWriteAI — Ctrl+D", None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit", _on_quit),
    )
    return pystray.Icon("CleanWriteAI", _make_icon_image(), "CleanWriteAI", menu)


# ---------------------------------------------------------------------------
# Hotkey handler
# ---------------------------------------------------------------------------

_popup_lock = threading.Lock()


def _on_hotkey():
    """Triggered on Ctrl+D — grabs selected text and shows popup."""
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
# First-launch notice
# ---------------------------------------------------------------------------

def _show_first_launch_notice():
    import tkinter as tk
    from tkinter import messagebox
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    messagebox.showinfo(
        "Welcome to CleanWriteAI",
        "CleanWriteAI is now running in your system tray.\n\n"
        "Highlight any text and press Ctrl+D to open the popup.\n\n"
        "Note: The first time you use Proofread or Rewrite, the AI model\n"
        "will download (~300 MB). This only happens once.",
        parent=root,
    )
    root.destroy()
    mark_launched()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if is_first_launch():
        threading.Thread(target=_show_first_launch_notice, daemon=True).start()

    keyboard.add_hotkey(
        "ctrl+d",
        lambda: threading.Thread(target=_on_hotkey, daemon=True).start(),
    )

    print("CleanWriteAI running. Press Ctrl+D over selected text.")
    print("Right-click the system tray icon to quit.")

    tray = _build_tray()
    tray.run()


if __name__ == "__main__":
    main()
