const express = require('express');
const router = express.Router();
const aiStylistController = require('./aiStylist.controller');
const { validateGenerateLook, validateLookIdParam } = require('./aiStylist.validation');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

router.post('/generate', validateGenerateLook, aiStylistController.generateLook);
router.get('/looks', aiStylistController.getSavedLooks);
router.get('/looks/:id', validateLookIdParam, aiStylistController.getLookById);
router.delete('/looks/:id', validateLookIdParam, aiStylistController.deleteLook);

module.exports = router;
