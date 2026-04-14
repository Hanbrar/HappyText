import json
import os

CONFIG_DIR = os.path.join(os.path.expanduser("~"), ".cleanwriteai")
CONFIG_PATH = os.path.join(CONFIG_DIR, "config.json")


def load_config() -> dict:
    if not os.path.exists(CONFIG_PATH):
        return {}
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_config(config: dict):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)


def get_api_key() -> str | None:
    return load_config().get("api_key")


def set_api_key(key: str):
    config = load_config()
    config["api_key"] = key.strip()
    save_config(config)
