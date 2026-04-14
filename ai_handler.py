"""
Local AI inference via Hugging Face Transformers.
Models are downloaded once on first use and cached locally by HF.
"""
import threading
from transformers import pipeline

# Model identifiers
MODEL_GRAMMAR = "pszemraj/flan-t5-large-grammar-synthesis"
MODEL_PARAPHRASE = "Vamsi/T5_Paraphrase_Paws"

# Lazy-loaded pipelines — initialized on first use
_grammar_pipe = None
_paraphrase_pipe = None
_lock = threading.Lock()


def _get_grammar_pipe():
    global _grammar_pipe
    if _grammar_pipe is None:
        with _lock:
            if _grammar_pipe is None:
                _grammar_pipe = pipeline(
                    "text2text-generation",
                    model=MODEL_GRAMMAR,
                )
    return _grammar_pipe


def _get_paraphrase_pipe():
    global _paraphrase_pipe
    if _paraphrase_pipe is None:
        with _lock:
            if _paraphrase_pipe is None:
                _paraphrase_pipe = pipeline(
                    "text2text-generation",
                    model=MODEL_PARAPHRASE,
                )
    return _paraphrase_pipe


def proofread(text: str) -> str:
    """Fix grammar, spelling, and punctuation using a local T5 model."""
    pipe = _get_grammar_pipe()
    prompt = f"Fix grammar: {text}"
    result = pipe(prompt, max_length=512, num_beams=4, early_stopping=True)
    return result[0]["generated_text"].strip()


def rewrite(text: str) -> str:
    """Rephrase text for clarity using a local T5 paraphrase model."""
    pipe = _get_paraphrase_pipe()
    prompt = f"paraphrase: {text} </s>"
    result = pipe(prompt, max_length=512, num_beams=4, early_stopping=True)
    return result[0]["generated_text"].strip()
