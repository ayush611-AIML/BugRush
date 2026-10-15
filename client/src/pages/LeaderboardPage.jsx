import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, RotateCcw, Clock, ArrowRight, UserCheck, Shield } from 'lucide-react';
import { api } from '../services/api';

export function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lbData, matchData] = await Promise.all([
        api.getLeaderboard(),
        api.getRecentMatches()
      ]);
      setLeaderboard(lbData.leaderboard || []);
      setRecentMatches(matchData.matches || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C06520]/10 border border-[#C06520]/25 text-[#C06520] text-xs font-mono mb-2">
            <Trophy className="w-3.5 h-3.5 text-[#C06520]" />
            RANKED ARENA
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3B1E10] tracking-tight">
            Leaderboard
          </h1>
          <p className="text-xs text-[#8A7560]">
            Authoritative ratings calculated via Elo ($K=32$) on every competitive 1v1 match.
          </p>
        </div>

        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white border border-[#E8DDD2] hover:bg-[#FBF4EC] text-[#3B1E10] text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-[#C06520] ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Top 3 Podium Cards - Warm Brown & Amber Editorial Palette */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {leaderboard.slice(0, 3).map((player, idx) => {
          const podiumStyles = [
            {
              bg: 'bg-gradient-to-b from-[#C06520]/15 to-white border-[#C06520]',
              badge: 'bg-[#C06520] text-white',
              title: '#1 Apex Master',
              eloColor: 'text-[#C06520]'
            },
            {
              bg: 'bg-gradient-to-b from-[#3B1E10]/10 to-white border-[#E8DDD2]',
              badge: 'bg-[#3B1E10] text-white',
              title: '#2 Grand Champion',
              eloColor: 'text-[#3B1E10]'
            },
            {
              bg: 'bg-gradient-to-b from-[#FBF4EC] to-white border-[#E8DDD2]',
              badge: 'bg-[#8A7560] text-white',
              title: '#3 High Challenger',
              eloColor: 'text-[#3B1E10]'
            }
          ];

          const style = podiumStyles[idx] || podiumStyles[2];

          return (
            <Link
              key={player._id}
              to={`/profile/${encodeURIComponent(player.username)}`}
              className={`p-6 rounded-2xl border ${style.bg} shadow-xs hover:shadow-md transition-all group block relative overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${style.badge}`}>
                  {style.title}
                </span>
                <span className="text-xs text-[#8A7560] group-hover:text-[#C06520] flex items-center gap-1 transition-colors">
                  View Profile <ArrowRight className="w-3 h-3" />
                </span>
              </div>

              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#3B1E10] flex items-center justify-center text-lg font-bold text-white shadow-xs">
                  {player.username.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-[#3B1E10] text-base group-hover:text-[#C06520] transition-colors">
                    {player.username}
                  </h3>
                  <div className={`text-sm font-mono font-extrabold ${style.eloColor}`}>
                    {player.rating} Elo
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-3 border-t border-[#E8DDD2]">
                <div>
                  <div className="text-[10px] text-[#8A7560] uppercase">Wins</div>
                  <div className="text-[#C06520] font-bold">{player.wins}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8A7560] uppercase">Losses</div>
                  <div className="text-rose-600 font-bold">{player.losses}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#8A7560] uppercase">Win Rate</div>
                  <div className="text-[#3B1E10] font-bold">
                    {player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0}%
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white border border-[#E8DDD2] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#E8DDD2] flex items-center justify-between bg-[#FBF4EC]">
          <div>
            <h2 className="text-sm font-bold text-[#3B1E10]">Ranked Ladder Standings</h2>
            <p className="text-xs text-[#8A7560]">Connected to live GET /api/leaderboard</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white border border-[#E8DDD2] text-[#3B1E10] font-semibold">
            {leaderboard.length} Ranked Developers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FBF4EC] text-[11px] font-mono text-[#8A7560] border-b border-[#E8DDD2] uppercase">
              <tr>
                <th className="px-6 py-3.5">Rank</th>
                <th className="px-6 py-3.5">Developer</th>
                <th className="px-6 py-3.5">Rating (Elo)</th>
                <th className="px-6 py-3.5">Matches</th>
                <th className="px-6 py-3.5">Record (W-L-D)</th>
                <th className="px-6 py-3.5">Win Rate</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DDD2]/60">
              {leaderboard.map((p, idx) => {
                const totalMatches = p.matches || (p.wins + p.losses + (p.draws || 0));
                const winRate = totalMatches > 0 ? Math.round((p.wins / totalMatches) * 100) : 0;
                return (
                  <tr key={p._id} className="hover:bg-[#FBF4EC]/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#8A7560]">
                      #{idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/profile/${encodeURIComponent(p.username)}`}
                        className="flex items-center gap-2.5 group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#3B1E10] flex items-center justify-center text-xs font-bold text-white shadow-xs">
                          {p.username.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-bold text-[#3B1E10] group-hover:text-[#C06520] transition-colors">
                          {p.username}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-[#C06520] text-sm">
                      {p.rating}
                    </td>
                    <td className="px-6 py-4 font-mono text-[#8A7560]">
                      {totalMatches}
                    </td>
                    <td className="px-6 py-4 font-mono text-[#8A7560]">
                      <span className="text-[#C06520] font-semibold">{p.wins}W</span> - <span className="text-rose-600 font-semibold">{p.losses}L</span> {p.draws ? `- ${p.draws}D` : ''}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-[#FBF4EC] rounded-full overflow-hidden border border-[#E8DDD2]">
                          <div
                            className="h-full bg-[#C06520] rounded-full"
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                        <span className="font-mono text-[#3B1E10] font-semibold">{winRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/profile/${encodeURIComponent(p.username)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#C06520] hover:bg-[#C06520]/10 transition-colors"
                      >
                        Profile &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Matches Section */}
      <div className="bg-white border border-[#E8DDD2] rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#3B1E10] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#C06520]" />
          Recent Match Activity
        </h2>

        <div className="space-y-2">
          {recentMatches.map((m) => (
            <div
              key={m._id}
              className="p-3.5 rounded-xl bg-[#FBF4EC] border border-[#E8DDD2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <Link
                  to={`/profile/${encodeURIComponent(m.player1?.username || '')}`}
                  className="font-bold text-[#3B1E10] hover:text-[#C06520]"
                >
                  {m.player1?.username || 'Player 1'}
                </Link>
                <span className="text-[10px] font-mono text-[#8A7560]">VS</span>
                <Link
                  to={`/profile/${encodeURIComponent(m.player2?.username || '')}`}
                  className="font-bold text-[#3B1E10] hover:text-[#C06520]"
                >
                  {m.player2?.username || 'Player 2'}
                </Link>
                <span className="text-[#E8DDD2]">&bull;</span>
                <span className="text-[#C06520] font-medium">{m.challengeTitle || 'Debugging Challenge'}</span>
              </div>

              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-[#C06520] font-bold">
                  Winner: {m.winnerUsername || 'Draw'}
                </span>
                <span className="text-[#8A7560]">{m.durationSeconds || 0}s duration</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
