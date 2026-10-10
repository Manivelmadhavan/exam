import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/endpoints';
import type { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null; loading: boolean; sessionExpired: boolean;
  loginAdmin: (identifier: string, password: string) => Promise<void>;
  loginStudent: (studentId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const refresh = useCallback(async () => {
    try { setUser((await authApi.me()).user); } catch { setUser(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const onExpired = () => { setUser((u) => { if (u) setSessionExpired(true); return null; }); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, loading, sessionExpired,
    loginAdmin: async (i, p) => { setUser((await authApi.adminLogin(i, p)).user); setSessionExpired(false); },
    loginStudent: async (i, p) => { setUser((await authApi.studentLogin(i, p)).user); setSessionExpired(false); },
    logout: async () => { try { await authApi.logout(); } finally { setUser(null); setSessionExpired(false); } },
    refresh,
  }), [user, loading, sessionExpired, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
