import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { RadarScan } from './components/RadarScan';
import { MatchFoundModal } from './components/MatchFoundModal';
import { LobbyPage } from './pages/LobbyPage';
import { BattleRoomPage } from './pages/BattleRoomPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { useAuth } from './hooks/useAuth';
import { useSocket } from './hooks/useSocket';

function AppContent() {
  const { user, login, register, loginAsGuest, logout, updateUserStats } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isQueuing, setIsQueuing] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [isInBattle, setIsInBattle] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Global socket listener for matchmaking and match start
  useEffect(() => {
    if (!socket) return;

    function onQueueJoined() {
      setIsQueuing(true);
    }

    function onQueueLeft() {
      setIsQueuing(false);
    }

    function onMatchFound(data) {
      console.log('[App] match:found received:', data);
      setIsQueuing(false);
      setMatchData(data);
    }

    function onMatchStart(data) {
      console.log('[App] match:start received:', data);
      setMatchData((prev) => ({
        ...prev,
        ...data
      }));
      setIsInBattle(true);
    }

    function onMatchEndGlobal(data) {
      console.log('[App] match:end received globally:', data);
      const myId = user?._id || user?.id || socket.id;
      const isWin = data.winner === myId || data.winnerId === myId;
      const isDraw = data.winner === 'draw';
      const myDelta = data.ratingChanges?.[myId]?.delta || 0;
      updateUserStats(myDelta, isWin, isDraw);
    }

    socket.on('queue:joined', onQueueJoined);
    socket.on('queue:left', onQueueLeft);
    socket.on('match:found', onMatchFound);
    socket.on('match:start', onMatchStart);
    socket.on('match:end', onMatchEndGlobal);

    return () => {
      socket.off('queue:joined', onQueueJoined);
      socket.off('queue:left', onQueueLeft);
      socket.off('match:found', onMatchFound);
      socket.off('match:start', onMatchStart);
      socket.off('match:end', onMatchEndGlobal);
    };
  }, [socket, user, updateUserStats]);

  const handleFindMatch = async () => {
    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await loginAsGuest();
      } catch (e) {
        setIsAuthOpen(true);
        return;
      }
    }

    if (socket) {
      socket.emit('queue:join', {
        rating: currentUser.rating || 1000
      });
      setIsQueuing(true);
    }
  };

  const handlePlayBot = async () => {
    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await loginAsGuest();
      } catch (e) {
        setIsAuthOpen(true);
        return;
      }
    }

    if (socket) {
      socket.emit('queue:join_bot');
      setIsQueuing(true);
    }
  };

  const handleCancelQueue = () => {
    if (socket) {
      socket.emit('queue:leave');
    }
    setIsQueuing(false);
  };

  const handleExitBattle = () => {
    setIsInBattle(false);
    setMatchData(null);
    navigate('/');
  };

  // If in active battle, display BattleRoomPage
  if (isInBattle && matchData) {
    return (
      <div className="min-h-screen bg-[#FBF4EC] text-[#3B1E10] flex flex-col font-sans">
        <Navbar
          user={user}
          onOpenAuth={() => setIsAuthOpen(true)}
          onLogout={logout}
          isConnected={isConnected}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
        />
        <main className="flex-1">
          <BattleRoomPage
            matchData={matchData}
            user={user}
            socket={socket}
            onExit={handleExitBattle}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF4EC] text-[#3B1E10] flex flex-col font-sans selection:bg-[#C06520]/20 selection:text-[#3B1E10]">
      {/* Top Navigation Bar with 3 Tabs: Play, Leaderboard, Profile */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={logout}
        isConnected={isConnected}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />

      {/* React Router Tab Routes */}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route
            path="/"
            element={
              <LobbyPage
                user={user}
                onFindMatch={handleFindMatch}
                onPlayBot={handlePlayBot}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            }
          />
          <Route
            path="/play"
            element={
              <LobbyPage
                user={user}
                onFindMatch={handleFindMatch}
                onPlayBot={handlePlayBot}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            }
          />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route
            path="/profile"
            element={
              <ProfilePage
                user={user}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            }
          />
          <Route
            path="/profile/:username"
            element={
              <ProfilePage
                user={user}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            }
          />
        </Routes>
      </main>

      {/* Matchmaking Radar Modal */}
      {isQueuing && (
        <RadarScan
          user={user}
          onCancel={handleCancelQueue}
          onPlayBot={handlePlayBot}
        />
      )}

      {/* Match Found 3-second Countdown Modal */}
      {matchData && !isInBattle && (
        <MatchFoundModal
          matchData={matchData}
          user={user}
        />
      )}

      {/* Authentication Modal (Argon2 Login & Register) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={login}
        onRegister={register}
        onGuestLogin={loginAsGuest}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
