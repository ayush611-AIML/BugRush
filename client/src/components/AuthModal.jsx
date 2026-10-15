import React, { useState } from 'react';
import { X, ShieldCheck, Zap, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';

export function AuthModal({ isOpen, onClose, onLogin, onRegister, onGuestLogin }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        await onLogin(username || email, password);
      } else {
        await onRegister(username, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setLoading(true);
    try {
      await onGuestLogin();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create guest session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3B1E10]/40 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white border border-[#E8DDD2] rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#8A7560] hover:text-[#3B1E10] hover:bg-[#FBF4EC] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C06520]/10 text-[#C06520] border border-[#C06520]/25 text-[11px] font-mono font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Argon2id Encrypted Auth
          </div>
          <h2 className="text-xl font-bold text-[#3B1E10] tracking-tight">
            {tab === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs text-[#8A7560] mt-1">
            Sign in to track your 1v1 Elo rating, climb the leaderboard, and save match history.
          </p>
        </div>

        {/* Quick Guest Play Banner */}
        <div className="mb-5 p-3.5 rounded-2xl bg-[#FBF4EC] border border-[#E8DDD2] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#3B1E10] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#C06520]" />
              Quick Practice Mode?
            </div>
            <div className="text-[11px] text-[#8A7560]">1-click instant session with 1000 base Elo</div>
          </div>
          <button
            onClick={handleGuest}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-[#3B1E10] hover:bg-[#2A1409] text-white text-xs font-bold transition-colors whitespace-nowrap shadow-xs"
          >
            Play as Guest
          </button>
        </div>

        {/* Tab Switch */}
        <div className="flex bg-[#FBF4EC] p-1 rounded-xl border border-[#E8DDD2] mb-4">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'login'
                ? 'bg-white text-[#3B1E10] font-bold shadow-xs'
                : 'text-[#8A7560] hover:text-[#3B1E10]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'register'
                ? 'bg-white text-[#3B1E10] font-bold shadow-xs'
                : 'text-[#8A7560] hover:text-[#3B1E10]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'register' ? (
            <div>
              <label className="block text-[11px] font-mono text-[#8A7560] font-semibold mb-1">USERNAME</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#8A7560] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. NeoHacker"
                  className="w-full bg-[#FBF4EC] border border-[#E8DDD2] focus:border-[#C06520] focus:bg-white focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-[#3B1E10] placeholder-[#8A7560]/60 transition-colors"
                />
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-[11px] font-mono text-[#8A7560] font-semibold mb-1">
              {tab === 'login' ? 'USERNAME OR EMAIL' : 'EMAIL ADDRESS'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8A7560] absolute left-3 top-2.5" />
              <input
                type={tab === 'register' ? 'email' : 'text'}
                required
                value={tab === 'register' ? email : (username || email)}
                onChange={(e) => {
                  if (tab === 'register') setEmail(e.target.value);
                  else {
                    setUsername(e.target.value);
                    setEmail(e.target.value);
                  }
                }}
                placeholder={tab === 'login' ? 'Username or email' : 'hacker@bugrush.dev'}
                className="w-full bg-[#FBF4EC] border border-[#E8DDD2] focus:border-[#C06520] focus:bg-white focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-[#3B1E10] placeholder-[#8A7560]/60 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#8A7560] font-semibold mb-1">PASSWORD</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8A7560] absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#FBF4EC] border border-[#E8DDD2] focus:border-[#C06520] focus:bg-white focus:outline-none rounded-xl pl-9 pr-3 py-2 text-xs text-[#3B1E10] placeholder-[#8A7560]/60 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 rounded-xl bg-[#C06520] hover:bg-[#A35215] text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {tab === 'login' ? 'Sign In to Arena' : 'Create Ranked Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
