import time
import pyperclip
import keyboard


def get_selected_text() -> str:
    """Grab currently selected text from any app via Ctrl+C simulation."""
    old_clipboard = pyperclip.paste()
    pyperclip.copy("")  # clear so we can detect if copy succeeded
    keyboard.send("ctrl+c")
    time.sleep(0.15)  # wait for clipboard to update
    text = pyperclip.paste()
    pyperclip.copy(old_clipboard)  # restore previous clipboard
    return text


def replace_selected_text(new_text: str):
    """Replace currently selected text by writing to clipboard and pasting."""
    pyperclip.copy(new_text)
    time.sleep(0.05)
    keyboard.send("ctrl+v")
