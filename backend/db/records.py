from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class MessageRecord:
    id: int
    chat_id: Optional[int]
    user_id: str
    timestamp: datetime
    query: str
    response: str


@dataclass
class UserRecord:
    id: int
    name: str
    email: str
    password_hash: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    profile_picture: Optional[str] = None  # Base64 encoded image


@dataclass
class ChatRecord:
    id: int
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


@dataclass
class DocumentRecord:
    id: int
    user_id: str
    filename: str
    file_path: str
    file_type: str
    file_size: int
    upload_date: datetime
    extracted_text: Optional[str] = None
