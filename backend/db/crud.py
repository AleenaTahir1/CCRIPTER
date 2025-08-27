from typing import List, Optional
from sqlalchemy.orm import Session
from . import models
import os

def create_message(db: Session, user_id: str, query: str, response: str) -> models.Message:
    msg = models.Message(user_id=user_id, query=query, response=response)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def list_messages(db: Session, user_id: Optional[str] = None, limit: int = 50) -> List[models.Message]:
    q = db.query(models.Message)
    if user_id:
        q = q.filter(models.Message.user_id == user_id)
    return q.order_by(models.Message.timestamp.desc()).limit(limit).all()


def get_recent_history(db: Session, user_id: str, limit: int = 10) -> List[models.Message]:
    return (
        db.query(models.Message)
        .filter(models.Message.user_id == user_id)
        .order_by(models.Message.timestamp.desc())
        .limit(limit)
        .all()
    )[::-1]  # oldest to newest


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
