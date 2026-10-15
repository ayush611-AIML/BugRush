import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { reconnectSocketWithAuth } from '../services/socket';

export function useAuth() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bugrush_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('bugrush_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Revalidate profile on mount
  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.getMe();
        setUser(data.user);
        localStorage.setItem('bugrush_user', JSON.stringify(data.user));
        reconnectSocketWithAuth(token, data.user);
      } catch (err) {
        console.warn('Session expired or invalid token:', err.message);
        // If guest or token expired, keep cached or allow re-auth
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = useCallback(async (loginIdentifier, password) => {
    setError(null);
    try {
      const res = await api.login({ login: loginIdentifier, password });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('bugrush_token', res.token);
      localStorage.setItem('bugrush_user', JSON.stringify(res.user));
      reconnectSocketWithAuth(res.token, res.user);
      return res.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async (username, email, password) => {
    setError(null);
    try {
      const res = await api.register({ username, email, password });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('bugrush_token', res.token);
      localStorage.setItem('bugrush_user', JSON.stringify(res.user));
      reconnectSocketWithAuth(res.token, res.user);
      return res.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const loginAsGuest = useCallback(async () => {
    setError(null);
    try {
      const res = await api.guest();
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('bugrush_token', res.token);
      localStorage.setItem('bugrush_user', JSON.stringify(res.user));
      reconnectSocketWithAuth(res.token, res.user);
      return res.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('bugrush_token');
    localStorage.removeItem('bugrush_user');
    reconnectSocketWithAuth(null, null);
  }, []);

  const updateUserStats = useCallback((ratingChange, isWin, isDraw) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        rating: Math.max(100, (prev.rating || 1000) + ratingChange),
        matches: (prev.matches || 0) + 1,
        wins: isWin ? (prev.wins || 0) + 1 : (prev.wins || 0),
        draws: isDraw ? (prev.draws || 0) + 1 : (prev.draws || 0),
        losses: (!isWin && !isDraw) ? (prev.losses || 0) + 1 : (prev.losses || 0)
      };
      localStorage.setItem('bugrush_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    user,
    token,
    loading,
    error,
    login,
    register,
    loginAsGuest,
    logout,
    updateUserStats
  };
}
