from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    query: str
    chat_id: Optional[int] = None

class ChatResponse(BaseModel):
    message_id: int
    user_id: str
    chat_id: Optional[int] = None
    timestamp: datetime
    query: str
    response: str

class TranscribeResponse(BaseModel):
    text: str

class SpeakRequest(BaseModel):
    text: str

class MessageOut(BaseModel):
    id: int
    user_id: str
    chat_id: Optional[int] = None
    timestamp: datetime
    query: str
    response: str

    class Config:
        from_attributes = True


class VoiceChatResponse(BaseModel):
    message_id: int
    user_id: str
    chat_id: Optional[int] = None
    timestamp: datetime
    transcript: str
    response: str
    audio_b64: str
    audio_mime: str = "audio/wav"


class ChatCreate(BaseModel):
    title: Optional[str] = None


class ChatOut(BaseModel):
    id: int
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


# Document-related schemas
class DocumentOut(BaseModel):
    """Schema for document response"""
    id: int
    user_id: str
    filename: str
    file_type: str
    file_size: int
    upload_date: datetime
    extracted_text: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    """Response after successful document upload"""
    id: int
    filename: str
    file_type: str
    file_size: int
    upload_date: str
    extracted_text: Optional[str] = None
    message: str


class DocumentChatRequest(BaseModel):
    """Request for chatting with documents"""
    query: str
    document_ids: List[int] = Field(default_factory=list, description="List of document IDs to include in context")
    chat_id: Optional[int] = None


class DocumentListResponse(BaseModel):
    """Response for listing documents"""
    documents: List[DocumentOut]
    total: int
