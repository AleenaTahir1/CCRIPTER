import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (CCRIPT-Chatbot/.env) BEFORE importing app modules
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=PROJECT_ROOT / ".env", override=False)

# Now import modules that may read environment variables
from .db.database import init_db
from .routes.api import router as api_router
from .services import whisper_service, gemini_service

app = FastAPI(title="CCRIPT Chatbot Backend", version="0.1.0")

# CORS (adjust later when frontend is added)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Ensure DB and tables exist
    init_db()
    # Preload heavy models to avoid cold-start latency 