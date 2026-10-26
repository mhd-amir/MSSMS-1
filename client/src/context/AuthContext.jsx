import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const authApi = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api', timeout: 15000 });

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('mssms_token'));
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('mssms_user') || 'null'); } catch { return null; } });
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('mssms_token')));
  useEffect(() => {
    let alive = true;
    const savedToken = localStorage.getItem('mssms_token');
    if (!savedToken) { setLoading(false); return undefined; }
    authApi.get('/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } })
      .then(({ data }) => { if (alive) { setUser(data.user); localStorage.setItem('mssms_user', JSON.stringify(data.user)); } })
      .catch(() => { if (alive) { localStorage.removeItem('mssms_token'); localStorage.removeItem('mssms_user'); setToken(null); setUser(null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    const clearSession = () => { localStorage.removeItem('mssms_token'); localStorage.removeItem('mssms_user'); setToken(null); setUser(null); };
    window.addEventListener('mssms:unauthorized', clearSession);
    return () => window.removeEventListener('mssms:unauthorized', clearSession);
  }, []);
  function acceptSession(session) { localStorage.setItem('mssms_token', session.token); localStorage.setItem('mssms_user', JSON.stringify(session.user)); setToken(session.token); setUser(session.user); }
  async function login(login, password) { const { data } = await authApi.post('/auth/login', { login, password }); acceptSession(data); return data.user; }
  async function register(details) { const { data } = await authApi.post('/auth/register', details, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined); acceptSession(data); return data.user; }
  function logout() { localStorage.removeItem('mssms_token'); localStorage.removeItem('mssms_user'); setToken(null); setUser(null); }
  const value = useMemo(() => ({ token, user, loading, login, register, logout, isAuthenticated: Boolean(token && user), hasRole: (...roles) => roles.includes(user?.role) }), [token, user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within AuthProvider'); return context; }
