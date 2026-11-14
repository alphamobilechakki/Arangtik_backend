const WalkieTalkieSession = require('./walkieTalkie.model');
const conversationService = require('../conversation/conversation.service');
const ApiError = require('../../../utils/apiError');

// In-memory active floor control map:
// conversationId -> { sessionId, speakerId, speakerName, startedAt, timer }
const activeFloors = new Map();

const MAX_TALK_SECONDS = 60;

class WalkieTalkieService {
  /**
   * Acquire floor to speak in a conversation (Half-duplex)
   */
  async acquireFloor(conversationId, speakerId, speakerName) {
    // 1. Verify user belongs to this conversation
    const conversation = await conversationService.getConversationById(conversationId, speakerId);

    const convIdStr = conversationId.toString();
    const speakerIdStr = speakerId.toString();

    // 2. Check if floor is already occupied
    const existing = activeFloors.get(convIdStr);
    if (existing) {
      if (existing.speakerId === speakerIdStr) {
        // Speaker already holds floor
        return { success: true, session: existing, alreadyHeld: true };
      }
      return {
        success: false,
        error: 'FLOOR_BUSY',
        message: `${existing.speakerName || 'Someone'} is currently speaking`,
        currentSpeaker: {
          speakerId: existing.speakerId,
          speakerName: existing.speakerName,
        },
      };
    }

    // 3. Create persistent DB session
    const session = await WalkieTalkieSession.create({
      conversationId,
      speakerId,
      status: 'ACTIVE',
      startedAt: new Date(),
    });

    const floorInfo = {
      sessionId: session._id.toString(),
      conversationId: convIdStr,
      speakerId: speakerIdStr,
      speakerName: speakerName || 'Speaker',
      startedAt: session.startedAt,
      timer: null,
    };

    activeFloors.set(convIdStr, floorInfo);

    return {
      success: true,
      floor: floorInfo,
      conversation,
    };
  }

  /**
   * Release floor in a conversation
   */
  async releaseFloor(conversationId, speakerId, reason = 'NORMAL') {
    const convIdStr = conversationId.toString();
    const speakerIdStr = speakerId.toString();

    const existing = activeFloors.get(convIdStr);
    if (!existing) {
      return { released: false, reason: 'NO_ACTIVE_FLOOR' };
    }

    if (existing.speakerId !== speakerIdStr) {
      return { released: false, reason: 'NOT_FLOOR_HOLDER' };
    }

    // Clear timeout timer if any
    if (existing.timer) {
      clearTimeout(existing.timer);
    }

    activeFloors.delete(convIdStr);

    const endedAt = new Date();
    const duration = Math.round((endedAt.getTime() - new Date(existing.startedAt).getTime()) / 1000);

    // Update persistent DB session
    await WalkieTalkieSession.findByIdAndUpdate(existing.sessionId, {
      status: 'ENDED',
      endedAt,
      duration,
      endReason: reason,
    });

    return {
      released: true,
      sessionId: existing.sessionId,
      duration,
      reason,
      speakerId: speakerIdStr,
    };
  }

  /**
   * Force release when a socket disconnects unexpectedly
   */
  async handleSpeakerDisconnect(speakerId) {
    const speakerIdStr = speakerId.toString();
    const releasedConversations = [];

    for (const [convId, floor] of activeFloors.entries()) {
      if (floor.speakerId === speakerIdStr) {
        if (floor.timer) clearTimeout(floor.timer);
        activeFloors.delete(convId);

        const endedAt = new Date();
        const duration = Math.round((endedAt.getTime() - new Date(floor.startedAt).getTime()) / 1000);

        await WalkieTalkieSession.findByIdAndUpdate(floor.sessionId, {
          status: 'ENDED',
          endedAt,
          duration,
          endReason: 'DISCONNECTED',
        });

        releasedConversations.push({
          conversationId: convId,
          speakerId: speakerIdStr,
        });
      }
    }

    return releasedConversations;
  }

  /**
   * Get current floor status for a conversation
   */
  getFloorStatus(conversationId) {
    const floor = activeFloors.get(conversationId.toString());
    if (!floor) {
      return { isBusy: false, speaker: null };
    }
    return {
      isBusy: true,
      speaker: {
        speakerId: floor.speakerId,
        speakerName: floor.speakerName,
        startedAt: floor.startedAt,
      },
    };
  }
}

module.exports = new WalkieTalkieService();
