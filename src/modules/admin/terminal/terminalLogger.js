/**
 * In-Memory Real-Time Terminal Logger (Zero Database / Zero Disk writes)
 * - Keeps a strict FIFO Circular Buffer of the latest 200 logs in RAM (~100 KB)
 * - Broadcasts events in real-time via Socket.IO
 * - Automatically masks sensitive information (passwords, tokens, OTPs)
 */

let io = null;
try {
  const { getIO } = require('../../../config/socket.config');
  // Lazy getter since getIO() may throw before initSocketServer runs
  io = () => {
    try {
      return getIO();
    } catch {
      return null;
    }
  };
} catch {
  io = () => null;
}

const MAX_LOGS = 200;
const ringBuffer = [];
let logCounter = 0;

// Sensitive keys to mask from log messages
const SENSITIVE_PATTERNS = [
  /password["':\s=]+([^"\s,&]+)/gi,
  /token["':\s=]+([^"\s,&]+)/gi,
  /secret["':\s=]+([^"\s,&]+)/gi,
  /otp["':\s=]+(\d{4,6})/gi,
  /authorization:\s*bearer\s+([^\s]+)/gi,
];

const maskSensitiveData = (text) => {
  if (typeof text !== 'string') return text;
  let masked = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    masked = masked.replace(pattern, (match, val) => {
      return match.replace(val, '***[MASKED]***');
    });
  }
  return masked;
};

/**
 * Detect tag from message contents
 */
const detectTagAndLevel = (msg, defaultLevel = 'info') => {
  const str = String(msg);
  let tag = 'SYSTEM';
  let level = defaultLevel;

  if (str.includes('[HTTP]')) {
    tag = 'HTTP';
  } else if (str.includes('[BullMQ]') || str.includes('[Queue:')) {
    tag = 'BULLMQ';
  } else if (str.includes('[Worker:') || str.includes('[BullMQ Worker]') || str.includes('[BackgroundWorker]')) {
    tag = 'WORKER';
  } else if (str.includes('[PythonGarmentAI]') || str.includes('[AdminGarmentAI]') || str.includes('Garment AI')) {
    tag = 'GARMENT_AI';
  } else if (str.includes('[MongoDB') || str.includes('[Database')) {
    tag = 'MONGODB';
  } else if (str.includes('[Redis')) {
    tag = 'REDIS';
  } else if (str.includes('Cron') || str.includes('Auto-Delete')) {
    tag = 'CRON';
  } else if (str.includes('error') || str.includes('Error') || str.includes('❌') || defaultLevel === 'error') {
    tag = 'ERROR';
    level = 'error';
  }

  if (str.includes('✅') || str.includes('SUCCESS') || str.includes('completed successfully')) {
    level = 'success';
  } else if (str.includes('⚠️') || str.includes('warning') || str.includes('Warning')) {
    level = 'warn';
  }

  return { tag, level };
};

/**
 * Add a log entry to the in-memory ring buffer and emit to connected admins
 */
const pushLog = (rawMessage, explicitLevel = null, explicitTag = null) => {
  const cleanMsg = maskSensitiveData(typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage));
  const { tag, level } = detectTagAndLevel(cleanMsg, explicitLevel || 'info');

  const entry = {
    id: `log_${Date.now()}_${++logCounter}`,
    timestamp: new Date().toISOString(),
    timeStr: new Date().toLocaleTimeString(),
    level: explicitLevel || level,
    tag: explicitTag || tag,
    message: cleanMsg,
  };

  // Maintain circular FIFO buffer of MAX_LOGS
  ringBuffer.push(entry);
  if (ringBuffer.length > MAX_LOGS) {
    ringBuffer.shift();
  }

  // Real-time broadcast to admin dashboard
  try {
    const socketServer = typeof io === 'function' ? io() : null;
    if (socketServer) {
      socketServer.emit('server_terminal_log', entry);
    }
  } catch (err) {
    // Suppress socket emit errors to never crash runtime
  }

  return entry;
};

// Store original console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

let isHooked = false;

/**
 * Safely hook global console logs to capture all backend activity
 */
const initConsoleHook = () => {
  if (isHooked) return;
  isHooked = true;

  console.log = (...args) => {
    originalLog.apply(console, args);
    try {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      pushLog(msg, 'info');
    } catch (_) {}
  };

  console.warn = (...args) => {
    originalWarn.apply(console, args);
    try {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      pushLog(msg, 'warn');
    } catch (_) {}
  };

  console.error = (...args) => {
    originalError.apply(console, args);
    try {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      pushLog(msg, 'error');
    } catch (_) {}
  };
};

/**
 * Express middleware to capture all HTTP API requests
 */
const terminalHttpMiddleware = (req, res, next) => {
  // Ignore static assets or favicon
  if (req.originalUrl.startsWith('/uploads') || req.originalUrl === '/favicon.ico') {
    return next();
  }

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    let level = 'info';
    if (status >= 500) level = 'error';
    else if (status >= 400) level = 'warn';
    else if (status >= 200 && status < 300) level = 'success';

    const msg = `[HTTP] ${req.method} ${req.originalUrl} ${status} (${duration}ms)`;
    pushLog(msg, level, 'HTTP');
  });

  next();
};

/**
 * Get snapshot of recent in-memory logs
 */
const getRecentLogs = () => [...ringBuffer];

/**
 * Clear in-memory logs
 */
const clearLogs = () => {
  ringBuffer.length = 0;
  try {
    const socketServer = typeof io === 'function' ? io() : null;
    if (socketServer) {
      socketServer.emit('server_terminal_clear');
    }
  } catch (_) {}
  return true;
};

module.exports = {
  initConsoleHook,
  pushLog,
  terminalHttpMiddleware,
  getRecentLogs,
  clearLogs,
};
