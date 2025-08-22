from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    user_id: str = Field(default="demo")
    query: str

class ChatResponse(BaseModel):
    message_id: int
    user_id: str
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
    timestamp: datetime
    query: str
    response: str

    class Config:
        from_attributes = True


class VoiceChatResponse(BaseModel):
    message_id: int
    user_id: str
    timestamp: datetime
    transcript: str
    response: str
    audio_b64: str
    audio_mime: str = "audio/wav"
