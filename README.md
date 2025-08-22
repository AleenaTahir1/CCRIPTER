# CCRIPT Chatbot Backend (MVP)

Backend service for voice-enabled AI chatbot: Whisper (STT) → FastAPI → Gemini (LLM) + SQLite → Piper (TTS).

## Quick Start (Windows)

1. Create venv and install deps
```
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2. Configure environment
- Copy `backend/.env.example` to `.env` at project root or set env vars in your shell.
- Required:
  - `GEMINI_API_KEY` (for chat)
  - Optional: `GEMINI_MODEL` (default `gemini-1.5-flash`)
  - For STT: install `ffmpeg` and set `FASTER_WHISPER_MODEL` (default `tiny`)
  - For TTS (Piper): set `PIPER_PATH` and `PIPER_VOICE`

3. Install prerequisites
- ffmpeg: https://www.gyan.dev/ffmpeg/builds/
- Piper binary: https://github.com/rhasspy/piper/releases
- Piper voice (e.g., en_US-amy-medium.onnx): https://github.com/rhasspy/piper#voice-samples

4. Run API
```
uvicorn backend.main:app --reload
```

5. Test via Swagger UI
- Open http://127.0.0.1:8000/docs
- Endpoints:
  - GET `/health`
  - POST `/transcribe` (upload audio file)
  - POST `/chat` (send text)
  - POST `/speak` (receive WAV audio)
  - GET `/messages`

## Project Structure
```
CCRIPT-Chatbot/
├─ backend/
│  ├─ main.py
│  ├─ SYSTEM_PROMPT.txt
│  ├─ routes/
│  │  └─ api.py
│  ├─ services/
│  │  ├─ whisper_service.py
│  │  ├─ piper_service.py
│  │  └─ gemini_service.py
│  └─ db/
│     ├─ database.py
│     ├─ models.py
│     └─ crud.py
├─ database/ (created automatically on first run)
├─ requirements.txt
└─ README.md
```

## Notes
- SQLite DB is created at `database/app.db`.
- Models load lazily to reduce startup time; first call may take longer.
- For full local-only operation, replace Gemini with a local LLM (e.g., Ollama) in `services/gemini_service.py` in the future.
