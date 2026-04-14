import threading
import tkinter as tk
import pyperclip
import pyautogui
import customtkinter as ctk

import ai_handler
from clipboard_utils import replace_selected_text

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

POPUP_WIDTH = 420
POPUP_HEIGHT = 300
PREVIEW_MAX = 120


def _truncate(text: str, max_len: int = PREVIEW_MAX) -> str:
    return text if len(text) <= max_len else text[:max_len].rstrip() + "…"


class PopupWindow:
    def __init__(self, original_text: str):
        self.original_text = original_text
        self.result_text = ""

        self.root = ctk.CTk()
        self.root.title("CleanWriteAI")
        self.root.geometry(f"{POPUP_WIDTH}x{POPUP_HEIGHT}")
        self.root.resizable(False, False)
        self.root.attributes("-topmost", True)
        self.root.protocol("WM_DELETE_WINDOW", self._close)

        self._position_near_cursor()
        self._build_ui()

    def _position_near_cursor(self):
        x, y = pyautogui.position()
        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()
        px = min(x + 20, screen_w - POPUP_WIDTH - 10)
        py = min(y + 20, screen_h - POPUP_HEIGHT - 10)
        self.root.geometry(f"{POPUP_WIDTH}x{POPUP_HEIGHT}+{px}+{py}")

    def _build_ui(self):
        # Header
        ctk.CTkLabel(
            self.root,
            text="CleanWriteAI",
            font=ctk.CTkFont(size=16, weight="bold"),
        ).pack(pady=(12, 4))

        # Original text preview
        preview_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        preview_frame.pack(fill="x", padx=14, pady=(0, 6))
        ctk.CTkLabel(
            preview_frame,
            text="Selected:",
            font=ctk.CTkFont(size=11),
            text_color="gray",
            anchor="w",
        ).pack(anchor="w")
        ctk.CTkLabel(
            preview_frame,
            text=_truncate(self.original_text),
            font=ctk.CTkFont(size=12),
            wraplength=390,
            justify="left",
            anchor="w",
        ).pack(anchor="w")

        # Action buttons
        btn_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        btn_frame.pack(pady=6)
        for label, action in [("Proofread", "proofread"), ("Rewrite", "rewrite")]:
            ctk.CTkButton(
                btn_frame,
                text=label,
                width=120,
                command=lambda a=action: self._run_action(a),
            ).pack(side="left", padx=6)

        # Result area
        result_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        result_frame.pack(fill="x", padx=14, pady=(4, 4))
        ctk.CTkLabel(
            result_frame,
            text="Result:",
            font=ctk.CTkFont(size=11),
            text_color="gray",
            anchor="w",
        ).pack(anchor="w")
        self.result_box = ctk.CTkTextbox(
            result_frame,
            height=75,
            font=ctk.CTkFont(size=12),
            wrap="word",
            state="disabled",
        )
        self.result_box.pack(fill="x")

        # Status label
        self.status_label = ctk.CTkLabel(
            self.root,
            text="",
            font=ctk.CTkFont(size=11),
            text_color="gray",
        )
        self.status_label.pack(pady=(0, 4))

        # Bottom buttons
        bottom_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        bottom_frame.pack(pady=(0, 10))
        self.replace_btn = ctk.CTkButton(
            bottom_frame,
            text="Replace",
            width=110,
            state="disabled",
            command=self._replace,
        )
        self.replace_btn.pack(side="left", padx=6)
        self.copy_btn = ctk.CTkButton(
            bottom_frame,
            text="Copy",
            width=110,
            state="disabled",
            fg_color="gray30",
            hover_color="gray40",
            command=self._copy,
        )
        self.copy_btn.pack(side="left", padx=6)
        ctk.CTkButton(
            bottom_frame,
            text="Close",
            width=80,
            fg_color="transparent",
            border_width=1,
            text_color="gray",
            command=self._close,
        ).pack(side="left", padx=6)

    def _run_action(self, action: str):
        self._set_status("Running… (first use downloads model ~300MB)")
        self._set_result("")
        self.replace_btn.configure(state="disabled")
        self.copy_btn.configure(state="disabled")

        def worker():
            try:
                if action == "proofread":
                    result = ai_handler.proofread(self.original_text)
                else:
                    result = ai_handler.rewrite(self.original_text)
                self.result_text = result
                self.root.after(0, lambda: self._on_result(result))
            except Exception as e:
                self.root.after(0, lambda: self._on_error(str(e)))

        threading.Thread(target=worker, daemon=True).start()

    def _on_result(self, result: str):
        self._set_result(result)
        self._set_status("")
        self.replace_btn.configure(state="normal")
        self.copy_btn.configure(state="normal")

    def _on_error(self, msg: str):
        self._set_status(f"Error: {msg}")

    def _set_result(self, text: str):
        self.result_box.configure(state="normal")
        self.result_box.delete("1.0", "end")
        if text:
            self.result_box.insert("1.0", text)
        self.result_box.configure(state="disabled")

    def _set_status(self, msg: str):
        self.status_label.configure(text=msg)

    def _replace(self):
        if self.result_text:
            self._close()
            replace_selected_text(self.result_text)

    def _copy(self):
        if self.result_text:
            pyperclip.copy(self.result_text)
            self._set_status("Copied to clipboard.")

    def _close(self):
        self.root.destroy()

    def show(self):
        self.root.mainloop()


def show_popup(original_text: str):
    PopupWindow(original_text).show()
