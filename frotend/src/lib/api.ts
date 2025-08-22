export const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

export const endpoints = {
  chatStream: () => `${API_BASE}/chat/stream`,
  voiceChat: (format: 'json' | 'binary' = 'json') => `${API_BASE}/voice-chat?format=${format}`,
  speak: () => `${API_BASE}/speak`,
};
