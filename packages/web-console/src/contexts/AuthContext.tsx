import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';
import { UserPublic } from '@authmaster/shared';

interface AuthContextType {
  user: UserPublic | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));

  useEffect(() => {
    if (token) {
      // In production, validate token and fetch user data
      // For now, we'll just mark as authenticated
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    setUser(result.user);
    setToken(result.token);
  };

  const register = async (email: string, password: string) => {
    await api.register(email, password);
    // Auto-login after registration
    await login(email, password);
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
