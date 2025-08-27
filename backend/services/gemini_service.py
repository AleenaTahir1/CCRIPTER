import os
from pathlib import Path

import google.generativeai as genai

SYSTEM_PROMPT_PATH = Path(__file__).resolve().parents[1] / "SYSTEM_PROMPT.txt"


def read_system_prompt() -> str:
    try:
        return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")
    except Exception:
        return "You are a helpful assistant."


# Cache singleton model
_model = None

def _get_model():
    global _model
    if _model is None:
        api_key = os.getenv("GEMINI_API_KEY")
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel(model_name)
    return _model

def warmup() -> None:
    try:
        _get_model()
    except Exception:
        pass


async def generate_reply(system_prompt: str, history_text: str, query: str) -> str:
    import anyio

    model = _get_model()

    prompt = (
        f"{system_prompt}\n\n"
        f"Conversation so far:\n{history_text}\n\n"
        f"User: {query}\n"
        f"Assistant:"
    )

    def _call():
        return model.generate_content(prompt)

    resp = await anyio.to_thread.run_sync(_call)
    return (getattr(resp, "text", "") or "").strip()
