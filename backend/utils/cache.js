const CACHE_CONFIG = {
  TTL: {
    SHORT: 60,
    MEDIUM: 300,
    LONG: 1800,
    VERY_LONG: 3600,
    DAY: 86400,
    WEEK: 604800,
  },
  
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

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0
    };
    
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    
    this.maxSize = parseInt(process.env.MEMORY_CACHE_MAX_SIZE) || 10000;
  }

  set(key, value, ttlSeconds = 300) {
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

const cache = {
  generateKey(prefix, params = {}) {
    const paramStr = Object.keys(params).length > 0 
      ? `:${Buffer.from(JSON.stringify(params)).toString('base64').replace(/=/g, '')}`
      : '';
    return `${prefix}${paramStr}`;
  },

  async get(key, options = {}) {
    const { useMemory = true, namespace = 'default' } = options;
    const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
    
    if (useMemory) {
      return memoryCache.get(fullKey);
    }
    
    return null;
  },

  async set(key, value, ttlSeconds = 300, options = {}) {
    const { useMemory = true, namespace = 'default' } = options;
    const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
    
    if (useMemory) {
      return memoryCache.set(fullKey, value, ttlSeconds);
    }
    
    return true;
  },

  async del(keyPattern, options = {}) {
    const { namespace = 'default' } = options;
    const fullPattern = namespace !== 'default' ? `${namespace}:${keyPattern}` : keyPattern;
    
    return memoryCache.del(fullPattern);
  },

  async mget(keys, options = {}) {
    const { useMemory = true, namespace = 'default' } = options;
    const fullKeys = namespace !== 'default' ? keys.map(k => `${namespace}:${k}`) : keys;
    
    return fullKeys.map(key => memoryCache.get(key));
  },

  async pipelineSet(items, options = {}) {
    const { namespace = 'default' } = options;
    
    items.forEach(({ key, value, ttlSeconds = 300 }) => {
      const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
      memoryCache.set(fullKey, value, ttlSeconds);
    });
  },

  async keys(pattern, options = {}) {
    const { namespace = 'default' } = options;
    const fullPattern = namespace !== 'default' ? `${namespace}:${pattern}` : pattern;
    
    return memoryCache.keys(fullPattern);
  },

  async incr(key, amount = 1, options = {}) {
    const { namespace = 'default' } = options;
    const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
    
    const current = memoryCache.get(fullKey) || 0;
    const newValue = current + amount;
    memoryCache.set(fullKey, newValue, 3600);
    return newValue;
  },

  async setnx(key, value, ttlSeconds = 300, options = {}) {
    const { namespace = 'default' } = options;
    const fullKey = namespace !== 'default' ? `${namespace}:${key}` : key;
    
    if (!memoryCache.get(fullKey)) {
      memoryCache.set(fullKey, value, ttlSeconds);
      return true;
    }
    return false;
  },

  async ttl(key, options = {}) {
    return -1;
  },

  async clearNamespace(namespace) {
    const pattern = `${namespace}:*`;
    return this.del(pattern);
  },

  async flushAll() {
    let memoryCleared = 0;
    
    memoryCleared = memoryCache.clear();
    
    console.log(`🧹 Cache flushed: Memory=${memoryCleared} entries`);
    return { memoryCleared };
  },

  stats() {
    const memoryStats = memoryCache.getStats();
    
    return {
      memory: memoryStats,
      environment: process.env.NODE_ENV,
      overallHitRate: memoryStats.hitRate,
      uptime: process.uptime()
    };
  },

  async health() {
    return {
      memory: {
        healthy: true,
        size: memoryCache.size(),
        ...memoryCache.getStats()
      },
      overall: memoryCache.size() < memoryCache.maxSize
    };
  }
};

const shutdown = async () => {
  console.log('🛑 Cache shutdown initiated...');
  
  if (memoryCache.cleanupInterval) {
    clearInterval(memoryCache.cleanupInterval);
  }
  
  console.log('✅ Cache shutdown completed');
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('beforeExit', shutdown);

module.exports = cache;