import React, { useState, useEffect } from 'react';
import { Swords, Bot, Shield, Trophy, Bug, Sparkles, ArrowRight, Play, Terminal } from 'lucide-react';
import { api } from '../services/api';

export function LobbyPage({
  user,
  onFindMatch,
  onPlayBot,
  onOpenAuth
}) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChallenges() {
      try {
        const data = await api.getChallenges();
        setChallenges(data.challenges || []);
      } catch (err) {
        console.error('Failed to load challenges:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchChallenges();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-10">
      {/* Hero Battle CTA Section - Warm Cream & Amber Editorial */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#FBF4EC] via-[#F5E6D8] to-[#FBF4EC] text-[#3B1E10] p-8 lg:p-12 overflow-hidden shadow-sm border border-[#E8DDD2]/40">
        {/* Warm Ambient Decorative Shapes */}
        <div className="absolute top-[-60px] right-[-40px] w-[340px] h-[340px] bg-gradient-to-br from-[#C06520]/20 via-[#E8C9A8]/30 to-[#F5E6D8]/20 rounded-full blur-sm pointer-events-none" />
        <div className="absolute top-[60px] right-[80px] w-[200px] h-[200px] bg-gradient-to-tl from-[#D4882E]/15 via-[#F0D5B8]/25 to-transparent rounded-full pointer-events-none" />
        <div className="absolute top-[140px] right-[220px] w-[90px] h-[90px] bg-gradient-to-br from-[#C06520]/12 to-[#E8C9A8]/20 rounded-full blur-xs pointer-events-none" />
        <div className="absolute bottom-[20px] right-[40px] w-[120px] h-[120px] bg-gradient-to-t from-[#E8DDD2]/30 to-[#F5E6D8]/15 rounded-full blur-sm pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#F5E6D8]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C06520]/10 border border-[#C06520]/20 text-[#C06520] text-xs font-mono mb-4">
            <Swords className="w-3.5 h-3.5 text-[#C06520]" />
            REAL-TIME 1v1 SPEED-DEBUGGING ARENA
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-4 text-[#3B1E10]">
            Two Developers. One Broken Codebase.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C06520] via-[#D4882E] to-[#E8A860]">
              First to Fix Wins.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#8A7560] leading-relaxed mb-8">
            Race head-to-head in synchronized browser Monaco editor duels. Code executes securely in a Judge0 CE sandbox with 2s CPU limits and 128MB RAM. Pass all hidden tests first to climb the ranked Elo ladder.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={onFindMatch}
              className="px-8 py-4 rounded-2xl bg-[#C06520] hover:bg-[#A8541A] text-white font-black text-sm tracking-wide shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2.5"
            >
              <Swords className="w-5 h-5" />
              Find 1v1 Ranked Match
            </button>

            <button
              onClick={onPlayBot}
              className="px-6 py-4 rounded-2xl bg-white hover:bg-[#FBF4EC] border border-[#E8DDD2] text-[#3B1E10] font-bold text-sm transition-all flex items-center gap-2.5 shadow-xs"
            >
              <Bot className="w-5 h-5 text-[#C06520]" />
              Practice vs AI BugBot
            </button>
          </div>
        </div>
      </div>

      {/* Highlights Grid - Cloud White Cards with Sand Borders and Chocolate Headers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E8DDD2]/60 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#C06520]/10 border border-[#C06520]/25 flex items-center justify-center text-[#C06520] mb-3">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#3B1E10]">Judge0 Sandboxed Security</h3>
          <p className="text-xs text-[#8A7560] leading-relaxed">
            Every submission runs in an isolated container with 2.0s CPU limit, 128MB RAM limit, and network access disabled.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8DDD2]/60 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#C06520]/10 border border-[#C06520]/25 flex items-center justify-center text-[#C06520] mb-3">
            <Trophy className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#3B1E10]">Authoritative Elo ($K=32$)</h3>
          <p className="text-xs text-[#8A7560] leading-relaxed">
            Redis-backed matchmaking in <code className="text-[#C06520] font-mono font-semibold">queue:1v1</code> sorted set with rating window expansion and instant ladder updates.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8DDD2]/60 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#3B1E10]/10 border border-[#3B1E10]/20 flex items-center justify-center text-[#3B1E10] mb-3">
            <Bug className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#3B1E10]">20 Hand-Crafted Bugs</h3>
          <p className="text-xs text-[#8A7560] leading-relaxed">
            Curated JavaScript debugging challenges across 3 difficulty tiers. Each with visible + hidden test suites for tamper-proof verification.
          </p>
        </div>
      </div>

      {/* Challenge Catalog Preview */}
      <div className="bg-white border border-[#E8DDD2]/60 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#E8DDD2]/60 flex items-center justify-between bg-[#FBF4EC]">
          <div>
            <h2 className="text-sm font-bold text-[#3B1E10]">Challenge Catalog</h2>
            <p className="text-xs text-[#8A7560]">20 debugging challenges from /api/challenges</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white border border-[#E8DDD2]/60 text-[#3B1E10] font-semibold">
            {challenges.length} Challenges
          </span>
        </div>

        <div className="divide-y divide-[#E8DDD2]/30">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#8A7560]">Loading challenges from MongoDB...</div>
          ) : (
            challenges.slice(0, 8).map((c) => (
              <div key={c._id} className="px-6 py-3.5 flex items-center justify-between hover:bg-[#FBF4EC]/80 transition-colors">
                <div className="flex items-center gap-3">
                  <Bug className="w-4 h-4 text-[#C06520]" />
                  <div>
                    <div className="text-xs font-bold text-[#3B1E10]">{c.title}</div>
                    <div className="text-[11px] text-[#8A7560] font-mono">
                      {c.functionName}() &bull; {c.visibleTests?.length || 2} visible + {c.hiddenTests?.length || 4} hidden tests
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  c.difficulty === 'Easy'
                    ? 'bg-[#C06520]/10 text-[#C06520] border border-[#C06520]/25'
                    : c.difficulty === 'Hard'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-[#3B1E10]/10 text-[#3B1E10] border border-[#3B1E10]/20'
                }`}>
                  {c.difficulty}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
