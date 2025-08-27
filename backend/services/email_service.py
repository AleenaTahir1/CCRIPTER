import os
import logging
from typing import List
from fastapi import HTTPException
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.conf = None
        self.fastmail = None
        self._initialize_email_config()
    
    def _initialize_email_config(self):
        """Initialize email configuration from environment variables"""
        try:
            # Get email configuration from environment
            smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
            smtp_port = int(os.getenv("SMTP_PORT", "587"))
            smtp_username = os.getenv("SMTP_USERNAME")
            smtp_password = os.getenv("SMTP_PASSWORD")
            mail_from = os.getenv("MAIL_FROM")
            mail_from_name = os.getenv("MAIL_FROM_NAME", "CCRIPT Agency")
            
            if not smtp_username or not smtp_password or not mail_from:
                logger.warning("Email configuration incomplete. Email sending will be disabled.")
                return
            
            self.conf = ConnectionConfig(
                MAIL_USERNAME=smtp_username,
                MAIL_PASSWORD=smtp_password,
                MAIL_FROM=mail_from,
                MAIL_FROM_NAME=mail_from_name,
                MAIL_PORT=smtp_port,
                MAIL_SERVER=smtp_server,
                MAIL_STARTTLS=True,
                MAIL_SSL_TLS=False,
                USE_CREDENTIALS=True,
                VALIDATE_CERTS=True
            )
            
            self.fastmail = FastMail(self.conf)
            logger.info("Email service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize email service: {e}")
            self.conf = None
            self.fastmail = None
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return self.fastmail is not None
    
    async def send_password_reset_email(self, email: EmailStr, reset_code: str, user_name: str = None):
        """Send password reset email with 6-digit code to user"""
        if not self.is_configured():
            logger.error("Email service not configured. Cannot send password reset email.")
            raise HTTPException(status_code=500, detail="Email service not available")
        
        try:
            # Email content
            subject = "🔐 Password Reset Code - CCRIPT Agency"
            
            html_body = f"""
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset Code - CCRIPT Agency</title>
    <!--[if mso]>
    <style type="text/css">
        table {{ border-collapse: collapse; }}
        .fallback-font {{ font-family: Arial, sans-serif !important; }}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 30px; border-bottom: 1px solid #f0f0f0; background-color: #ffffff; border-radius: 12px 12px 0 0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center">
                                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #FF5722 0%, #FF7043 100%); border-radius: 12px; display: inline-block; line-height: 60px; text-align: center; margin-bottom: 20px;">
                                            <span style="color: white; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">CC</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <h1 style="color: #FF5722; font-size: 24px; font-weight: 600; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.2;">Password Reset Code</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px; background-color: #ffffff;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="color: #333333; font-size: 16px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin-bottom: 20px;">
                                        <p style="margin: 0 0 20px 0;">Hello,</p>
                                        
                                        <p style="margin: 0 0 30px 0;">You requested a password reset for your <strong style="color: #FF5722;">CCRIPT Agency</strong> account. Use the verification code below to continue:</p>
                                    </td>
                                </tr>
                                
                                <!-- Code Section -->
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td align="center" style="background-color: #FF5722; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 20px 30px; border-radius: 8px; font-family: 'Courier New', monospace, Arial; border: 3px solid #FF5722;">
                                                    {reset_code}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <tr>
                                    <td style="color: #666666; font-size: 14px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; text-align: center; padding: 20px 0;">
                                        <p style="margin: 0 0 20px 0;">⏰ This code will expire in <strong style="color: #FF5722;">15 minutes</strong> for security.</p>
                                        
                                        <p style="margin: 0; color: #888888; font-size: 13px;">If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #FF5722; padding: 30px; border-radius: 0 0 12px 12px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center">
                                        <p style="color: #ffffff; font-size: 14px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; opacity: 0.95;">🔒 <strong>CCRIPT Agency</strong> - Secure AI Platform</p>
                                        <p style="color: #ffffff; font-size: 12px; margin: 10px 0 0 0; opacity: 0.8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">© 2024 CCRIPT Agency. All rights reserved.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            """
            
            text_body = f"""
🔐 Password Reset Code - CCRIPT Agency

Hello{f" {user_name}" if user_name else ""},

You requested a password reset for your CCRIPT Agency account.

Your verification code is: {reset_code}

⏰ This code will expire in 15 minutes for security reasons.

If you didn't request this password reset, please ignore this email. Your account remains secure.

Security Tips:
• Never share your verification code with anyone
• CCRIPT Agency will never ask for your code via phone or email
• If you suspect suspicious activity, contact our support team immediately

Best regards,
The CCRIPT Agency Team

🔒 CCRIPT Agency - Secure AI Platform
© 2024 CCRIPT Agency. All rights reserved.

This is an automated security message. Please do not reply to this email.
            """
            
            # FastAPI-Mail expects HTML content in `body` when subtype is MessageType.html
            # Providing both `body` (plain) and `html` can cause providers to render the plain text.
            # So we send only the HTML version here.
            message = MessageSchema(
                subject=subject,
                recipients=[email],
                body=html_body,
                subtype=MessageType.html,
            )
            
            await self.fastmail.send_message(message)
            logger.info(f"Password reset code email sent successfully to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {email}: {e}")
            raise HTTPException(status_code=500, detail="Failed to send email")
    
    async def send_welcome_email(self, email: EmailStr, user_name: str):
        """Send welcome email to new users (optional)"""
        if not self.is_configured():
            logger.warning("Email service not configured. Skipping welcome email.")
            return False
        
        try:
            subject = "Welcome to CCRIPT Agency! 🎉"
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    .container {{ max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 30px; background: #f9f9f9; }}
                    .footer {{ padding: 20px; text-align: center; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Welcome to CCRIPT Agency!</h1>
                    </div>
                    <div class="content">
                        <p>Hello {user_name},</p>
                        
                        <p>Welcome to CCRIPT Agency! We're excited to have you join our community.</p>
                        
                        <p>Your account has been successfully created and you can now access all our features:</p>
                        <ul>
                            <li>🤖 AI-powered chat assistant</li>
                            <li>🎤 Voice interaction capabilities</li>
                            <li>💬 Persistent conversation history</li>
                            <li>🎨 Modern, responsive interface</li>
                        </ul>
                        
                        <p>Get started by logging into your account and exploring our AI assistant!</p>
                        
                        <p>If you have any questions or need assistance, feel free to reach out to our team.</p>
                        
                        <p>Best regards,<br>
                        The CCRIPT Agency Team</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 CCRIPT Agency. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            message = MessageSchema(
                subject=subject,
                recipients=[email],
                body=html_body,
                subtype=MessageType.html,
            )
            
            await self.fastmail.send_message(message)
            logger.info(f"Welcome email sent successfully to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {email}: {e}")
            return False

# Global email service instance
email_service = EmailService()

# Convenience functions
async def send_password_reset_email(email: EmailStr, reset_code: str, user_name: str = None):
    """Send password reset email with 6-digit code"""
    return await email_service.send_password_reset_email(email, reset_code, user_name)

async def send_welcome_email(email: EmailStr, user_name: str):
    """Send welcome email"""
    return await email_service.send_welcome_email(email, user_name)

def is_email_service_configured() -> bool:
    """Check if email service is configured"""
    return email_service.is_configured()