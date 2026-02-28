import os
import asyncio
from typing import Optional, List, Any

from .records import MessageRecord, UserRecord, ChatRecord, DocumentRecord
from . import crud
from .database import SessionLocal


class SqlRepo:
    """Async wrapper around SQLAlchemy CRUD — supports all features (users, chats, docs)."""

    def __init__(self) -> None:
        self.db = SessionLocal()

    # ── Messages ──────────────────────────────────────────────────

    async def create_message(self, user_id: str, query: str, response: str, chat_id: int | None = None) -> MessageRecord:
        msg = await asyncio.to_thread(crud.create_message, self.db, user_id, query, response, chat_id)
        return MessageRecord(id=msg.id, chat_id=msg.chat_id, user_id=msg.user_id, timestamp=msg.timestamp, query=msg.query, response=msg.response)

    async def list_messages(self, user_id: Optional[str] = None, chat_id: int | None = None, limit: int = 50) -> List[MessageRecord]:
        msgs = await asyncio.to_thread(crud.list_messages, self.db, user_id, chat_id, limit)
        return [MessageRecord(id=m.id, chat_id=m.chat_id, user_id=m.user_id, timestamp=m.timestamp, query=m.query, response=m.response) for m in msgs]

    async def get_recent_history(self, user_id: str, chat_id: int | None = None, limit: int = 10) -> List[MessageRecord]:
        msgs = await asyncio.to_thread(crud.get_recent_history, self.db, user_id, chat_id, limit)
        return [MessageRecord(id=m.id, chat_id=m.chat_id, user_id=m.user_id, timestamp=m.timestamp, query=m.query, response=m.response) for m in msgs]

    # ── Users ─────────────────────────────────────────────────────

    async def create_user(self, name: str, email: str, password_hash: str) -> UserRecord:
        u = await asyncio.to_thread(crud.create_user, self.db, name, email, password_hash)
        return UserRecord(id=u.id, name=u.name, email=u.email, password_hash=u.password_hash, created_at=u.created_at, updated_at=u.updated_at, profile_picture=u.profile_picture)

    async def get_user_by_email(self, email: str) -> Optional[UserRecord]:
        u = await asyncio.to_thread(crud.get_user_by_email, self.db, email)
        if not u:
            return None
        return UserRecord(id=u.id, name=u.name, email=u.email, password_hash=u.password_hash, created_at=u.created_at, updated_at=u.updated_at, profile_picture=u.profile_picture)

    async def get_user_by_id(self, user_id: int | str) -> Optional[UserRecord]:
        u = await asyncio.to_thread(crud.get_user_by_id, self.db, int(user_id))
        if not u:
            return None
        return UserRecord(id=u.id, name=u.name, email=u.email, password_hash=u.password_hash, created_at=u.created_at, updated_at=u.updated_at, profile_picture=u.profile_picture)

    async def create_password_reset(self, user_id: int, ttl_minutes: int = 15) -> str:
        return await asyncio.to_thread(crud.create_password_reset, self.db, user_id, ttl_minutes)

    async def verify_reset_code(self, user_id: int, code: str) -> bool:
        return await asyncio.to_thread(crud.verify_reset_code, self.db, user_id, code)

    async def use_password_reset(self, user_id: int, code: str) -> bool:
        return await asyncio.to_thread(crud.use_password_reset, self.db, user_id, code)

    async def update_user_password(self, user_id: int, new_hash: str) -> None:
        await asyncio.to_thread(crud.update_user_password, self.db, user_id, new_hash)

    async def update_user_profile(self, user_id: int, name: Optional[str] = None, email: Optional[str] = None, profile_picture: Optional[str] = None) -> bool:
        return await asyncio.to_thread(crud.update_user_profile, self.db, user_id, name, email, profile_picture)

    # ── Chats ─────────────────────────────────────────────────────

    async def create_chat(self, user_id: str, title: str | None = None) -> ChatRecord:
        c = await asyncio.to_thread(crud.create_chat, self.db, user_id, title)
        return ChatRecord(id=c.id, user_id=c.user_id, title=c.title, created_at=c.created_at, updated_at=c.updated_at)

    async def list_chats(self, user_id: str, limit: int = 100) -> List[ChatRecord]:
        chats = await asyncio.to_thread(crud.list_chats, self.db, user_id, limit)
        return [ChatRecord(id=c.id, user_id=c.user_id, title=c.title, created_at=c.created_at, updated_at=c.updated_at) for c in chats]

    async def rename_chat(self, user_id: str, chat_id: int, title: str) -> None:
        await asyncio.to_thread(crud.rename_chat, self.db, user_id, chat_id, title)

    async def delete_chat(self, user_id: str, chat_id: int, cascade: bool = True) -> None:
        await asyncio.to_thread(crud.delete_chat, self.db, user_id, chat_id, cascade)

    # ── Documents ─────────────────────────────────────────────────

    async def create_document(self, user_id: str, filename: str, file_path: str, file_type: str, file_size: int, extracted_text: Optional[str] = None) -> DocumentRecord:
        d = await asyncio.to_thread(crud.create_document, self.db, user_id, filename, file_path, file_type, file_size, extracted_text)
        return DocumentRecord(id=d.id, user_id=d.user_id, filename=d.filename, file_path=d.file_path, file_type=d.file_type, file_size=d.file_size, upload_date=d.upload_date, extracted_text=d.extracted_text)

    async def list_documents(self, user_id: str, limit: int = 50) -> List[DocumentRecord]:
        docs = await asyncio.to_thread(crud.list_documents, self.db, user_id, limit)
        return [DocumentRecord(id=d.id, user_id=d.user_id, filename=d.filename, file_path=d.file_path, file_type=d.file_type, file_size=d.file_size, upload_date=d.upload_date, extracted_text=d.extracted_text) for d in docs]

    async def get_document(self, document_id: int, user_id: str) -> Optional[DocumentRecord]:
        d = await asyncio.to_thread(crud.get_document, self.db, document_id, user_id)
        if not d:
            return None
        return DocumentRecord(id=d.id, user_id=d.user_id, filename=d.filename, file_path=d.file_path, file_type=d.file_type, file_size=d.file_size, upload_date=d.upload_date, extracted_text=d.extracted_text)

    async def delete_document(self, document_id: int, user_id: str) -> bool:
        return await asyncio.to_thread(crud.delete_document, self.db, document_id, user_id)

    async def get_documents_by_ids(self, document_ids: List[int], user_id: str) -> List[DocumentRecord]:
        docs = await asyncio.to_thread(crud.get_documents_by_ids, self.db, document_ids, user_id)
        return [DocumentRecord(id=d.id, user_id=d.user_id, filename=d.filename, file_path=d.file_path, file_type=d.file_type, file_size=d.file_size, upload_date=d.upload_date, extracted_text=d.extracted_text) for d in docs]


# Mongo implementation lives in mongo_repo.py
from .mongo_repo import MongoRepo  # noqa: E402


def get_repo() -> Any:
    backend = os.getenv("DB_BACKEND", "sqlite").lower()
    if backend == "mongo":
        return MongoRepo()
    return SqlRepo()
