const express = require('express');
const router = express.Router();
const adminEventController = require('./adminEvent.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');

// All endpoints require admin credentials
router.use(protectAdmin);

// 1. Dashboard Overview Stats
router.get('/stats', adminEventController.getStats);

// 2. Event Types Management (inside events router)
router.post('/types', adminEventController.createEventType);
router.patch('/types/:id', adminEventController.updateEventType);

// 3. Global Events Table & Moderation
router.get('/', adminEventController.getAllEvents);
router.patch('/:id', adminEventController.updateEvent);

// Also create a standalone router for /api/admin/event-types
const eventTypeRouter = express.Router();
eventTypeRouter.use(protectAdmin);
eventTypeRouter.post('/', adminEventController.createEventType);
eventTypeRouter.patch('/:id', adminEventController.updateEventType);

module.exports = router;
module.exports.eventTypeRouter = eventTypeRouter;
