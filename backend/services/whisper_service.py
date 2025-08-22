import os
import tempfile
from typing import Optional

from fastapi import UploadFile

# We import faster_whisper lazily inside function to avoid heavy import on startup

DEFAULT_MODEL = os.getenv("FASTER_WHISPER_MODEL", "tiny")  # e.g., tiny, tiny.en, small
DEVICE = os.getenv("FASTER_WHISPER_DEVICE", "cpu")         # cpu or cuda (if CUDA build is available)
COMPUTE = os.getenv("FASTER_WHISPER_COMPUTE", "int8")      # int8 (cpu), float16 (cuda), etc.

# Global singleton
_model = None  # type: ignore[var-annotated]

def _get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(DEFAULT_MODEL, device=DEVICE, compute_type=COMPUTE)
    return _model

def warmup() -> None:
    """Optionally preload the model to avoid first-request latency."""
    try:
        _get_model()
    except Exception:
        # Fail-soft: do not crash app on warmup failure
        pass


async def transcribe_uploadfile(file: UploadFile) -> str:
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        # Save uploaded file to a temporary path
        suffix = os.path.splitext(file.filename or "audio.wav")[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        # Run CPU-friendly transcription
        text = await _transcribe_path(tmp_path)
        try:
            os.remove(tmp_path)
        except Exception:
            pass
        return text
    except Exception as e:
        raise RuntimeError(str(e))


async def _transcribe_path(audio_path: str) -> str:
    model = _get_model()
    # Favor speed: small beam, no best-of search
    segments, info = model.transcribe(
        audio_path,
        beam_size=1,
        best_of=1,
    )
    text = " ".join([seg.text for seg in segments]).strip()
    return text or ""
