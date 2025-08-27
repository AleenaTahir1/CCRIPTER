import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Resolve project root: .../CCRIPT-Chatbot/
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_DIR = PROJECT_ROOT / "database"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "app.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def init_db() -> None:
    # Import models so metadata is registered
    from . import models  # noqa: F401
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
