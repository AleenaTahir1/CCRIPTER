from typing import List, Optional
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import StreamingResponse, Response
import base64
import asyncio
import json
import re
import os
import uuid
import logging
from pathlib import Path

from ..db.repo import get_repo
from ..security import get_current_user
from ..schemas import (
    ChatRequest,
    ChatResponse,
    TranscribeResponse,
    SpeakRequest,
    MessageOut,
    VoiceChatResponse,
    ChatCreate,
    ChatOut,
    DocumentOut,
    DocumentUploadResponse,
    DocumentChatRequest,
    DocumentListResponse,
)
from ..services import whisper_service, piper_service, gemini_service
from ..services.file_processing_service import FileProcessingService

router = APIRouter()

def generate_smart_title(message: str) -> str:
    """Generate smart chat title from user message using stop word filtering."""
    print(f"[DEBUG] Generating smart title for message: '{message}'")  # Debug log
    
    # Stop words to filter out
    stop_words = {
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'could',
        'should', 'can', 'may', 'might', 'do', 'does', 'did', 'am', 'be', 'been',
        'being', 'a', 'an', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
        'mine', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers',
        'it', 'its', 'we', 'us', 'our', 'ours', 'they', 'them', 'their', 'theirs'
    }
    
    # Clean and split the message
    words = re.findall(r'\b\w+\b', message.lower())
    print(f"[DEBUG] Extracted words: {words}")  # Debug log
    
    # Filter out stop words and short words
    meaningful_words = [
        word for word in words 
        if len(word) > 2 and word not in stop_words
    ]
    print(f"[DEBUG] Meaningful words: {meaningful_words}")  # Debug log
    
    # Get 2-3 meaningful words for title
    if len(meaningful_words) >= 3:
        title_words = meaningful_words[:3]
    elif len(meaningful_words) >= 2:
        title_words = meaningful_words[:2]
    elif meaningful_words:
        title_words = meaningful_words[:1]
    else:
        # Fallback: use first 2-3 words regardless of stop words
        all_words = re.findall(r'\b\w+\b', message)
        title_words = all_words[:min(3, len(all_words))]
    
    if not title_words:
        result = "New Chat"
    else:
        # Capitalize first letter of each word and join
        result = ' '.join(word.capitalize() for word in title_words)
    
    print(f"[DEBUG] Generated title: '{result}'")  # Debug log
    return result

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

