const express = require('express');
const {
  uploadSingleImage,
  uploadMultipleImages,
} = require('../../middlewares/upload.middleware');
const {
  uploadSingleImageHandler,
  uploadMultipleImagesHandler,
  deleteImageHandler,
} = require('./upload.controller');

const router = express.Router();

// Single image upload endpoint (form field name: "image", supports file or base64)
router.post('/single', uploadSingleImage('image', { required: false }), uploadSingleImageHandler);

// Multiple images upload endpoint (form field name: "images", max: 20)
router.post(
  '/multiple',
  uploadMultipleImages('images', 20, { required: false }),
  uploadMultipleImagesHandler
);

// Delete image endpoint
router.delete('/:filename', deleteImageHandler);

module.exports = router;
