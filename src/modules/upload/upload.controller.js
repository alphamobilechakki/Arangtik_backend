const ApiResponse = require('../../utils/apiResponse');
const ApiError = require('../../utils/apiError');
const {
  formatUploadedFile,
  formatUploadedFiles,
  deleteUploadedImage,
  saveBase64Image,
} = require('../../middlewares/upload.middleware');

/**
 * Handle single image upload (supports multipart file or base64 JSON payload)
 * @route POST /api/v1/upload/single or /api/upload/single
 */
const uploadSingleImageHandler = async (req, res, next) => {
  try {
    if (!req.file && req.body && req.body.image) {
      const imageVal = req.body.image;
      if (typeof imageVal === 'string' && imageVal.startsWith('data:image')) {
        const savedUrl = await saveBase64Image(imageVal, req);
        return res.status(201).json(
          new ApiResponse(
            201,
            {
              file: { url: savedUrl },
              url: savedUrl,
            },
            'Image uploaded successfully'
          )
        );
      }
    }

    if (!req.file) {
      throw new ApiError(400, 'No image file uploaded');
    }

    const formatted = formatUploadedFile(req.file, req);

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          file: formatted,
          url: formatted.url,
        },
        'Image uploaded successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle multiple images upload
 * @route POST /api/v1/upload/multiple or /api/upload/multiple
 */
const uploadMultipleImagesHandler = async (req, res, next) => {
  try {
    if ((!req.files || req.files.length === 0) && req.body && Array.isArray(req.body.images)) {
      const savedUrls = await Promise.all(
        req.body.images.map((img) =>
          typeof img === 'string' && img.startsWith('data:image')
            ? saveBase64Image(img, req)
            : img
        )
      );
      return res.status(201).json(
        new ApiResponse(
          201,
          {
            files: savedUrls.map((u) => ({ url: u })),
            urls: savedUrls,
            count: savedUrls.length,
          },
          'Images uploaded successfully'
        )
      );
    }

    if (!req.files || req.files.length === 0) {
      throw new ApiError(400, 'No image files uploaded');
    }

    const formattedFiles = formatUploadedFiles(req.files, req);
    const urls = formattedFiles.map((f) => f.url);

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          files: formattedFiles,
          urls: urls,
          count: formattedFiles.length,
        },
        'Images uploaded successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Delete uploaded image
 * @route DELETE /api/v1/upload/:filename or /api/upload/:filename
 */
const deleteImageHandler = async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      throw new ApiError(400, 'Filename parameter is required');
    }

    const deleted = await deleteUploadedImage(filename);
    if (!deleted) {
      throw new ApiError(404, 'File not found or already deleted');
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, 'Image deleted successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadSingleImageHandler,
  uploadMultipleImagesHandler,
  deleteImageHandler,
};
