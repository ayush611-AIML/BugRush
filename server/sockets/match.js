const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Match = require('../models/Match');
const { calculateElo } = require('../services/elo');
const { runChallengeTests } = require('../services/judge0');
const { validateSubmission } = require('../middleware/rateLimit');
const { getRoom, updateRoom, cleanupRoom } = require('../services/matchmaking');
const { activeTimers } = require('./room');

/**
 * Register match execution socket handlers
 * PDF Section 5 & 7:
 * - code:run (rate limited 1 per 3s, max 10KB)
 * - run:result (passed, total, per-test output with visible tests only)
 * - opponent:progress (passed, total)
 * - match:end (winner, reason, rating changes)
 */
function registerMatchHandlers(io, socket) {
  const userId = socket.userId;
  const username = socket.username;

  socket.on('code:run', async ({ roomId, code }) => {
    try {
      // 1. Validate rate limit (1 run per 3s) and code size (cap at 10KB)
      const validation = validateSubmission(userId, code);
      if (!validation.valid) {
        return socket.emit('run:result', {
          passed: 0,
          total: 0,
          status: 'RATE_LIMITED',
          error: validation.error,
          message: validation.error,
          visibleResults: []
        });
      }

      // 2. Authoritative room check
      const room = await getRoom(roomId);
      if (!room || !room.id) {
        return socket.emit('error', { message: 'Active match room not found' });
      }

      if (room.status === 'FINISHED') {
        return socket.emit('run:result', {
          passed: Number(room.p1Passed || 0),
          total: Number(room.totalTests || 0),
          status: 'MATCH_FINISHED',
          message: 'Match has already ended',
          visibleResults: []
        });
      }

      // 3. Fetch challenge with server-side hidden tests
      const challenge = await Challenge.findById(room.challengeId);
      if (!challenge) {
        return socket.emit('error', { message: 'Challenge data not found' });
      }

      // 4. Execute in Judge0 CE sandbox (2s CPU, 128MB memory)
      const result = await runChallengeTests({
        userCode: code,
        functionName: challenge.functionName,
        visibleTests: challenge.visibleTests,
        hiddenTests: challenge.hiddenTests,
        challenge
      });

      // 5. Emit run:result to submitting player (visible tests only!)
      // PDF Section 5: passed, total, per-test output (visible tests only)
      socket.emit('run:result', {
        passed: result.passedTests,
        total: result.totalTests,
        status: result.status,
        message: result.message,
        perTestOutput: result.visibleResults, // Visible tests with input, expected, received
        visibleResults: result.visibleResults,
        hiddenCount: result.hiddenResults.length,
        hiddenPassed: result.hiddenResults.filter(h => h.passed).length,
        allPassed: result.allPassed,
        logs: result.logs
      });

      // 6. Update room progress in Redis
      const isPlayer1 = String(room.player1Id) === String(userId);
      const passedCount = result.passedTests;
      const totalCount = result.totalTests;

      if (isPlayer1) {
        await updateRoom(roomId, {
          p1Passed: String(passedCount),
          player1PassedTests: String(passedCount)
        });
      } else {
        await updateRoom(roomId, {
          p2Passed: String(passedCount),
          player2PassedTests: String(passedCount)
        });
      }

      // 7. Broadcast opponent:progress to the other player (passed, total)
      // PDF Section 5: server to other player -> passed, total
      socket.to(roomId).emit('opponent:progress', {
        passed: passedCount,
        total: totalCount
      });

      // 8. If all tests (visible + hidden) passed, first player to pass wins!
      // PDF Section 4 item 7: "The first player to pass all tests wins."
      if (result.allPassed) {
        await endMatchAuthoritative(io, {
          roomId,
          winnerId: userId,
          reason: 'SOLVED_ALL_TESTS'
        });
      }
    } catch (err) {
      console.error('[CodeRun] Error running code:', err);
      socket.emit('run:result', {
        passed: 0,
        total: 0,
        status: 'RUNTIME_ERROR',
        error: err.message,
        message: 'Sandbox execution error: ' + err.message,
        visibleResults: []
      });
    }
  });
}

/**
 * Authoritative match resolution on timeout (PDF Section 4 item 7)
 * "If the timer ends, the player with more tests passed wins, and a tie is a draw."
 */
async function resolveMatchTimeout(io, roomId) {
  const room = await getRoom(roomId);
  if (!room || room.status === 'FINISHED') return;

  const p1 = Number(room.p1Passed || 0);
  const p2 = Number(room.p2Passed || 0);

  let winnerId = 'draw';
  if (p1 > p2) winnerId = room.player1Id;
  else if (p2 > p1) winnerId = room.player2Id;

  await endMatchAuthoritative(io, {
    roomId,
    winnerId,
    reason: winnerId === 'draw' ? 'DRAW_TIMEOUT' : 'MOST_TESTS_PASSED_TIMEOUT'
  });
}

/**
 * End match authoritative:
 * - Update room status to FINISHED
 * - Calculate Elo ratings with K=32 (PDF Section 8)
 * - Update User records (rating, wins, losses, draws)
 * - Save Match history in MongoDB
 * - Clean up Redis active room state
 * - Emit match:end to room with { winner, reason, rating changes } (PDF Section 5)
 */
