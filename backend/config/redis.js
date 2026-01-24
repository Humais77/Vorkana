// config/redis.js - Production Ready
const Redis = require('ioredis');
require('dotenv').config();

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
    this.connectionTimeout = 10000;
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      reconnects: 0
    };
  }

  async connect() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => {
        this.retryAttempts++;
        this.stats.reconnects++;
        
        if (this.retryAttempts > this.maxRetries) {
          console.warn('⚠️ Redis max retries reached, falling back to memory cache');
          return null;
        }
        
        const delay = Math.min(times * 200, 5000);
        console.warn(`🔁 Redis reconnecting in ${delay}ms... (attempt ${times}/${this.maxRetries})`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      connectTimeout: this.connectionTimeout,
      enableReadyCheck: true,
      keepAlive: 10000,
      connectionName: `node-api-${process.env.NODE_ENV || 'development'}`,
      lazyConnect: false,
      showFriendlyErrorStack: process.env.NODE_ENV !== 'production'
    };

    // Use Redis URL if provided
    if (process.env.REDIS_URL) {
      try {
        this.client = new Redis(process.env.REDIS_URL, redisConfig);
      } catch (error) {
        console.error('❌ Failed to create Redis client with URL:', error.message);
        this.client = new Redis(redisConfig);
      }
    } else {
      this.client = new Redis(redisConfig);
    }

    // Event listeners
    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
      this.retryAttempts = 0;
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready to accept commands');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      this.isConnected = false;
      this.stats.errors++;
    });

    this.client.on('close', () => {
      console.warn('⚠️ Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔁 Redis reconnecting...');
    });

    this.client.on('end', () => {
      console.log('🔚 Redis connection ended');
      this.isConnected = false;
    });

    // Monitor commands in development
    if (process.env.NODE_ENV === 'development') {
      this.client.monitor((err, monitor) => {
        console.log('👁️ Redis monitor started');
        monitor.on('monitor', (time, args, source, database) => {
          console.log(`👁️ Redis command: ${args}`);
        });
      });
    }

    // Test connection with retry
    let attempts = 0;
    while (attempts < 3) {
      try {
        await this.client.ping();
        console.log('✅ Redis ping successful');
        break;
      } catch (err) {
        attempts++;
        console.warn(`⚠️ Redis ping attempt ${attempts}/3 failed:`, err.message);
        if (attempts === 3) {
          console.warn('⚠️ Redis connection test failed, falling back to memory cache');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return this.client;
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        this.isConnected = false;
        console.log('✅ Redis disconnected gracefully');
      } catch (err) {
        console.error('❌ Error disconnecting Redis:', err.message);
      }
    }
  }

  getClient() {
    return this.client;
  }

  isReady() {
    return this.isConnected && this.client.status === 'ready';
  }

  // Statistics
  recordHit() {
    this.stats.cacheHits++;
    this.stats.totalRequests++;
  }

  recordMiss() {
    this.stats.cacheMisses++;
    this.stats.totalRequests++;
  }

  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? ((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      isConnected: this.isConnected,
      status: this.client?.status || 'disconnected',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  // Utility methods
  async healthCheck() {
    try {
      if (!this.isReady()) {
        return { healthy: false, message: 'Redis not connected' };
      }
      
      await this.client.ping();
      const info = await this.client.info('memory');
      
      return {
        healthy: true,
        uptime: await this.client.info('server').then(info => {
          const match = info.match(/uptime_in_seconds:(\d+)/);
          return match ? parseInt(match[1]) : null;
        }),
        memory: await this.client.info('memory').then(info => {
          const used = info.match(/used_memory_human:([\d\.]+[KMG]?B)/);
          return used ? used[1] : null;
        }),
        connectedClients: await this.client.info('clients').then(info => {
          const clients = info.match(/connected_clients:(\d+)/);
          return clients ? parseInt(clients[1]) : null;
        }),
        keyspace: await this.client.info('keyspace').then(info => {
          const keys = info.match(/db0:keys=(\d+)/);
          return keys ? parseInt(keys[1]) : null;
        })
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  // Clear cache with patterns
  async clearPattern(pattern) {
    if (!this.isReady()) return 0;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🧹 Cleared ${keys.length} keys with pattern: ${pattern}`);
      }
      return keys.length;
    } catch (error) {
      console.error('❌ Error clearing cache pattern:', error.message);
      return 0;
    }
  }

  // Flush database (use with caution)
  async flushDB() {
    if (!this.isReady()) return false;
    
    try {
      await this.client.flushdb();
      console.log('🧹 Redis database flushed');
      return true;
    } catch (error) {
      console.error('❌ Error flushing Redis DB:', error.message);
      return false;
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

// Auto-connect in production
if (process.env.NODE_ENV === 'production') {
  redisClient.connect().catch(err => {
    console.error('❌ Failed to auto-connect Redis:', err.message);
  });
}

module.exports = redisClient;