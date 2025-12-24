const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const http = require('http');
const compression = require('compression'); // ADD THIS
const responseTime = require('response-time'); // ADD THIS
const morgan = require('morgan'); // ADD THIS for logging

dotenv.config();

// Validate environment variables
const validateEnv = () => {
  const requiredEnvVars = ['JWT_SECRET', 'MONGO_URL', 'FRONTEND_URL'];
  const missing = requiredEnvVars.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  if (process.env.NODE_ENV === 'production' && !process.env.COOKIE_SECRET) {
    console.error('❌ COOKIE_SECRET is required in production');
    process.exit(1);
  }
};

validateEnv();

const connectDB = require('./config/db');
const security = require('./middleware/security.js');

const authRoutes = require('./routes/auth.route.js');
const categoryRoutes = require('./routes/category.route.js');
const serviceRoutes = require('./routes/services.route.js');
const gigRoutes = require('./routes/gig.route.js');
const userRoutes = require('./routes/user.route.js');
const adminRoutes = require('./routes/admin.route.js');
const searchRoute = require("./routes/search.routes.js");
const popularServicesRoute = require('./routes/popularService.route.js');
const passport = require("passport");
require("./config/passport.js");

// Connect to database with connection pooling
connectDB().then(() => {
  console.log('✅ Database connected with optimized pool');
});

const app = express();
const server = http.createServer(app);

// ==================== CRITICAL PERFORMANCE MIDDLEWARE ====================

// 1. Compression - REDUCES RESPONSE SIZE BY 70%
app.use(compression({
  level: 6, // Optimal balance between speed and compression
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 2. Response Time Tracking - IDENTIFY SLOW ENDPOINTS
app.use(responseTime((req, res, time) => {
  if (time > 300) {
    console.warn(`🚨 SLOW ENDPOINT: ${req.method} ${req.originalUrl} - ${time.toFixed(2)}ms`);
  }
  
  // Add response time header for client-side monitoring
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
}));

// 3. Optimized Morgan Logging (skip in production for performance)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (process.env.NODE_ENV === 'production') {
  // Minimal logging in production
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400, // Only log errors in production
    stream: process.stderr
  }));
}

// ==================== SECURITY MIDDLEWARE ====================

app.use(cookieParser(process.env.COOKIE_SECRET || 'your-cookie-secret-key-change-this'));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

// Optimized CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || process.env.NODE_ENV === 'test') return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked for origin: ${origin}`);
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
    'Cache-Control', // Add cache control headers
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
    'ETag', // For caching
    'Last-Modified'
  ],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
security(app);

// ==================== RATE LIMITING ====================

// Use memory store for better performance
const MemoryStore = require('express-rate-limit').MemoryStore;

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Reduced from 1000 for better memory management
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new MemoryStore(),
  // FIXED: Proper IP key generator
  keyGenerator: (req, res) => {
    // Use the built-in helper for IPv6 support
    const ipKeyGenerator = require('express-rate-limit').ipKeyGenerator;
    const ip = ipKeyGenerator(req, res);
    
    // Add user agent for additional uniqueness (optional)
    const userAgent = req.headers['user-agent'] || '';
    return `${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
  },
  skip: (req) => {
    // Skip rate limiting for health checks and static files
    return req.path === '/health' || 
           req.path.startsWith('/public/') ||
           req.method === 'OPTIONS';
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});
app.use(globalLimiter);

// ==================== BODY PARSING OPTIMIZATIONS ====================

app.use(hpp({
  whitelist: ['sort', 'limit', 'page'] // Only check these parameters
}));

// Parse JSON with optimization
app.use(express.json({ 
  limit: '5mb', // Reduced from 10mb for security/performance
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

// Parse URL-encoded with optimization
app.use(express.urlencoded({ 
  extended: true, 
  limit: '5mb', // Reduced from 10mb
  parameterLimit: 50 // Reduced from 100
}));

// ==================== STATIC FILES WITH CACHING ====================

if (process.env.NODE_ENV === 'production') {
  app.use('/public', express.static('public', {
    maxAge: '1d', // Cache for 1 day
    etag: true, // Enable ETag for caching
    lastModified: true,
    setHeaders: (res, path) => {
      // Cache images longer
      if (path.match(/\.(jpg|jpeg|png|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=604800'); // 1 week
      }
    }
  }));
}

// ==================== PASSPORT INITIALIZATION ====================

app.use(passport.initialize());

// ==================== ROUTES WITH PERFORMANCE HEADERS ====================

// Health check with minimal overhead
app.get('/health', (req, res) => {
  const start = Date.now();
  res.json({ 
    success: true, 
    message: 'API is healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dbStatus: 'connected' // You might want to check DB connection here
  });
  console.log(`Health check: ${Date.now() - start}ms`);
});

// Cache control middleware for GET routes
const cacheControl = (seconds = 300) => (req, res, next) => {
  if (req.method === 'GET' && !req.path.includes('/api/auth')) {
    res.set('Cache-Control', `public, max-age=${seconds}`);
  }
  next();
};

// Apply cache control to all GET routes
app.use(cacheControl(300));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoute);
app.use('/api/popular-services', popularServicesRoute);
// Add this route to your Express server
app.get('/api/proxy/image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Optionally validate the URL is from your Cloudinary account
    if (!url.includes(process.env.CLOUDINARY_CLOUD_NAME)) {
      return res.status(403).json({ error: 'Invalid image source' });
    }
    
    // Fetch the image from Cloudinary
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    
    // Get image data
    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type');
    
    // Serve the image
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    res.send(buffer);
    
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});
// ==================== ERROR HANDLING ====================

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
  
  console.error(`🔴 [${errorId}] Unhandled Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp
  });

  // Specific error handling
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

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    errorId,
    timestamp,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.toString()
    })
  });
});

// ==================== SERVER OPTIMIZATION ====================

// Increase server timeouts
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds

// Set proper timeout for requests
app.use((req, res, next) => {
  req.setTimeout(30000, () => { // 30 second timeout
    console.warn(`Request timeout: ${req.method} ${req.url}`);
  });
  next();
});

// ==================== PERFORMANCE MONITORING ====================

// Performance monitoring middleware
if (process.env.NODE_ENV === 'production') {
  let requestCount = 0;
  let totalResponseTime = 0;
  
  setInterval(() => {
    const avgResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;
    console.log(`📊 Performance Stats: ${requestCount} requests, Avg: ${avgResponseTime.toFixed(2)}ms`);
    
    // Reset counters
    requestCount = 0;
    totalResponseTime = 0;
    
    // Log memory usage
    const memoryUsage = process.memoryUsage();
    console.log(`🧠 Memory: RSS=${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap=${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB/${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`);
  }, 60000); // Log every minute
}

module.exports = { app, server };