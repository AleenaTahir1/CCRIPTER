from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import StreamingResponse, Response
import base64
import asyncio
import json
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..db import crud
from ..schemas import ChatRequest, ChatResponse, TranscribeResponse, SpeakRequest, MessageOut, VoiceChatResponse
from ..services import whisper_service, piper_service, gemini_service

router = APIRouter()

@router.get("/health")
def health():
    return {
        "status": "ok",
        "services": {
            "db": "ok",
            "whisper": "lazy-load on first use",
            "piper": "requires PIPER_PATH and PIPER_VOICE",
            "gemini": "requires GEMINI_API_KEY",
        },
    }

@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        text = await whisper_service.transcribe_uploadfile(file)
        return TranscribeResponse(text=text)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Transcription failed: {e}")

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    # Load recent history for context (simple last N messages)
    history = crud.get_recent_history(db, user_id=req.user_id, limit=10)
    history_text = "\n".join([f"User: {m.query}\nAssistant: {m.response}" for m in history])

    try:
        system_prompt = gemini_service.read_system_prompt()
        reply = await gemini_service.generate_reply(system_prompt, history_text, req.query)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM error: {e}")

    # Persist
    message = crud.create_message(db, user_id=req.user_id, query=req.query, response=reply)

    return ChatResponse(
        message_id=message.id,
        user_id=message.user_id,
        timestamp=message.timestamp,
        query=message.query,
        response=message.response,
    )

@router.post(
    "/speak",
    responses={
        200: {
            "content": {"audio/wav": {"schema": {"type": "string", "format": "binary"}}},
            "description": "Returns synthesized speech as a WAV file",
        }
    },
)
async def speak(req: SpeakRequest):
    try:
        audio_bytes = await piper_service.synthesize(req.text)
        # Return full response with content-length for better playback reliability
        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={
                "Content-Length": str(len(audio_bytes)),
                "Content-Disposition": "attachment; filename=\"speech.wav\"",
                "Cache-Control": "no-store",
                # Expose disposition so browsers/frontends can read filename if needed
                "Access-Control-Expose-Headers": "Content-Disposition, Content-Length",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"TTS failed: {e}")

@router.get("/messages", response_model=List[MessageOut])
async def list_messages(user_id: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    msgs = crud.list_messages(db, user_id=user_id, limit=limit)
    return [
        MessageOut(
            id=m.id,
            user_id=m.user_id,
            timestamp=m.timestamp,
            query=m.query,
            response=m.response,
        ) for m in msgs
    ]


@router.post("/voice-chat", response_model=VoiceChatResponse)
async def voice_chat(
    file: UploadFile = File(...),
    user_id: Optional[str] = "demo",
    format: Optional[str] = "json",
    db: Session = Depends(get_db),
):
    # 1) STT: transcribe uploaded audio to text
    try:
        transcript = await whisper_service.transcribe_uploadfile(file)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Transcription failed: {e}")

    # 2) LLM: generate reply using recent history + system prompt
    history = crud.get_recent_history(db, user_id=user_id, limit=10)
    history_text = "\n".join([f"User: {m.query}\nAssistant: {m.response}" for m in history])
    try:
        system_prompt = gemini_service.read_system_prompt()
        reply = await gemini_service.generate_reply(system_prompt, history_text, transcript)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM error: {e}")

    # 3) Persist this interaction
    message = crud.create_message(db, user_id=user_id or "demo", query=transcript, response=reply)

    # 4) TTS: synthesize the reply to WAV
    try:
        audio_bytes = await piper_service.synthesize(reply)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"TTS failed: {e}")

    # Binary mode: return audio WAV directly with helpful headers
    if (format or "").lower() == "binary":
        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={
                "Content-Length": str(len(audio_bytes)),
                "Content-Disposition": "inline; filename=\"voice_chat.wav\"",
                "Cache-Control": "no-store",
                # Surface related metadata (short strings recommended)
                "X-Transcript": transcript[:512],
                "X-Text": reply[:2048],
                "X-Message-Id": str(message.id),
                "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, X-Transcript, X-Text, X-Message-Id",
            },
        )

    # Default: JSON payload with base64 audio
    audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
    return VoiceChatResponse(
        message_id=message.id,
        user_id=message.user_id,
        timestamp=message.timestamp,
        transcript=transcript,
        response=reply,
        audio_b64=audio_b64,
        audio_mime="audio/wav",
    )


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest, db: Session = Depends(get_db)):
    """Stream LLM reply over SSE (simulated typing)."""
    # Prepare context
    history = crud.get_recent_history(db, user_id=req.user_id, limit=10)
    history_text = "\n".join([f"User: {m.query}\nAssistant: {m.response}" for m in history])

    # Get full reply first (we'll stream it in chunks to mimic typing)
    try:
        system_prompt = gemini_service.read_system_prompt()
        reply = await gemini_service.generate_reply(system_prompt, history_text, req.query)
    except Exception as e:
        # Send an SSE error as a single event
        async def err_gen():
            yield f"data: {json.dumps({'type':'error','message': str(e)})}\n\n"
        return StreamingResponse(err_gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})

    # Persist
    message = crud.create_message(db, user_id=req.user_id, query=req.query, response=reply)

    # Chunk reply into small pieces
    def chunks(s: str, n: int = 40):
        for i in range(0, len(s), n):
            yield s[i:i+n]

    async def event_gen():
        # Start event with metadata
        start_evt = {"type": "start", "message_id": message.id, "user_id": message.user_id}
        yield f"data: {json.dumps(start_evt)}\n\n"

        for part in chunks(reply, 40):
            yield f"data: {json.dumps({'type':'delta','text': part})}\n\n"
            await asyncio.sleep(0.03)

        # Final event with full text
        end_evt = {"type": "end", "text": reply}
        yield f"data: {json.dumps(end_evt)}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})
