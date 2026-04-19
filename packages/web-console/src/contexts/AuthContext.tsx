import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';
import { UserPublic } from '@authmaster/shared';

interface AuthContextType {
  user: UserPublic | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  setSession: (user: UserPublic, token: string) => void;
  register: (
    email: string,
    password: string,
    accountType: 'user' | 'merchant'
  ) => Promise<{ pendingReview: boolean }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp < Math.floor(Date.now() / 1000);
}

function loadStoredToken(): string | null {
  const token = localStorage.getItem('auth_token');
  if (!token) return null;
  if (isTokenExpired(token)) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    return null;
  }
  return token;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(() => {
    // Only restore user if token is still valid
    if (!loadStoredToken()) return null;
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserPublic;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(loadStoredToken);

  useEffect(() => {
    if (token) {
      const payload = parseJwtPayload(token);
      if (payload?.sub && payload?.email) {
        setUser(prev => ({
          id: payload.sub,
          email: payload.email,
          // Use least-privilege fallback to avoid accidentally exposing merchant-only UI.
          role: payload.role || prev?.role || 'user',
          status: payload.status || prev?.status || 'active',
          created_at: prev?.created_at || new Date(0).toISOString(),
        }));
      }
    } else {
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    setUser(result.user);
    setToken(result.token);
  };

  const setSession = (nextUser: UserPublic, nextToken: string) => {
    setUser(nextUser);
    setToken(nextToken);
    api.setToken(nextToken);
  };

  const register = async (email: string, password: string, accountType: 'user' | 'merchant') => {
    const created = await api.register(email, password, accountType);
    if (created.status === 'pending') {
      return { pendingReview: true };
    }

    // Auto-login after registration
    await login(email, password);
    return { pendingReview: false };
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_user');
  };

  const value = {
    user,
    token,
    login,
    setSession,
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
