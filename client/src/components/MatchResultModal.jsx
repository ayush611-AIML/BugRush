import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Frown, Equal, RotateCcw, Home, TrendingUp, TrendingDown } from 'lucide-react';
import { sound } from '../services/audio';

export function MatchResultModal({
  matchEndData,
  currentUserId,
  onPlayAgain,
  onBackToLobby
}) {
  if (!matchEndData) return null;

  const isWinner = matchEndData.winner === currentUserId || matchEndData.winnerId === currentUserId;
  const isDraw = matchEndData.winner === 'draw' || matchEndData.winnerId === 'draw';

  const myRatingChange = matchEndData.ratingChanges?.[currentUserId] || {
    oldRating: 1000,
    newRating: 1000,
    delta: 0
  };

  useEffect(() => {
    if (isWinner) {
      sound.playVictory();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } else if (isDraw) {
      sound.playTestPass();
    } else {
      sound.playDefeat();
    }
  }, [isWinner, isDraw]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3B1E10]/50 backdrop-blur-sm animate-in zoom-in-95">
      <div className="relative w-full max-w-lg bg-white border border-[#E8DDD2]/60 rounded-3xl p-8 text-center shadow-2xl overflow-hidden">
        {/* Icon Header */}
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <div className={`w-full h-full rounded-2xl flex items-center justify-center shadow-sm ${
            isWinner
              ? 'bg-[#C06520] text-white'
              : (isDraw ? 'bg-[#3B1E10] text-white' : 'bg-rose-600 text-white')
          }`}>
            {isWinner ? (
              <Trophy className="w-10 h-10 animate-bounce" />
            ) : (
              isDraw ? <Equal className="w-10 h-10" /> : <Frown className="w-10 h-10" />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black text-[#3B1E10] tracking-tight mb-1">
          {isWinner ? 'VICTORY!' : (isDraw ? 'DRAW!' : 'DEFEAT')}
        </h2>
        <p className="text-xs text-[#8A7560] mb-6">
          {matchEndData.reason === 'SOLVED_ALL_TESTS'
            ? 'All visible & hidden tests successfully solved!'
            : (matchEndData.reason === 'OPPONENT_DISCONNECTED'
            ? 'Opponent surrendered / disconnected'
            : 'Match timer elapsed')}
        </p>

        {/* Elo Rating Card */}
        <div className="p-4 rounded-2xl bg-[#FBF4EC] border border-[#E8DDD2]/60 mb-6 flex items-center justify-around">
          <div className="text-left">
            <div className="text-[11px] font-mono text-[#8A7560] uppercase">Previous Elo</div>
            <div className="text-base font-bold text-[#3B1E10] font-mono">{myRatingChange.oldRating}</div>
          </div>

          <div className="flex flex-col items-center">
            <span className={`inline-flex items-center gap-1 font-mono font-black text-sm px-3 py-1 rounded-full ${
              myRatingChange.delta >= 0
                ? 'bg-[#C06520]/10 text-[#C06520] border border-[#C06520]/25'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {myRatingChange.delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {myRatingChange.delta >= 0 ? `+${myRatingChange.delta}` : myRatingChange.delta} Elo
            </span>
            <span className="text-[10px] text-[#8A7560] font-mono mt-0.5">K=32 Rating Formula</span>
          </div>

          <div className="text-right">
            <div className="text-[11px] font-mono text-[#8A7560] uppercase">New Elo</div>
            <div className="text-base font-bold text-[#3B1E10] font-mono">{myRatingChange.newRating}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
          <button
            onClick={onPlayAgain}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C06520] hover:bg-[#A8541A] text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Play Next Match
          </button>
          <button
            onClick={onBackToLobby}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#FBF4EC] hover:bg-[#F0E5D8] border border-[#E8DDD2]/60 text-[#3B1E10] font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-[#8A7560]" />
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
