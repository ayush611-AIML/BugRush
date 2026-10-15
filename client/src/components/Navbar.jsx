import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Bug, Trophy, User, Swords, Volume2, VolumeX, LogIn, LogOut } from 'lucide-react';
import { sound } from '../services/audio';

export function Navbar({
  user,
  onOpenAuth,
  onLogout,
  isConnected,
  isMuted,
  setIsMuted
}) {
  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const navItemClass = ({ isActive }) =>
    `px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
      isActive
        ? 'bg-[#3B1E10] text-white shadow-xs'
        : 'text-[#3B1E10]/70 hover:text-[#3B1E10] hover:bg-[#F0E5D8] border border-transparent'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8DDD2]/50 px-4 lg:px-8 py-3 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#3B1E10] p-0.5 shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center">
            <div className="w-full h-full bg-[#3B1E10] rounded-[10px] flex items-center justify-center border border-[#5e3f25]/30">
              <Bug className="w-5 h-5 text-[#C06520] group-hover:text-white transition-colors" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-[#3B1E10]">
                BUG<span className="text-[#C06520]">RUSH</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#C06520]/10 text-[#C06520] border border-[#C06520]/25 font-bold uppercase tracking-wider">
                1v1 Duel
              </span>
            </div>
            <p className="text-[11px] text-[#8A7560] hidden sm:block">
              Multiplayer Code Debugging Arena
            </p>
          </div>
        </Link>

        {/* Three Navigation Tabs: Play, Leaderboard, Profile */}
        <nav className="flex items-center gap-1.5 bg-[#FBF4EC] p-1 rounded-2xl border border-[#E8DDD2]/50 shadow-inner">
          <NavLink to="/" end className={navItemClass}>
            <Swords className="w-4 h-4 text-[#C06520]" />
            Play
          </NavLink>

          <NavLink to="/leaderboard" className={navItemClass}>
            <Trophy className="w-4 h-4 text-[#C06520]" />
            Leaderboard
          </NavLink>

          <NavLink to="/profile" className={navItemClass}>
            <User className="w-4 h-4 text-[#C06520]" />
            Profile
          </NavLink>
        </nav>

        {/* User Account & Controls */}
        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            className="p-2 rounded-xl bg-[#FBF4EC] hover:bg-[#F0E5D8] border border-[#E8DDD2]/50 text-[#3B1E10] transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-[#C06520]" />}
          </button>

          {/* Connection Status Dot */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              isConnected
                ? 'bg-[#C06520]/10 text-[#C06520] border-[#C06520]/25'
                : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
            }`}
            title={isConnected ? 'Connected to Socket.IO authoritative server' : 'Reconnecting to server...'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#C06520]' : 'bg-rose-600'}`} />
            <span className="hidden sm:inline font-semibold">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>

          {/* User Account / Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FBF4EC] border border-[#E8DDD2]/50 hover:bg-[#F0E5D8] transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-[#3B1E10] flex items-center justify-center text-xs font-bold text-white">
                  {user.username?.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-[#3B1E10] hidden sm:inline">{user.username}</span>
                <span className="text-[10px] font-mono text-[#C06520] font-semibold">{user.rating || 1000}</span>
              </Link>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-xl bg-[#FBF4EC] hover:bg-rose-50 border border-[#E8DDD2]/50 text-[#8A7560] hover:text-rose-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-[#3B1E10] text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:bg-[#2D150A] transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
