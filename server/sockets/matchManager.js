const { addToQueue, removeFromQueue, isInQueue } = require('../services/matchmaking');
const { createRoomAndStartMatch } = require('./room');
const { getRedis } = require('../config/redis');
const { getRoom, updateRoom } = require('../services/matchmaking');

const QUEUE_KEY = 'queue:1v1';
const BOT_WAIT_THRESHOLD_SECONDS = 12; // Auto-match with BugBot if waiting > 12 seconds
const BOT_MIN_STEP_MS = 15000; // Increment passed tests every 15-25 seconds
const BOT_MAX_STEP_MS = 25000;

// Track active queue timers: userId -> timeout handle
const queueBotTimers = new Map();

/**
 * Generates simulated BugBot with a rating within 50 points of player's rating
 */
function generateBugBot(playerRating = 1000) {
  // Random rating offset between -50 and +50 points
  const offset = Math.floor(Math.random() * 101) - 50;
  const rating = Math.max(100, Math.round(Number(playerRating) + offset));

  return {
    userId: `bot_bugbot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    username: 'BugBot',
    socketId: 'bot_socket',
    rating,
    isBot: true
  };
}

/**
 * Simulates BugBot progression in the match:
 * Increments its passed tests every 15-25 seconds and solves the challenge if the player takes too long.
 */
function simulateBugBot(io, roomId, botId, challenge, playerSocket) {
  const totalTests = challenge.visibleTests.length + challenge.hiddenTests.length;
  let botPassed = 0;
  let timerHandle = null;

  async function step() {
    try {
      const room = await getRoom(roomId);
      if (!room || room.status === 'FINISHED') {
        if (timerHandle) clearTimeout(timerHandle);
        return;
      }

      botPassed += 1;
      const progressPercent = Math.min(100, Math.round((botPassed / totalTests) * 100));

      await updateRoom(roomId, {
        p2Passed: String(botPassed),
        player2PassedTests: String(botPassed),
        player2Progress: String(progressPercent)
      });

      console.log(`[BugBot] Step in ${roomId}: ${botPassed}/${totalTests} tests passed (${progressPercent}%)`);

      // Broadcast opponent progress to human player and room
      io.to(roomId).emit('opponent:progress', {
        userId: botId,
        username: 'BugBot',
        passed: botPassed,
        total: totalTests
      });

      if (playerSocket) {
        playerSocket.emit('opponent:progress', {
          passed: botPassed,
          total: totalTests
        });
      }

      // If BugBot passed all tests, it solves the challenge!
      if (botPassed >= totalTests) {
        console.log(`[BugBot] Solved all tests in room ${roomId}. Ending match authoritatively.`);
        const { endMatchAuthoritative } = require('./match');
        await endMatchAuthoritative(io, {
          roomId,
          winnerId: botId,
          reason: 'SOLVED_ALL_TESTS'
        });
        return;
      }

      // Schedule next test step after another random 15-25 seconds
      scheduleNext();
    } catch (err) {
      console.error('[BugBot] Error in step:', err);
    }
  }

  function scheduleNext() {
    // Random delay between 15,000ms (15s) and 25,000ms (25s)
    const delay = Math.floor(Math.random() * (BOT_MAX_STEP_MS - BOT_MIN_STEP_MS + 1)) + BOT_MIN_STEP_MS;
    timerHandle = setTimeout(step, delay);
  }

  // Start initial progression step after 15-25 seconds
  scheduleNext();

  return () => {
    if (timerHandle) clearTimeout(timerHandle);
  };
}

/**
 * Automatically matches a queued player against BugBot
 */
async function matchWithBugBot(io, userId) {
  const redis = getRedis();

  // Clear any pending timer
  if (queueBotTimers.has(String(userId))) {
    clearTimeout(queueBotTimers.get(String(userId)));
    queueBotTimers.delete(String(userId));
  }

  const inQueue = await isInQueue(userId);
  if (!inQueue) return;

  const meta = await redis.hgetall(`queue:meta:${userId}`);
  if (!meta || !meta.socketId) {
    await removeFromQueue(userId);
    return;
  }

  // Remove player from queue
  await removeFromQueue(userId);

  const playerRating = Number(meta.rating || 1000);
  const bugBot = generateBugBot(playerRating);

  console.log(`[MatchManager] Queue timeout (>12s): Matching ${meta.username} (${playerRating} Elo) with ${bugBot.username} (${bugBot.rating} Elo)`);

  await createRoomAndStartMatch(io, {
    player1: {
      userId: String(userId),
      username: meta.username,
      socketId: meta.socketId,
      rating: playerRating
    },
    player2: bugBot
  });
}

/**
 * Searches Redis queue:1v1 for a human match.
 * If waiting > 12 seconds with no human opponent, matches with BugBot.
 */
async function scanAndPairPlayers(io, triggerUserId) {
  const redis = getRedis();

  const userScore = await redis.zscore(QUEUE_KEY, String(triggerUserId));
  if (userScore === null) return;

  const rating = Number(userScore);
  const meta = await redis.hgetall(`queue:meta:${triggerUserId}`);
  if (!meta || !meta.socketId) return;

  const joinedAt = Number(meta.joinedAt) || Date.now();
  const waitSeconds = (Date.now() - joinedAt) / 1000;

  // Window starts at 100 rating points, expanding by 50 every 2 seconds
  const windowDelta = Math.min(800, 100 + Math.floor(waitSeconds / 2) * 50);
  const minRating = Math.max(0, rating - windowDelta);
  const maxRating = rating + windowDelta;

  const candidates = await redis.zrangebyscore(QUEUE_KEY, minRating, maxRating);

  let opponentId = null;
  for (const c of candidates) {
    if (String(c) !== String(triggerUserId)) {
      opponentId = c;
      break;
    }
  }

  // If waiting > 8 seconds, check any available human in queue
  if (!opponentId && waitSeconds > 8) {
    const allInQueue = await redis.zrange(QUEUE_KEY, 0, -1);
    for (const c of allInQueue) {
      if (String(c) !== String(triggerUserId)) {
        opponentId = c;
        break;
      }
    }
  }

  // If human opponent found, pair them
  if (opponentId) {
    const opponentMeta = await redis.hgetall(`queue:meta:${opponentId}`);
    if (!opponentMeta || !opponentMeta.socketId) {
      await removeFromQueue(opponentId);
      return;
    }

    // Clear bot timers if any
    if (queueBotTimers.has(String(triggerUserId))) {
      clearTimeout(queueBotTimers.get(String(triggerUserId)));
      queueBotTimers.delete(String(triggerUserId));
    }
    if (queueBotTimers.has(String(opponentId))) {
      clearTimeout(queueBotTimers.get(String(opponentId)));
      queueBotTimers.delete(String(opponentId));
    }

    // Remove both from queue atomically
    await redis.zrem(QUEUE_KEY, String(triggerUserId), String(opponentId));
    await redis.del(`queue:meta:${triggerUserId}`);
    await redis.del(`queue:meta:${opponentId}`);

    // Create room and start match between human players
    await createRoomAndStartMatch(io, {
      player1: {
        userId: String(triggerUserId),
        username: meta.username,
        socketId: meta.socketId,
        rating: Number(meta.rating || 1000)
      },
      player2: {
        userId: String(opponentId),
        username: opponentMeta.username,
        socketId: opponentMeta.socketId,
        rating: Number(opponentMeta.rating || 1000)
      }
    });
    return;
  }

  // Requirement: If a player waits in queue:1v1 for more than 12 seconds without finding a human opponent,
  // automatically match them against a simulated bot (BugBot)
  if (waitSeconds >= BOT_WAIT_THRESHOLD_SECONDS) {
    await matchWithBugBot(io, triggerUserId);
  }
}

/**
 * Socket event handlers for matchmaking queue
 */
function registerMatchmakingHandlers(io, socket) {
  const userId = socket.userId;
  const username = socket.username;

  // queue:join event
  socket.on('queue:join', async (data) => {
    try {
      const rating = Number(socket.rating || data?.rating || 1000);
      console.log(`[Queue] ${username} (${userId}) joined queue with rating ${rating}`);

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

      // Clear existing timer if any
      if (queueBotTimers.has(String(userId))) {
        clearTimeout(queueBotTimers.get(String(userId)));
      }

      // Schedule exact 12-second bot fallback timer
      const botTimer = setTimeout(async () => {
        try {
          const stillInQueue = await isInQueue(userId);
          if (stillInQueue) {
            console.log(`[MatchManager] 12s queue timer fired for ${username}. Matching with BugBot.`);
            await matchWithBugBot(io, userId);
          }
        } catch (e) {
          console.error('[MatchManager] Error in 12s bot timer:', e);
        }
      }, (BOT_WAIT_THRESHOLD_SECONDS * 1000) + 100);

      queueBotTimers.set(String(userId), botTimer);

      // Attempt immediate match
      await scanAndPairPlayers(io, userId);
    } catch (err) {
      console.error('[Queue] Error joining queue:', err);
      socket.emit('error', { message: 'Failed to join matchmaking queue' });
    }
  });

  // queue:leave event
  socket.on('queue:leave', async () => {
    try {
      console.log(`[Queue] ${username} left queue`);
      if (queueBotTimers.has(String(userId))) {
        clearTimeout(queueBotTimers.get(String(userId)));
        queueBotTimers.delete(String(userId));
      }
      await removeFromQueue(userId);
      socket.emit('queue:left', { inQueue: false });
    } catch (err) {
      console.error('[Queue] Error leaving queue:', err);
    }
  });

  // Practice vs AI Bot (direct singleplayer demo)
  socket.on('queue:join_bot', async () => {
    try {
      if (queueBotTimers.has(String(userId))) {
        clearTimeout(queueBotTimers.get(String(userId)));
        queueBotTimers.delete(String(userId));
      }
      await removeFromQueue(userId);

      const playerRating = socket.rating || 1000;
      const bugBot = generateBugBot(playerRating);

      await createRoomAndStartMatch(io, {
        player1: {
          userId,
          username,
          socketId: socket.id,
          rating: playerRating
        },
        player2: bugBot
      });
    } catch (err) {
      console.error('[BotMatch] Error creating bot match:', err);
    }
  });
}

/**
 * Background matcher loop running every 1 second
 */
function startMatcherLoop(io) {
  setInterval(async () => {
    try {
      const redis = getRedis();
      const waitingUsers = await redis.zrange(QUEUE_KEY, 0, -1);
      if (!waitingUsers || waitingUsers.length === 0) return;

      for (const uid of waitingUsers) {
        const inQueue = await isInQueue(uid);
        if (inQueue) {
          await scanAndPairPlayers(io, uid);
        }
      }
    } catch (e) {
      // Ignore background ticker errors
    }
  }, 1000);
}

module.exports = {
  registerMatchmakingHandlers,
  scanAndPairPlayers,
  startMatcherLoop,
  matchWithBugBot,
  generateBugBot,
  simulateBugBot,
  BOT_WAIT_THRESHOLD_SECONDS,
  BOT_MIN_STEP_MS,
  BOT_MAX_STEP_MS
};
