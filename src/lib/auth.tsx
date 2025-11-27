import { type PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { sessionApi } from './api';

export interface AuthUser {
  username: string;
  type: 'admin' | 'user';
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof AxiosError) {
    return (error.response?.data as { error?: string })?.error ?? fallback;
  }
  return fallback;
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sessionApi.get<{ user: AuthUser }>('/auth/me');
      setUser(response.data.user);
      setError(null);
    } catch (err) {
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (credentials: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await sessionApi.post<{ user: AuthUser }>('/auth/login', credentials);
      setUser(response.data.user);
      setError(null);
    } catch (err) {
      const message = getErrorMessage(err, 'Login failed');
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await sessionApi.post('/auth/logout');
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
      refresh,
    }),
    [user, loading, error, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}