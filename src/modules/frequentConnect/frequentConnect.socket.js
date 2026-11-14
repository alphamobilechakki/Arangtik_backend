const socketAuthMiddleware = require('../../middlewares/socketAuth.middleware');
const messageService = require('./message/message.service');
const conversationService = require('./conversation/conversation.service');
const notificationService = require('../notification/notification.service');
const { registerWalkieTalkieGateway } = require('./walkieTalkie/walkieTalkie.gateway');
const walkieTalkieService = require('./walkieTalkie/walkieTalkie.service');
const { checkSocketMessageRate } = require('../../middlewares/fcRateLimit.middleware');

// In-memory tracking of online users and their active socket IDs
// Map: userId -> Set of socketIds
const onlineUsers = new Map();

/**
 * Check if a user is currently connected via Socket.IO
 */
const isUserOnline = (userId) => {
  const sockets = onlineUsers.get(userId.toString());
  return sockets && sockets.size > 0;
};

/**
 * Initialize Frequent Connect Socket.IO namespace & events
 */
const initFrequentConnectSocket = (io) => {
  const fcNamespace = io.of('/fc');

  // Apply JWT authentication
  fcNamespace.use(socketAuthMiddleware);

  fcNamespace.on('connection', (socket) => {
    const userId = socket.user.id;

    // Enforce max 5 concurrent socket sessions per user
    const existingSockets = onlineUsers.get(userId);
    if (existingSockets && existingSockets.size >= 5) {
      socket.emit('error', { message: 'Maximum concurrent active sessions reached (5)' });
      socket.disconnect(true);
      return;
    }

    console.log(`[FC Socket Connected]: User ${socket.user.name || socket.user.phone} (${userId}) - Socket: ${socket.id}`);

    // Register user in online tracking
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal user room for direct user notifications & presence
    socket.join(`user:${userId}`);

    // Broadcast user online event
    socket.broadcast.emit('user-online', { userId });

    /**
     * Join conversation room
     * Client emits: 'join-conversation', { conversationId }
     */
    socket.on('join-conversation', async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        // Verify user is a member of this conversation
        await conversationService.getConversationById(conversationId, userId);
        socket.join(`conversation:${conversationId}`);
        console.log(`[FC Socket]: User ${userId} joined conversation:${conversationId}`);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Leave conversation room
     * Client emits: 'leave-conversation', { conversationId }
     */
    socket.on('leave-conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        console.log(`[FC Socket]: User ${userId} left conversation:${conversationId}`);
      }
    });

    /**
     * Real-time send message
     * Client emits: 'send-message', { conversationId, content, type }
     */
    socket.on('send-message', async (data, callback) => {
      try {
        const { conversationId, content, type = 'TEXT' } = data;
        if (!conversationId) {
          if (callback) callback({ success: false, error: 'conversationId is required' });
          return;
        }

        // Apply real-time rate limit check (40 msgs/min)
        if (!checkSocketMessageRate(userId, 40)) {
          if (callback) callback({ success: false, error: 'Message rate limit exceeded. Please slow down.' });
          socket.emit('error', { message: 'Message rate limit exceeded. Please wait a moment.' });
          return;
        }

        const message = await messageService.sendMessage(conversationId, userId, { content, type });

        // Broadcast to everyone in the conversation room (including sender on other sessions/devices)
        fcNamespace.to(`conversation:${conversationId}`).emit('new-message', message);

        // Fetch conversation participants for offline FCM notifications
        const conversation = await conversationService.getConversationById(conversationId, userId);

        for (const participant of conversation.participants) {
          const participantId = (participant._id || participant).toString();
          if (participantId === userId) continue;

          // If participant is not currently connected online, dispatch FCM push
          if (!isUserOnline(participantId)) {
            const senderName = socket.user.name || 'Frequent Connect';
            const clusterName = conversation.clusterId?.name;
            const title = clusterName ? `${senderName} in ${clusterName}` : senderName;
            const body = type === 'TEXT' ? content : `Sent a ${type.toLowerCase()} message`;

            notificationService.sendToUser(participantId, {
              title,
              body,
              type: type === 'VOICE' ? 'FC_VOICE_MESSAGE' : 'FC_NEW_MESSAGE',
              data: {
                conversationId: conversationId.toString(),
                messageId: message._id.toString(),
                senderId: userId,
                type: message.type,
              },
            }).catch((notifErr) => {
              console.warn('[FC FCM Push Warning]:', notifErr.message);
            });
          }
        }

        if (callback) {
          callback({ success: true, message });
        }
      } catch (err) {
        console.error('[FC Socket send-message Error]:', err.message);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * Typing indicators
     * Client emits: 'typing', { conversationId }
     * Client emits: 'stop-typing', { conversationId }
     */
    socket.on('typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('user-typing', {
        conversationId,
        userId,
        userName: socket.user.name,
      });
    });

    socket.on('stop-typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('user-stop-typing', {
        conversationId,
        userId,
      });
    });

    /**
     * Real-time message status update (DELIVERED / SEEN / PLAYED)
     * Client emits: 'message-status', { messageId, conversationId, status }
     */
    socket.on('message-status', async (data, callback) => {
      try {
        const { messageId, conversationId, status } = data;
        if (!messageId || !status) {
          if (callback) callback({ success: false, error: 'messageId and status required' });
          return;
        }

        const result = await messageService.updateMessageStatus(messageId, userId, status);

        // Broadcast status change to conversation room
        if (conversationId) {
          fcNamespace.to(`conversation:${conversationId}`).emit('message-status-update', {
            messageId,
            conversationId,
            userId,
            status,
            recipientStatuses: result.recipientStatuses,
          });
        }

        if (callback) callback({ success: true, result });
      } catch (err) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    /**
     * Query online presence for a list of user IDs
     */
    socket.on('check-presence', ({ userIds }, callback) => {
      if (!Array.isArray(userIds) || !callback) return;
      const presence = {};
      userIds.forEach((id) => {
        presence[id] = isUserOnline(id);
      });
      callback({ success: true, presence });
    });

    // Register Walkie-Talkie (Push-to-Talk) event handlers
    registerWalkieTalkieGateway(io, socket, fcNamespace, isUserOnline);

    /**
     * Disconnect handler
     */
    socket.on('disconnect', async () => {
      console.log(`[FC Socket Disconnected]: User ${userId} - Socket ${socket.id}`);

      // Auto-release any walkie-talkie floor held by this user
      try {
        const releasedList = await walkieTalkieService.handleSpeakerDisconnect(userId);
        releasedList.forEach((item) => {
          fcNamespace.to(`conversation:${item.conversationId}`).emit('walkie-ended', {
            conversationId: item.conversationId,
            speakerId: item.speakerId,
            reason: 'DISCONNECTED',
          });
        });
      } catch (wtErr) {
        console.warn('[FC Walkie Cleanup Error]:', wtErr.message);
      }

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('user-offline', { userId });
        }
      }
    });
  });

  return fcNamespace;
};

module.exports = {
  initFrequentConnectSocket,
  isUserOnline,
};
