const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.route.js');
const categoryRoutes = require('./routes/category.route.js');
const serviceRoutes = require('./routes/services.route.js');
// const securityMiddleware = require('./middleware/security.js');

dotenv.config();
connectDB();

const app = express();

app.use(express.json());

// securityMiddleware(app);
app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services',serviceRoutes);

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
