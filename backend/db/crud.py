from typing import List, Optional
from sqlalchemy.orm import Session
from . import models

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
