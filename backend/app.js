const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const http = require('http'); // Add this
const { initSocket } = require('./socket/order.socket'); // Add this

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
const orderRoutes = require('./routes/order.route.js'); // Add this
const passport = require("passport");
require("./config/passport.js");

connectDB();

const app = express();
const server = http.createServer(app); // Create HTTP server

// Initialize Socket.io
const io = initSocket(server);

// Make io accessible in routes if needed
app.set('io', io);

// ========== CRITICAL FIX: COOKIE PARSER MUST BE FIRST ==========
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-cookie-secret-key-change-this'));

// ========== SECURITY MIDDLEWARE ==========
security(app);

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Import ipKeyGenerator from express-rate-limit
const { ipKeyGenerator } = require('express-rate-limit');

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  skip: (req) => {
    return req.path === '/health';
  }
});

// Apply global rate limiting
app.use(globalLimiter);

// Prevent parameter pollution
app.use(hpp());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Request-ID',
    'X-CSRF-Token',
    'Accept'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Total-Count',
    'X-Total-Pages',
    'X-Page-Size',
    'X-Current-Page',
    'X-Response-Time',
    'X-CSRF-Token'
  ],
  credentials: true,
  maxAge: 86400
}));

// Body parsing with limits
app.use(express.json({ 
  limit: '10mb'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100
}));

// Initialize passport
app.use(passport.initialize());

// ========== ROUTES ==========
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/orders', orderRoutes); // Add this

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API is healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔴 Unhandled Error:', {
    message: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS policy') {
    return res.status(403).json({
      success: false,
      message: 'Cross-origin request blocked'
    });
  }

  // Handle rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.toString()
    })
  });
});

module.exports = { app, server }; // Export both app and server 