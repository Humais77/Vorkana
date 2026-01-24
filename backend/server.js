// Import app and server from app.js
const { server } = require('./app.js');

const PORT = process.env.PORT || 3000;

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  
  // Log startup information
  const memoryUsage = process.memoryUsage();
  console.log(`📊 Startup Memory: RSS=${Math.round(memoryUsage.rss / 1024 / 1024)}MB, Heap=${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Production mode enabled');
  }
});