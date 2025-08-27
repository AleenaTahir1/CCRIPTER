import axios from 'axios';

// Point frontend to the active backend by default (can be overridden via REACT_APP_API_BASE)
export const API_BASE = process.env.REACT_APP_API_BASE || "https://f1580261af9f.ngrok-free.app";

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  signup: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login-json', data),
  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot', data),
  verifyCode: (data: { email: string; code: string }) =>
    api.post('/auth/verify-code', data),
  resetPassword: (data: { email: string; code: string; new_password: string }) =>
    api.post('/auth/reset-password', data),
  getCurrentUser: () => api.get('/auth/me'),
};

// Profile API
export const profileAPI = {
  getProfile: () => api.get('/profile'),
  updateProfile: (data: { name?: string; email?: string; profile_picture?: string }) =>
    api.patch('/profile', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/profile/change-password', data),
  uploadProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/upload-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Chat API
export const chatAPI = {
  createChat: (data: { title?: string }) => api.post('/chats', data),
  listChats: (limit = 100) => api.get(`/chats?limit=${limit}`),
  renameChat: (chatId: number, data: { title: string }) =>
    api.patch(`/chats/${chatId}`, data),
  deleteChat: (chatId: number, cascade = true) =>
    api.delete(`/chats/${chatId}?cascade=${cascade}`),
  getChatMessages: (chatId: number, limit = 200) =>
    api.get(`/chats/${chatId}/messages?limit=${limit}`),
  sendMessage: (data: { query: string; chat_id?: number }) =>
    api.post('/chat', data),
  sendVoiceMessage: (formData: FormData, chatId?: number) =>
    api.post(`/voice-chat${chatId ? `?chat_id=${chatId}` : ''}`, formData),
  listMessages: (limit = 50, chatId?: number) =>
    api.get(`/messages?limit=${limit}${chatId ? `&chat_id=${chatId}` : ''}`),
  chatWithDocument: (data: { query: string; document_ids?: number[]; chat_id?: number }) =>
    api.post('/chat-with-document', data),
};

// Document API
export const documentAPI = {
  uploadDocument: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },
  listDocuments: (limit = 50) => api.get(`/documents?limit=${limit}`),
  getDocument: (documentId: number) => api.get(`/documents/${documentId}`),
  deleteDocument: (documentId: number) => api.delete(`/documents/${documentId}`),
};

// Legacy endpoints for compatibility
export const endpoints = {
  chatStream: () => `${API_BASE}/chat/stream`,
  voiceChat: (format: 'json' | 'binary' = 'json') => `${API_BASE}/voice-chat?format=${format}`,
  speak: () => `${API_BASE}/speak`,
};

export default api;
