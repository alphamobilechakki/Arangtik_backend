const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ApiError = require('../utils/apiError');

//=================== CONFIGURATION ===================//
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const LOCAL_SRC_UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

// Ensure upload directory exists
[UPLOAD_DIR, LOCAL_SRC_UPLOAD_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Allowed file MIME types and extensions (images, pdfs, documents)
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/avif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
];

const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.bmp',
  '.tiff',
  '.avif',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
];

//=================== HELPER FUNCTIONS ===================//

/**
 * Generate a short, collision-free unique filename (e.g. img_m7z1a4_a9f1b2.jpg)
 * @param {string} ext 
 * @returns {string} Short unique filename
 */
const generateShortFilename = (ext = '.jpg') => {
  const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
  const timestamp = Date.now().toString(36);
  const randomHex = crypto.randomBytes(3).toString('hex');
  return `img_${timestamp}_${randomHex}${cleanExt}`;
};

/**
 * Generate clean accessible URL for a stored filename
 * @param {string} filename 
 * @param {object} req Optional Express request object for dynamic host detection
 * @returns {string} e.g. "/api/uploads/img_123.jpg" or "http://localhost:5000/api/uploads/img_123.jpg"
 */
const getImageUrl = (filename, req = null) => {
  if (!filename) return null;
  // If filename is already a full URL or data URI, return it
  if (
    filename.startsWith('http://') ||
    filename.startsWith('https://') ||
    filename.startsWith('data:image')
  ) {
    return filename;
  }
  const cleanFilename = path.basename(filename);

  if (process.env.UPLOAD_BASE_URL && process.env.UPLOAD_BASE_URL.trim()) {
    const base = process.env.UPLOAD_BASE_URL.replace(/\/?$/, '/');
    return `${base}${cleanFilename}`;
  }

  if (req && typeof req.get === 'function') {
    const host = req.get('host') || '';
    const protocol =
      req.headers['x-forwarded-proto'] ||
      (host.includes('arangtik.com') ? 'https' : (req.protocol || (req.secure ? 'https' : 'http')));
    return `${protocol}://${host}/api/uploads/${cleanFilename}`;
  }

  return `/api/uploads/${cleanFilename}`;
};

/**
 * Saves a base64 encoded data URI (e.g. data:image/png;base64,...) as a static image file
 * @param {string} base64Str 
 * @param {object} req Optional Express request object
 * @returns {Promise<string>} Uploaded file URL or original string if not base64
 */
const saveBase64Image = async (base64Str, req = null) => {
  if (!base64Str || typeof base64Str !== 'string') return base64Str;
  if (!base64Str.startsWith('data:image')) return base64Str;

  try {
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Str;
    }

    let ext = matches[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (ext === 'svg+xml') ext = 'svg';
    const buffer = Buffer.from(matches[2], 'base64');

    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const filename = generateShortFilename(`.${ext}`);
    const filePath = path.join(UPLOAD_DIR, filename);

    await fs.promises.writeFile(filePath, buffer);
    return getImageUrl(filename, req);
  } catch (err) {
    console.error('Error saving base64 image:', err);
    return base64Str;
  }
};

/**
 * Extract filename from a full image URL or relative path
 * @param {string} urlOrFilename 
 * @returns {string} e.g. "img_123.jpg"
 */
const getImageFilename = (urlOrFilename) => {
  if (!urlOrFilename) return null;
  return path.basename(urlOrFilename.split('?')[0]);
};

/**
 * Delete an uploaded image from local storage
 * @param {string} filenameOrUrl 
 * @returns {Promise<boolean>}
 */
const deleteUploadedImage = async (filenameOrUrl) => {
  try {
    const filename = getImageFilename(filenameOrUrl);
    if (!filename) return false;

    const possiblePaths = [
      path.join(UPLOAD_DIR, filename),
      path.join(LOCAL_SRC_UPLOAD_DIR, filename),
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error deleting image file:', error);
    return false;
  }
};

/**
 * Format uploaded file metadata with complete database URL
 * @param {object} file Multer file object
 * @param {object} req Optional Express request
 * @returns {object} Formatted file details
 */
const formatUploadedFile = (file, req = null) => {
  if (!file) return null;
  const url = file.url || getImageUrl(file.filename, req);
  return {
    uniqueId: file.uniqueId || file.filename?.split('.')[0] || null,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: url,
    path: file.path,
  };
};

/**
 * Format multiple uploaded files
 * @param {Array} files Array of Multer file objects
 * @param {object} req Optional Express request
 * @returns {Array} Array of formatted file details
 */
const formatUploadedFiles = (files, req = null) => {
  if (!Array.isArray(files)) return [];
  return files.map((file) => formatUploadedFile(file, req));
};

//=================== MULTER STORAGE CONFIGURATION ===================//

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = generateShortFilename(ext);
    file.uniqueId = filename.split('.')[0];
    cb(null, filename);
  },
});

