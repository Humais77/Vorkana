const mongoose = require('mongoose');
const dns = require('dns');

dns.setServers([
  '8.8.8.8',
  '8.8.4.4'
]);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', (collectionName, method, query, doc) => {
        console.log(
          `📝 MongoDB: ${collectionName}.${method}`,
          JSON.stringify(query)
        );
      });
    }

    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;