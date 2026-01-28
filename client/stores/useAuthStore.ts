import { create } from 'zustand';
import AuthService, { SignUpData, LoginData } from '../services/auth.service';
import SocketManager from '../services/socket.service';

export interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  
  // Auth operations
  checkAuthStatus: () => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignUpData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Basic setters
  setUser: (user) => set({ user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsLoading: (isLoading) => set({ isLoading }),

  // Check authentication status
  checkAuthStatus: async () => {
    try {
      // First check if we have a token
      const token = await AuthService.getToken();
      
      if (token) {
        // Try to get stored user first (faster)
        const storedUser = await AuthService.getStoredUser();
        
        if (storedUser) {
          set({ 
            user: storedUser, 
            isAuthenticated: true 
          });
          
          // Optionally verify with server in background
          AuthService.getProfile()
            .then((profile) => {
              set({ user: profile.user });
            })
            .catch((error) => {
              console.error('Background auth check failed:', error);
              // Don't update state here, let user continue with cached data
            });
        } else {
          // No cached user, fetch from server
          const profile = await AuthService.getProfile();
          set({ 
            user: profile.user, 
            isAuthenticated: true 
          });
        }
      } else {
        set({ 
          user: null, 
          isAuthenticated: false 
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear any corrupted data
      await AuthService.clearAuthData();
      set({ 
        user: null, 
        isAuthenticated: false 
      });
    } finally {
      set({ isLoading: false });
    }
  },

  // Login user
  login: async (data) => {
    try {
      const response = await AuthService.login(data);
      set({ 
        user: response.user, 
        isAuthenticated: true 
      });
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.error || error.message || 'Login failed';
      throw new Error(message);
    }
  },

  // Sign up user
  signup: async (data) => {
    try {
      const response = await AuthService.signup(data);
      set({ 
        user: response.user, 
        isAuthenticated: true 
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      const message = error.error || error.message || 'Sign up failed';
      throw new Error(message);
    }
  },

  // Logout user
  logout: async () => {
    try {
      // Disconnect socket first
      SocketManager.disconnect();
      
      // Then clear auth data
      await AuthService.logout();
      set({ 
        user: null, 
        isAuthenticated: false 
      });
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },

  // Refresh authentication
  refreshAuth: async () => {
    set({ isLoading: true });
    await get().checkAuthStatus();
  },
}));

// Initialize auth check on store creation
useAuthStore.getState().checkAuthStatus();
