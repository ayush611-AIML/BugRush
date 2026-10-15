import React, { useState, useEffect } from 'react';
import { Search, X, Bot, Shield } from 'lucide-react';

export function RadarScan({ user, onCancel, onPlayBot }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const ratingDelta = Math.min(800, 100 + Math.floor(elapsed / 2) * 50);
  const userRating = user?.rating || 1000;
  const minRating = Math.max(0, userRating - ratingDelta);
  const maxRating = userRating + ratingDelta;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3B1E10]/50 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white border border-[#E8DDD2]/60 rounded-3xl p-8 text-center shadow-2xl overflow-hidden">
        {/* Radar concentric pulse rings in Warm Brown & Amber */}
        <div className="relative w-44 h-44 mx-auto my-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#C06520]/40 radar-ring" />
          <div className="absolute inset-0 rounded-full border border-[#C06520]/25 radar-ring-delay-1" />
          <div className="absolute inset-0 rounded-full border border-[#3B1E10]/20 radar-ring-delay-2" />

          <div className="w-24 h-24 rounded-full bg-[#FBF4EC] border border-[#C06520]/40 flex flex-col items-center justify-center shadow-sm z-10">
            <Search className="w-6 h-6 text-[#C06520] animate-pulse mb-1" />
            <span className="font-mono text-xs font-bold text-[#3B1E10] tracking-wider">
              {timeFormatted}
            </span>
          </div>
        </div>

        {/* Status text */}
        <h3 className="text-xl font-bold text-[#3B1E10] tracking-tight mb-1">
          Finding Worthy Opponent...
        </h3>
        <p className="text-xs text-[#8A7560] mb-4">
          Redis Matchmaking: Scanning <span className="font-mono text-[#C06520] font-semibold">queue:1v1</span> sorted set
        </p>

        {/* Rating Range Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FBF4EC] border border-[#E8DDD2]/60 text-xs font-mono text-[#3B1E10] mb-6">
          <Shield className="w-3.5 h-3.5 text-[#C06520]" />
          <span>Elo Window:</span>
          <span className="text-[#C06520] font-bold">{minRating} - {maxRating}</span>
          <span className="text-[10px] text-[#8A7560]">(±{ratingDelta})</span>
        </div>

        {/* Player Banner */}
        <div className="p-3.5 rounded-2xl bg-[#FBF4EC] border border-[#E8DDD2]/60 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3B1E10] flex items-center justify-center font-bold text-white shadow-xs">
              {user?.username?.slice(0, 1).toUpperCase() || 'Y'}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-[#3B1E10]">{user?.username || 'You'}</div>
              <div className="text-[11px] font-mono text-[#C06520] font-semibold">{userRating} Elo</div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#C06520]/10 text-[#C06520] border border-[#C06520]/25 font-bold">
              IN QUEUE
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FBF4EC] hover:bg-[#F0E5D8] border border-[#E8DDD2]/60 text-[#3B1E10] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4 text-[#8A7560]" />
            Cancel Matchmaking
          </button>

          <button
            onClick={onPlayBot}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#C06520] hover:bg-[#A8541A] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Bot className="w-4 h-4 text-[#E8C9A8]" />
            Instant Practice vs AI Bot
          </button>
        </div>
      </div>
    </div>
  );
}
