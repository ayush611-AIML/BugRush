const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Match = require('../models/Match');
const { calculateElo } = require('../services/elo');
const { runChallengeTests } = require('../services/judge0');
const {
  addToQueue,
  removeFromQueue,
  isInQueue,
  tryMatchmaking,
  getRoom,
  updateRoom,
  cleanupRoom
} = require('../services/matchmaking');

function initSocketServer(io) {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          const user = await User.findById(decoded.id).select('-password');
          if (user) {
            socket.user = user;
            socket.userId = user._id.toString();
            socket.username = user.username;
            socket.rating = user.rating;
            return next();
          }
        }
      }

      // Guest fallback
      const guestId = socket.handshake.auth?.guestId || socket.id;
      const guestName = socket.handshake.auth?.guestName || `Hacker_${socket.id.slice(0, 4)}`;
      const guestRating = socket.handshake.auth?.rating || 1000;

      socket.userId = guestId;
      socket.username = guestName;
      socket.rating = Number(guestRating) || 1000;
      next();
    } catch (err) {
      next();
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    const username = socket.username;
    console.log(`[Socket] User connected: ${username} (${userId})`);

    // Join personal user room for direct signals
    socket.join(`user_${userId}`);

    // Track active match timers
    const roomTimers = new Map();

    /**
     * Handle queue:join
     */
    socket.on('queue:join', async (data) => {
      try {
        const rating = socket.rating || data?.rating || 1000;
        console.log(`[Queue] ${username} joining queue with rating ${rating}`);

        await addToQueue({
          userId,
          username,
          socketId: socket.id,
          rating
        });

        socket.emit('queue:joined', {
          inQueue: true,
          userId,
          rating
        });

        // Trigger matchmaking check
        const match = await tryMatchmaking(userId);
        if (match) {
          await handleMatchFound(match);
        }
      } catch (err) {
        console.error('[Queue] Error joining queue:', err);
        socket.emit('error', { message: 'Failed to join matchmaking queue' });
      }
    });

    /**
     * Handle queue:leave
     */
    socket.on('queue:leave', async () => {
      try {
        console.log(`[Queue] ${username} leaving queue`);
        await removeFromQueue(userId);
        socket.emit('queue:left', { inQueue: false });
      } catch (err) {
        console.error('[Queue] Error leaving queue:', err);
      }
    });

    /**
     * Handle practice bot match requested by user
     */
    socket.on('queue:join_bot', async () => {
      try {
        await removeFromQueue(userId);
        const challenge = await Challenge.findOne().skip(Math.floor(Math.random() * (await Challenge.countDocuments() || 1)));
        if (!challenge) {
          return socket.emit('error', { message: 'No challenges available' });
        }

        const botRating = Math.max(800, (socket.rating || 1000) + Math.floor(Math.random() * 80 - 40));
        const botNames = ['CyberPulse', 'GlitchHunter', 'NullPointer', 'ByteReaper', 'SyntaxSlayer'];
        const botName = botNames[Math.floor(Math.random() * botNames.length)];
        const botId = `bot_${Date.now()}`;

        const match = {
          roomId: `room_bot_${Date.now()}`,
          roomData: {
            id: `room_bot_${Date.now()}`,
            challengeId: challenge._id.toString(),
            challengeTitle: challenge.title,
            functionName: challenge.functionName,
            difficulty: challenge.difficulty,
            description: challenge.description,
            buggyCode: challenge.buggyCode,
            player1Id: String(userId),
            player1Username: username,
            player1SocketId: socket.id,
            player1Rating: String(socket.rating || 1000),
            player1Progress: '0',
            player1PassedTests: '0',
            player2Id: botId,
            player2Username: `${botName} [BOT]`,
            player2SocketId: 'bot_socket',
            player2Rating: String(botRating),
            player2Progress: '0',
            player2PassedTests: '0',
            totalTests: String(challenge.visibleTests.length + challenge.hiddenTests.length),
            status: 'STARTING',
            startTime: String(Date.now() + 3000),
            createdAt: String(Date.now())
          },
          challenge,
          player1: {
            userId: String(userId),
            username,
            socketId: socket.id,
            rating: Number(socket.rating || 1000)
          },
          player2: {
            userId: botId,
            username: `${botName} [BOT]`,
            socketId: 'bot_socket',
            rating: botRating,
            isBot: true
          }
        };

        await handleMatchFound(match);

        // Simulate Bot progressive test solving in background
        simulateBotPlay(match.roomId, botId, challenge, socket);
      } catch (err) {
        console.error('[BotMatch] Error creating bot match:', err);
      }
    });

    /**
     * Helper to start match when 2 players are paired
     */
    async function handleMatchFound(match) {
      const { roomId, roomData, challenge, player1, player2 } = match;
      console.log(`[Matchmaking] Match found: ${roomId} (${player1.username} vs ${player2.username})`);

      // Both players join the socket room
      const s1 = io.sockets.sockets.get(player1.socketId);
      const s2 = io.sockets.sockets.get(player2.socketId);

      if (s1) s1.join(roomId);
      if (s2) s2.join(roomId);

      const challengeClientView = {
        id: challenge._id.toString(),
        title: challenge.title,
        difficulty: challenge.difficulty,
        description: challenge.description,
        functionName: challenge.functionName,
        buggyCode: challenge.buggyCode,
        visibleTests: challenge.visibleTests,
        hints: challenge.hints,
        tags: challenge.tags,
        totalTests: challenge.visibleTests.length + challenge.hiddenTests.length
      };

      // 1. Emit match:found
      io.to(`user_${player1.userId}`).emit('match:found', {
        roomId,
        opponent: {
          id: player2.userId,
          username: player2.username,
          rating: player2.rating,
          isBot: Boolean(player2.isBot)
        },
        challenge: challengeClientView,
        countdownSeconds: 3
      });

      io.to(`user_${player2.userId}`).emit('match:found', {
        roomId,
        opponent: {
          id: player1.userId,
          username: player1.username,
          rating: player1.rating,
          isBot: Boolean(player1.isBot)
        },
        challenge: challengeClientView,
        countdownSeconds: 3
      });

      // 2. Countdown then emit match:start
      setTimeout(async () => {
        await updateRoom(roomId, { status: 'PLAYING' });

        io.to(roomId).emit('match:start', {
          roomId,
          challenge: challengeClientView,
          startTime: Date.now(),
          timeLimitSeconds: 300 // 5 minutes
        });

        // Set room timeout (5 minutes)
        const timeoutHandle = setTimeout(async () => {
          await handleMatchTimeout(roomId);
        }, 305 * 1000);

        roomTimers.set(roomId, timeoutHandle);
      }, 3000);
    }

    /**
     * Handle code:run
     * Authoritatively executes user code using Judge0 service,
     * strips hidden tests before returning results to client,
     * emits run:result to player,
     * emits opponent:progress to opponent,
     * and ends match if all tests pass.
     */
    socket.on('code:run', async ({ roomId, code }) => {
      try {
        if (!roomId || !code) {
          return socket.emit('run:result', {
            status: 'RUNTIME_ERROR',
            message: 'Room ID and code are required',
            visibleResults: [],
            hiddenResults: [],
            passedTests: 0,
            totalTests: 0,
            allPassed: false
          });
        }

        const room = await getRoom(roomId);
        if (!room || !room.id) {
          return socket.emit('error', { message: 'Match room not found' });
        }

        if (room.status === 'FINISHED') {
          return socket.emit('run:result', {
            status: 'MATCH_FINISHED',
            message: 'Match has already completed',
            visibleResults: [],
            hiddenResults: [],
            passedTests: 0,
            totalTests: 0,
            allPassed: false
          });
        }

        // Fetch challenge with full hidden tests
        const challenge = await Challenge.findById(room.challengeId);
        if (!challenge) {
          return socket.emit('error', { message: 'Challenge data missing' });
        }

        // Run authoritative test harness via Judge0
        const result = await runChallengeTests({
          userCode: code,
          functionName: challenge.functionName,
          visibleTests: challenge.visibleTests,
          hiddenTests: challenge.hiddenTests
        });

        // Emit run:result back to the submitting player
        socket.emit('run:result', result);

        // Update progress in room state
        const isPlayer1 = String(room.player1Id) === String(userId);
        const passedTests = result.passedTests;
        const totalTests = result.totalTests;
        const percent = Math.round((passedTests / (totalTests || 1)) * 100);

        if (isPlayer1) {
          await updateRoom(roomId, {
            player1Progress: String(percent),
            player1PassedTests: String(passedTests)
          });
        } else {
          await updateRoom(roomId, {
            player2Progress: String(percent),
            player2PassedTests: String(passedTests)
          });
        }

        // Broadcast authoritative opponent:progress to other player
        socket.to(roomId).emit('opponent:progress', {
          opponentId: userId,
          passedTests,
          totalTests,
          percent
        });

        // If player passed all tests (visible + hidden), match is won!
        if (result.allPassed) {
          await endMatch({
            roomId,
            winnerId: userId,
            reason: 'SOLVED_ALL_TESTS',
            finalCode: code
          });
        }
      } catch (err) {
        console.error('[CodeRun] Error executing code:', err);
        socket.emit('run:result', {
          status: 'RUNTIME_ERROR',
          message: err.message || 'Execution error',
          visibleResults: [],
          hiddenResults: [],
          passedTests: 0,
          totalTests: 0,
          allPassed: false
        });
      }
    });

    /**
     * Handle match timeout (5 minutes passed)
     */
    async function handleMatchTimeout(roomId) {
      const room = await getRoom(roomId);
      if (!room || room.status === 'FINISHED') return;

      const p1Pass = Number(room.player1PassedTests || 0);
      const p2Pass = Number(room.player2PassedTests || 0);

      let winnerId = 'draw';
      if (p1Pass > p2Pass) {
        winnerId = room.player1Id;
      } else if (p2Pass > p1Pass) {
        winnerId = room.player2Id;
      }

      await endMatch({
        roomId,
        winnerId,
        reason: winnerId === 'draw' ? 'DRAW_TIMEOUT' : 'MOST_TESTS_PASSED_TIMEOUT'
      });
    }

    /**
     * End match, compute Elo (K=32), update DB and notify both players
     */
    async function endMatch({ roomId, winnerId, reason }) {
      const room = await getRoom(roomId);
      if (!room || room.status === 'FINISHED') return;

      // Mark finished immediately to prevent double resolution
      await updateRoom(roomId, { status: 'FINISHED', winner: winnerId });

      // Clear any active timer
      if (roomTimers.has(roomId)) {
        clearTimeout(roomTimers.get(roomId));
        roomTimers.delete(roomId);
      }

      const p1Id = room.player1Id;
      const p2Id = room.player2Id;
      const p1Rating = Number(room.player1Rating) || 1000;
      const p2Rating = Number(room.player2Rating) || 1000;

      let scoreP1 = 0.5;
      if (winnerId === p1Id) scoreP1 = 1;
      else if (winnerId === p2Id) scoreP1 = 0;

      // Calculate authoritative Elo ratings
      const eloResults = calculateElo(p1Rating, p2Rating, scoreP1);

      // Update MongoDB Users if they are registered accounts
      let u1 = null;
      let u2 = null;

      try {
        if (p1Id && !p1Id.startsWith('bot_') && p1Id.match(/^[0-9a-fA-F]{24}$/)) {
          u1 = await User.findById(p1Id);
          if (u1) {
            u1.rating = eloResults.playerA.newRating;
            u1.matches += 1;
            if (winnerId === p1Id) u1.wins += 1;
            else if (winnerId === p2Id) u1.losses += 1;
            await u1.save();
          }
        }

        if (p2Id && !p2Id.startsWith('bot_') && p2Id.match(/^[0-9a-fA-F]{24}$/)) {
          u2 = await User.findById(p2Id);
          if (u2) {
            u2.rating = eloResults.playerB.newRating;
            u2.matches += 1;
            if (winnerId === p2Id) u2.wins += 1;
            else if (winnerId === p1Id) u2.losses += 1;
            await u2.save();
          }
        }

        // Record Match in MongoDB
        if (room.challengeId && room.challengeId.match(/^[0-9a-fA-F]{24}$/)) {
          await Match.create({
            roomId,
            challenge: room.challengeId,
            challengeTitle: room.challengeTitle,
            player1: {
              userId: u1 ? u1._id : null,
              username: room.player1Username,
              ratingBefore: eloResults.playerA.oldRating,
              ratingAfter: eloResults.playerA.newRating,
              passedTests: Number(room.player1PassedTests || 0),
              totalTests: Number(room.totalTests || 0)
            },
            player2: {
              userId: u2 ? u2._id : null,
              username: room.player2Username,
              ratingBefore: eloResults.playerB.oldRating,
              ratingAfter: eloResults.playerB.newRating,
              passedTests: Number(room.player2PassedTests || 0),
              totalTests: Number(room.totalTests || 0)
            },
            winner: winnerId,
            winnerUsername: winnerId === p1Id ? room.player1Username : (winnerId === p2Id ? room.player2Username : 'Draw'),
            reason,
            durationSeconds: Math.floor((Date.now() - Number(room.startTime || Date.now())) / 1000)
          });
        }
      } catch (dbErr) {
        console.error('[MatchEnd] Error persisting match results:', dbErr);
      }

      // Cleanup room mapping in Redis
      await cleanupRoom(roomId, p1Id, p2Id);

      // Emit match:end to both players
      io.to(roomId).emit('match:end', {
        roomId,
        winnerId,
        winnerUsername: winnerId === p1Id ? room.player1Username : (winnerId === p2Id ? room.player2Username : 'Draw'),
        reason,
        elo: {
          [p1Id]: eloResults.playerA,
          [p2Id]: eloResults.playerB
        },
        player1: {
          userId: p1Id,
          username: room.player1Username,
          passedTests: Number(room.player1PassedTests || 0),
          oldRating: eloResults.playerA.oldRating,
          newRating: eloResults.playerA.newRating,
          change: eloResults.playerA.change
        },
        player2: {
          userId: p2Id,
          username: room.player2Username,
          passedTests: Number(room.player2PassedTests || 0),
          oldRating: eloResults.playerB.oldRating,
          newRating: eloResults.playerB.newRating,
          change: eloResults.playerB.change
        }
      });

      console.log(`[MatchEnd] Match ${roomId} finished. Winner: ${winnerId} (${reason})`);
    }

    /**
     * Simulate a competitive AI BugBot in practice mode
     */
    function simulateBotPlay(roomId, botId, challenge, playerSocket) {
      const totalTests = challenge.visibleTests.length + challenge.hiddenTests.length;
      let botPassed = 0;

      // Realistic interval between 12s and 35s per test passed
      const interval = setInterval(async () => {
        const room = await getRoom(roomId);
        if (!room || room.status === 'FINISHED') {
          clearInterval(interval);
          return;
        }

        botPassed += 1;
        const percent = Math.round((botPassed / totalTests) * 100);

        await updateRoom(roomId, {
          player2Progress: String(percent),
          player2PassedTests: String(botPassed)
        });

        // Emit progress to player
        playerSocket.emit('opponent:progress', {
          opponentId: botId,
          passedTests: botPassed,
          totalTests,
          percent
        });

        if (botPassed >= totalTests) {
          clearInterval(interval);
          await endMatch({
            roomId,
            winnerId: botId,
            reason: 'SOLVED_ALL_TESTS'
          });
        }
      }, 16000 + Math.random() * 8000);
    }

    /**
     * Disconnect handler
     */
    socket.on('disconnect', async () => {
      console.log(`[Socket] User disconnected: ${username}`);
      await removeFromQueue(userId);
    });
  });
}

module.exports = initSocketServer;
