import React from 'react';

export function OpponentProgressBar({
  myUsername,
  myRating,
  myPassed,
  totalTests,
  opponentUsername,
  opponentRating,
  opponentPassed,
  isOpponentBot
}) {
  const myPercent = Math.min(100, Math.round(((myPassed || 0) / (totalTests || 1)) * 100));
  const oppPercent = Math.min(100, Math.round(((opponentPassed || 0) / (totalTests || 1)) * 100));

  return (
    <div className="bg-white border border-[#E8DDD2]/60 rounded-2xl p-4 shadow-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* My Progress - Warm Amber Accent */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C06520] animate-pulse" />
              <span className="font-bold text-[#3B1E10]">{myUsername || 'You'}</span>
              <span className="text-[10px] font-mono text-[#C06520] font-semibold">({myRating || 1000} Elo)</span>
            </div>
            <div className="font-mono text-xs font-bold text-[#C06520]">
              {myPassed || 0} / {totalTests || 0} Passed
            </div>
          </div>
          <div className="h-2.5 w-full bg-[#FBF4EC] rounded-full overflow-hidden border border-[#E8DDD2]/40 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#C06520] to-[#D4882E] rounded-full transition-all duration-500 ease-out shadow-xs"
              style={{ width: `${myPercent}%` }}
            />
          </div>
        </div>

        {/* Opponent Progress - Dark Chocolate Accent */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3B1E10] animate-pulse" />
              <span className="font-bold text-[#3B1E10]">{opponentUsername || 'Opponent'}</span>
              {isOpponentBot ? (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#3B1E10]/10 text-[#3B1E10] font-semibold">
                  AI
                </span>
              ) : null}
              <span className="text-[10px] font-mono text-[#8A7560] font-semibold">({opponentRating || 1000} Elo)</span>
            </div>
            <div className="font-mono text-xs font-bold text-[#3B1E10]">
              {opponentPassed || 0} / {totalTests || 0} Passed
            </div>
          </div>
          <div className="h-2.5 w-full bg-[#FBF4EC] rounded-full overflow-hidden border border-[#E8DDD2]/40 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#3B1E10] to-[#5A3820] rounded-full transition-all duration-500 ease-out shadow-xs"
              style={{ width: `${oppPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
