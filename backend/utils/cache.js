// utils/cache.js - UPDATED VERSION
const Redis = require('ioredis');
require('dotenv').config();

let redisClient = null;
let isRedisEnabled = false;

// In-memory fallback cache
const memoryCache = new Map();

const cache = {
  async get(key) {
    if (isRedisEnabled && redisClient) {
      try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } catch (err) {
        console.warn('Redis GET error, falling back to memory:', err.message);
      }
    }

    const entry = memoryCache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return entry.value;
    }
    memoryCache.delete(key); // Clean expired
    return null;
  },

  async set(key, value, ttlSeconds = 300) {
    const stringified = JSON.stringify(value);

    if (isRedisEnabled && redisClient) {
      try {
        await redisClient.set(key, stringified, 'EX', ttlSeconds);
        return;
      } catch (err) {
        console.warn('Redis SET error, falling back to memory:', err.message);
      }
    }

    // Memory fallback
    memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  },

  async del(keyPattern) {
    if (isRedisEnabled && redisClient) {
      try {
        if (keyPattern.includes('*')) {
          const keys = await redisClient.keys(keyPattern);
          if (keys.length > 0) {
            await redisClient.del(keys);
          }
        } else {
          await redisClient.del(keyPattern);
        }
        return;
      } catch (err) {
        console.warn('Redis DEL error, falling back to memory cleanup:', err.message);
      }
    }

    // Memory cleanup for pattern (simple prefix match)
    for (const key of memoryCache.keys()) {
      if (key.startsWith(keyPattern.replace('*', ''))) {
        memoryCache.delete(key);
      }
    }
  },
  async mget(keys) {
    if (isRedisEnabled && redisClient) {
      try {
        return await redisClient.mget(...keys);
      } catch (err) {
        console.warn('Redis MGET error:', err.message);
      }
    }

    // Memory fallback
    return keys.map(key => {
      const entry = memoryCache.get(key);
      if (entry && entry.expiry > Date.now()) {
        return entry.value;
      }
      memoryCache.delete(key);
      return null;
    });
  },

  async pipelineSet(items) {
    if (isRedisEnabled && redisClient) {
      try {
        const pipeline = redisClient.pipeline();
        items.forEach(({ key, value, ttlSeconds = 300 }) => {
          pipeline.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        });
        await pipeline.exec();
        return;
      } catch (err) {
        console.warn('Redis pipeline error:', err.message);
      }
    }

    // Memory fallback
    items.forEach(({ key, value, ttlSeconds = 300 }) => {
      memoryCache.set(key, {
        value,
        expiry: Date.now() + ttlSeconds * 1000
      });
    });
  },
  async keys(pattern) {
  if (isRedisEnabled && redisClient) {
    try {
      return await redisClient.keys(pattern);
    } catch (err) {
      console.warn('Redis KEYS error:', err.message);
      return [];
    }
  }
  
  // Memory fallback - simple pattern matching
  const patternRegex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  const keys = [];
  for (const key of memoryCache.keys()) {
    if (patternRegex.test(key)) {
      keys.push(key);
    }
  }
  return keys;
},
  

  // Manual cleanup for memory cache
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (entry.expiry < now) {
        memoryCache.delete(key);
      }
    }
  }
  
};


// Initialize Redis only if URL is provided AND we can connect
if (process.env.REDIS_URL && process.env.ENABLE_REDIS !== 'false') {
  const initializeRedis = () => {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 100, 3000);
          console.log(`Redis reconnecting in ${delay}ms... (attempt ${times})`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        enableOfflineQueue: false,
        enableReadyCheck: true,
        lazyConnect: true // Don't connect immediately
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully for caching');
        isRedisEnabled = true;
      });

      redisClient.on('error', (err) => {
        console.warn('⚠️ Redis connection error:', err.message);
        isRedisEnabled = false;
      });

      redisClient.on('close', () => {
        console.warn('⚠️ Redis connection closed');
        isRedisEnabled = false;
      });

      redisClient.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      redisClient.on('ready', () => {
        console.log('✅ Redis ready for commands');
        isRedisEnabled = true;
      });

      // Try to connect, but don't fail if Redis is unavailable
      redisClient.connect().catch(err => {
        console.warn('⚠️ Redis initial connection failed, using memory cache:', err.message);
        isRedisEnabled = false;
        redisClient = null;
      });

    } catch (err) {
      console.warn('⚠️ Failed to initialize Redis client, using memory cache:', err.message);
      isRedisEnabled = false;
      redisClient = null;
    }
  };

  // Initialize with a delay to avoid startup issues
  setTimeout(initializeRedis, 2000);
} else {
  console.log('ℹ️  Redis disabled, using in-memory cache only');
}

// Periodic cleanup for memory cache
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000); // Every 10 minutes

module.exports = cache;