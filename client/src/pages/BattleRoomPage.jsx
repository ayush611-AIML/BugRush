import React, { useState, useEffect, useCallback } from 'react';
import { MonacoBattleEditor } from '../components/MonacoBattleEditor';
import { TestOutputConsole } from '../components/TestOutputConsole';
import { OpponentProgressBar } from '../components/OpponentProgressBar';
import { MatchResultModal } from '../components/MatchResultModal';
import { useTimer } from '../hooks/useTimer';
import { sound } from '../services/audio';
import { Clock, AlertTriangle, ArrowLeft } from 'lucide-react';

export function BattleRoomPage({
  matchData,
  user,
  socket,
  onExit
}) {
  const challenge = matchData?.challenge || {};
  const opponent = matchData?.opponent || { username: 'Opponent', rating: 1000 };
  const roomId = matchData?.roomId;

  const [code, setCode] = useState(challenge.buggyCode || '// Loading challenge code...');
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const [myPassed, setMyPassed] = useState(0);
  const [opponentPassed, setOpponentPassed] = useState(0);
  const [matchEndData, setMatchEndData] = useState(null);
  const [disconnectAlert, setDisconnectAlert] = useState(null);

  const totalTests = challenge.totalTests || (challenge.visibleTests?.length || 2) + 4;

  const { formatted, isUrgent, isExpired } = useTimer(matchData?.endsAt, () => {
    console.log('[Timer] Match time expired.');
  });

  useEffect(() => {
    if (!socket || !roomId) return;

    function onRunResult(data) {
      setIsRunning(false);
      setRunResult(data);

      if (data.status === 'ACCEPTED') {
        sound.playTestPass();
        setMyPassed(data.total);
      } else if (data.status === 'RATE_LIMITED') {
        sound.playTestFail();
      } else {
        if (data.passed > myPassed) {
          sound.playTestPass();
        } else {
          sound.playTestFail();
        }
        setMyPassed(data.passed || 0);
      }
    }

    function onOpponentProgress(data) {
      setOpponentPassed(data.passed || 0);
    }

    function onMatchEnd(data) {
      setIsRunning(false);
      setMatchEndData(data);
    }

    function onOpponentDisconnected(data) {
      setDisconnectAlert(`Opponent disconnected! Grace period: ${data.gracePeriodSeconds || 30}s.`);
    }

    function onOpponentReconnected() {
      setDisconnectAlert(null);
    }

    socket.on('run:result', onRunResult);
    socket.on('opponent:progress', onOpponentProgress);
    socket.on('match:end', onMatchEnd);
    socket.on('opponent:disconnected', onOpponentDisconnected);
    socket.on('opponent:reconnected', onOpponentReconnected);

    return () => {
      socket.off('run:result', onRunResult);
      socket.off('opponent:progress', onOpponentProgress);
      socket.off('match:end', onMatchEnd);
      socket.off('opponent:disconnected', onOpponentDisconnected);
      socket.off('opponent:reconnected', onOpponentReconnected);
    };
  }, [socket, roomId, myPassed]);

  const handleRunCode = useCallback(() => {
    if (!socket || isRunning || !roomId) return;
    setIsRunning(true);
    socket.emit('code:run', {
      roomId,
      code
    });
  }, [socket, isRunning, roomId, code]);

  const handleResetCode = () => {
    if (challenge.buggyCode) {
      setCode(challenge.buggyCode);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] max-w-7xl mx-auto px-4 lg:px-6 py-4 space-y-3">
      {/* Top Match HUD Bar - Warm Brown & Amber Editorial Theme */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-[#E8DDD2] rounded-2xl px-5 py-2.5 shadow-xs">
        {/* Left: Challenge Title & Difficulty */}
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 rounded-xl bg-[#FBF4EC] hover:bg-[#F5E6D8] border border-[#E8DDD2] text-[#3B1E10] transition-colors"
            title="Leave Battle"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#3B1E10] tracking-tight">{challenge.title}</h2>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                challenge.difficulty === 'Easy'
                  ? 'bg-[#C06520]/10 text-[#C06520] border border-[#C06520]/25'
                  : challenge.difficulty === 'Hard'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-[#3B1E10]/10 text-[#3B1E10] border border-[#3B1E10]/20'
              }`}>
                {challenge.difficulty || 'Medium'}
              </span>
            </div>
            <div className="text-[11px] text-[#8A7560]">
              Fix <code className="text-[#C06520] font-mono font-semibold">{challenge.functionName}()</code> to pass all tests
            </div>
          </div>
        </div>

        {/* Center: Authoritative Countdown Timer */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border font-mono text-base font-bold shadow-xs ${
          isUrgent
            ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
            : 'bg-[#FBF4EC] border-[#E8DDD2] text-[#3B1E10]'
        }`}>
          <Clock className="w-4 h-4 text-[#C06520]" />
          <span>{formatted}</span>
        </div>

        {/* Right: Room ID Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-[#8A7560]">
          <span>ROOM:</span>
          <span className="text-[#3B1E10] truncate max-w-[120px] font-semibold">{roomId}</span>
        </div>
      </div>

      {/* Disconnect Alert Banner */}
      {disconnectAlert && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{disconnectAlert}</span>
        </div>
      )}

      {/* Real-time 1v1 Progress Competition Bar */}
      <OpponentProgressBar
        myUsername={user?.username || 'You'}
        myRating={user?.rating || 1000}
        myPassed={myPassed}
        totalTests={totalTests}
        opponentUsername={opponent.username}
        opponentRating={opponent.rating}
        opponentPassed={opponentPassed}
        isOpponentBot={opponent.isBot}
      />

      {/* Main Split Layout: Monaco Editor & Test Output Console */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left Console Panel (5 cols) */}
        <div className="lg:col-span-5 h-full overflow-hidden flex flex-col">
          <TestOutputConsole
            challenge={challenge}
            runResult={runResult}
            isRunning={isRunning}
          />
        </div>

        {/* Right Monaco Editor Panel (7 cols) */}
        <div className="lg:col-span-7 h-full overflow-hidden flex flex-col">
          <MonacoBattleEditor
            code={code}
            onChange={setCode}
            onRun={handleRunCode}
            onReset={handleResetCode}
            isRunning={isRunning}
            originalCode={challenge.buggyCode}
          />
        </div>
      </div>

      {/* Match Result Modal */}
      {matchEndData && (
        <MatchResultModal
          matchEndData={matchEndData}
          currentUserId={user?._id || user?.id || socket?.id}
          onPlayAgain={() => {
            setMatchEndData(null);
            onExit();
          }}
          onBackToLobby={() => {
            setMatchEndData(null);
            onExit();
          }}
        />
      )}
    </div>
  );
}
