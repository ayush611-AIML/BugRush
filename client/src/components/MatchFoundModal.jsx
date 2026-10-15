import React, { useState, useEffect } from 'react';
import { Swords, Zap, Bug } from 'lucide-react';
import { sound } from '../services/audio';

export function MatchFoundModal({ matchData, user }) {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    sound.playMatchFound();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!matchData) return null;

  const opponent = matchData.opponent || { username: 'Rival Developer', rating: 1000 };
  const challenge = matchData.challenge || { title: 'Debugging Challenge', difficulty: 'Medium' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3B1E10]/50 backdrop-blur-sm animate-in zoom-in-95">
      <div className="relative w-full max-w-lg bg-white border border-[#E8DDD2]/60 rounded-3xl p-8 text-center shadow-2xl overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C06520]/10 text-[#C06520] border border-[#C06520]/25 text-xs font-mono font-bold mb-4">
          <Zap className="w-3.5 h-3.5 text-[#C06520]" />
          MATCH FOUND
        </div>

        <h2 className="text-2xl font-black text-[#3B1E10] tracking-tight mb-1">
          Opponent Locked In!
        </h2>
        <p className="text-xs text-[#8A7560] mb-8">
          Entering Judge0 Sandboxed 1v1 Battle Arena
        </p>

        {/* 1v1 VS Showcase */}
        <div className="grid grid-cols-5 items-center gap-2 mb-8">
          {/* Player */}
          <div className="col-span-2 p-4 rounded-2xl bg-[#C06520]/10 border border-[#C06520]/25 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#C06520] flex items-center justify-center text-xl font-black text-white shadow-xs mb-2">
              {user?.username?.slice(0, 1).toUpperCase() || 'Y'}
            </div>
            <div className="font-bold text-sm text-[#3B1E10] truncate">{user?.username || 'You'}</div>
            <div className="text-xs font-mono text-[#C06520] font-bold">{user?.rating || 1000} Elo</div>
          </div>

          {/* VS Badge */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#FBF4EC] border border-[#E8DDD2]/60 flex items-center justify-center text-[#3B1E10] font-black text-xs">
              VS
            </div>
          </div>

          {/* Opponent */}
          <div className="col-span-2 p-4 rounded-2xl bg-[#3B1E10]/10 border border-[#3B1E10]/20 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#3B1E10] flex items-center justify-center text-xl font-black text-white shadow-xs mb-2">
              {opponent?.username?.slice(0, 1).toUpperCase() || 'O'}
            </div>
            <div className="font-bold text-sm text-[#3B1E10] truncate">{opponent.username}</div>
            <div className="text-xs font-mono text-[#8A7560] font-bold">{opponent.rating || 1000} Elo</div>
          </div>
        </div>

        {/* Challenge Preview */}
        <div className="p-4 rounded-2xl bg-[#FBF4EC] border border-[#E8DDD2]/60 text-left mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white border border-[#E8DDD2]/50 text-[#C06520]">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#3B1E10]">{challenge.title}</div>
              <div className="text-[11px] text-[#8A7560]">Function: <code className="text-[#C06520] font-semibold">{challenge.functionName || 'solve'}</code></div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            challenge.difficulty === 'Easy'
              ? 'bg-[#C06520]/10 text-[#C06520] border border-[#C06520]/25'
              : challenge.difficulty === 'Hard'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-[#3B1E10]/10 text-[#3B1E10] border border-[#3B1E10]/20'
          }`}>
            {challenge.difficulty || 'Medium'}
          </span>
        </div>

        {/* Countdown */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-4xl font-black font-mono text-[#C06520] animate-bounce">
            {countdown > 0 ? countdown : 'START!'}
          </div>
          <span className="text-[11px] font-mono text-[#8A7560] mt-1">Starting match in...</span>
        </div>
      </div>
    </div>
  );
}
