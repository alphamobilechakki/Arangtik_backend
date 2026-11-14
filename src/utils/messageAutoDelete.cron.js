const path = require('path');
const fs = require('fs');
const Message = require('../modules/frequentConnect/message/message.model');

const AUTO_DELETE_MINUTES = 15;
let cronInterval = null;

/**
 * Execute auto-delete cycle:
 * 1. Identify recipient statuses where seenAt + 15 min <= now and isAutoDeleted is false
 * 2. If recipient did NOT save message, mark recipientStatus.isAutoDeleted = true
 * 3. If ALL recipients are auto-deleted and sender doesn't have an active save,
 *    scrub global content and delete physical voice file from disk
 */
const runAutoDeleteCycle = async () => {
  try {
    const cutoffTime = new Date(Date.now() - AUTO_DELETE_MINUTES * 60 * 1000);

    // Find candidate messages where at least one recipient status has seenAt <= cutoff and isAutoDeleted = false
    const candidateMessages = await Message.find({
      isAutoDeleted: false,
      recipientStatuses: {
        $elemMatch: {
          seenAt: { $ne: null, $lte: cutoffTime },
          isAutoDeleted: false,
        },
      },
    }).limit(100);

    if (!candidateMessages || candidateMessages.length === 0) {
      return;
    }

    let recipientsDeletedCount = 0;
    let messagesScrubbedCount = 0;

    for (const msg of candidateMessages) {
      let modified = false;

      // Update individual recipient statuses
      msg.recipientStatuses.forEach((rs) => {
        if (rs.seenAt && rs.seenAt <= cutoffTime && !rs.isAutoDeleted) {
          if (!rs.isSaved) {
            rs.isAutoDeleted = true;
            recipientsDeletedCount++;
            modified = true;
          }
        }
      });

      // Check if ALL recipient statuses are now marked as auto-deleted
      const allRecipientsDeleted = msg.recipientStatuses.every((rs) => rs.isAutoDeleted);

      if (allRecipientsDeleted) {
        msg.isAutoDeleted = true;

        // If message was a voice message, delete physical audio file from disk
        if (msg.voiceUrl) {
          try {
            const urlPath = msg.voiceUrl.split('?')[0];
            const filename = path.basename(urlPath);
            const voiceDir = path.resolve(process.cwd(), 'uploads/voice');
            const filePath = path.join(voiceDir, filename);

            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[Auto-Delete]: Removed voice file ${filename}`);
            }
          } catch (fileErr) {
            console.warn('[Auto-Delete]: Error deleting physical voice file:', fileErr.message);
          }
        }

        // Scrub text content and URL references
        msg.content = '';
        msg.voiceUrl = '';
        messagesScrubbedCount++;
        modified = true;
      }

      if (modified) {
        await msg.save();
      }
    }

    if (recipientsDeletedCount > 0 || messagesScrubbedCount > 0) {
      console.log(
        `[Message Auto-Delete]: Auto-deleted ${recipientsDeletedCount} recipient copies, fully scrubbed ${messagesScrubbedCount} messages.`
      );
    }
  } catch (error) {
    console.error('[Message Auto-Delete Cron Error]:', error.message);
  }
};

/**
 * Start recurring auto-delete timer (runs every 60 seconds)
 */
const startAutoDeleteCron = (intervalMs = 60000) => {
  if (cronInterval) {
    clearInterval(cronInterval);
  }

  // Initial trigger after 5 seconds of server boot
  setTimeout(runAutoDeleteCycle, 5000);

  cronInterval = setInterval(runAutoDeleteCycle, intervalMs);
  console.log('⏰ Frequent Connect: 15-Minute Auto-Delete scheduler active (runs every 60s)');
  return cronInterval;
};

const stopAutoDeleteCron = () => {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
  }
};

module.exports = {
  runAutoDeleteCycle,
  startAutoDeleteCron,
  stopAutoDeleteCron,
};
