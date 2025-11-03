import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear all stored data
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      } catch (e) {
        console.error('Failed to clear auth data:', e);
      }
    }
    return Promise.reject(error);
  }
);

export interface SignUpData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface UserProfile {
  user: {
    id: number;
    name: string;
    email: string;
    createdAt: string;
  };
}

class AuthService {
  // Store token securely
  async storeToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token:', error);
      throw new Error('Failed to save authentication data');
    }
  }

  // Store user data
  async storeUser(user: User): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user:', error);
      throw new Error('Failed to save user data');
    }
  }

  // Get stored token
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  // Get stored user
  async getStoredUser(): Promise<User | null> {
    try {
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  // Remove all auth data
  async clearAuthData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  // Sign up
  async signup(data: SignUpData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/signup', data);
      if (response.data.token && response.data.user) {
        await this.storeToken(response.data.token);
        await this.storeUser(response.data.user);
      }
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  // Login
  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', data);
      if (response.data.token && response.data.user) {
        await this.storeToken(response.data.token);
        await this.storeUser(response.data.user);
      }
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  // Logout
  async logout(): Promise<void> {
    await this.clearAuthData();
  }

  // Get current user profile from server
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await api.get<UserProfile>('/auth/me');
      // Update stored user data
      if (response.data.user) {
        await this.storeUser(response.data.user);
      }
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.clearAuthData();
      }
      throw error;
    }
  }

  // Check authentication status
  async checkAuth(): Promise<{
    isAuthenticated: boolean;
    userId: number | null;
    email: string | null;
  }> {
    try {
      const response = await api.get('/auth/check');
      return response.data;
    } catch (error) {
      return {
        isAuthenticated: false,
        userId: null,
        email: null,
      };
    }
  }

  // Forgot password
  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw new Error('Failed to send reset email');
    }
  }

  // Reset password
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw new Error('Failed to reset password');
    }
  }
}

export default new AuthService();

