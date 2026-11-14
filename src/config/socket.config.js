const { Server } = require('socket.io');
const { CLIENT_URL } = require('./env.config');

let io = null;

/**
 * Configure and initialize Socket.IO server
 */
const initSocketServer = (httpServer) => {
  const allowedOrigins = [
    CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          CLIENT_URL === '*'
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initSocketServer first.');
  }
  return io;
};

module.exports = {
  initSocketServer,
  getIO,
};
