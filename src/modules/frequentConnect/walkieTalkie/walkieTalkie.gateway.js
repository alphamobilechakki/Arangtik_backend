const walkieTalkieService = require('./walkieTalkie.service');
const notificationService = require('../../notification/notification.service');

const MAX_TALK_SECONDS = 60;

/**
 * Register Walkie-Talkie (PTT) Socket.IO events for a client socket
 */
const registerWalkieTalkieGateway = (io, socket, fcNamespace, isUserOnline) => {
  const userId = socket.user.id;
  const userName = socket.user.name || socket.user.phone || 'Contact';

  /**
   * PTT Button Pressed: Acquire floor
   * Client emits: 'walkie-start', { conversationId }
   */
  socket.on('walkie-start', async (data, callback) => {
    try {
      const { conversationId } = data || {};
      if (!conversationId) {
        if (callback) callback({ success: false, error: 'conversationId is required' });
        return;
      }

      const result = await walkieTalkieService.acquireFloor(conversationId, userId, userName);

      if (!result.success) {
        if (callback) callback({ success: false, code: result.error, message: result.message });
        socket.emit('walkie-busy', {
          conversationId,
          currentSpeaker: result.currentSpeaker,
        });
        return;
      }

      const floor = result.floor;

      // Broadcast to all participants in this conversation that speech is incoming
      socket.to(`conversation:${conversationId}`).emit('walkie-incoming', {
        conversationId,
        speakerId: userId,
        speakerName: userName,
        startedAt: floor.startedAt,
      });

      // Notify offline participants via high-priority FCM notification
      if (result.conversation) {
        const clusterName = result.conversation.clusterId?.name;
        const notifTitle = clusterName
          ? `Walkie-Talkie in ${clusterName}`
          : `Walkie-Talkie from ${userName}`;

        for (const p of result.conversation.participants) {
          const participantId = (p._id || p).toString();
          if (participantId === userId) continue;

          if (!isUserOnline(participantId)) {
            notificationService.sendToUser(participantId, {
              title: notifTitle,
              body: `${userName} is speaking live on Walkie-Talkie`,
              type: 'FC_WALKIE_TALKIE_REQUEST',
              data: {
                conversationId: conversationId.toString(),
                speakerId: userId,
                speakerName: userName,
                type: 'WALKIE_TALKIE',
              },
            }).catch((err) => console.warn('[FC Walkie FCM Warning]:', err.message));
          }
        }
      }

      // Enforce 60-second talk timeout
      floor.timer = setTimeout(async () => {
        console.log(`[FC Walkie Timeout]: Auto-ending talk for ${userId} in ${conversationId}`);
        const endResult = await walkieTalkieService.releaseFloor(conversationId, userId, 'TIMEOUT');
        if (endResult.released) {
          fcNamespace.to(`conversation:${conversationId}`).emit('walkie-ended', {
            conversationId,
            speakerId: userId,
            duration: endResult.duration,
            reason: 'TIMEOUT',
          });
        }
      }, MAX_TALK_SECONDS * 1000);

      if (callback) callback({ success: true, startedAt: floor.startedAt });
    } catch (err) {
      console.error('[FC Walkie-Start Error]:', err.message);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  /**
   * PTT Audio Stream: Relay raw audio chunk (Binary Buffer or ArrayBuffer)
   * Client emits: 'walkie-audio', { conversationId, chunk }
   */
  socket.on('walkie-audio', (data) => {
    try {
      const { conversationId, chunk } = data || {};
      if (!conversationId || !chunk) return;

      const floorStatus = walkieTalkieService.getFloorStatus(conversationId);
      if (!floorStatus.isBusy || floorStatus.speaker.speakerId !== userId) {
        return; // Only current floor holder can broadcast audio
      }

      // Relay binary audio chunk to all other listeners in this conversation room
      socket.to(`conversation:${conversationId}`).emit('walkie-audio-stream', {
        conversationId,
        speakerId: userId,
        chunk,
      });
    } catch (err) {
      console.error('[FC Walkie-Audio Relay Error]:', err.message);
    }
  });

  /**
   * PTT Button Released: Release floor
   * Client emits: 'walkie-stop', { conversationId }
   */
  socket.on('walkie-stop', async (data, callback) => {
    try {
      const { conversationId } = data || {};
      if (!conversationId) {
        if (callback) callback({ success: false, error: 'conversationId is required' });
        return;
      }

      const result = await walkieTalkieService.releaseFloor(conversationId, userId, 'NORMAL');

      if (result.released) {
        // Broadcast speech completion to everyone in the room
        fcNamespace.to(`conversation:${conversationId}`).emit('walkie-ended', {
          conversationId,
          speakerId: userId,
          duration: result.duration,
          reason: 'NORMAL',
        });
      }

      if (callback) callback({ success: true, duration: result.duration });
    } catch (err) {
      console.error('[FC Walkie-Stop Error]:', err.message);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  /**
   * Query floor status
   * Client emits: 'walkie-status', { conversationId }
   */
  socket.on('walkie-status', ({ conversationId }, callback) => {
    if (!conversationId || !callback) return;
    const status = walkieTalkieService.getFloorStatus(conversationId);
    callback({ success: true, ...status });
  });
};

module.exports = {
  registerWalkieTalkieGateway,
};
