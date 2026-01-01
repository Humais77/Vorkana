// security.js - Fix the mongo sanitization part
const helmet = require('helmet');
const hpp = require('hpp');

module.exports = function setupSecurity(app) {
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  
  // Enhanced helmet configuration
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "same-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin" },
      referrerPolicy: { policy: "no-referrer" },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      permissionsPolicy: {
        accelerometer: [],
        ambientLightSensor: [],
        autoplay: [],
        camera: [],
        encryptedMedia: [],
        fullscreen: [],
        geolocation: [],
        gyroscope: [],
        magnetometer: [],
        microphone: [],
        midi: [],
        payment: [],
        pictureInPicture: [],
        speaker: [],
        usb: [],
        vr: []
      }
    })
  );

  // HPP protection
  app.use(hpp({
    whitelist: ['page', 'limit', 'sort', 'category', 'price', 'rating', 'search']
  }));

  // Custom MongoDB sanitization that doesn't modify req.query
  app.use((req, res, next) => {
    // Clean body, query, and params from MongoDB operators
    const sanitize = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      Object.keys(obj).forEach(key => {
        // Check if key starts with $ (MongoDB operator)
        if (key.startsWith('$')) {
          delete obj[key];
          return;
        }
        
        // Recursively sanitize nested objects
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      });
      
      return obj;
    };
    
    // Create sanitized copies instead of modifying originals
    if (req.body) {
      req.body = sanitize(JSON.parse(JSON.stringify(req.body)));
    }
    
    if (req.query) {
      // For query, we need to be careful since it's read-only
      const sanitizedQuery = sanitize(JSON.parse(JSON.stringify(req.query)));
      // Apply sanitized query back safely
      Object.keys(req.query).forEach(key => {
        if (key.startsWith('$')) {
          delete req.query[key];
        }
      });
    }
    
    if (req.params) {
      const sanitizedParams = sanitize(JSON.parse(JSON.stringify(req.params)));
      Object.keys(sanitizedParams).forEach(key => {
        if (!key.startsWith('$')) {
          req.params[key] = sanitizedParams[key];
        }
      });
    }
    
    next();
  });

  // XSS protection
  app.use((req, res, next) => {
    const clean = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/<\s*script/gi, '&lt;script')
            .replace(/on\w+\s*=/gi, 'disabled-event=')
            .replace(/javascript:/gi, '')
            .replace(/eval\s*\(/gi, 'disabled-eval(');
        } else if (typeof obj[key] === 'object') {
          clean(obj[key]);
        }
      }
    };
    
    if (req.body && typeof req.body === 'object') {
      const bodyCopy = JSON.parse(JSON.stringify(req.body));
      clean(bodyCopy);
      req.body = bodyCopy;
    }
    
    next();
  });

  // SQL/NoSQL injection protection
  app.use((req, res, next) => {
    const dangerousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/gi,
      /(\b(OR|AND)\b\s*[\d\w]+\s*=\s*[\d\w]+)/gi,
      /(--|\#|\/\*)/,
      /\$where/i,
      /\$ne/i,
      /\$nin/i,
      /\$regex/i,
      /\$exists/i,
      /\$type/i,
      /\$mod/i,
      /\$text/i,
      /\$search/i,
      /\beval\s*\(/gi,
      /\bsetTimeout\s*\(/gi,
      /\bsetInterval\s*\(/gi,
      /\bFunction\s*\(/gi,
      /\bnew\s+Function\s*\(/gi
    ];
    
    const checkObject = (obj, path = '') => {
      for (const key in obj) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (obj[key] && typeof obj[key] === 'object') {
          checkObject(obj[key], currentPath);
        } else if (typeof obj[key] === 'string') {
          for (const pattern of dangerousPatterns) {
            if (pattern.test(obj[key])) {
              console.warn(`[SECURITY] Injection attempt detected at ${currentPath}`);
              return res.status(400).json({
                success: false,
                message: 'Security violation detected',
                code: 'SECURITY_VIOLATION'
              });
            }
          }
        }
      }
    };
    
    // Check input sources safely
    if (req.body && typeof req.body === 'object') {
      const bodyCopy = JSON.parse(JSON.stringify(req.body));
      checkObject(bodyCopy, 'body');
    }
    
    if (req.query && typeof req.query === 'object') {
      const queryCopy = JSON.parse(JSON.stringify(req.query));
      checkObject(queryCopy, 'query');
    }
    
    if (req.params && typeof req.params === 'object') {
      const paramsCopy = JSON.parse(JSON.stringify(req.params));
      checkObject(paramsCopy, 'params');
    }
    
    next();
  });
};