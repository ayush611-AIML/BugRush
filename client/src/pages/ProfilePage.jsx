import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, Trophy, Shield, Swords, Search, Clock, ArrowRight, RotateCcw, CheckCircle2, XCircle, Equal, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export function ProfilePage({ user: authUser, onOpenAuth }) {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();

  const targetUsername = routeUsername || authUser?.username;
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      if (!targetUsername) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Calls GET /api/profile/:username
        const data = await api.getProfile(targetUsername);
        setProfileData(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message || `Could not find profile for '${targetUsername}'`);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [targetUsername]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/profile/${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // If no target user and not logged in
  if (!targetUsername && !authUser) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-white border border-[#E8DDD2] text-center shadow-xs">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#C06520]/10 border border-[#C06520]/25 flex items-center justify-center text-[#C06520]">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#3B1E10] mb-2">Sign in to View Profile</h2>
        <p className="text-xs text-[#8A7560] mb-6">
          Log in or create a guest session to view your 1v1 battle history, Elo rating, and duel records.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-xl bg-[#C06520] hover:bg-[#A35215] text-white font-bold text-xs shadow-xs transition-colors"
        >
          Sign In / Play as Guest
        </button>
      </div>
    );
  }

  const username = profileData?.username || targetUsername;
  const stats = profileData?.stats || {
    rating: profileData?.rating || 1000,
    wins: 0,
    losses: 0,
    draws: 0,
    matches: 0,
    winRate: '0%'
  };
  const matches = profileData?.matches || [];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Search Bar for Any Player */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E8DDD2] shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#3B1E10]">
          <Search className="w-4 h-4 text-[#C06520]" />
          <span>Look Up Player Profile:</span>
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username (e.g. NeoHacker)..."
            className="w-full sm:w-72 px-3.5 py-1.5 rounded-xl bg-[#FBF4EC] border border-[#E8DDD2] text-xs text-[#3B1E10] placeholder-[#8A7560]/60 focus:outline-none focus:border-[#C06520] focus:bg-white transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-xl bg-[#3B1E10] hover:bg-[#2A1409] text-white font-semibold text-xs transition-colors shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      {loading && (
        <div className="p-12 text-center text-[#8A7560] text-xs bg-white rounded-2xl border border-[#E8DDD2]">
          <RotateCcw className="w-6 h-6 mx-auto mb-2 text-[#C06520] animate-spin" />
          Loading profile for {targetUsername}...
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <h3 className="font-bold text-rose-800 text-sm">{error}</h3>
          <p className="text-xs text-rose-600">Please check the username spelling or try searching another player.</p>
          <button
            onClick={() => navigate('/leaderboard')}
            className="px-4 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-700 font-semibold text-xs hover:bg-rose-100 transition-colors"
          >
            Back to Leaderboard
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Profile Hero Overview Card - Warm Dark Chocolate & Amber Editorial */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-[#3B1E10] via-[#4A2615] to-[#2A1409] text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden border border-[#3B1E10]">
            <div className="flex items-center gap-5 z-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#C06520] to-[#E07A2B] flex items-center justify-center text-3xl font-black text-white shadow-md">
                {username?.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{username}</h1>
                  {authUser?.username === username && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#C06520]/40 text-white border border-[#C06520]/60">
                      YOU
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#E8DDD2] font-mono">1v1 Competitor &bull; Connected via /api/profile/:username</p>
              </div>
            </div>

            {/* Elo Card */}
            <div className="flex items-center gap-4 z-10">
              <div className="px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
                <div className="text-[11px] font-mono text-[#E8DDD2] uppercase tracking-wider">Elo Rating</div>
                <div className="text-2xl font-black text-white font-mono">{stats.rating}</div>
              </div>
              <div className="px-6 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
                <div className="text-[11px] font-mono text-[#E8DDD2] uppercase tracking-wider">Win Rate</div>
                <div className="text-2xl font-black text-[#E07A2B] font-mono">{stats.winRate}</div>
              </div>
            </div>
          </div>

          {/* Win/Loss/Draw Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E8DDD2] shadow-xs">
              <div className="text-[11px] font-mono text-[#8A7560] uppercase tracking-wider mb-1">Total Duels</div>
              <div className="text-2xl font-black text-[#3B1E10] font-mono">{stats.matches}</div>
              <div className="text-[11px] text-[#8A7560]/80 mt-1">1v1 Matches</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#C06520]/10 border border-[#C06520]/30 shadow-xs">
              <div className="text-[11px] font-mono text-[#C06520] uppercase tracking-wider mb-1 font-bold">Victories</div>
              <div className="text-2xl font-black text-[#C06520] font-mono">{stats.wins}</div>
              <div className="text-[11px] text-[#C06520]/80 mt-1">Solved all tests</div>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-xs">
              <div className="text-[11px] font-mono text-rose-700 uppercase tracking-wider mb-1 font-bold">Defeats</div>
              <div className="text-2xl font-black text-rose-700 font-mono">{stats.losses}</div>
              <div className="text-[11px] text-rose-600 mt-1">Second to solve</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#FBF4EC] border border-[#E8DDD2] shadow-xs">
              <div className="text-[11px] font-mono text-[#8A7560] uppercase tracking-wider mb-1 font-bold">Draws</div>
              <div className="text-2xl font-black text-[#3B1E10] font-mono">{stats.draws || 0}</div>
              <div className="text-[11px] text-[#8A7560]/80 mt-1">Equal timeout score</div>
            </div>
          </div>

          {/* 10 Most Recent Matches Section */}
          <div className="bg-white border border-[#E8DDD2] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DDD2] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#3B1E10] flex items-center gap-2">
                  <Swords className="w-4 h-4 text-[#C06520]" />
                  10 Most Recent Matches
                </h2>
                <p className="text-xs text-[#8A7560]">From the Match collection via GET /api/profile/{username}</p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[#FBF4EC] text-[#3B1E10] border border-[#E8DDD2]">
                {matches.length} Matches Found
              </span>
            </div>

            {matches.length > 0 ? (
              <div className="space-y-3">
                {matches.map((m) => {
                  const isWinner = m.winnerUsername === username;
                  const isDraw = m.winner === 'draw' || m.winnerId === 'draw';
                  const isPlayer1 = m.player1?.username === username;
                  const opponentName = isPlayer1 ? m.player2?.username : m.player1?.username;
                  const myScore = isPlayer1 ? m.player1?.passedTests : m.player2?.passedTests;
                  const opponentScore = isPlayer1 ? m.player2?.passedTests : m.player1?.passedTests;
                  const total = m.player1?.totalTests || 6;

                  return (
                    <div
                      key={m._id}
                      className="p-4 rounded-xl bg-[#FBF4EC]/60 hover:bg-[#FBF4EC] border border-[#E8DDD2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isWinner
                            ? 'bg-[#C06520]/15 text-[#C06520] border border-[#C06520]/30'
                            : isDraw
                            ? 'bg-[#E8DDD2]/60 text-[#3B1E10] border border-[#E8DDD2]'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                          {isWinner ? <CheckCircle2 className="w-5 h-5" /> : isDraw ? <Equal className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-bold text-[#3B1E10] text-sm">
                            {m.challengeTitle || 'Debugging Challenge'}
                          </div>
                          <div className="text-xs text-[#8A7560] flex items-center gap-2 mt-0.5">
                            <span>VS</span>
                            <Link
                              to={`/profile/${encodeURIComponent(opponentName || '')}`}
                              className="font-semibold text-[#C06520] hover:underline"
                            >
                              {opponentName || 'Opponent'}
                            </Link>
                            <span>&bull;</span>
                            <span className="font-mono text-[#3B1E10]">{myScore ?? 0}/{total} vs {opponentScore ?? 0}/{total} tests</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                        <span className={`px-2.5 py-1 rounded-lg font-bold ${
                          isWinner
                            ? 'bg-[#C06520]/15 text-[#C06520] border border-[#C06520]/30'
                            : isDraw
                            ? 'bg-[#E8DDD2]/60 text-[#3B1E10] border border-[#E8DDD2]'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {isWinner ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
                        </span>
                        <div className="text-right text-[11px] text-[#8A7560]">
                          <div>{m.durationSeconds || 0}s duration</div>
                          <div>{new Date(m.createdAt || m.endedAt || Date.now()).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-[#8A7560] text-xs border border-dashed border-[#E8DDD2] rounded-xl bg-[#FBF4EC]/30">
                No match records found for this player in the Match collection yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
