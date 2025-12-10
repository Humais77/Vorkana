const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');
const security = require('./middleware/security.js');

const authRoutes = require('./routes/auth.route.js');
const categoryRoutes = require('./routes/category.route.js');
const serviceRoutes = require('./routes/services.route.js');
const gigRoutes = require('./routes/gig.route.js');
const userRoutes = require('./routes/user.route.js');
const passport = require("passport");
require("./config/passport.js");

connectDB();

const app = express();
security(app);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(passport.initialize());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/gigs', gigRoutes);


app.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is alive', timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;