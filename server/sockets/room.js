const { getRedis } = require('../config/redis');
const { getRandomChallenge, sanitizeChallengeForClient } = require('../services/challenges');
const { updateRoom, cleanupRoom, getRoom } = require('../services/matchmaking');

const activeTimers = new Map(); // roomId -> timeoutHandle
const disconnectGraceTimers = new Map(); // userId -> timer

/**
 * Creates room, saves active room state to Redis, and starts the match countdown
 * Implements PDF Section 4 & 5:
 * - room:{id} hash (challengeId, endsAt, p1Passed, p2Passed, status)
 * - user:{id}:room string (so reconnects find the active match)
 * - emits match:found
 * - after 3s lobby countdown, emits match:start with challenge & endsAt
 */
async function createRoomAndStartMatch(io, { player1, player2 }) {
  const redis = getRedis();

  // Pick challenge neither player has seen
  const challenge = await getRandomChallenge();
  if (!challenge) {
    throw new Error('No challenge found in database.');
  }

  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const matchDurationMs = 300 * 1000; // 5 minutes
  const endsAt = Date.now() + 3000 + matchDurationMs;

  const roomHash = {
    id: roomId,
    challengeId: challenge._id.toString(),
    challengeTitle: challenge.title,
    functionName: challenge.functionName,
    difficulty: challenge.difficulty,
    endsAt: String(endsAt),
    player1Id: String(player1.userId),
    player1Username: player1.username,
    player1SocketId: player1.socketId,
    player1Rating: String(player1.rating || 1000),
    p1Passed: '0',
    player1Progress: '0',
    player2Id: String(player2.userId),
    player2Username: player2.username,
    player2SocketId: player2.socketId,
    player2Rating: String(player2.rating || 1000),
    p2Passed: '0',
    player2Progress: '0',
    totalTests: String(challenge.visibleTests.length + challenge.hiddenTests.length),
    status: 'COUNTDOWN', // COUNTDOWN -> PLAYING -> FINISHED
    startedAt: String(Date.now() + 3000),
    createdAt: String(Date.now())
  };

  // Save room:{id} hash and user:{id}:room string in Redis
  await redis.hset(`room:${roomId}`, roomHash);
  await redis.set(`user:${player1.userId}:room`, roomId, 'EX', 7200);
  if (!player2.isBot) {
    await redis.set(`user:${player2.userId}:room`, roomId, 'EX', 7200);
  }

  // Join socket rooms
  const s1 = io.sockets.sockets.get(player1.socketId);
  const s2 = io.sockets.sockets.get(player2.socketId);
  if (s1) s1.join(roomId);
  if (s2) s2.join(roomId);

  const clientChallenge = sanitizeChallengeForClient(challenge);

  // Emit match:found to both players
  io.to(`user_${player1.userId}`).emit('match:found', {
    roomId,
    opponent: {
      name: player2.username,
      username: player2.username,
      rating: player2.rating,
      isBot: Boolean(player2.isBot)
    },
    challenge: clientChallenge,
    countdownSeconds: 3
  });

  if (!player2.isBot) {
    io.to(`user_${player2.userId}`).emit('match:found', {
      roomId,
      opponent: {
        name: player1.username,
        username: player1.username,
        rating: player1.rating,
        isBot: false
      },
      challenge: clientChallenge,
      countdownSeconds: 3
    });
  }

  console.log(`[Room] Created ${roomId} for ${player1.username} vs ${player2.username}`);

  // Countdown 3 seconds -> match:start
  setTimeout(async () => {
    await updateRoom(roomId, { status: 'PLAYING' });

    // match:start payload as defined in PDF Section 5:
    // challenge (buggy code, visible tests), endsAt timestamp
    io.to(roomId).emit('match:start', {
      roomId,
      challenge: clientChallenge,
      endsAt,
      timeLimitSeconds: Math.floor(matchDurationMs / 1000)
    });

    // Schedule authoritative match timeout handler
    const timeoutHandle = setTimeout(async () => {
      const { resolveMatchTimeout } = require('./match');
      await resolveMatchTimeout(io, roomId);
    }, matchDurationMs + 1000);

    activeTimers.set(roomId, timeoutHandle);

    // If opponent is Bot, start simulated progression
    if (player2.isBot) {
      const { simulateBugBot } = require('./matchManager');
      simulateBugBot(io, roomId, player2.userId, challenge, s1);
    }
  }, 3000);

  return { roomId, challenge };
}

/**
 * Handle player disconnection and reconnection grace period
 * PDF Section 5: opponent:disconnected / reconnected with grace-period timer
 */
function handlePlayerDisconnect(io, socket) {
  const userId = socket.userId;
  const username = socket.username;

  // Check if player was in an active room
  const redis = getRedis();
  redis.get(`user:${userId}:room`).then(async (roomId) => {
    if (!roomId) return;
    const room = await getRoom(roomId);
    if (!room || room.status !== 'PLAYING') return;

    console.log(`[Room] Player ${username} disconnected during match ${roomId}. Starting 30s grace period.`);

    // Emit opponent:disconnected with grace period to room
    io.to(roomId).emit('opponent:disconnected', {
      disconnectedUserId: userId,
      gracePeriodSeconds: 30
    });

    // Set 30s forfeit timer
    const graceTimer = setTimeout(async () => {
      const currentRoom = await getRoom(roomId);
      if (currentRoom && currentRoom.status === 'PLAYING') {
        const otherPlayerId = String(currentRoom.player1Id) === String(userId) ? currentRoom.player2Id : currentRoom.player1Id;
        const { endMatchAuthoritative } = require('./match');
        await endMatchAuthoritative(io, {
          roomId,
          winnerId: otherPlayerId,
          reason: 'OPPONENT_DISCONNECTED'
        });
      }
      disconnectGraceTimers.delete(userId);
    }, 30000);

    disconnectGraceTimers.set(userId, graceTimer);
  });
}

function handlePlayerReconnect(io, socket) {
  const userId = socket.userId;
  if (disconnectGraceTimers.has(userId)) {
    clearTimeout(disconnectGraceTimers.get(userId));
    disconnectGraceTimers.delete(userId);

    const redis = getRedis();
    redis.get(`user:${userId}:room`).then((roomId) => {
      if (roomId) {
        socket.join(roomId);
        io.to(roomId).emit('opponent:reconnected', {
          reconnectedUserId: userId
        });
        console.log(`[Room] Player ${socket.username} reconnected to room ${roomId}. Grace timer cancelled.`);
      }
    });
  }
}

module.exports = {
  createRoomAndStartMatch,
  handlePlayerDisconnect,
  handlePlayerReconnect,
  activeTimers
};