@router.get("/debug/documents")
async def debug_documents(current_user = Depends(get_current_user), repo = Depends(get_repo)):
    """Debug endpoint to check document content and extraction"""
    try:
        user_id = str(current_user.id)
        documents = await repo.list_documents(user_id=user_id, limit=10)
        
        debug_info = []
        for doc in documents:
            debug_info.append({
                "id": doc.id,
                "filename": doc.filename,
                "file_type": doc.file_type,
                "upload_date": doc.upload_date.isoformat(),
                "extracted_text_length": len(doc.extracted_text) if doc.extracted_text else 0,
                "extracted_text_preview": doc.extracted_text[:200] + "..." if doc.extracted_text and len(doc.extracted_text) > 200 else doc.extracted_text,
                "has_extracted_text": bool(doc.extracted_text)
            })
        
        return {
            "user_id": user_id,
            "document_count": len(documents),
            "documents": debug_info
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
@router.get("/debug/upload")
async def debug_upload_setup(current_user = Depends(get_current_user), repo = Depends(get_repo)):
    """Debug endpoint to check upload setup"""
    try:
        # Check if we can access the user
        user_info = {"user_id": current_user.id, "email": current_user.email}
        
        # Check if FileProcessingService works
        fs_status = {
            "supported_extensions": list(FileProcessingService.SUPPORTED_EXTENSIONS.keys()),
            "max_file_size_mb": FileProcessingService.MAX_FILE_SIZE // (1024*1024)
        }
        
        # Check if uploads directory can be created
        upload_dir = Path("uploads") / str(current_user.id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        directory_status = {"upload_dir": str(upload_dir), "exists": upload_dir.exists()}
        
        # Test database connection
        try:
            # Try to list documents (this will test MongoDB connection)
            docs = await repo.list_documents(user_id=str(current_user.id), limit=1)
            db_status = {"connection": "ok", "documents_count": len(docs)}
        except Exception as e:
            db_status = {"connection": "failed", "error": str(e)}
        
        return {
            "user": user_info,
            "file_service": fs_status,
            "directory": directory_status,
            "database": db_status,
            "status": "ready_for_upload"
        }
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@router.post("/debug/chat-context")
async def debug_chat_context(
    req: DocumentChatRequest,
    repo = Depends(get_repo),
    current_user = Depends(get_current_user)
):
    """Debug endpoint to check what context is being sent for document chat"""
    try:
        user_id = str(current_user.id)
        
        # Get document context if document IDs provided
        document_context = ""
        selected_documents = []
        
        if req.document_ids:
            documents = await repo.get_documents_by_ids(
                document_ids=req.document_ids,
                user_id=user_id
            )
            
            if documents:
                doc_texts = []
                for doc in documents:
                    selected_documents.append({
                        "id": doc.id,
                        "filename": doc.filename,
                        "has_text": bool(doc.extracted_text),
                        "text_length": len(doc.extracted_text) if doc.extracted_text else 0,
                        "text_preview": doc.extracted_text[:200] + "..." if doc.extracted_text and len(doc.extracted_text) > 200 else doc.extracted_text
                    })
                    
                    if doc.extracted_text:
                        doc_texts.append(f"Document: {doc.filename}\n{doc.extracted_text}")
                
                if doc_texts:
                    document_context = "\n\n--- DOCUMENT CONTEXT ---\n" + "\n\n".join(doc_texts) + "\n--- END CONTEXT ---\n\n"
        
        return {
            "user_id": user_id,
            "requested_document_ids": req.document_ids,
            "found_documents": selected_documents,
            "context_generated": bool(document_context),
            "context_length": len(document_context),
            "context_preview": document_context[:500] + "..." if len(document_context) > 500 else document_context,
            "query": req.query
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@router.get("/debug/ocr")
async def debug_ocr_setup(current_user = Depends(get_current_user)):
    """Debug endpoint to check OCR setup and capabilities"""
    try:
        ocr_status = FileProcessingService.test_ocr_setup()
        
        # Test with actual file if any images exist
        user_id = str(current_user.id)
        upload_dir = Path("uploads") / user_id
        
        image_files = []
        if upload_dir.exists():
            for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif']:
                image_files.extend(list(upload_dir.glob(f'*{ext}')))
                image_files.extend(list(upload_dir.glob(f'*{ext.upper()}')))
        
        return {
            "ocr_status": ocr_status,
            "found_image_files": [str(f) for f in image_files[:5]],  # Show max 5
            "total_image_files": len(image_files),
            "upload_directory": str(upload_dir),
            "recommendations": [
                "Install Tesseract OCR: https://github.com/UB-Mannheim/tesseract/wiki",
                "For Windows: Download and install tesseract-ocr-w64-setup-v5.3.0.exe",
                "Alternative: easyocr should work without additional setup"
            ]
        }
    except Exception as e:
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        text = await whisper_service.transcribe_uploadfile(file)
        return TranscribeResponse(text=text)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Transcription failed: {e}")

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, repo = Depends(get_repo), current_user = Depends(get_current_user)):
    # Load recent history for context (simple last N messages)
    # Always scope to the authenticated user
    user_id = str(current_user.id)
    chat_id = req.chat_id
    is_new_chat = False
    
    if chat_id is None:
        # Auto-create chat on first message with smart title
        smart_title = generate_smart_title(req.query)
        chat = await repo.create_chat(user_id=user_id, title=smart_title)
        chat_id = chat.id
        is_new_chat = True
    else:
        # Check if this is the first message in an existing "New Chat"
        messages = await repo.get_recent_history(user_id=user_id, chat_id=chat_id, limit=1)
        if not messages:  # No previous messages, update title
            smart_title = generate_smart_title(req.query)
            await repo.rename_chat(user_id=user_id, chat_id=chat_id, title=smart_title)
            is_new_chat = True
    
    history = await repo.get_recent_history(user_id=user_id, chat_id=chat_id, limit=10)
    history_text = "\n".join([f"User: {m.query}\nAssistant: {m.response}" for m in history])

    try:
        system_prompt = gemini_service.read_system_prompt()
        reply = await gemini_service.generate_reply(system_prompt, history_text, req.query)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM error: {e}")

    # Persist
    message = await repo.create_message(user_id=user_id, query=req.query, response=reply, chat_id=chat_id)

    return ChatResponse(
        message_id=message.id,
        user_id=message.user_id,
        chat_id=chat_id,
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
async def speak(req: SpeakRequest, current_user = Depends(get_current_user)):
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
async def list_messages(limit: int = 50, chat_id: Optional[int] = None, repo = Depends(get_repo), current_user = Depends(get_current_user)):
    user_id = str(current_user.id)
    msgs = await repo.list_messages(user_id=user_id, chat_id=chat_id, limit=limit)
    return [
        MessageOut(
            id=m.id,
            user_id=m.user_id,
            chat_id=m.chat_id,
            timestamp=m.timestamp,
            query=m.query,
            response=m.response,
        ) for m in msgs
    ]

@router.post("/voice-chat", response_model=VoiceChatResponse)
async def voice_chat(
    file: UploadFile = File(...),
    chat_id: Optional[int] = None,
    format: Optional[str] = "json",
    repo = Depends(get_repo),
    current_user = Depends(get_current_user),
):
    # 1) STT: transcribe uploaded audio to text
    try:
        transcript = await whisper_service.transcribe_uploadfile(file)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Transcription failed: {e}")

    # 2) LLM: generate reply using recent history + system prompt
    user_id = str(current_user.id)
    is_new_chat = False
    
    # Ensure chat exists if not provided
    if chat_id is None:
        smart_title = generate_smart_title(transcript)
        chat = await repo.create_chat(user_id=user_id, title=smart_title)
        chat_id = chat.id
        is_new_chat = True
    else:
        # Check if this is the first message in an existing "New Chat"
        messages = await repo.get_recent_history(user_id=user_id, chat_id=chat_id, limit=1)
        if not messages:  # No previous messages, update title
            smart_title = generate_smart_title(transcript)
            await repo.rename_chat(user_id=user_id, chat_id=chat_id, title=smart_title)
            is_new_chat = True
    
    # Use chat-specific history
    history = await repo.get_recent_history(user_id=user_id, chat_id=chat_id, limit=10)
    history_text = "\n".join([f"User: {m.query}\nAssistant: {m.response}" for m in history])
    try:
        system_prompt = gemini_service.read_system_prompt()
        reply = await gemini_service.generate_reply(system_prompt, history_text, transcript)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM error: {e}")

    # 3) Persist this interaction
    message = await repo.create_message(user_id=user_id, query=transcript, response=reply, chat_id=chat_id)

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
                "X-Chat-Id": str(chat_id),
                "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, X-Transcript, X-Text, X-Message-Id",
            },
        )

    # Default: JSON payload with base64 audio
    audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
    return VoiceChatResponse(
        message_id=message.id,
        user_id=message.user_id,
        chat_id=chat_id,
        timestamp=message.timestamp,
        transcript=transcript,
        response=reply,
        audio_b64=audio_b64,
        audio_mime="audio/wav",
    )

@router.post("/chat/stream")
async def chat_stream(req: ChatRequest, repo = Depends(get_repo), current_user = Depends(get_current_user)):
    """Stream LLM reply over SSE with real Gemini token streaming.
    Supports optional document_ids for document-aware chat."""
    import anyio

    user_id = str(current_user.id)
    chat_id = req.chat_id

    if chat_id is None:
        smart_title = generate_smart_title(req.query)
        chat = await repo.create_chat(user_id=user_id, title=smart_title)
        chat_id = chat.id
    else:
        messages = await repo.get_recent_history(user_id=user_id, chat_id=chat_id, limit=1)
        if not messages:
            smart_title = generate_smart_title(req.query)
            await repo.rename_chat(user_id=user_id, chat_id=chat_id, title=smart_title)

    history = await repo.get_recent_history(user_id=user_id, chat_id=chat_id, limit=10)
    history_text = "\n".join([f"User: {m.query}\nAssistant: {m.response}" for m in history])

    system_prompt = gemini_service.read_system_prompt()

    # ── Build document context if document_ids provided ──
    document_context = ""
    print(f"[STREAM] document_ids received: {req.document_ids}")
    if req.document_ids:
        documents = await repo.get_documents_by_ids(
            document_ids=req.document_ids,
            user_id=user_id
        )
        print(f"[STREAM] documents found: {len(documents) if documents else 0}")
        if documents:
            doc_texts = []
            for doc in documents:
                has_text = bool(doc.extracted_text)
                text_len = len(doc.extracted_text) if doc.extracted_text else 0
                print(f"[STREAM]   doc id={doc.id} filename={doc.filename} has_text={has_text} text_len={text_len}")
                if doc.extracted_text:
                    doc_texts.append(f"Document: {doc.filename}\n{doc.extracted_text}")
            if doc_texts:
                document_context = "\n\n--- DOCUMENT CONTEXT ---\n" + "\n\n".join(doc_texts) + "\n--- END CONTEXT ---\n\n"
                system_prompt += (
                    "\n\nIMPORTANT: The user has attached documents to this conversation. "
                    "The full document content is included in the user's message below between "
                    "'--- DOCUMENT CONTEXT ---' markers. You MUST read this content and use it "
                    "to answer the user's questions. Do NOT say you cannot access documents — "
                    "the text has already been extracted and provided to you. "
                    "Summarize, quote, and reference the document content directly."
                )
                print(f"[STREAM] document context length: {len(document_context)} chars")
            else:
                print("[STREAM] WARNING: documents found but none had extracted_text!")
    else:
        print("[STREAM] no document_ids in request")

    enhanced_query = document_context + req.query if document_context else req.query

    async def event_gen():
        # Send start event immediately so frontend can show the bubble
        start_evt = {"type": "start", "chat_id": chat_id}
        yield f"data: {json.dumps(start_evt)}\n\n"

        full_reply = ""
        try:
            # Stream real Gemini chunks via thread (sync generator → async)
            stream_iter = iter(gemini_service.generate_reply_stream(
                system_prompt, history_text, enhanced_query
            ))
            while True:
                try:
                    chunk = await anyio.to_thread.run_sync(lambda: next(stream_iter))
                    full_reply += chunk
                    yield f"data: {json.dumps({'type': 'delta', 'text': chunk})}\n\n"
                except StopIteration:
                    break
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        # Save to DB after streaming completes (store original query, not enhanced)
        message = await repo.create_message(
            user_id=user_id, query=req.query, response=full_reply.strip(), chat_id=chat_id
        )

        end_evt = {
            "type": "end",
            "text": full_reply.strip(),
            "message_id": message.id,
            "chat_id": chat_id,
        }
        yield f"data: {json.dumps(end_evt)}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


# Chats CRUD
@router.post("/chats", response_model=ChatOut)
async def create_chat(req: ChatCreate, repo = Depends(get_repo), current_user = Depends(get_current_user)):
    user_id = str(current_user.id)
    chat = await repo.create_chat(user_id=user_id, title=req.title)
    return ChatOut(id=chat.id, user_id=chat.user_id, title=chat.title, created_at=chat.created_at, updated_at=chat.updated_at)


@router.get("/chats", response_model=List[ChatOut])
async def list_chats(limit: int = 100, repo = Depends(get_repo), current_user = Depends(get_current_user)):
    user_id = str(current_user.id)
    chats = await repo.list_chats(user_id=user_id, limit=limit)
    return [ChatOut(id=c.id, user_id=c.user_id, title=c.title, created_at=c.created_at, updated_at=c.updated_at) for c in chats]


@router.get("/chats/{chat_id}/messages", response_model=List[MessageOut])
async def list_chat_messages(chat_id: int, limit: int = 200, repo = Depends(get_repo), current_user = Depends(get_current_user)):
    user_id = str(current_user.id)
    msgs = await repo.list_messages(user_id=user_id, chat_id=chat_id, limit=limit)
    return [MessageOut(id=m.id, user_id=m.user_id, chat_id=m.chat_id, timestamp=m.timestamp, query=m.query, response=m.response) for m in msgs]


@router.patch("/chats/{chat_id}")
async def rename_chat(chat_id: int, req: ChatCreate, repo = Depends(get_repo), current_user = Depends(get_current_user)):
    user_id = str(current_user.id)
    if not req.title:
        raise HTTPException(status_code=400, detail="title is required")
    await repo.rename_chat(user_id=user_id, chat_id=chat_id, title=req.title)
    return {"status": "ok"}


@router.delete("/chats/{chat_id}")
async def delete_chat(chat_id: int, cascade: bool = True, repo = Depends(get_repo), current_user = Depends(get_current_user)):
    user_id = str(current_user.id)
    await repo.delete_chat(user_id=user_id, chat_id=chat_id, cascade=cascade)
    return {"status": "ok"}


# Document Upload and Management Endpoints
@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    repo = Depends(get_repo),
    current_user = Depends(get_current_user)
):
    """Upload and process a document file"""
    print(f"[DEBUG] Upload request received for file: {file.filename}")
    user_id = str(current_user.id)
    
    try:
        # Validate file
        print(f"[DEBUG] Validating file: {file.filename}, size: {file.size}")
        is_valid, validation_msg = FileProcessingService.validate_file(file.filename, file.size)
        if not is_valid:
            print(f"[DEBUG] File validation failed: {validation_msg}")
            raise HTTPException(status_code=400, detail=validation_msg)
        
        # Create user-specific upload directory
        upload_dir = Path("uploads") / user_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        print(f"[DEBUG] Created upload directory: {upload_dir}")
        
        # Generate unique filename to avoid conflicts
        file_ext = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4().hex}_{FileProcessingService.get_safe_filename(file.filename)}"
        file_path = upload_dir / unique_filename
        print(f"[DEBUG] Will save to: {file_path}")
        
        # Save uploaded file
        print(f"[DEBUG] Saving file...")
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        print(f"[DEBUG] File saved successfully")
        
        # Extract text content
        print(f"[DEBUG] Processing file for text extraction...")
        extracted_text = FileProcessingService.process_file(str(file_path), file.filename)
        print(f"[DEBUG] Text extraction completed. Length: {len(extracted_text) if extracted_text else 0}")
        
        # Get file type
        file_type = FileProcessingService.get_file_type(file.filename) or "unknown"
        print(f"[DEBUG] File type: {file_type}")
        
        # Save to database
        print(f"[DEBUG] Saving to database...")
        document = await repo.create_document(
            user_id=user_id,
            filename=file.filename,
            file_path=str(file_path),
            file_type=file_type,
            file_size=file.size,
            extracted_text=extracted_text if extracted_text else None
        )
        print(f"[DEBUG] Document saved to database with ID: {document.id}")
        
        response = DocumentUploadResponse(
            id=document.id,
            filename=document.filename,
            file_type=document.file_type,
            file_size=document.file_size,
            upload_date=document.upload_date.isoformat(),
            extracted_text=extracted_text[:500] + "..." if extracted_text and len(extracted_text) > 500 else extracted_text,
            message="File uploaded and processed successfully"
        )
        print(f"[DEBUG] Returning response: {response}")
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Clean up file if it exists
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        
        error_details = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "user_id": user_id if 'user_id' in locals() else "unknown",
            "filename": file.filename if file else "unknown"
        }
        
        print(f"[ERROR] File processing failed: {error_details}")
        import traceback
        traceback.print_exc()
        
        # Return more specific error messages
        if "PyPDF2" in str(e) or "docx" in str(e) or "pytesseract" in str(e) or "PIL" in str(e):
            raise HTTPException(status_code=500, detail=f"Missing file processing dependency: {str(e)}")
        elif "mongo" in str(e).lower() or "database" in str(e).lower():
            raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")
        elif "permission" in str(e).lower() or "access" in str(e).lower():
            raise HTTPException(status_code=500, detail=f"File system permission error: {str(e)}")
        else:
            raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")


