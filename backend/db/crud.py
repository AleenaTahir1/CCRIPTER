from typing import List, Optional
from datetime import datetime, timedelta, timezone
import random
import string

from sqlalchemy.orm import Session
from . import models
import os


# ── User CRUD ──────────────────────────────────────────────────────

def create_user(db: Session, name: str, email: str, password_hash: str) -> models.User:
    user = models.User(name=name, email=email.lower(), password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email.lower()).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def update_user_password(db: Session, user_id: int, new_hash: str) -> None:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        user.password_hash = new_hash
        user.updated_at = datetime.now(timezone.utc)
        db.commit()


def update_user_profile(db: Session, user_id: int, name: Optional[str] = None, email: Optional[str] = None, profile_picture: Optional[str] = None) -> bool:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return False
    if name is not None:
        user.name = name
    if email is not None:
        user.email = email.lower()
    if profile_picture is not None:
        user.profile_picture = profile_picture or None
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    return True


# ── Password Reset CRUD ───────────────────────────────────────────

def create_password_reset(db: Session, user_id: int, ttl_minutes: int = 15) -> str:
    code = ''.join(random.choices(string.digits, k=6))
    expires = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
    # Remove old codes for this user
    db.query(models.PasswordReset).filter(models.PasswordReset.user_id == user_id).delete()
    pr = models.PasswordReset(user_id=user_id, code=code, expires_at=expires)
    db.add(pr)
    db.commit()
    return code


def verify_reset_code(db: Session, user_id: int, code: str) -> bool:
    now = datetime.now(timezone.utc)
    return db.query(models.PasswordReset).filter(
        models.PasswordReset.user_id == user_id,
        models.PasswordReset.code == code,
        models.PasswordReset.expires_at > now,
    ).first() is not None


def use_password_reset(db: Session, user_id: int, code: str) -> bool:
    now = datetime.now(timezone.utc)
    pr = db.query(models.PasswordReset).filter(
        models.PasswordReset.user_id == user_id,
        models.PasswordReset.code == code,
        models.PasswordReset.expires_at > now,
    ).first()
    if not pr:
        return False
    db.delete(pr)
    db.commit()
    return True


# ── Chat CRUD ─────────────────────────────────────────────────────

def create_chat(db: Session, user_id: str, title: Optional[str] = None) -> models.Chat:
    chat = models.Chat(user_id=user_id, title=(title or "New chat").strip() or "New chat")
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def list_chats(db: Session, user_id: str, limit: int = 100) -> List[models.Chat]:
    return (
        db.query(models.Chat)
        .filter(models.Chat.user_id == user_id)
        .order_by(models.Chat.updated_at.desc())
        .limit(limit)
        .all()
    )


def rename_chat(db: Session, user_id: str, chat_id: int, title: str) -> None:
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id, models.Chat.user_id == user_id).first()
    if chat:
        chat.title = title.strip() or "Untitled"
        chat.updated_at = datetime.now(timezone.utc)
        db.commit()


def delete_chat(db: Session, user_id: str, chat_id: int, cascade: bool = True) -> None:
    db.query(models.Chat).filter(models.Chat.id == chat_id, models.Chat.user_id == user_id).delete()
    if cascade:
        db.query(models.Message).filter(models.Message.chat_id == chat_id, models.Message.user_id == user_id).delete()
    db.commit()


# ── Message CRUD ──────────────────────────────────────────────────

def create_message(db: Session, user_id: str, query: str, response: str, chat_id: Optional[int] = None) -> models.Message:
    msg = models.Message(user_id=user_id, query=query, response=response, chat_id=chat_id)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    # Touch chat updated_at
    if chat_id is not None:
        chat = db.query(models.Chat).filter(models.Chat.id == chat_id, models.Chat.user_id == user_id).first()
        if chat:
            chat.updated_at = datetime.now(timezone.utc)
            db.commit()
    return msg


def list_messages(db: Session, user_id: Optional[str] = None, chat_id: Optional[int] = None, limit: int = 50) -> List[models.Message]:
    q = db.query(models.Message)
    if user_id:
        q = q.filter(models.Message.user_id == user_id)
    if chat_id is not None:
        q = q.filter(models.Message.chat_id == chat_id)
    return q.order_by(models.Message.timestamp.desc()).limit(limit).all()


def get_recent_history(db: Session, user_id: str, chat_id: Optional[int] = None, limit: int = 10) -> List[models.Message]:
    q = db.query(models.Message).filter(models.Message.user_id == user_id)
    if chat_id is not None:
        q = q.filter(models.Message.chat_id == chat_id)
    return q.order_by(models.Message.timestamp.desc()).limit(limit).all()[::-1]


# Document CRUD operations
def create_document(
    db: Session, 
    user_id: str, 
    filename: str, 
    file_path: str, 
    file_type: str, 
    file_size: int,
    extracted_text: Optional[str] = None
) -> models.Document:
    """Create a new document record"""
    doc = models.Document(
        user_id=user_id,
        filename=filename,
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        extracted_text=extracted_text
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def list_documents(db: Session, user_id: str, limit: int = 50) -> List[models.Document]:
    """List user's documents"""
    return (
        db.query(models.Document)
        .filter(models.Document.user_id == user_id)
        .order_by(models.Document.upload_date.desc())
        .limit(limit)
        .all()
    )


def get_document(db: Session, document_id: int, user_id: str) -> Optional[models.Document]:
    """Get a specific document by ID and user"""
    return (
        db.query(models.Document)
        .filter(models.Document.id == document_id, models.Document.user_id == user_id)
        .first()
    )


def delete_document(db: Session, document_id: int, user_id: str) -> bool:
    """Delete a document and its file"""
    doc = get_document(db, document_id, user_id)
    if not doc:
        return False
    
    # Delete the physical file
    try:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception:
        pass  # Continue even if file deletion fails
    
    # Delete the database record
    db.delete(doc)
    db.commit()
    return True


def get_documents_by_ids(db: Session, document_ids: List[int], user_id: str) -> List[models.Document]:
    """Get multiple documents by IDs for context"""
    return (
        db.query(models.Document)
        .filter(
            models.Document.id.in_(document_ids),
            models.Document.user_id == user_id
        )
        .all()
    )
