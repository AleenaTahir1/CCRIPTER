from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from .database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
