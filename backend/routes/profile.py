from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status, Body
from pydantic import BaseModel, EmailStr
import base64
import logging
import os
from pathlib import Path

from ..security import get_password_hash, verify_password, get_current_user
from ..db.repo import get_repo
from ..db.records import UserRecord

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["profile"])


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    profile_picture: Optional[str] = None  # Base64 encoded image


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class ProfileOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: str
    updated_at: Optional[str] = None
    profile_picture: Optional[str] = None


class UploadProfilePictureResponse(BaseModel):
    success: bool
    profile_picture: Optional[str] = None
    message: str


@router.get("", response_model=ProfileOut)
async def get_profile(current_user=Depends(get_current_user)):
    """Get the current user's profile"""
    return ProfileOut(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        created_at=current_user.created_at.isoformat(),
        updated_at=current_user.updated_at.isoformat() if current_user.updated_at else None,
        profile_picture=current_user.profile_picture
    )


@router.patch("", response_model=ProfileOut)
async def update_profile(
    body: ProfileUpdateIn,
    current_user=Depends(get_current_user),
    repo=Depends(get_repo)
):
    """Update the current user's profile"""
    # Check if email is being updated and verify it's not taken
    if body.email and body.email != current_user.email:
        existing = await repo.get_user_by_email(body.email)
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="Email already registered")

    # Update the profile. Allow clearing avatar when client sends empty string
    success = await repo.update_user_profile(
        user_id=current_user.id,
        name=body.name,
        email=body.email,
        profile_picture=(body.profile_picture if body.profile_picture is not None else None)
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update profile")

    # Fetch the updated user
    updated_user = await repo.get_user_by_id(current_user.id)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")

    return ProfileOut(
        id=updated_user.id,
        name=updated_user.name,
        email=updated_user.email,
        created_at=updated_user.created_at.isoformat(),
        updated_at=updated_user.updated_at.isoformat() if updated_user.updated_at else None,
        profile_picture=updated_user.profile_picture
    )


@router.post("/change-password")
async def change_password(
    body: ChangePasswordIn,
    current_user=Depends(get_current_user),
    repo=Depends(get_repo)
):
    """Change the current user's password"""
    # Verify current password
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Hash new password
    new_hash = get_password_hash(body.new_password)

    # Update password
    await repo.update_user_password(user_id=current_user.id, new_hash=new_hash)

    return {"message": "Password updated successfully"}


@router.post("/upload-picture", response_model=UploadProfilePictureResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    repo=Depends(get_repo)
):
    """Upload a profile picture"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
            )

        # Read file content
        contents = await file.read()
        
        # Limit file size (3MB)
        if len(contents) > 3 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File too large. Maximum size: 3MB"
            )

        # Convert to base64
        base64_image = base64.b64encode(contents).decode("utf-8")
        data_uri = f"data:{file.content_type};base64,{base64_image}"

        # Update user profile with the image
        success = await repo.update_user_profile(
            user_id=current_user.id,
            profile_picture=data_uri
        )

        if not success:
            raise HTTPException(status_code=500, detail="Failed to update profile picture")

        return UploadProfilePictureResponse(
            success=True,
            profile_picture=data_uri,
            message="Profile picture uploaded successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload profile picture: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload profile picture")