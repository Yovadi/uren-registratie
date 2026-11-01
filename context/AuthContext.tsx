import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DEMO_USERS,
  authenticate,
  type AuthSession,
  type DemoUser,
} from '@/domain';

const SESSION_KEY = 'hotraco-speria-fsm:session';

type AuthCtx = {
  ready: boolean;
  session: AuthSession | null;
  users: DemoUser[];
  login: (userId: string, pin: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) setSession(JSON.parse(raw) as AuthSession);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const persist = (next: AuthSession | null) => {
    setSession(next);
    if (typeof localStorage === 'undefined') return;
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  };

  const login = useCallback((userId: string, pin: string) => {
    const result = authenticate(userId, pin);
    if (!result) return { ok: false as const, error: 'Onjuiste PIN of gebruiker.' };
    persist(result);
    return { ok: true as const };
  }, []);

  const logout = useCallback(() => {
    persist(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      session,
      users: DEMO_USERS,
      login,
      logout,
    }),
    [ready, session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
