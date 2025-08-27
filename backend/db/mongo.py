import os
from typing import Optional
from datetime import timedelta

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def init_mongo() -> None:
    """Initialize global Motor client and database, and ensure collections/indexes.
    Uses env vars:
      - MONGODB_URI
      - MONGODB_DB
    Creates/ensures:
      - counters: for integer sequences (message_id, user_id, chat_id)
      - users: unique index on email
      - messages: compound index (user_id ASC, chat_id ASC, timestamp DESC)
      - chats: compound index (user_id ASC, updated_at DESC)
      - password_resets: TTL index on expiresAt
    """
    global _client, _db
    uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("MONGODB_DB", "ccripter")
    if not uri:
        raise RuntimeError("MONGODB_URI is not set")

    _client = AsyncIOMotorClient(uri)
    _db = _client[db_name]

    # Ensure counters docs exist
    await _db["counters"].update_one({"_id": "message_id"}, {"$setOnInsert": {"seq": 0}}, upsert=True)
    await _db["counters"].update_one({"_id": "user_id"}, {"$setOnInsert": {"seq": 0}}, upsert=True)
    await _db["counters"].update_one({"_id": "chat_id"}, {"$setOnInsert": {"seq": 0}}, upsert=True)
    await _db["counters"].update_one({"_id": "document_id"}, {"$setOnInsert": {"seq": 0}}, upsert=True)

    # Users: unique email
    await _db["users"].create_index([("email", ASCENDING)], unique=True, name="uniq_email")

    # Messages: index for recent history per user & chat
    await _db["messages"].create_index([("user_id", ASCENDING), ("chat_id", ASCENDING), ("timestamp", DESCENDING)], name="user_chat_ts_idx")

    # Chats: list chats by user, most recent first
    await _db["chats"].create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)], name="user_updated_idx")

    # Password reset tokens: TTL on expiresAt field
    # expireAfterSeconds=0 means expire exactly at the expiresAt datetime
    await _db["password_resets"].create_index([("expiresAt", ASCENDING)], expireAfterSeconds=0, name="ttl_expires")

    # Documents: index for user's documents, most recent first
    await _db["documents"].create_index([("user_id", ASCENDING), ("upload_date", DESCENDING)], name="user_upload_idx")


def get_db() -> Optional[AsyncIOMotorDatabase]:
    """Return the initialized Motor database instance, or None if not init yet."""
    return _db
