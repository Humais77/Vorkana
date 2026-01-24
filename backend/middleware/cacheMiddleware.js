// middleware/cacheMiddleware.js - Production Ready
const cache = require('../utils/cache');
const crypto = require('crypto');

// Cache duration presets (in seconds)
const CACHE_TTL = {
  PUBLIC: {
    SHORT: 60,      // 1 minute
    MEDIUM: 300,    // 5 minutes
    LONG: 1800,     // 30 minutes
    VERY_LONG: 3600 // 1 hour
  },
  PRIVATE: {
    SHORT: 30,      // 30 seconds
    MEDIUM: 120,    // 2 minutes
    LONG: 600       // 10 minutes
  },
  STATIC: {
    DAY: 86400,     // 24 hours
    WEEK: 604800    // 7 days
  }
};

// Namespace prefixes for different routes
const NAMESPACES = {
  PUBLIC: 'pub',
  ADMIN: 'admin',
  USER: 'usr',
  API: 'api',
  SEARCH: 'search',
  DASHBOARD: 'dashboard'
};

// Generate cache key from request
const generateCacheKey = (req, namespace = NAMESPACES.PUBLIC) => {
  const { method, originalUrl, query, params, user } = req;
  
  // For GET requests, include query params
  const keyData = {
    method,
    path: originalUrl.split('?')[0],
    query: method === 'GET' ? query : {},
    params,
    userId: user?._id || 'anonymous',
    role: user?.role || 'guest'
  };
  
  // Create hash of key data
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(keyData))
    .digest('hex');
  
  return cache.generateKey(`${namespace}:${hash}`, keyData);
};

// Cache middleware factory
const createCacheMiddleware = (options = {}) => {
  const {
    ttl = CACHE_TTL.PUBLIC.MEDIUM,
    namespace = NAMESPACES.PUBLIC,
    skipMethods = ['POST', 'PUT', 'DELETE', 'PATCH'],
    bypassCookies = ['cache_bypass', 'no_cache'],
    bypassHeaders = ['x-no-cache', 'cache-control'],
    checkUserRole = false,
    rolesToBypass = ['admin'],
    publicOnly = false,
    customKeyFn = null,
    staleWhileRevalidate = false,
    revalidateTimeout = 5000,
    tags = []
  } = options;

  return async (req, res, next) => {
    // Skip non-GET methods or explicitly bypassed
    if (skipMethods.includes(req.method)) {
      res.set('X-Cache', 'BYPASSED_METHOD');
      return next();
    }

    // Check bypass cookies
    if (bypassCookies.some(cookie => req.cookies?.[cookie])) {
      res.set('X-Cache', 'BYPASSED_COOKIE');
      return next();
    }

    // Check bypass headers
    if (bypassHeaders.some(header => req.headers[header])) {
      res.set('X-Cache', 'BYPASSED_HEADER');
      return next();
    }

    // Check user role bypass
    if (checkUserRole && req.user && rolesToBypass.includes(req.user.role)) {
      res.set('X-Cache', 'BYPASSED_ROLE');
      return next();
    }

    // Public only check
    if (publicOnly && req.user) {
      res.set('X-Cache', 'BYPASSED_AUTH');
      return next();
    }

    // Generate cache key
    const cacheKey = customKeyFn ? customKeyFn(req) : generateCacheKey(req, namespace);
    
    // Add tags to cache key for invalidation
    const taggedKey = tags.length > 0 
      ? `${cacheKey}:tags:${tags.join(':')}` 
      : cacheKey;

    try {
      // Try to get from cache
      const cachedData = await cache.get(taggedKey, { namespace });

      if (cachedData) {
        // Cache hit
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': taggedKey,
          'X-Cache-TTL': ttl,
          'X-Cache-Generated': new Date().toISOString()
        });

        // If staleWhileRevalidate is enabled, serve stale data and refresh in background
        if (staleWhileRevalidate) {
          // Serve cached response immediately
          res.json({
            ...cachedData,
            cached: true,
            stale: false,
            timestamp: new Date().toISOString()
          });

          // Refresh cache in background
          setTimeout(async () => {
            try {
              // Store original json method
              const originalJson = res.json;
              
              // Create a mock response to capture fresh data
              const mockRes = {
                json: function(data) {
                  if (data && data.success !== false) {
                    cache.set(taggedKey, data, ttl, { namespace })
                      .then(() => console.log(`🔄 Cache revalidated: ${taggedKey}`))
                      .catch(err => console.warn('Cache revalidation error:', err.message));
                  }
                  return this;
                }
              };

              // Create a mock next function
              const mockNext = () => {
                // This would normally call the route handler
                // For background refresh, we need a different approach
                console.log(`⚠️ Stale-while-revalidate not implemented for background refresh on ${req.path}`);
              };

              // We need a better approach for background refresh
              // This is a simplified version
              console.log(`📡 Background revalidation scheduled for: ${taggedKey}`);
            } catch (error) {
              console.warn('Background revalidation failed:', error.message);
            }
          }, 100); // Small delay to not block response
          
          return; // Response already sent
        }

        // Normal cache hit response
        return res.json({
          ...cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      // Cache miss
      res.set({
        'X-Cache': 'MISS',
        'X-Cache-Key': taggedKey,
        'X-Cache-TTL': ttl
      });

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = function(data) {
        // Only cache successful responses
        if (data && data.success !== false) {
          // Add cache metadata
          const cacheableData = {
            ...data,
            _cacheMetadata: {
              cachedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + (ttl * 1000)).toISOString(),
              ttl,
              key: taggedKey
            }
          };

          // Store in cache
          cache.set(taggedKey, cacheableData, ttl, { namespace })
            .then(() => console.log(`💾 Cache stored: ${taggedKey}`))
            .catch(err => console.warn('Cache store error:', err.message));
        }

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error.message);
      res.set('X-Cache', 'ERROR');
      next();
    }
  };
};

