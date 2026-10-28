'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  totalEnergyUsed?: number;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      let parsedUser: User | null = null;
      try {
        parsedUser = JSON.parse(savedUser);
      } catch {
        parsedUser = null;
      }

      if (!parsedUser) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      fetch('/api/auth/verify', { headers: { Authorization: `Bearer ${savedToken}` } })
        .then(async (response) => {
          if (!response.ok) throw new Error('Invalid session');
          const data = await response.json();
          setToken(savedToken);
          setUser(data.user || parsedUser);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
      return;
    }

    setLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    login: (nextUser, nextToken) => {
      localStorage.setItem('token', nextToken);
      localStorage.setItem('user', JSON.stringify(nextUser));
      setUser(nextUser);
      setToken(nextToken);
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
    }
  }), [loading, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
