import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import type { Profile } from '../types';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  refresh(): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.currentUser());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value: AuthState = {
    user,
    loading,
    refresh,
    async signIn(email, password) {
      setUser(await api.signIn(email, password));
    },
    async signOut() {
      await api.signOut();
      setUser(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}

export const isAdmin = (u: Profile | null) => !!u && u.active && u.role === 'admin';

export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10 text-center text-slate-500">Carregando…</div>;
  if (!user) return <Navigate to="/app/login" replace state={{ from: loc.pathname }} />;
  if (!user.active) return <Navigate to="/app/aguardando" replace />;
  if (admin && user.role !== 'admin')
    return (
      <div className="card mx-auto mt-10 max-w-md text-center">
        <p className="text-lg font-bold">Acesso restrito</p>
        <p className="mt-1 text-slate-600">Esta área é só do administrador.</p>
      </div>
    );
  return <>{children}</>;
}
