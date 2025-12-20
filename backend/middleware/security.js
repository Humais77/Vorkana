const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const sanitize = require('mongo-sanitize');
const { createLogger, transports, format } = require('winston');

module.exports = function (app) {
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.disable('etag');

  app.use(compression());
  app.use(cookieParser());

  // Enhanced helmet configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'http://localhost:*',
            'ws://localhost:*'
          ],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
      },
      crossOriginResourcePolicy: { policy: "same-origin" },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
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

  // Request sanitization
  app.use((req, res, next) => {
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);
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
    clean(req.body);
    clean(req.query);
    clean(req.params);
    next();
  });

  // HPP protection
  app.use(hpp({
    whitelist: ['page', 'limit', 'sort', 'category', 'price', 'rating', 'search']
  }));

  // ========== RATE LIMITING ==========
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 80,
    delayMs: (hits) => (hits - 80) * 100,
  });

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests – please slow down.',
      });
    },
  });

  const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 15,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many login attempts. Try again later.',
      });
    },
  });

  // ========== REQUEST VALIDATION ==========
  const validateRequest = (req, res, next) => {
    // Check request size
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
      return res.status(413).json({
        success: false,
        message: 'Request payload too large'
      });
    }
    
    // Check content type
    const contentType = req.headers['content-type'];
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!contentType || !contentType.includes('application/json')) {
        return res.status(415).json({
          success: false,
          message: 'Unsupported media type'
        });
      }
    }
    
    // Validate JSON for JSON requests
    if (contentType && contentType.includes('application/json')) {
      try {
        if (req.body && typeof req.body === 'string') {
          req.body = JSON.parse(req.body);
        }
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON format'
        });
      }
    }
    
    next();
  };

  // ========== INJECTION PROTECTION ==========
  const createInjectionProtection = () => {
    const dangerousPatterns = [
      // SQL patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/gi,
      /(\b(OR|AND)\b\s*[\d\w]+\s*=\s*[\d\w]+)/gi,
      /(--|\#|\/\*)/,
      
      // NoSQL patterns
      /\$where/i,
      /\$ne/i,
      /\$nin/i,
      /\$regex/i,
      /\$exists/i,
      /\$type/i,
      /\$mod/i,
      /\$text/i,
      /\$search/i,
      
      // JavaScript injection
      /\beval\s*\(/gi,
      /\bsetTimeout\s*\(/gi,
      /\bsetInterval\s*\(/gi,
      /\bFunction\s*\(/gi,
      /\bnew\s+Function\s*\(/gi
    ];
    
    return (req, res, next) => {
      const checkObject = (obj, path = '') => {
        for (const key in obj) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (obj[key] && typeof obj[key] === 'object') {
            checkObject(obj[key], currentPath);
          } else if (typeof obj[key] === 'string') {
            for (const pattern of dangerousPatterns) {
              if (pattern.test(obj[key])) {
                console.warn(`[SECURITY] Injection attempt detected at ${currentPath}: ${obj[key]}`);
                
                // Block the request
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
      
      // Check all input sources
      checkObject(req.body, 'body');
      checkObject(req.query, 'query');
      checkObject(req.params, 'params');
      
      next();
    };
  };

  // ========== SECURITY LOGGING ==========
  // Create the logger instance
  const SecurityLogger = createLogger({
    level: 'warn',
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    transports: [
      new transports.File({ 
        filename: 'security.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple()
        )
      })
    ]
  });

  // Safe logging function
  const logSecurityEvent = (event, req, details = {}) => {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        event,
        ip: req?.ip || 'unknown',
        userAgent: req?.headers?.['user-agent'] || 'unknown',
        method: req?.method,
        url: req?.url,
        ...details
      };
      
      SecurityLogger.warn(logData);
      
      // In production, you can add additional logging services
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to external monitoring service
        // monitorService.logSecurityEvent(logData);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  // Error response wrapper
  app.use((req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    const originalStatus = res.status;
    
    // Store the original status
    let statusCode = 200;
    
    // Override status method
    res.status = function(code) {
      statusCode = code;
      return originalStatus.call(this, code);
    };
    
    // Override json method for better error logging
    res.json = function(data) {
      // Log security-related responses
      if (statusCode >= 400 && statusCode < 500) {
        logSecurityEvent('CLIENT_ERROR', req, {
          statusCode,
          userId: req.user?._id,
          responseData: typeof data === 'object' ? 
            (data.message ? data.message.substring(0, 200) : 'No message') : 
            String(data).substring(0, 200)
        });
      }
      
      return originalJson.call(this, data);
    };
    
    // Override send method
    res.send = function(data) {
      // Log security-related responses
      if (statusCode >= 400 && statusCode < 500) {
        logSecurityEvent('CLIENT_ERROR', req, {
          statusCode,
          userId: req.user?._id,
          responseData: typeof data === 'string' ? data.substring(0, 200) : 'Non-string response'
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  });

  // ========== APPLY MIDDLEWARE ==========
  app.use(speedLimiter);
  app.use(generalLimiter);
  app.use(validateRequest);
  app.use(createInjectionProtection());

  // Auth-specific rate limiting
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);

  // ========== GLOBAL ERROR HANDLER ==========
  app.use((err, req, res, next) => {
    console.error('🔴 Global Error Handler:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // Log security event for server errors
    logSecurityEvent('SERVER_ERROR', req, {
      error: err.message,
      stack: err.stack?.substring(0, 500) // Limit stack trace length
    });

    // Don't expose stack trace in production
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.status(err.status || 500).json({
      success: false,
      message: isProduction ? 'Internal server error' : err.message,
      ...(!isProduction && { stack: err.stack })
    });
  });
};