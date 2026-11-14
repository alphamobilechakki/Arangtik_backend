const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ApiError = require('../utils/apiError');

// Voice storage directory
const VOICE_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/voice');
const LOCAL_VOICE_DIR = path.resolve(__dirname, '../../uploads/voice');

// Ensure directories exist
[VOICE_UPLOAD_DIR, LOCAL_VOICE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Allowed audio MIME types
const ALLOWED_AUDIO_MIMES = [
  'audio/aac',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/3gpp',
  'audio/amr',
];

const ALLOWED_AUDIO_EXTS = ['.aac', '.mp4', '.m4a', '.mp3', '.ogg', '.webm', '.wav', '.3gp', '.amr'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VOICE_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.m4a';
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `voice-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  const isAllowedMime = ALLOWED_AUDIO_MIMES.includes(mime);
  const isAllowedExt = ALLOWED_AUDIO_EXTS.includes(ext);

  if (isAllowedMime || isAllowedExt) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid audio file format (${mime || ext}). Allowed formats: ${ALLOWED_AUDIO_EXTS.join(', ')}`
      ),
      false
    );
  }
};

const uploadVoice = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

module.exports = {
  uploadVoice,
  VOICE_UPLOAD_DIR,
};
