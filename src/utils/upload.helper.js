const uploadMiddleware = require('../middlewares/upload.middleware');

module.exports = {
  uploadSingleImage: uploadMiddleware.uploadSingleImage,
  uploadMultipleImages: uploadMiddleware.uploadMultipleImages,
  uploadSingle: uploadMiddleware.uploadSingle,
  uploadMultiple: uploadMiddleware.uploadMultiple,
  uploadFields: uploadMiddleware.uploadFields,
  getImageUrl: uploadMiddleware.getImageUrl,
  saveBase64Image: uploadMiddleware.saveBase64Image,
  generateShortFilename: uploadMiddleware.generateShortFilename,
  getImageFilename: uploadMiddleware.getImageFilename,
  deleteUploadedImage: uploadMiddleware.deleteUploadedImage,
  formatUploadedFile: uploadMiddleware.formatUploadedFile,
  formatUploadedFiles: uploadMiddleware.formatUploadedFiles,
  UPLOAD_DIR: uploadMiddleware.UPLOAD_DIR,
  createMulterInstance: uploadMiddleware.createMulterInstance,
  upload: uploadMiddleware,
};
