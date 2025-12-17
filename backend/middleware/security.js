const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const sanitize = require('mongo-sanitize');

module.exports = function (app) {
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.disable('etag');

  app.use(compression());

  app.use(cookieParser());

  // In security.js - Update helmet configuration
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
          'ws://localhost:*',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*', 'wss://localhost:*'],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Add this
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
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

  app.use(speedLimiter);
  app.use(generalLimiter);

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);
};