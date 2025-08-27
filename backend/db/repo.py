import os
import asyncio
from typing import Optional, List, Any

from .records import MessageRecord, UserRecord, ChatRecord, DocumentRecord
from . import crud
from .database import SessionLocal


class SqlRepo:
    """Async wrapper around existing SQLAlchemy CRUD for messages.
    User-related operations are not implemented for SQLite in this project.
    """

    def __init__(self) -> None:
        self.db = SessionLocal()

    async def create_message(self, user_id: str, query: str, response: str, chat_id: int | None = None) -> MessageRecord:
        # SQLite path ignores chat_id
        msg = await asyncio.to_thread(crud.create_message, self.db, user_id, query, response)
        return MessageRecord(id=msg.id, user_id=msg.user_id, timestamp=msg.timestamp, query=msg.query, response=msg.response)

    async def list_messages(self, user_id: Optional[str] = None, chat_id: int | None = None, limit: int = 50) -> List[MessageRecord]:
        # SQLite path ignores chat_id
        msgs = await asyncio.to_thread(crud.list_messages, self.db, user_id, limit)
        return [MessageRecord(id=m.id, user_id=m.user_id, timestamp=m.timestamp, query=m.query, response=m.response) for m in msgs]

    async def get_recent_history(self, user_id: str, chat_id: int | None = None, limit: int = 10) -> List[MessageRecord]:
        # SQLite path ignores chat_id
        msgs = await asyncio.to_thread(crud.get_recent_history, self.db, user_id, limit)
        return [MessageRecord(id=m.id, user_id=m.user_id, timestamp=m.timestamp, query=m.query, response=m.response) for m in msgs]

    # Users (not implemented for SQLite path)
    async def create_user(self, name: str, email: str, password_hash: str) -> UserRecord:
        raise NotImplementedError("User auth is only supported on Mongo backend in this project.")

    async def get_user_by_email(self, email: str) -> Optional[UserRecord]:
        return None

    async def get_user_by_id(self, user_id: int | str) -> Optional[UserRecord]:
        return None

    async def create_password_reset(self, user_id: int, ttl_minutes: int = 60) -> str:
        raise NotImplementedError

    async def use_password_reset(self, token: str) -> Optional[int]:
        return None

    async def update_user_password(self, user_id: int, new_hash: str) -> None:
        raise NotImplementedError

    # Chats (not implemented for SQLite)
    async def create_chat(self, user_id: str, title: str | None = None) -> ChatRecord:
        raise NotImplementedError("Chats are only supported on Mongo backend in this project.")

    async def list_chats(self, user_id: str, limit: int = 100) -> List[ChatRecord]:
        return []

    async def rename_chat(self, user_id: str, chat_id: int, title: str) -> None:
        raise NotImplementedError

    async def delete_chat(self, user_id: str, chat_id: int, cascade: bool = True) -> None:
        raise NotImplementedError

    # Documents (not implemented for SQLite - use MongoDB)
    async def create_document(self, user_id: str, filename: str, file_path: str, file_type: str, file_size: int, extracted_text: Optional[str] = None) -> DocumentRecord:
        raise NotImplementedError("Document upload is only supported on Mongo backend.")

    async def list_documents(self, user_id: str, limit: int = 50) -> List[DocumentRecord]:
        return []

    async def get_document(self, document_id: int, user_id: str) -> Optional[DocumentRecord]:
        return None

    async def delete_document(self, document_id: int, user_id: str) -> bool:
        return False

    async def get_documents_by_ids(self, document_ids: List[int], user_id: str) -> List[DocumentRecord]:
        return []


# Mongo implementation lives in mongo_repo.py
from .mongo_repo import MongoRepo  # noqa: E402


def get_repo() -> Any:
    backend = os.getenv("DB_BACKEND", "mongo").lower()  # Changed default to mongo
    if backend == "mongo":
        return MongoRepo()
    return SqlRepo()
