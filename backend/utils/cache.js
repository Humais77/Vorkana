// utils/cache.js - Production Ready
const redisClient = require('../config/redis');
require('dotenv').config();

// Cache configuration
const CACHE_CONFIG = {
  // TTL in seconds
  TTL: {
    SHORT: 60,           // 1 minute
    MEDIUM: 300,         // 5 minutes
    LONG: 1800,          // 30 minutes
    VERY_LONG: 3600,     // 1 hour
    DAY: 86400,          // 24 hours
    WEEK: 604800,        // 7 days
  },
  
  // Namespace prefixes
  PREFIXES: {
    CATEGORIES: 'cat',
    SUBCATEGORIES: 'subcat',
    SERVICES: 'svc',
    GIGS: 'gig',
    USERS: 'usr',
    AUTH: 'auth',
    SEARCH: 'search',
    ADMIN: 'admin',
    SESSION: 'session',
    RATE_LIMIT: 'rate',
  }
};

// In-memory fallback cache with TTL
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0
    };
    
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    
    // Max size to prevent memory leaks
    this.maxSize = parseInt(process.env.MEMORY_CACHE_MAX_SIZE) || 10000;
  }

  set(key, value, ttlSeconds = 300) {
    // Evict if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry, accessed: Date.now() });
    this.stats.size = this.cache.size;
    return true;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return null;
    }
    
    // Update last accessed time for LRU
    entry.accessed = Date.now();
    this.stats.hits++;
    return entry.value;
  }

  del(keyPattern) {
    let deleted = 0;
    
    if (keyPattern.includes('*')) {
      const regex = new RegExp('^' + keyPattern.replace(/\*/g, '.*') + '$');
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          deleted++;
        }
      }
    } else {
      this.cache.delete(keyPattern);
      deleted = 1;
    }
    
    this.stats.size = this.cache.size;
    return deleted;
  }

  keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keys = [];
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Memory cache cleanup: removed ${cleaned} expired entries`);
      this.stats.size = this.cache.size;
    }
  }

  evictOldest() {
    if (this.cache.size === 0) return;
    
    let oldestKey = null;
    let oldestAccess = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessed < oldestAccess) {
        oldestKey = key;
        oldestAccess = entry.accessed;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
    }
  }

  size() {
    return this.cache.size;
  }

  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    return size;
  }

  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

const memoryCache = new MemoryCache();

// Cache utility with Redis primary, memory fallback
const cache = {
  // Generate cache key
  generateKey(prefix, params = {}) {
    const paramStr = Object.keys(params).length > 0 
      ? `:${Buffer.from(JSON.stringify(params)).toString('base64').replace(/=/g, '')}`
      : '';
    return `${prefix}${paramStr}`;
  },

  // Get with namespace support
  async get(key, options = {}) {
    const { useMemory = true, namespace = 'default' } = options;
    const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
    
    // Always try Redis first in production
    if (process.env.NODE_ENV === 'production') {
      try {
        await redisClient.connect();
        if (redisClient.isReady()) {
          const value = await redisClient.client.get(fullKey);
          if (value) {
            redisClient.recordHit();
            return JSON.parse(value);
          }
        }
      } catch (err) {
        console.warn('Redis GET error:', err.message);
        redisClient.stats.errors++;
      }
    }
    
    // Fallback to memory cache
    if (useMemory) {
      return memoryCache.get(fullKey);
    }
    
    return null;
  },

  // Set with namespace support
  async set(key, value, ttlSeconds = 300, options = {}) {
    const { useMemory = true, namespace = 'default' } = options;
    const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
    const stringified = JSON.stringify(value);
    
    // Set in Redis for production
    if (process.env.NODE_ENV === 'production') {
      try {
        await redisClient.connect();
        if (redisClient.isReady()) {
          await redisClient.client.setex(fullKey, ttlSeconds, stringified);
        }
      } catch (err) {
        console.warn('Redis SET error:', err.message);
        redisClient.stats.errors++;
      }
    }
    
    // Always set in memory cache as fallback
    if (useMemory) {
      return memoryCache.set(fullKey, value, ttlSeconds);
    }
    
    return true;
  },

  // Delete with namespace and pattern support
  async del(keyPattern, options = {}) {
    const { namespace = 'default' } = options;
    const fullPattern = namespace !== 'default' ? `${namespace}:${keyPattern}` : keyPattern;
    
    // Delete from Redis
    if (process.env.NODE_ENV === 'production') {
      try {
        await redisClient.connect();
        if (redisClient.isReady()) {
          if (keyPattern.includes('*')) {
            const keys = await redisClient.client.keys(fullPattern);
            if (keys.length > 0) {
              await redisClient.client.del(keys);
              console.log(`🧹 Redis: Deleted ${keys.length} keys with pattern: ${fullPattern}`);
            }
          } else {
            await redisClient.client.del(fullPattern);
          }
        }
      } catch (err) {
        console.warn('Redis DEL error:', err.message);
        redisClient.stats.errors++;
      }
    }
    
    // Delete from memory cache
    return memoryCache.del(fullPattern);
  },

  // Multi-get
  async mget(keys, options = {}) {
    const { useMemory = true, namespace = 'default' } = options;
    const fullKeys = namespace !== 'default' ? keys.map(k => `${namespace}:${k}`) : keys;
    
    if (process.env.NODE_ENV === 'production') {
      try {
        await redisClient.connect();
        if (redisClient.isReady()) {
          const values = await redisClient.client.mget(...fullKeys);
          return values.map(v => v ? JSON.parse(v) : null);
        }
      } catch (err) {
        console.warn('Redis MGET error:', err.message);
        redisClient.stats.errors++;
      }
    }
    
    // Memory fallback
    return fullKeys.map(key => memoryCache.get(key));
  },

  // Pipeline set for multiple items
  async pipelineSet(items, options = {}) {
    const { namespace = 'default' } = options;
    
    if (process.env.NODE_ENV === 'production') {
      try {
        await redisClient.connect();
        if (redisClient.isReady()) {
          const pipeline = redisClient.client.pipeline();
          items.forEach(({ key, value, ttlSeconds = 300 }) => {
            const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
            pipeline.setex(fullKey, ttlSeconds, JSON.stringify(value));
          });
          await pipeline.exec();
          return;
        }
      } catch (err) {
        console.warn('Redis pipeline error:', err.message);
        redisClient.stats.errors++;
      }
    }
    
    // Memory fallback
    items.forEach(({ key, value, ttlSeconds = 300 }) => {
      const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
      memoryCache.set(fullKey, value, ttlSeconds);
    });
  },

  // Get keys by pattern
  async keys(pattern, options = {}) {
    const { namespace = 'default' } = options;
    const fullPattern = namespace !== 'default' ? `${namespace}:${pattern}` : pattern;
    
    if (process.env.NODE_ENV === 'production') {
      try {
        await redisClient.connect();
        if (redisClient.isReady()) {
          return await redisClient.client.keys(fullPattern);
        }
      } catch (err) {
        console.warn('Redis KEYS error:', err.message);
        redisClient.stats.errors++;
      }
    }
    
    return memoryCache.keys(fullPattern);
  },

  // Increment counter (for rate limiting, views, etc.)
  async incr(key, amount = 1, options = {}) {
    const { namespace = 'default' } = options;
    const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
    
    if (process.env.NODE_ENV === 'production') {
      try {
        await redisClient.connect();
        if (redisClient.isReady()) {
          if (amount === 1) {
            return await redisClient.client.incr(fullKey);
          } else {
            return await redisClient.client.incrby(fullKey, amount);
          }
        }
      } catch (err) {
        console.warn('Redis INCR error:', err.message);
        redisClient.stats.errors++;
      }
    }
    
    // Memory fallback
    const current = memoryCache.get(fullKey) || 0;
    const newValue = current + amount;
    memoryCache.set(fullKey, newValue, 3600);
    return newValue;
  },

  // Set with expiration only if not exists (NX)
  async setnx(key, value, ttlSeconds = 300, options = {}) {
    const { namespace = 'default' } = options;
    const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
    
    if (process.env.NODE_ENV === 'production') {
      try {
        await redisClient.connect();
        if (redisClient.isReady()) {
          const result = await redisClient.client.set(fullKey, JSON.stringify(value), 'NX', 'EX', ttlSeconds);
          return result === 'OK';
        }
      } catch (err) {
        console.warn('Redis SETNX error:', err.message);
        redisClient.stats.errors++;
      }
    }
    
    // Memory fallback - check if exists
    if (!memoryCache.get(fullKey)) {
      memoryCache.set(fullKey, value, ttlSeconds);
      return true;
    }
    return false;
  },

  // Get TTL
  async ttl(key, options = {}) {
    const { namespace = 'default' } = options;
    const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
    
    if (process.env.NODE_ENV === 'production') {
      try {
        await redisClient.connect();
        if (redisClient.isReady()) {
          return await redisClient.client.ttl(fullKey);
        }
      } catch (err) {
        console.warn('Redis TTL error:', err.message);
        redisClient.stats.errors++;
      }
    }
    
    // Memory fallback - not implemented
    return -1;
  },

  // Clear entire namespace
  async clearNamespace(namespace) {
    const pattern = `${namespace}:*`;
    return this.del(pattern);
  },

  // Flush all cache (use with caution)
  async flushAll() {
    let redisCleared = 0;
    let memoryCleared = 0;
    
    if (process.env.NODE_ENV === 'production') {
      try {
        await redisClient.connect();
        if (redisClient.isReady()) {
          await redisClient.client.flushdb();
          redisCleared = 1;
        }
      } catch (err) {
        console.warn('Redis FLUSHDB error:', err.message);
      }
    }
    
    memoryCleared = memoryCache.clear();
    
    console.log(`🧹 Cache flushed: Redis=${redisCleared > 0 ? 'yes' : 'no'}, Memory=${memoryCleared} entries`);
    return { redisCleared, memoryCleared };
  },

  // Stats for monitoring
  stats() {
    const redisStats = redisClient.getStats();
    const memoryStats = memoryCache.getStats();
    
    return {
      redis: redisStats,
      memory: memoryStats,
      environment: process.env.NODE_ENV,
      overallHitRate: (redisStats.hitRate || '0%'),
      connected: redisClient.isReady(),
      uptime: process.uptime()
    };
  },

  // Health check
  async health() {
    const redisHealth = await redisClient.healthCheck();
    return {
      redis: redisHealth,
      memory: {
        healthy: true,
        size: memoryCache.size(),
        ...memoryCache.getStats()
      },
      overall: redisHealth.healthy && memoryCache.size() < memoryCache.maxSize
    };
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Cache shutdown initiated...');
  
  // Stop memory cache cleanup interval
  if (memoryCache.cleanupInterval) {
    clearInterval(memoryCache.cleanupInterval);
  }
  
  // Disconnect Redis
  if (redisClient) {
    await redisClient.disconnect();
  }
  
  console.log('✅ Cache shutdown completed');
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('beforeExit', shutdown);

module.exports = cache;