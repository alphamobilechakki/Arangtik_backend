const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env.config');

/**
 * Connect to MongoDB Database (Local or Cloud Atlas)
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`[MongoDB Atlas Connected]: ${conn.connection.host}`);
    console.log(`[Database Active]: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
