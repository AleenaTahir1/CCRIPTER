from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import uuid4
import random
import string

from pymongo import ReturnDocument, ASCENDING, DESCENDING

from .mongo import get_db
from .records import MessageRecord, UserRecord, ChatRecord, DocumentRecord


class MongoRepo:
    def __init__(self):
        self.db = get_db()
        if self.db is None:
            raise RuntimeError("Mongo database is not initialized. Call init_mongo() on startup.")

    async def _next_id(self, counter_name: str) -> int:
        res = await self.db["counters"].find_one_and_update(
            {"_id": counter_name}, {"$inc": {"seq": 1}}, return_document=ReturnDocument.AFTER
        )
        return int(res["seq"])  # type: ignore

    # Messages
    async def create_message(self, user_id: str, query: str, response: str, chat_id: int | None = None) -> MessageRecord:
        mid = await self._next_id("message_id")
        now = datetime.now(timezone.utc)
        doc = {
            "_id": mid,
            "user_id": user_id,
            "chat_id": chat_id,
            "timestamp": now,
            "query": query,
            "response": response,
        }
        await self.db["messages"].insert_one(doc)
        # Touch chat updated time if provided
        if chat_id is not None:
            await self.db["chats"].update_one({"_id": int(chat_id), "user_id": user_id}, {"$set": {"updated_at": now}})
        return MessageRecord(id=mid, chat_id=chat_id, user_id=user_id, timestamp=now, query=query, response=response)

    async def list_messages(self, user_id: Optional[str] = None, chat_id: int | None = None, limit: int = 50) -> List[MessageRecord]:
        filt: dict = {}
        if user_id:
            filt["user_id"] = user_id
        if chat_id is not None:
            filt["chat_id"] = int(chat_id)
        cursor = self.db["messages"].find(filt).sort([("timestamp", DESCENDING)]).limit(int(limit))
        out: List[MessageRecord] = []
        async for d in cursor:
            out.append(
                MessageRecord(
                    id=int(d.get("_id")),
                    chat_id=(int(d.get("chat_id")) if d.get("chat_id") is not None else None),
                    user_id=str(d.get("user_id")),
                    timestamp=d.get("timestamp"),
                    query=d.get("query", ""),
                    response=d.get("response", ""),
                )
            )
        return out

    async def get_recent_history(self, user_id: str, chat_id: int | None = None, limit: int = 10) -> List[MessageRecord]:
        filt = {"user_id": user_id}
        if chat_id is not None:
            filt["chat_id"] = int(chat_id)
        cursor = self.db["messages"].find(filt).sort([("timestamp", DESCENDING)]).limit(int(limit))
        out: List[MessageRecord] = []
        async for d in cursor:
            out.append(
                MessageRecord(
                    id=int(d.get("_id")),
                    chat_id=(int(d.get("chat_id")) if d.get("chat_id") is not None else None),
                    user_id=str(d.get("user_id")),
                    timestamp=d.get("timestamp"),
                    query=d.get("query", ""),
                    response=d.get("response", ""),
                )
            )
        return list(reversed(out))

    # Users
    async def create_user(self, name: str, email: str, password_hash: str) -> UserRecord:
        # ensure unique email handled by unique index
        uid = await self._next_id("user_id")
        now = datetime.now(timezone.utc)
        doc = {
            "_id": uid,
            "name": name,
            "email": email.lower(),
            "password_hash": password_hash,
            "created_at": now,
            "updated_at": now,
            "profile_picture": None,  # Default to None
        }
        await self.db["users"].insert_one(doc)
        return UserRecord(id=uid, name=name, email=email.lower(), password_hash=password_hash, created_at=now, updated_at=now, profile_picture=None)

    async def get_user_by_email(self, email: str) -> Optional[UserRecord]:
        d = await self.db["users"].find_one({"email": email.lower()})
        if not d:
            return None
        return UserRecord(
            id=int(d.get("_id")),
            name=str(d.get("name", "")),
            email=str(d.get("email", "")),
            password_hash=str(d.get("password_hash", "")),
            created_at=d.get("created_at"),
            updated_at=d.get("updated_at"),
            profile_picture=d.get("profile_picture"),
        )

    async def get_user_by_id(self, user_id: int | str) -> Optional[UserRecord]:
        d = await self.db["users"].find_one({"_id": int(user_id)})
        if not d:
            return None
        return UserRecord(
            id=int(d.get("_id")),
            name=str(d.get("name", "")),
            email=str(d.get("email", "")),
            password_hash=str(d.get("password_hash", "")),
            created_at=d.get("created_at"),
            updated_at=d.get("updated_at"),
            profile_picture=d.get("profile_picture"),
        )

    async def create_password_reset(self, user_id: int, ttl_minutes: int = 15) -> str:
        """Create a 6-digit password reset code that expires in 15 minutes"""
        # Generate 6-digit code
        code = ''.join(random.choices(string.digits, k=6))
        expires = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
        
        # Delete any existing reset codes for this user
        await self.db["password_resets"].delete_many({"user_id": user_id})
        
        # Insert new reset code
        await self.db["password_resets"].insert_one({
            "_id": f"{user_id}_{code}",  # Composite key to ensure uniqueness per user
            "user_id": user_id,
            "code": code,
            "expiresAt": expires,
            "created_at": datetime.now(timezone.utc)
        })
        return code

    async def verify_reset_code(self, user_id: int, code: str) -> bool:
        """Verify if the 6-digit reset code is valid for the user"""
        d = await self.db["password_resets"].find_one({
            "user_id": user_id,
            "code": code,
            "expiresAt": {"$gt": datetime.now(timezone.utc)}
        })
        return d is not None

    async def use_password_reset(self, user_id: int, code: str) -> bool:
        """Use (consume) the reset code and delete it from database"""
        # Verify code exists and is not expired
        d = await self.db["password_resets"].find_one({
            "user_id": user_id,
            "code": code,
            "expiresAt": {"$gt": datetime.now(timezone.utc)}
        })
        
        if not d:
            return False
        
        # Delete the used code
        await self.db["password_resets"].delete_one({
            "user_id": user_id,
            "code": code
        })
        return True

    async def update_user_password(self, user_id: int, new_hash: str) -> None:
        now = datetime.now(timezone.utc)
        await self.db["users"].update_one({"_id": int(user_id)}, {"$set": {"password_hash": new_hash, "updated_at": now}})

    async def update_user_profile(self, user_id: int, name: Optional[str] = None, email: Optional[str] = None, profile_picture: Optional[str] = None) -> bool:
        """Update user profile information.

        If profile_picture is provided as an empty string (""), the field is cleared (set to None).
        If profile_picture is None, the field is not modified.
        """
        now = datetime.now(timezone.utc)
        update_fields = {"updated_at": now}

        if name is not None:
            update_fields["name"] = name
        if email is not None:
            update_fields["email"] = email.lower()
        if profile_picture is not None:
            # Allow clearing avatar when client sends empty string
            update_fields["profile_picture"] = profile_picture or None

        result = await self.db["users"].update_one(
            {"_id": int(user_id)},
            {"$set": update_fields}
        )
        return result.modified_count > 0

    # Chats
    async def create_chat(self, user_id: str, title: str | None = None) -> ChatRecord:
        cid = await self._next_id("chat_id")
        now = datetime.now(timezone.utc)
        title_final = (title or "New chat").strip() or "New chat"
        doc = {
            "_id": cid,
            "user_id": user_id,
            "title": title_final,
            "created_at": now,
            "updated_at": now,
        }
        await self.db["chats"].insert_one(doc)
        return ChatRecord(id=cid, user_id=user_id, title=title_final, created_at=now, updated_at=now)

    async def list_chats(self, user_id: str, limit: int = 100) -> List[ChatRecord]:
        cursor = self.db["chats"].find({"user_id": user_id}).sort([("updated_at", DESCENDING)]).limit(int(limit))
        out: List[ChatRecord] = []
        async for d in cursor:
            out.append(
                ChatRecord(
                    id=int(d.get("_id")),
                    user_id=str(d.get("user_id")),
                    title=str(d.get("title", "Untitled")),
                    created_at=d.get("created_at"),
                    updated_at=d.get("updated_at"),
                )
            )
        return out

    async def rename_chat(self, user_id: str, chat_id: int, title: str) -> None:
        now = datetime.now(timezone.utc)
        await self.db["chats"].update_one({"_id": int(chat_id), "user_id": user_id}, {"$set": {"title": title.strip() or "Untitled", "updated_at": now}})

    async def delete_chat(self, user_id: str, chat_id: int, cascade: bool = True) -> None:
        await self.db["chats"].delete_one({"_id": int(chat_id), "user_id": user_id})
        if cascade:
            await self.db["messages"].delete_many({"chat_id": int(chat_id), "user_id": user_id})

    # Documents
    async def create_document(
        self, 
        user_id: str, 
        filename: str, 
        file_path: str, 
        file_type: str, 
        file_size: int,
        extracted_text: Optional[str] = None
    ) -> DocumentRecord:
        """Create a new document record"""
        doc_id = await self._next_id("document_id")
        now = datetime.now(timezone.utc)
        doc = {
            "_id": doc_id,
            "user_id": user_id,
            "filename": filename,
            "file_path": file_path,
            "file_type": file_type,
            "file_size": file_size,
            "upload_date": now,
            "extracted_text": extracted_text
        }
        await self.db["documents"].insert_one(doc)
        return DocumentRecord(
            id=doc_id,
            user_id=user_id,
            filename=filename,
            file_path=file_path,
            file_type=file_type,
            file_size=file_size,
            upload_date=now,
            extracted_text=extracted_text
        )

    async def list_documents(self, user_id: str, limit: int = 50) -> List[DocumentRecord]:
        """List user's documents"""
        cursor = self.db["documents"].find({"user_id": user_id}).sort([("upload_date", DESCENDING)]).limit(int(limit))
        out: List[DocumentRecord] = []
        async for d in cursor:
            out.append(
                DocumentRecord(
                    id=int(d.get("_id")),
                    user_id=str(d.get("user_id")),
                    filename=str(d.get("filename", "")),
                    file_path=str(d.get("file_path", "")),
                    file_type=str(d.get("file_type", "")),
                    file_size=int(d.get("file_size", 0)),
                    upload_date=d.get("upload_date"),
                    extracted_text=d.get("extracted_text")
                )
            )
        return out

    async def get_document(self, document_id: int, user_id: str) -> Optional[DocumentRecord]:
        """Get a specific document by ID and user"""
        d = await self.db["documents"].find_one({"_id": int(document_id), "user_id": user_id})
        if not d:
            return None
        return DocumentRecord(
            id=int(d.get("_id")),
            user_id=str(d.get("user_id")),
            filename=str(d.get("filename", "")),
            file_path=str(d.get("file_path", "")),
            file_type=str(d.get("file_type", "")),
            file_size=int(d.get("file_size", 0)),
            upload_date=d.get("upload_date"),
            extracted_text=d.get("extracted_text")
        )

    async def delete_document(self, document_id: int, user_id: str) -> bool:
        """Delete a document and its file"""
        import os
        
        # Get document first to access file path
        doc = await self.get_document(document_id, user_id)
        if not doc:
            return False
        
        # Delete the physical file
        try:
            if os.path.exists(doc.file_path):
                os.remove(doc.file_path)
        except Exception:
            pass  # Continue even if file deletion fails
        
        # Delete the database record
        result = await self.db["documents"].delete_one({"_id": int(document_id), "user_id": user_id})
        return result.deleted_count > 0

    async def get_documents_by_ids(self, document_ids: List[int], user_id: str) -> List[DocumentRecord]:
        """Get multiple documents by IDs for context"""
        cursor = self.db["documents"].find({
            "_id": {"$in": [int(doc_id) for doc_id in document_ids]},
            "user_id": user_id
        })
        out: List[DocumentRecord] = []
        async for d in cursor:
            out.append(
                DocumentRecord(
                    id=int(d.get("_id")),
                    user_id=str(d.get("user_id")),
                    filename=str(d.get("filename", "")),
                    file_path=str(d.get("file_path", "")),
                    file_type=str(d.get("file_type", "")),
                    file_size=int(d.get("file_size", 0)),
                    upload_date=d.get("upload_date"),
                    extracted_text=d.get("extracted_text")
                )
            )
        return out
