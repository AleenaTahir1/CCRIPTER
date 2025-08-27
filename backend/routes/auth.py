from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
import logging

from ..security import get_password_hash, verify_password, create_access_token, get_current_user
from ..db.repo import get_repo
from ..services.email_service import send_password_reset_email, send_welcome_email, is_email_service_configured

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"]) 


class SignupIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SignupOut(BaseModel):
    message: str
    user_id: int
    email: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str


class VerifyCodeIn(BaseModel):
    email: EmailStr
    code: str


class ResetPasswordIn(BaseModel):
    email: EmailStr
    code: str
    new_password: str


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


@router.post("/signup", response_model=SignupOut)
async def signup(body: SignupIn, repo=Depends(get_repo)):
    # Check if email exists
    existing = await repo.get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    pwd_hash = get_password_hash(body.password)
    user = await repo.create_user(name=body.name, email=body.email, password_hash=pwd_hash)
    
    # Optionally send welcome email (won't fail if email service is not configured)
    try:
        if is_email_service_configured():
            await send_welcome_email(user.email, user.name)
    except Exception as e:
        logger.warning(f"Failed to send welcome email to {user.email}: {e}")
    
    return SignupOut(
        message="Account created successfully. Please login to continue.",
        user_id=user.id,
        email=user.email
    )


@router.post("/login", response_model=TokenOut)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), repo=Depends(get_repo)):
    # Swagger's OAuth2 password flow sends form fields. We treat username as email.
    user = await repo.get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(uid=user.id, email=user.email)
    return TokenOut(access_token=token)

# Optional JSON login if you need programmatic login without form-encoding
@router.post("/login-json", response_model=TokenOut)
async def login_json(body: LoginIn, repo=Depends(get_repo)):
    user = await repo.get_user_by_email(body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(uid=user.id, email=user.email)
    return TokenOut(access_token=token)


@router.post("/forgot")
async def forgot(body: ForgotIn, repo=Depends(get_repo)):
    user = await repo.get_user_by_email(body.email)
    # Always return 200 to avoid user enumeration
    if not user:
        logger.info(f"Password reset requested for non-existent email: {body.email}")
        return {
            "ok": True, 
            "message": "If an account with this email exists, a verification code has been sent."
        }
    
    try:
        # Create 6-digit password reset code (15 minutes expiry)
        code = await repo.create_password_reset(user_id=user.id, ttl_minutes=15)
        
        # Check if email service is configured
        if not is_email_service_configured():
            logger.error("Email service not configured. Cannot send password reset email.")
            # For development: return code if email is not configured
            return {
                "ok": True, 
                "message": "Email service not configured.",
                "dev_reset_code": code,
                "warning": "Email service not configured. Use dev_reset_code for testing."
            }
        
        # Send password reset email with 6-digit code
        await send_password_reset_email(user.email, code, user.name)
        logger.info(f"Password reset code sent successfully to {user.email}")
        
        return {
            "ok": True, 
            "message": "If an account with this email exists, a verification code has been sent to your email address."
        }
        
    except Exception as e:
        logger.error(f"Failed to process password reset for {body.email}: {e}")
        # Don't expose internal errors to prevent information leakage
        return {
            "ok": True, 
            "message": "If an account with this email exists, a verification code has been sent to your email address."
        }


@router.post("/verify-code")
async def verify_code(body: VerifyCodeIn, repo=Depends(get_repo)):
    """Verify the 6-digit reset code without consuming it"""
    try:
        # Get user by email
        user = await repo.get_user_by_email(body.email)
        if not user:
            raise HTTPException(status_code=400, detail="Invalid verification code")
        
        # Verify the code
        is_valid = await repo.verify_reset_code(user.id, body.code)
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
        return {
            "ok": True, 
            "message": "Verification code is valid. You may now reset your password."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to verify code for {body.email}: {e}")
        raise HTTPException(status_code=400, detail="Invalid verification code")


@router.post("/reset-password")
async def reset_password(body: ResetPasswordIn, repo=Depends(get_repo)):
    """Reset password using email, code, and new password"""
    try:
        # Get user by email
        user = await repo.get_user_by_email(body.email)
        if not user:
            raise HTTPException(status_code=400, detail="Invalid verification code")
        
        # Use (consume) the reset code
        code_used = await repo.use_password_reset(user.id, body.code)
        
        if not code_used:
            raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
        # Update password
        from ..security import get_password_hash
        new_hash = get_password_hash(body.new_password)
        await repo.update_user_password(user_id=user.id, new_hash=new_hash)
        
        logger.info(f"Password reset successful for user {user.email}")
        return {
            "ok": True, 
            "message": "Your password has been reset successfully. You can now login with your new password."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reset password for {body.email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password")


@router.get("/me")
async def me(current_user = Depends(get_current_user)):
    return {
        "id": current_user.id, 
        "name": current_user.name, 
        "email": current_user.email,
        "profile_picture": current_user.profile_picture
    }


@router.put("/profile", response_model=ProfileOut)
async def update_profile(body: ProfileUpdateIn, repo=Depends(get_repo), current_user = Depends(get_current_user)):
    """Update user profile information"""
    try:
        # Check if email is being changed and if it's already taken
        if body.email and body.email.lower() != current_user.email.lower():
            existing_user = await repo.get_user_by_email(body.email)
            if existing_user and existing_user.id != current_user.id:
                raise HTTPException(status_code=400, detail="Email is already registered")
        
        # Update profile
        success = await repo.update_user_profile(
            user_id=current_user.id,
            name=body.name,
            email=body.email,
            profile_picture=body.profile_picture
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        # Get updated user info
        updated_user = await repo.get_user_by_id(current_user.id)
        if not updated_user:
            raise HTTPException(status_code=500, detail="Failed to retrieve updated profile")
        
        return ProfileOut(
            id=updated_user.id,
            name=updated_user.name,
            email=updated_user.email,
            created_at=updated_user.created_at.isoformat(),
            updated_at=updated_user.updated_at.isoformat() if updated_user.updated_at else None,
            profile_picture=updated_user.profile_picture
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update profile for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.post("/change-password")
async def change_password(body: ChangePasswordIn, repo=Depends(get_repo), current_user = Depends(get_current_user)):
    """Change user password"""
    try:
        # Verify current password
        if not verify_password(body.current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Validate new password
        if len(body.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")
        
        # Hash new password and update
        new_hash = get_password_hash(body.new_password)
        await repo.update_user_password(current_user.id, new_hash)
        
        logger.info(f"Password changed successfully for user {current_user.email}")
        return {"ok": True, "message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to change password for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to change password")
