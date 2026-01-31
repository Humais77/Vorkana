const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const http = require('http');
const compression = require('compression');
const responseTime = require('response-time');
const morgan = require('morgan');
const csrfRoutes = require('./routes/csrf.route');
const sessionCleanup = require('./cron/sessionCleanup');
const { validateEnv } = require('./config/env-check');

dotenv.config();
validateEnv();

const connectDB = require('./config/db');
const security = require('./middleware/security.js');

const authRoutes = require('./routes/auth.route.js');
const categoryRoutes = require('./routes/category.route.js');
const subcategoryRoutes = require('./routes/subcategory.route.js');
const serviceRoutes = require('./routes/services.route.js');
const gigRoutes = require('./routes/gig.route.js');
const userRoutes = require('./routes/user.route.js');
const adminRoutes = require('./routes/admin.route.js');
const searchRoute = require("./routes/search.routes.js");
const subscribeRoute = require('./routes/subscribe.route.js');
const contactRoutes = require('./routes/contact.route.js');
const passport = require("passport");
require("./config/passport.js");

// Connect to database
connectDB().then(() => {
  console.log('✅ Database connected');
   sessionCleanup.init();
});

const app = express();
const server = http.createServer(app);


app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(responseTime((req, res, time) => {
  if (time > 500) {
    console.warn(`SLOW ENDPOINT: ${req.method} ${req.originalUrl} - ${time.toFixed(2)}ms`);
  }
  
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400,
    stream: process.stderr
  }));
}

app.use(cookieParser(process.env.COOKIE_SECRET || 'your-cookie-secret-key-change-this'));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || process.env.NODE_ENV === 'test') return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Request-ID',
    'X-CSRF-Token',
    'Accept',
    'X-Admin-Request', 
    'X-Admin-Token',
    'X-Request-Source',
    'X-Client-Version',
    'Cache-Control', 
    'If-Modified-Since'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Total-Count',
    'X-Total-Pages',
    'X-Page-Size',
    'X-Current-Page',
    'X-Response-Time',
    'X-CSRF-Token',
    'X-Admin-Access',
    'ETag',
    'Last-Modified'
  ],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
security(app);
console.log('Server time:', new Date());
console.log('UTC time:', new Date().toUTCString());
console.log('Timezone offset:', new Date().getTimezoneOffset());
const MemoryStore = require('express-rate-limit').MemoryStore;

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new MemoryStore(),
  skip: (req) => {
    return req.path === '/health' || 
           req.path.startsWith('/public/') ||
           req.method === 'OPTIONS';
  }
});

app.use(globalLimiter);

app.use(hpp({
  whitelist: ['sort', 'limit', 'page']
}));

app.use(express.json({ 
  limit: '5mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '5mb',
  parameterLimit: 50
}));

if (process.env.NODE_ENV === 'production') {
  app.use('/public', express.static('public', {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.match(/\.(jpg|jpeg|png|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    }
  }));
}

app.use(passport.initialize());

app.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.json({ 
    success: true, 
    message: 'API is healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
    },
    uptime: process.uptime()
  });
});

const cacheControl = (seconds = 60) => (req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('/api/auth')) {
    res.set('Cache-Control', `public, max-age=${seconds}`);
  }
  next();
};

app.use(cacheControl(60));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subcategoryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoute);
app.use('/api/subscribe-email', subscribeRoute);
app.use('/api/contact', contactRoutes); 
app.use('/api/csrf', csrfRoutes);

app.use((req, res, next) => {
  if (req.csrfToken) {
    res.setHeader('X-CSRF-Token', req.csrfToken);
  }
  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const errorId = Math.random().toString(36).substr(2, 9);
  const timestamp = new Date().toISOString();
  
  console.error(`[${errorId}] Error:`, {
    message: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp
  });

  if (err.message === 'Not allowed by CORS policy') {
    return res.status(403).json({
      success: false,
      message: 'Cross-origin request blocked',
      errorId,
      timestamp
    });
  }

  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      errorId,
      timestamp
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      errorId,
      timestamp
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      errorId,
      timestamp
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message),
      errorId,
      timestamp
    });
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    errorId,
    timestamp,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack
    })
  });
});


if (process.env.NODE_ENV === 'production') {
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    console.warn(`Request timeout: ${req.method} ${req.url}`);
  });
  next();
});
module.exports = { app, server };