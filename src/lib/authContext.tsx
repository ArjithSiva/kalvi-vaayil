import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { User, OrganizerSettings } from '@/types';

interface AuthContextType {
  user: User | null;
  organizerSettings: OrganizerSettings | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, selectedRole?: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizerSettings, setOrganizerSettings] = useState<OrganizerSettings | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('kv_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setOrganizerSettings(data.organizerSettings || null);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, selectedRole?: string) => {
    const { data } = await api.post('/auth/login', { email, password, selectedRole });
    localStorage.setItem('kv_token', data.token);
    localStorage.setItem('kv_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string, role?: string) => {
    const { data } = await api.post('/auth/register', { email, password, name, role });
    localStorage.setItem('kv_token', data.token);
    localStorage.setItem('kv_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('kv_token');
    localStorage.removeItem('kv_user');
    setToken(null);
    setUser(null);
    setOrganizerSettings(null);
  };

  return (
    <AuthContext.Provider value={{ user, organizerSettings, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
