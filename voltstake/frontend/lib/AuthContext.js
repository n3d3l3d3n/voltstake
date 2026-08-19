import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { api, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('voltstake_token') : null;
    if (token) refresh();
    else setLoading(false);
  }, [refresh]);

  const login = async (username, password) => {
    const { token, user } = await api.login({ username, password });
    setToken(token);
    setUser(user);
  };

  const register = async (username, email, password) => {
    const { token, user } = await api.register({ username, email, password });
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const setBalance = (balance) => setUser((u) => (u ? { ...u, balance } : u));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setBalance }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