async function endMatchAuthoritative(io, { roomId, winnerId, reason }) {
  const room = await getRoom(roomId);
  if (!room || room.status === 'FINISHED') return;

  // Mark FINISHED in Redis to prevent double resolution
  await updateRoom(roomId, { status: 'FINISHED', winner: winnerId });

  // Clear timeout timer if active
  if (activeTimers.has(roomId)) {
    clearTimeout(activeTimers.get(roomId));
    activeTimers.delete(roomId);
  }

  const p1Id = room.player1Id;
  const p2Id = room.player2Id;
  const p1Rating = Number(room.player1Rating) || 1000;
  const p2Rating = Number(room.player2Rating) || 1000;

  // Determine score: 1 for win, 0.5 for draw, 0 for loss
  let scoreP1 = 0.5;
  if (winnerId === p1Id) scoreP1 = 1;
  else if (winnerId === p2Id) scoreP1 = 0;

  // Calculate Elo using K=32
  const eloResults = calculateElo(p1Rating, p2Rating, scoreP1);

  let u1 = null;
  let u2 = null;

  try {
    // Update player 1
    if (p1Id && p1Id.match(/^[0-9a-fA-F]{24}$/)) {
      u1 = await User.findById(p1Id);
      if (u1) {
        u1.rating = eloResults.playerA.newRating;
        u1.matches += 1;
        if (winnerId === p1Id) u1.wins += 1;
        else if (winnerId === 'draw') u1.draws = (u1.draws || 0) + 1;
        else u1.losses += 1;
        await u1.save();
      }
    }

    // Update player 2
    if (p2Id && !p2Id.startsWith('bot_') && p2Id.match(/^[0-9a-fA-F]{24}$/)) {
      u2 = await User.findById(p2Id);
      if (u2) {
        u2.rating = eloResults.playerB.newRating;
        u2.matches += 1;
        if (winnerId === p2Id) u2.wins += 1;
        else if (winnerId === 'draw') u2.draws = (u2.draws || 0) + 1;
        else u2.losses += 1;
        await u2.save();
      }
    }

    // Persist Match in MongoDB
    if (room.challengeId && room.challengeId.match(/^[0-9a-fA-F]{24}$/)) {
      const now = new Date();
      const started = room.startedAt ? new Date(Number(room.startedAt)) : new Date(Date.now() - 120000);

      await Match.create({
        roomId,
        challengeId: room.challengeId,
        challengeTitle: room.challengeTitle,
        players: [
          {
            userId: u1 ? u1._id : null,
            username: room.player1Username,
            passed: Number(room.p1Passed || 0),
            total: Number(room.totalTests || 0),
            ratingBefore: eloResults.playerA.oldRating,
            ratingAfter: eloResults.playerA.newRating
          },
          {
            userId: u2 ? u2._id : null,
            username: room.player2Username,
            passed: Number(room.p2Passed || 0),
            total: Number(room.totalTests || 0),
            ratingBefore: eloResults.playerB.oldRating,
            ratingAfter: eloResults.playerB.newRating
          }
        ],
        player1: {
          userId: u1 ? u1._id : null,
          username: room.player1Username,
          ratingBefore: eloResults.playerA.oldRating,
          ratingAfter: eloResults.playerA.newRating,
          passedTests: Number(room.p1Passed || 0),
          totalTests: Number(room.totalTests || 0)
        },
        player2: {
          userId: u2 ? u2._id : null,
          username: room.player2Username,
          ratingBefore: eloResults.playerB.oldRating,
          ratingAfter: eloResults.playerB.newRating,
          passedTests: Number(room.p2Passed || 0),
          totalTests: Number(room.totalTests || 0)
        },
        winnerId: winnerId,
        winner: winnerId,
        winnerUsername: winnerId === p1Id ? room.player1Username : (winnerId === p2Id ? room.player2Username : 'Draw'),
        endReason: reason,
        reason: reason,
        startedAt: started,
        endedAt: now,
        durationSeconds: Math.floor((now - started) / 1000)
      });
    }
  } catch (dbErr) {
    console.error('[MatchEnd] Error persisting match in MongoDB:', dbErr);
  }

  // Cleanup room keys in Redis
  await cleanupRoom(roomId, p1Id, p2Id);

  // Emit match:end to both players
  // PDF Section 5: winner, reason, rating changes
  io.to(roomId).emit('match:end', {
    roomId,
    winner: winnerId,
    winnerId,
    winnerUsername: winnerId === p1Id ? room.player1Username : (winnerId === p2Id ? room.player2Username : 'Draw'),
    reason,
    ratingChanges: {
      [p1Id]: {
        oldRating: eloResults.playerA.oldRating,
        newRating: eloResults.playerA.newRating,
        delta: eloResults.playerA.change
      },
      [p2Id]: {
        oldRating: eloResults.playerB.oldRating,
        newRating: eloResults.playerB.newRating,
        delta: eloResults.playerB.change
      }
    },
    stats: {
      player1: {
        userId: p1Id,
        username: room.player1Username,
        passed: Number(room.p1Passed || 0),
        total: Number(room.totalTests || 0),
        rating: eloResults.playerA.newRating,
        delta: eloResults.playerA.change
      },
      player2: {
        userId: p2Id,
        username: room.player2Username,
        passed: Number(room.p2Passed || 0),
        total: Number(room.totalTests || 0),
        rating: eloResults.playerB.newRating,
        delta: eloResults.playerB.change
      }
    }
  });

  console.log(`[MatchEnd] Room ${roomId} completed. Winner: ${winnerId} (${reason}). Delta A: ${eloResults.playerA.change}, Delta B: ${eloResults.playerB.change}`);
}

module.exports = {
  registerMatchHandlers,
  resolveMatchTimeout,
  endMatchAuthoritative
};
