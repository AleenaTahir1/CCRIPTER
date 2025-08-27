from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from .database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, docx, txt, png, jpg, etc.
    extracted_text = Column(Text, nullable=True)  # OCR/parsed text content
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    file_size = Column(BigInteger, nullable=False)  # Size in bytes
