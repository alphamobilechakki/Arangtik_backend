const app = require('./src/app');
const connectDB = require('./src/config/db.config');
const { PORT, NODE_ENV } = require('./src/config/env.config');

/**
 * Initialize and start Arangtik Express Backend Server
 */
const startServer = async () => {
  try {
    // 1. Establish MongoDB Database Connection
    await connectDB();

    // 2. Start HTTP Listener
    app.listen(PORT, () => {
      console.log('==================================================');
      console.log(`🚀 Arangtik Backend Server Running in [${NODE_ENV.toUpperCase()}] mode`);
      console.log(`📡 Local Server URL: http://localhost:${PORT}`);
      console.log(`🔗 API Base Endpoint: http://localhost:${PORT}/api`);
      console.log(`📄 Health Check URL: http://localhost:${PORT}/api/health`);
      console.log('==================================================');
    });
  } catch (error) {
    console.error('❌ Critical Server Initialization Failure:', error);
    process.exit(1);
  }
};

startServer();
