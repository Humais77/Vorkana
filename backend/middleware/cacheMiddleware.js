const cache = require('../utils/cache');
const crypto = require('crypto');

const CACHE_TTL = {
  PUBLIC: {
    SHORT: 60,
    MEDIUM: 300,
    LONG: 1800,
    VERY_LONG: 3600
  },
  PRIVATE: {
    SHORT: 30,
    MEDIUM: 120,
    LONG: 600
  },
  STATIC: {
    DAY: 86400,
    WEEK: 604800
  }
};

const NAMESPACES = {
  PUBLIC: 'pub',
  ADMIN: 'admin',
  USER: 'usr',
  API: 'api',
  SEARCH: 'search',
  DASHBOARD: 'dashboard'
};

const generateCacheKey = (req, namespace = NAMESPACES.PUBLIC) => {
  const { method, originalUrl, query, params, user } = req;
  
  const keyData = {
    method,
    path: originalUrl.split('?')[0],
    query: method === 'GET' ? query : {},
    params,
    userId: user?._id || 'anonymous',
    role: user?.role || 'guest'
  };
  
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(keyData))
    .digest('hex');
  
  return cache.generateKey(`${namespace}:${hash}`, keyData);
};

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
    if (skipMethods.includes(req.method)) {
      res.set('X-Cache', 'BYPASSED_METHOD');
      return next();
    }

    if (bypassCookies.some(cookie => req.cookies?.[cookie])) {
      res.set('X-Cache', 'BYPASSED_COOKIE');
      return next();
    }

    if (bypassHeaders.some(header => req.headers[header])) {
      res.set('X-Cache', 'BYPASSED_HEADER');
      return next();
    }

    if (checkUserRole && req.user && rolesToBypass.includes(req.user.role)) {
      res.set('X-Cache', 'BYPASSED_ROLE');
      return next();
    }

    if (publicOnly && req.user) {
      res.set('X-Cache', 'BYPASSED_AUTH');
      return next();
    }

    const cacheKey = customKeyFn ? customKeyFn(req) : generateCacheKey(req, namespace);
    
    const taggedKey = tags.length > 0 
      ? `${cacheKey}:tags:${tags.join(':')}` 
      : cacheKey;

    try {
      const cachedData = await cache.get(taggedKey, { namespace });

      if (cachedData) {
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': taggedKey,
          'X-Cache-TTL': ttl,
          'X-Cache-Generated': new Date().toISOString()
        });

        if (staleWhileRevalidate) {
          res.json({
            ...cachedData,
            cached: true,
            stale: false,
            timestamp: new Date().toISOString()
          });

          setTimeout(async () => {
            try {
              console.log(`📡 Background revalidation scheduled for: ${taggedKey}`);
            } catch (error) {
              console.warn('Background revalidation failed:', error.message);
            }
          }, 100);
          
          return;
        }

        return res.json({
          ...cachedData,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      res.set({
        'X-Cache': 'MISS',
        'X-Cache-Key': taggedKey,
        'X-Cache-TTL': ttl
      });

      const originalJson = res.json;

      res.json = function(data) {
        if (data && data.success !== false) {
          const cacheableData = {
            ...data,
            _cacheMetadata: {
              cachedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + (ttl * 1000)).toISOString(),
              ttl,
              key: taggedKey
            }
          };

          cache.set(taggedKey, cacheableData, ttl, { namespace })
            .then(() => console.log(`💾 Cache stored: ${taggedKey}`))
            .catch(err => console.warn('Cache store error:', err.message));
        }

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

const createClearCacheMiddleware = (options = {}) => {
  const {
    patterns = [],
    tags = [],
    namespace = NAMESPACES.PUBLIC,
    clearAllOnWrite = false
  } = options;

  return async (req, res, next) => {
    const originalJson = res.json;

    res.json = async function(data) {
      if (data && data.success !== false) {
        try {
          const clearPromises = [];

          patterns.forEach(pattern => {
            const fullPattern = namespace !== 'default' ? `${namespace}:${pattern}` : pattern;
            clearPromises.push(cache.del(fullPattern));
          });

          if (tags.length > 0) {
            tags.forEach(tag => {
              const tagPattern = `${namespace}:*:tags:*${tag}*`;
              clearPromises.push(cache.del(tagPattern));
            });
          }

          if (clearAllOnWrite) {
            clearPromises.push(cache.clearNamespace(namespace));
          }

          if (req.params.id) {
            const resourcePattern = `${namespace}:*${req.params.id}*`;
            clearPromises.push(cache.del(resourcePattern));
          }

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

      return originalJson.call(this, data);
    };

    next();
  };
};

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
    
    res.set('X-Cache-Stats', JSON.stringify(stats));
    res.set('X-Cache-Health', health.overall ? 'healthy' : 'unhealthy');
    
    next();
  } catch (error) {
    console.error('Cache stats middleware error:', error);
    next();
  }
};

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