// File filter to restrict uploads to valid images and documents
const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isMimeValid = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

  if (isMimeValid || isExtValid) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type (${file.mimetype}). Only supported image and document files (${ALLOWED_EXTENSIONS.join(', ')}) are allowed!`
      ),
      false
    );
  }
};

// Base Multer Instance
const createMulterInstance = (options = {}) => {
  const fileSize = options.fileSize || 10 * 1024 * 1024; // Default 10MB limit
  return multer({
    storage: storage,
    fileFilter: options.fileFilter || imageFileFilter,
    limits: {
      fileSize: fileSize,
      files: options.maxFiles || 100,
    },
  });
};

// Default multer upload instance for backward compatibility (e.g. upload.single, upload.fields, etc.)
const defaultUpload = createMulterInstance();

//=================== GLOBAL UPLOAD FUNCTIONS / MIDDLEWARES ===================//

/**
 * Global middleware for SINGLE image upload
 * @param {string} fieldName - Form field name (default: "image")
 * @param {object} options - Custom options { fileSize, required }
 * @returns {Function} Express middleware
 */
const uploadSingleImage = (fieldName = 'image', options = {}) => {
  const uploadMiddleware = createMulterInstance(options).single(fieldName);

  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new ApiError(
                400,
                `File size exceeds the limit of ${
                  options.fileSize ? options.fileSize / (1024 * 1024) : 10
                }MB`
              )
            );
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(
              new ApiError(
                400,
                `Unexpected field '${err.field}'. Expected field '${fieldName}'`
              )
            );
          }
          return next(new ApiError(400, `Upload error: ${err.message}`));
        }
        return next(err);
      }

      // Check if file is required and missing
      if (!req.file && options.required && !req.body[fieldName]) {
        return next(
          new ApiError(400, `Please upload an image file in '${fieldName}' field`)
        );
      }

      // Attach database URL to file object if uploaded
      if (req.file) {
        req.file.url = getImageUrl(req.file.filename, req);
        req.file.dbUrl = req.file.url;
      }

      next();
    });
  };
};

/**
 * Global middleware for MULTIPLE images upload
 * @param {string} fieldName - Form field name (default: "images")
 * @param {number} maxCount - Maximum number of images allowed (default: 10)
 * @param {object} options - Custom options { fileSize, required }
 * @returns {Function} Express middleware
 */
const uploadMultipleImages = (fieldName = 'images', maxCount = 10, options = {}) => {
  const uploadMiddleware = createMulterInstance({ ...options, maxFiles: maxCount }).array(
    fieldName,
    maxCount
  );

  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              new ApiError(400, `One or more files exceed the maximum allowed size limit`)
            );
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(
              new ApiError(
                400,
                `Cannot upload more than ${maxCount} images in '${fieldName}'`
              )
            );
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(
              new ApiError(
                400,
                `Unexpected field '${err.field}'. Expected field '${fieldName}'`
              )
            );
          }
          return next(new ApiError(400, `Upload error: ${err.message}`));
        }
        return next(err);
      }

      // Check if files are required and missing
      if ((!req.files || req.files.length === 0) && options.required) {
        return next(
          new ApiError(400, `Please upload at least one image in '${fieldName}' field`)
        );
      }

      // Attach database URLs to all uploaded file objects
      if (Array.isArray(req.files)) {
        req.files.forEach((file) => {
          file.url = getImageUrl(file.filename, req);
          file.dbUrl = file.url;
        });
      }

      next();
    });
  };
};

/**
 * Global middleware for MULTIPLE NAMED FIELDS image upload
 * @param {Array} fields - Array of field definitions e.g. [{ name: 'avatar', maxCount: 1 }, { name: 'photos', maxCount: 5 }]
 * @param {object} options - Custom options
 * @returns {Function} Express middleware
 */
const uploadFields = (fields = [], options = {}) => {
  const uploadMiddleware = createMulterInstance(options).fields(fields);

  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return next(new ApiError(400, `Upload error: ${err.message}`));
        }
        return next(err);
      }

      if (req.files) {
        Object.keys(req.files).forEach((key) => {
          req.files[key].forEach((file) => {
            file.url = getImageUrl(file.filename, req);
            file.dbUrl = file.url;
          });
        });
      }

      next();
    });
  };
};

// Aliases for convenience
const uploadSingle = uploadSingleImage;
const uploadMultiple = uploadMultipleImages;

// Attach helper properties and methods directly to defaultUpload instance so both require styles work seamlessly
defaultUpload.uploadSingleImage = uploadSingleImage;
defaultUpload.uploadMultipleImages = uploadMultipleImages;
defaultUpload.uploadSingle = uploadSingle;
defaultUpload.uploadMultiple = uploadMultiple;
defaultUpload.uploadFields = uploadFields;
defaultUpload.getImageUrl = getImageUrl;
defaultUpload.saveBase64Image = saveBase64Image;
defaultUpload.generateShortFilename = generateShortFilename;
defaultUpload.getImageFilename = getImageFilename;
defaultUpload.deleteUploadedImage = deleteUploadedImage;
defaultUpload.formatUploadedFile = formatUploadedFile;
defaultUpload.formatUploadedFiles = formatUploadedFiles;
defaultUpload.UPLOAD_DIR = UPLOAD_DIR;
defaultUpload.createMulterInstance = createMulterInstance;

module.exports = defaultUpload;
