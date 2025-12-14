const { server } = require('./app.js');

const PORT = process.env.PORT || 3000;

server.listen(3000, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io server initialized`);
});