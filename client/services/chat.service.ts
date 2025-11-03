import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Use Railway URL or fallback to localhost:3000 (backend default port)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Log API URL for debugging (remove in production)
if (__DEV__) {
  console.log('🔗 API Base URL:', API_BASE_URL);
}
const TOKEN_KEY = 'auth_token';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for streaming
});

// Request interceptor to add token to headers
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface Message {
  id: string;
  chatId?: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
  metadata?: any;
}

export interface Chat {
  id: string;
  userId?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  messages?: Message[];
}

class ChatService {
  // Get all user chats
  async getUserChats(): Promise<{ chats: Chat[] }> {
    try {
      const response = await api.get<{ chats: Chat[] }>('/api/chats');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch chats:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch chats');
    }
  }

  // Create new chat
  async createChat(title?: string): Promise<{ chat: Chat }> {
    try {
      const response = await api.post<{ chat: Chat }>('/api/chats', {
        title: title || 'New Chat',
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to create chat:', error);
      throw new Error(error.response?.data?.error || 'Failed to create chat');
    }
  }

  // Get specific chat with messages
  async getChatById(chatId: string): Promise<{ chat: Chat }> {
    try {
      const response = await api.get<{ chat: Chat }>(`/api/chats/${chatId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch chat:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch chat');
    }
  }

  // Send message with streaming response
  async sendMessage(
    chatId: string,
    content: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      
      const response = await fetch(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          
          if (onChunk) {
            onChunk(chunk);
          }
        }
      }

      return fullResponse;
    } catch (error: any) {
      console.error('Failed to send message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Update chat title
  async updateChat(chatId: string, title: string): Promise<{ chat: Chat }> {
    try {
      const response = await api.patch<{ chat: Chat }>(`/api/chats/${chatId}`, {
        title,
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to update chat:', error);
      throw new Error(error.response?.data?.error || 'Failed to update chat');
    }
  }

  // Delete chat
  async deleteChat(chatId: string): Promise<void> {
    try {
      await api.delete(`/api/chats/${chatId}`);
    } catch (error: any) {
      console.error('Failed to delete chat:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete chat');
    }
  }

  // Clear chat messages
  async clearChatMessages(chatId: string): Promise<void> {
    try {
      await api.delete(`/api/chats/${chatId}/messages`);
    } catch (error: any) {
      console.error('Failed to clear messages:', error);
      throw new Error(error.response?.data?.error || 'Failed to clear messages');
    }
  }
}

export default new ChatService();

