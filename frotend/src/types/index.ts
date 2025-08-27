export interface Document {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  extracted_text?: string;
}

export interface Message {
  id: number;
  user_id: string;
  chat_id?: number;
  timestamp: string;
  query: string;
  response: string;
}

export interface Chat {
  id: number;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at?: string;
  profile_picture?: string; // Base64 encoded image or URL
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  profile_picture?: string;
  created_at: string;
  updated_at?: string;
}

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
  profile_picture?: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ProfilePictureUploadResponse {
  success: boolean;
  profile_picture: string;
  message: string;
}