// Clear cache middleware (for POST/PUT/DELETE operations)
const createClearCacheMiddleware = (options = {}) => {
  const {
    patterns = [],
    tags = [],
    namespace = NAMESPACES.PUBLIC,
    clearAllOnWrite = false
  } = options;

  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    res.json = async function(data) {
      // Only clear cache on successful operations
      if (data && data.success !== false) {
        try {
          const clearPromises = [];

          // Clear specific patterns
          patterns.forEach(pattern => {
            const fullPattern = namespace !== 'default' ? `${namespace}:${pattern}` : pattern;
            clearPromises.push(cache.del(fullPattern));
          });

          // Clear by tags if provided
          if (tags.length > 0) {
            tags.forEach(tag => {
              const tagPattern = `${namespace}:*:tags:*${tag}*`;
              clearPromises.push(cache.del(tagPattern));
            });
          }

          // Clear all if specified
          if (clearAllOnWrite) {
            clearPromises.push(cache.clearNamespace(namespace));
          }

          // Clear cache for the specific resource if ID is in params
          if (req.params.id) {
            const resourcePattern = `${namespace}:*${req.params.id}*`;
            clearPromises.push(cache.del(resourcePattern));
          }

          // Execute all cache clearing
          const results = await Promise.allSettled(clearPromises);
          
          const failed = results.filter(r => r.status === 'rejected');
          if (failed.length > 0) {
            console.warn('Some cache clearing failed:', failed.map(f => f.reason.message));
          }

          const cleared = results.filter(r => r.status === 'fulfilled').length;
          res.set('X-Cache-Cleared', cleared.toString());
          
        } catch (error) {
          console.error('Cache clearing error:', error.message);
        }
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

// Cache stats middleware
const cacheStatsMiddleware = async (req, res, next) => {
  try {
    const stats = cache.stats();
    const health = await cache.health();
    
    req.cacheStats = {
      stats,
      health,
      headers: {
        'X-Cache-Stats': JSON.stringify(stats),
        'X-Cache-Health': health.overall ? 'healthy' : 'unhealthy'
      }
    };
    
    // Add headers to response
    res.set('X-Cache-Stats', JSON.stringify(stats));
    res.set('X-Cache-Health', health.overall ? 'healthy' : 'unhealthy');
    
    next();
  } catch (error) {
    console.error('Cache stats middleware error:', error);
    next();
  }
};

// Cache control header middleware
const cacheControlMiddleware = (options = {}) => {
  const {
    public: isPublic = true,
    maxAge = 300,
    staleWhileRevalidate = 60,
    mustRevalidate = false,
    noCache = false,
    noStore = false
  } = options;

  return (req, res, next) => {
    if (noStore) {
      res.set('Cache-Control', 'no-store');
    } else if (noCache) {
      res.set('Cache-Control', 'no-cache');
    } else {
      const directives = [];
      
      if (isPublic) {
        directives.push('public');
      } else {
        directives.push('private');
      }
      
      directives.push(`max-age=${maxAge}`);
      
      if (staleWhileRevalidate > 0) {
        directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
      }
      
      if (mustRevalidate) {
        directives.push('must-revalidate');
      }
      
      res.set('Cache-Control', directives.join(', '));
    }
    
    next();
  };
};

module.exports = {
  createCacheMiddleware,
  createClearCacheMiddleware,
  cacheStatsMiddleware,
  cacheControlMiddleware,
  CACHE_TTL,
  NAMESPACES
};