// utils/cache.js
const Redis = require('ioredis');
require('dotenv').config();

let client;
let isRedisEnabled = false;

if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
  try {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    client.on('error', (err) => console.warn('Redis connection error:', err));
    client.on('connect', () => console.log('Redis connected for caching'));
    isRedisEnabled = true;
  } catch (err) {
    console.warn('Redis not available, falling back to in-memory cache');
  }
}

// Simple in-memory fallback
const memoryCache = new Map();

const cache = {
  async get(key) {
    if (isRedisEnabled) {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    }
    return memoryCache.get(key) || null;
  },

  async set(key, value, ttlSeconds = 300) { // 5 minutes default
    const stringified = JSON.stringify(value);
    if (isRedisEnabled) {
      await client.set(key, stringified, 'EX', ttlSeconds);
    } else {
      memoryCache.set(key, {
        value,
        expiry: Date.now() + ttlSeconds * 1000
      });
    }
  },

  async del(keyPattern) {
    if (isRedisEnabled) {
      const keys = await client.keys(keyPattern);
      if (keys.length > 0) await client.del(keys);
    } else {
      for (const key of memoryCache.keys()) {
        if (key.startsWith(keyPattern)) {
          memoryCache.delete(key);
        }
      }
    }
  },

  // Clean expired in-memory entries
  cleanup() {
    if (!isRedisEnabled) {
      const now = Date.now();
      for (const [key, entry] of memoryCache.entries()) {
        if (entry.expiry < now) {
          memoryCache.delete(key);
        }
      }
    }
  }
};

// Optional: Clean memory cache every 10 minutes
if (!isRedisEnabled) {
  setInterval(() => cache.cleanup(), 10 * 60 * 1000);
}

module.exports = cache;