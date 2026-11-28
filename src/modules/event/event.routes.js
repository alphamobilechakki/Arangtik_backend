const express = require('express');
const router = express.Router();
const eventController = require('./event.controller');
const { validateCreateEvent, validateUpdateEvent } = require('./event.validation');
const { protect } = require('../../middlewares/auth.middleware');

// All event routes are protected with JWT auth
router.use(protect);

/**
 * 1. Event Types
 */
router.get('/types', eventController.getEventTypes);

/**
 * 2. Cluster / Group events
 */
router.get('/cluster/:clusterId', eventController.getClusterEvents);

/**
 * 3. Event CRUD
 */
router.post('/', validateCreateEvent, eventController.createEvent);
router.get('/', eventController.getUserEvents);
router.get('/:id', eventController.getEventById);
router.patch('/:id', validateUpdateEvent, eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);
router.post('/:id/restore', eventController.restoreEvent);

module.exports = router;
