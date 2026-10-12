const express = require('express');
const router = express.Router();
const outfitController = require('./outfit.controller');
const { validateSuggestRequest, validateSaveOutfit } = require('./outfit.validation');
const { protect } = require('../../middlewares/auth.middleware');

// All outfit endpoints are user-authenticated
router.use(protect);

/**
 * 1. OUTFIT SUGGESTION GENERATION
 * Generates smart, occasion-tailored outfit combinations strictly from available wardrobe items
 */
router.post('/suggest', validateSuggestRequest, outfitController.suggestOutfits);
router.post('/generate', validateSuggestRequest, outfitController.suggestOutfits);

/**
 * 2. OUTFIT PERSISTENCE & BOOKMARKING
 * Save favorite looks, list saved outfits, delete outfits
 */
router.post('/save', validateSaveOutfit, outfitController.saveOutfit);
router.get('/saved', outfitController.getSavedOutfits);
router.delete('/saved/:id', outfitController.deleteSavedOutfit);

module.exports = router;