@router.get("/documents", response_model=DocumentListResponse)
async def list_documents(
    limit: int = 50,
    repo = Depends(get_repo),
    current_user = Depends(get_current_user)
):
    """List user's uploaded documents"""
    user_id = str(current_user.id)
    documents = await repo.list_documents(user_id=user_id, limit=limit)
    
    return DocumentListResponse(
        documents=[
            DocumentOut(
                id=doc.id,
                user_id=doc.user_id,
                filename=doc.filename,
                file_type=doc.file_type,
                file_size=doc.file_size,
                upload_date=doc.upload_date,
                extracted_text=doc.extracted_text[:200] + "..." if doc.extracted_text and len(doc.extracted_text) > 200 else doc.extracted_text
            ) for doc in documents
        ],
        total=len(documents)
    )


@router.get("/documents/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: int,
    repo = Depends(get_repo),
    current_user = Depends(get_current_user)
):
    """Get a specific document"""
    user_id = str(current_user.id)
    document = await repo.get_document(document_id=document_id, user_id=user_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return DocumentOut(
        id=document.id,
        user_id=document.user_id,
        filename=document.filename,
        file_type=document.file_type,
        file_size=document.file_size,
        upload_date=document.upload_date,
        extracted_text=document.extracted_text
    )


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    repo = Depends(get_repo),
    current_user = Depends(get_current_user)
):
    """Delete a document and its file"""
    user_id = str(current_user.id)
    success = await repo.delete_document(document_id=document_id, user_id=user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"status": "ok", "message": "Document deleted successfully"}


