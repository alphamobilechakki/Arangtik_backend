const mongoose = require('mongoose');
const { MONGODB_URI, NODE_ENV } = require('./env.config');

/**
 * Mask sensitive credentials for logging
 */
const maskMongoUri = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
};

/**
 * Connect to MongoDB Database (Production or Development)
 */
const connectDB = async () => {
  const envLabel = (NODE_ENV || 'development').toUpperCase();
  try {
    console.log(`[MongoDB]: Connecting to [${envLabel}] database...`);

    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: 'arangtik', // Ensures connecting to 'arangtik' even if URI lacks path
      autoIndex: true,
    });

    console.log(`[MongoDB Connected - ${envLabel}]: ${conn.connection.host}`);
    console.log(`[MongoDB Active Database]: ${conn.connection.name}`);

    // Connection lifecycle event listeners
    mongoose.connection.on('error', (err) => {
      console.error(`❌ [MongoDB Runtime Error]: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(`⚠️ [MongoDB Warning]: Disconnected from [${envLabel}] database.`);
    });

    return conn;
  } catch (error) {
    console.error(`❌ [MongoDB Connection Error (${envLabel})]: ${error.message}`);
    console.error(`   Target URI: ${maskMongoUri(MONGODB_URI)}`);
    process.exit(1);
  }
};

module.exports = connectDB;
