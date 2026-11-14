const http = require('http');
const app = require('./app');
const connectDB = require('./config/db.config');
const { NODE_ENV } = require('./config/env.config');
const { initSocketServer } = require('./config/socket.config');
const { initFrequentConnectSocket } = require('./modules/frequentConnect/frequentConnect.socket');
const { startAutoDeleteCron } = require('./utils/messageAutoDelete.cron');

const PORT = 8083;

/**
 * Initialize and start Arangtik Express Backend Server with Socket.IO
 */
const startServer = async () => {
  try {
    // 1. Establish MongoDB Database Connection
    await connectDB();

    // 2. Wrap Express app with HTTP server
    const httpServer = http.createServer(app);

    // 3. Initialize Socket.IO and Frequent Connect handlers
    const io = initSocketServer(httpServer);
    initFrequentConnectSocket(io);

    // 4. Start 15-Minute Message Auto-Delete Background Cron
    startAutoDeleteCron();

    // 5. Start HTTP & WebSocket Server
    httpServer.listen(PORT, () => {
      console.log('==================================================');
      console.log(`🚀 Arangtik Backend Server Running in [${NODE_ENV.toUpperCase()}] mode`);
      console.log(`📡 Local Server URL: http://localhost:${PORT}`);
      console.log(`🔗 API Base Endpoint: http://localhost:${PORT}/api`);
      console.log(`⚡ WebSocket /fc: ws://localhost:${PORT}/fc`);
      console.log(`📄 Health Check URL: http://localhost:${PORT}/api/health`);
      console.log('==================================================');
    });
  } catch (error) {
    console.error('❌ Critical Server Initialization Failure:', error);
    process.exit(1);
  }
};

startServer();
