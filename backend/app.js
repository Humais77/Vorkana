const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.route.js');
const categoryRoutes = require('./routes/category.route.js');
const serviceRoutes = require('./routes/services.route.js');

dotenv.config(); 
connectDB();
// if (process.env.NODE_ENV !== 'test') {
//   connectDB();
// }

const app = express();
app.use(express.json());
app.use(cors());

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/services', serviceRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';
  res.status(statusCode).json({ success: false, statusCode, message });
});

// if (process.env.NODE_ENV === 'test') {
//   require('./test.route.js')(app);
// }

module.exports = app;