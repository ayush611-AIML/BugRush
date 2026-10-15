const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');

let redisClient;
let isMock = false;

function initRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) {
          // Give up connecting to external Redis and trigger mock
          return null;
        }
        return Math.min(times * 100, 500);
      },
      lazyConnect: true,
      enableOfflineQueue: false
    });

    client.on('connect', () => {
      console.log(`[Redis] Connected to real Redis at ${redisUrl}`);
    });

    client.on('error', (err) => {
      if (!isMock) {
        console.warn(`[Redis] Real Redis connection failed (${err.message}). Using ioredis-mock for seamless local operation.`);
        switchToMock();
      }
    });

    client.connect().catch((err) => {
      if (!isMock) {
        console.warn(`[Redis] Real Redis connect attempt failed (${err.message}). Using ioredis-mock.`);
        switchToMock();
      }
    });

    redisClient = client;
  } catch (err) {
    console.warn(`[Redis] Error initializing Redis client: ${err.message}. Using ioredis-mock.`);
    switchToMock();
  }

  return redisClient;
}

function switchToMock() {
  if (isMock) return redisClient;
  isMock = true;
  redisClient = new RedisMock();
  console.log('[Redis] Mock Redis initialized successfully (in-memory sorted sets & hashes ready).');
  return redisClient;
}

function getRedis() {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

module.exports = {
  getRedis,
  initRedis,
  isMockRedis: () => isMock
};
