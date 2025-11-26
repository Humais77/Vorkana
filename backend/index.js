const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const categoryRoutes = require('./routes/category.route.js');

dotenv.config();
connectDB();

const app = express();

app.use(express.json());

app.use(cors());

app.use('/api/categories', categoryRoutes);

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

const PORT = process.env.PORT || 3000;

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
