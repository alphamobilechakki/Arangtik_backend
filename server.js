const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db.config');
const { PORT, NODE_ENV } = require('./src/config/env.config');
const { initSocketServer } = require('./src/config/socket.config');
const { initFrequentConnectSocket } = require('./src/modules/frequentConnect/frequentConnect.socket');
const { startAutoDeleteCron } = require('./src/utils/messageAutoDelete.cron');
const { initQueuesAndWorkers, closeQueuesAndWorkers } = require('./src/queues');

/**
 * Initialize and start Arangtik Express Backend Server (Live & Local) with Socket.IO
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

    // 5. Initialize Redis & BullMQ Job Queue Subsystem
    initQueuesAndWorkers();

    // 6. Start HTTP & WebSocket Server
    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use (EADDRINUSE). Release port ${PORT} and try again.`);
      } else {
        console.error('❌ Server error:', err.message);
      }
      process.exit(1);
    });

    httpServer.listen(PORT, () => {
      console.log('==================================================');
      console.log(`🚀 Arangtik Backend Server Running in [${NODE_ENV.toUpperCase()}] mode`);
      console.log(`📡 Local Server URL: http://localhost:${PORT}`);
      console.log(`🔗 API Base Endpoint: http://localhost:${PORT}/api`);
      console.log(`⚡ WebSocket /fc: ws://localhost:${PORT}/fc`);
      console.log(`📄 Health Check URL: http://localhost:${PORT}/api/health`);
      console.log('==================================================');
    });

    // Graceful shutdown
    const handleShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      try {
        httpServer.close();
        await closeQueuesAndWorkers();
      } catch (err) {
        // ignore error during cleanup
      }
      if (signal === 'SIGUSR2') {
        process.kill(process.pid, 'SIGUSR2');
      } else {
        process.exit(0);
      }
    };
    process.once('SIGUSR2', () => handleShutdown('SIGUSR2'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Critical Server Initialization Failure:', error);
    process.exit(1);
  }
};

startServer();
