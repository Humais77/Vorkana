const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const sanitize = require('mongo-sanitize');
const { createLogger, transports } = require('winston');
module.exports = function (app) {
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.disable('etag');

  app.use(compression());

  app.use(cookieParser());

  // In security.js - Update helmet configuration
// security.js - Enhanced helmet
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

  app.use((req, res, next) => {
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);
    next();
  });

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

  app.use(hpp({
    whitelist: ['page', 'limit', 'sort', 'category', 'price', 'rating', 'search']
  }));

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
  // security.js - Add request validation
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
// security.js - Add injection protection middleware
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
const SecurityLogger = createLogger({
  level: 'warn',
  transports: [
    new transports.File({ 
      filename: 'security.log',
      format: require('winston').format.combine(
        require('winston').format.timestamp(),
        require('winston').format.json()
      )
    })
  ]
});

const logSecurityEvent = (event, details) => {
  SecurityLogger.warn({
    timestamp: new Date().toISOString(),
    event,
    ...details,
    ip: details.req?.ip,
    userAgent: details.req?.headers['user-agent']
  });
  
  // Send to security monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    // Integrate with SIEM/Security monitoring
  }
};

// Add to various security checks
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    // Log security-related responses
    if (res.statusCode >= 400 && res.statusCode < 500) {
      logSecurityEvent('CLIENT_ERROR', {
        req: {
          method: req.method,
          url: req.url,
          ip: req.ip,
          userId: req.user?._id
        },
        response: {
          statusCode: res.statusCode,
          data: typeof data === 'string' ? data.substring(0, 500) : data
        }
      });
    }
    originalSend.call(this, data);
  };
  next();
});


app.use(speedLimiter);
app.use(generalLimiter);
app.use(validateRequest);
app.use(createInjectionProtection());

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);
};