# CCRIPTER — Voice + Chat AI Assistant

My project is a full‑stack, voice-enabled chatbot. I transcribe audio (STT), generate responses (LLM), and synthesize voice (TTS) in a sleek React UI.

Backend: FastAPI + SQLite + Gemini + Piper + Whisper.  
Frontend: React (CRA) + Chakra UI.

---

## Features
- __Text + Voice chat__: send text or record voice and receive spoken replies.
- __Streaming replies__: smooth typing effect via SSE endpoint.
- __Persistent history__: messages saved to SQLite.
- __Context aware__: last 10 messages are used for better answers.
- __Theme aware UI__: premium, minimalist light/dark design.

---

## Tech Stack
- __Backend__: FastAPI, SQLAlchemy, SQLite
- __LLM__: Google Gemini (`gemini-1.5-flash` )
- __STT__: faster-whisper
- __TTS__: Piper
- __Frontend__: React 18, Chakra UI

---

## Project Structure
```
CCRIPT-Chatbot/
├─ backend/
│  ├─ main.py                # FastAPI app entry
│  ├─ routes/api.py          # REST API + SSE endpoints
│  ├─ services/              # STT (whisper), LLM (gemini), TTS (piper)
│  └─ db/                    # models, CRUD, session
├─ frotend/                  # React app (Create React App)
├─ piper/                    # Piper binaries & espeak-ng-data (Windows)
├─ en/                       # Example Piper voice (onnx + json)
├─ database/app.db           # SQLite DB (auto-created)
└─ requirements.txt
```

---

## Prerequisites (Windows)
- __Python__: 3.10+ recommended
- __Node.js__: 18+ (includes npm)
- __Piper__: bundled in `piper/` (set env vars below)
- Optional: __ffmpeg__ for broader audio compatibility

---

## Backend Setup
1) __Create and activate venv__
```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

2) __Install dependencies__
```powershell
pip install -r requirements.txt
```

3) __Environment variables__ (create `.env` in project root):
```env
# LLM
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# STT (faster-whisper)
FASTER_WHISPER_MODEL=tiny
FASTER_WHISPER_DEVICE=cpu
FASTER_WHISPER_COMPUTE=int8

# TTS (Piper)
# Paths can be absolute or relative to repo root
PIPER_PATH=piper/piper.exe
PIPER_VOICE=en/en_US-amy-medium.onnx
```

4) __Run API server__
```powershell
uvicorn backend.main:app --reload
```
- Swagger UI: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

---

## Frontend Setup
1) __Install dependencies__
```powershell
cd frotend
npm install
```

2) __Frontend environment__ (`frotend/.env`)
```env
REACT_APP_API_BASE=http://127.0.0.1:8000
```

3) __Run dev server__
```powershell
npm start
```
- App: http://localhost:3000

Open two terminals: one for the backend (port 8000) and one for the frontend (port 3000).

---

## Core Endpoints (backend/routes/api.py)
- __GET__ `/health` – service readiness
- __POST__ `/transcribe` – form-data audio → text
- __POST__ `/chat` – text chat (non-streaming)
- __POST__ `/chat/stream` – SSE streaming responses
- __POST__ `/voice-chat` – upload audio → JSON with base64 WAV or binary WAV
- __POST__ `/speak` – text → WAV audio
- __GET__ `/messages` – list stored messages

Context window: last __10__ messages per user are used for LLM context.

---

## Quick Start (TL;DR)
```powershell
# Terminal A (backend)
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
echo GEMINI_API_KEY=... > .env   # or create .env file and paste content from above
uvicorn backend.main:app --reload

# Terminal B (frontend)
cd frotend
npm install
echo REACT_APP_API_BASE=http://127.0.0.1:8000 > .env
npm start
```

---

## Troubleshooting
- __Piper errors / silent audio__:
  - Ensure `PIPER_PATH` points to `piper/piper.exe` and `PIPER_VOICE` to `en/en_US-amy-medium.onnx`.
  - The `.onnx.json` companion file should be next to the voice model.
  - On Windows, running Piper from its own directory helps DLL discovery (we do this in code).
- __Gemini errors__: confirm `GEMINI_API_KEY` is set and valid.
- __No audio playback__: check browser Autoplay/Media settings and that responses include WAV with correct `Content-Length`.
- __Build issues__: Node 18+ and a clean `npm install` in `frotend/` usually fixes CRA-related errors.

---
