import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AuthService, { SignUpData, LoginData } from '../services/auth.service';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignUpData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // First check if we have a token
      const token = await AuthService.getToken();
      
      if (token) {
        // Try to get stored user first (faster)
        const storedUser = await AuthService.getStoredUser();
        
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
          
          // Optionally verify with server in background
          AuthService.getProfile()
            .then((profile) => {
              setUser(profile.user);
            })
            .catch((error) => {
              console.error('Background auth check failed:', error);
              // Don't update state here, let user continue with cached data
            });
        } else {
          // No cached user, fetch from server
          const profile = await AuthService.getProfile();
          setUser(profile.user);
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear any corrupted data
      await AuthService.clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginData) => {
    try {
      const response = await AuthService.login(data);
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.error || error.message || 'Login failed';
      throw new Error(message);
    }
  };

  const signup = async (data: SignUpData) => {
    try {
      const response = await AuthService.signup(data);
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Signup error:', error);
      const message = error.error || error.message || 'Sign up failed';
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const refreshAuth = async () => {
    setIsLoading(true);
    await checkAuthStatus();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        signup,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

