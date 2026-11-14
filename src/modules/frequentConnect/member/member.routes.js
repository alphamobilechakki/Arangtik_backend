const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :id from parent
const { protect } = require('../../../middlewares/auth.middleware');
const memberController = require('./member.controller');

// All member routes require authentication
router.use(protect);

router.post('/', memberController.addMembers);
router.get('/', memberController.getMembers);
router.post('/leave', memberController.leaveCluster);
router.delete('/:memberId', memberController.removeMember);

module.exports = router;
