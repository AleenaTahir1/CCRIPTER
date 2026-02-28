import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (CCRIPT-Chatbot/.env) BEFORE importing app modules
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=PROJECT_ROOT / ".env", override=True)

# Now import modules that may read environment variables
from .db.database import init_db
from .db.mongo import init_mongo
from .routes.api import router as api_router
from .routes.auth import router as auth_router
from .routes.profile import router as profile_router
from .services import whisper_service, gemini_service, piper_service

app = FastAPI(title="CCRIPT Chatbot Backend", version="0.1.0")

# CORS configuration for frontend (supports local, ngrok and Vercel)
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
    # Common tunneling host (update as needed)
    os.getenv("NGROK_PUBLIC_URL", "https://f1580261af9f.ngrok-free.app"),
]

env_origins = os.getenv("CORS_ORIGINS")
allow_origins = list(default_origins)
if env_origins:
    for o in [o.strip() for o in env_origins.split(",") if o.strip()]:
        if o not in allow_origins:
            allow_origins.append(o)

allow_origin_regex = os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app$")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    # Ensure DB is initialized based on backend selection
    if os.getenv("DB_BACKEND", "sqlite").lower() == "mongo":
        try:
            await init_mongo()
        except Exception:
            pass
    else:
        try:
            init_db()
        except Exception:
            pass
    # Preload heavy models to avoid cold-start latency on first request
    try:
        whisper_service.warmup()
    except Exception:
        pass
    try:
        gemini_service.warmup()
    except Exception:
        pass
    try:
        piper_service.warmup()
    except Exception:
        pass

# Basic root endpoint
@app.get("/")
def home():
    return {"message": "Backend is running "}

# Mount API & Auth routes
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(profile_router)

# If running directly: uvicorn backend.main:app --reload
