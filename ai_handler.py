import anthropic
from config import get_api_key

MODEL = "claude-haiku-4-5-20251001"


def _client() -> anthropic.Anthropic:
    key = get_api_key()
    if not key:
        raise ValueError("No API key configured.")
    return anthropic.Anthropic(api_key=key)


def _call(prompt: str, text: str) -> str:
    client = _client()
    msg = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system="You are a writing assistant. Return only the requested output — no explanation, no preamble, no quotes.",
        messages=[{"role": "user", "content": f"{prompt}\n\n{text}"}],
    )
    return msg.content[0].text.strip()


def proofread(text: str) -> str:
    return _call(
        "Proofread the following text. Fix grammar, spelling, and punctuation. Return only the corrected text:",
        text,
    )


def rewrite(text: str) -> str:
    return _call(
        "Rewrite the following text for clarity and flow. Keep the meaning. Return only the rewritten text:",
        text,
    )


def tone(text: str, style: str) -> str:
    styles = {
        "professional": "formal and professional",
        "casual": "friendly and conversational",
        "concise": "brief and to the point",
    }
    descriptor = styles.get(style.lower(), style)
    return _call(
        f"Rewrite the following text in a {descriptor} tone. Return only the rewritten text:",
        text,
    )
