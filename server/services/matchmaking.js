const { getRedis } = require('../config/redis');
const Challenge = require('../models/Challenge');

const QUEUE_KEY = 'queue:1v1';

/**
 * Add a user to the matchmaking queue sorted set
 */
async function addToQueue({ userId, username, socketId, rating = 1000 }) {
  const redis = getRedis();
  const numRating = Number(rating) || 1000;

  // Add to sorted set with rating as score
  await redis.zadd(QUEUE_KEY, numRating, String(userId));

  // Store metadata
  await redis.hset(`queue:meta:${userId}`, {
    userId: String(userId),
    username: String(username),
    socketId: String(socketId),
    rating: String(numRating),
    joinedAt: String(Date.now())
  });

  return { userId, rating: numRating };
}

/**
 * Remove a user from the matchmaking queue
 */
async function removeFromQueue(userId) {
  const redis = getRedis();
  await redis.zrem(QUEUE_KEY, String(userId));
  await redis.del(`queue:meta:${userId}`);
}

/**
 * Check if a user is currently in the matchmaking queue
 */
async function isInQueue(userId) {
  const redis = getRedis();
  const score = await redis.zscore(QUEUE_KEY, String(userId));
  return score !== null;
}

/**
 * Check if a user is currently in an active room
 */
async function getUserActiveRoom(userId) {
  const redis = getRedis();
  const roomId = await redis.get(`user:${userId}:room`);
  if (!roomId) return null;
  const room = await redis.hgetall(`room:${roomId}`);
  if (!room || !room.id || room.status === 'FINISHED') {
    await redis.del(`user:${userId}:room`);
    return null;
  }
  return room;
}

/**
 * Pick a random challenge from the database
 */
async function pickRandomChallenge() {
  const count = await Challenge.countDocuments();
  if (count === 0) return null;
  const random = Math.floor(Math.random() * count);
  return await Challenge.findOne().skip(random);
}

/**
 * Find an opponent for the given user in queue:1v1
 */
async function tryMatchmaking(userId) {
  const redis = getRedis();
  const userScore = await redis.zscore(QUEUE_KEY, String(userId));
  if (userScore === null) return null;

  const rating = Number(userScore);
  const meta = await redis.hgetall(`queue:meta:${userId}`);
  if (!meta || !meta.socketId) return null;

  const joinedAt = Number(meta.joinedAt) || Date.now();
  const waitSeconds = (Date.now() - joinedAt) / 1000;

  // Rating window expands by 50 points per 3 seconds in queue
  const windowDelta = Math.min(600, 150 + Math.floor(waitSeconds / 3) * 50);
  const minRating = Math.max(0, rating - windowDelta);
  const maxRating = rating + windowDelta;

  // Query nearby candidates in the sorted set
  const candidates = await redis.zrangebyscore(QUEUE_KEY, minRating, maxRating);

  let opponentId = null;
  for (const c of candidates) {
    if (String(c) !== String(userId)) {
      opponentId = c;
      break;
    }
  }

  // If no candidate in narrow window and waiting for > 12s, match any available opponent
  if (!opponentId && waitSeconds > 12) {
    const allInQueue = await redis.zrange(QUEUE_KEY, 0, -1);
    for (const c of allInQueue) {
      if (String(c) !== String(userId)) {
        opponentId = c;
        break;
      }
    }
  }

  if (!opponentId) return null;

  const opponentMeta = await redis.hgetall(`queue:meta:${opponentId}`);
  if (!opponentMeta || !opponentMeta.socketId) {
    // Stale queue entry
    await removeFromQueue(opponentId);
    return null;
  }

  // Atomically remove both players from the queue
  await redis.zrem(QUEUE_KEY, String(userId), String(opponentId));
  await redis.del(`queue:meta:${userId}`);
  await redis.del(`queue:meta:${opponentId}`);

  // Pick challenge
  const challenge = await pickRandomChallenge();
  if (!challenge) {
    throw new Error('No challenges found in database. Please run seed script.');
  }

  const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const roomData = {
    id: roomId,
    challengeId: challenge._id.toString(),
    challengeTitle: challenge.title,
    functionName: challenge.functionName,
    difficulty: challenge.difficulty,
    description: challenge.description,
    buggyCode: challenge.buggyCode,
    player1Id: String(userId),
    player1Username: meta.username || 'Player 1',
    player1SocketId: meta.socketId,
    player1Rating: String(meta.rating || 1000),
    player1Progress: '0',
    player1PassedTests: '0',
    player2Id: String(opponentId),
    player2Username: opponentMeta.username || 'Player 2',
    player2SocketId: opponentMeta.socketId,
    player2Rating: String(opponentMeta.rating || 1000),
    player2Progress: '0',
    player2PassedTests: '0',
    totalTests: String(challenge.visibleTests.length + challenge.hiddenTests.length),
    status: 'STARTING', // STARTING -> PLAYING -> FINISHED
    winner: '',
    startTime: String(Date.now() + 3000), // 3s countdown
    createdAt: String(Date.now())
  };

  // Set active room state in Redis
  await redis.hset(`room:${roomId}`, roomData);

  // Set user active room mapping string
  await redis.set(`user:${userId}:room`, roomId, 'EX', 7200); // 2 hour max expiry
  await redis.set(`user:${opponentId}:room`, roomId, 'EX', 7200);

  return {
    roomId,
    roomData,
    challenge,
    player1: {
      userId: String(userId),
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
  };
}

/**
 * Get room by ID
 */
async function getRoom(roomId) {
  const redis = getRedis();
  return await redis.hgetall(`room:${roomId}`);
}

/**
 * Update room fields
 */
async function updateRoom(roomId, fields) {
  const redis = getRedis();
  return await redis.hset(`room:${roomId}`, fields);
}

/**
 * Cleanup room active state
 */
async function cleanupRoom(roomId, player1Id, player2Id) {
  const redis = getRedis();
  if (player1Id) await redis.del(`user:${player1Id}:room`);
  if (player2Id) await redis.del(`user:${player2Id}:room`);
  await redis.hset(`room:${roomId}`, { status: 'FINISHED' });
}

module.exports = {
  QUEUE_KEY,
  addToQueue,
  removeFromQueue,
  isInQueue,
  getUserActiveRoom,
  tryMatchmaking,
  getRoom,
  updateRoom,
  cleanupRoom
};