@router.post("/chat-with-document", response_model=ChatResponse)
async def chat_with_document(
    req: DocumentChatRequest,
    repo = Depends(get_repo),
    current_user = Depends(get_current_user)
):
    """Chat with document context included"""
    user_id = str(current_user.id)
    chat_id = req.chat_id
    
    # Get document context if document IDs provided
    document_context = ""
    if req.document_ids:
        documents = await repo.get_documents_by_ids(
            document_ids=req.document_ids,
            user_id=user_id
        )
        
        if documents:
            doc_texts = []
            for doc in documents:
                if doc.extracted_text:
                    doc_texts.append(f"Document: {doc.filename}\n{doc.extracted_text}")
            
            if doc_texts:
                document_context = "\n\n--- DOCUMENT CONTEXT ---\n" + "\n\n".join(doc_texts) + "\n--- END CONTEXT ---\n\n"
    
    # Handle chat creation/updating like regular chat
    if chat_id is None:
        smart_title = generate_smart_title(req.query)
        chat = await repo.create_chat(user_id=user_id, title=smart_title)
        chat_id = chat.id
    else:
        # Check if this is the first message in an existing "New Chat"
        messages = await repo.get_recent_history(user_id=user_id, chat_id=chat_id, limit=1)
        if not messages:  # No previous messages, update title
            smart_title = generate_smart_title(req.query)
            await repo.rename_chat(user_id=user_id, chat_id=chat_id, title=smart_title)
    
    # Get chat history
    history = await repo.get_recent_history(user_id=user_id, chat_id=chat_id, limit=10)
    history_text = "\n".join([f"User: {m.query}\nAssistant: {m.response}" for m in history])
    
    # Combine document context with query
    enhanced_query = document_context + req.query if document_context else req.query
    
    try:
        system_prompt = gemini_service.read_system_prompt()
        # Add document instruction to system prompt if we have document context
        if document_context:
            system_prompt += "\n\nIMPORTANT: The user has attached documents to this conversation. The full document content is included in the user's message below between '--- DOCUMENT CONTEXT ---' markers. You MUST read this content and use it to answer the user's questions. Do NOT say you cannot access documents — the text has already been extracted and provided to you. Summarize, quote, and reference the document content directly."
        
        reply = await gemini_service.generate_reply(system_prompt, history_text, enhanced_query)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM error: {e}")
    
    # Persist (store original query, not enhanced one)
    message = await repo.create_message(
        user_id=user_id,
        query=req.query,
        response=reply,
        chat_id=chat_id
    )
    
    return ChatResponse(
        message_id=message.id,
        user_id=message.user_id,
        chat_id=chat_id,
        timestamp=message.timestamp,
        query=message.query,
        response=message.response,
    )
