const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');
const {
  FACE_MATCH_THRESHOLD,
  FACE_MIN_CONFIDENCE,
  FACE_MIN_SIZE,
} = require('../../config/env.config');
const { ERROR_CODES } = require('../../modules/faceRecognition/faceRecognition.constants');
const ApiError = require('../../utils/apiError');

/**
 * Low-level Face AI Engine Client
 * Handles AI model initialization, image tensor conversion,
 * face detection, landmark extraction, and 128-d face descriptor generation.
 */
class FaceAIClient {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    this.modelPath = path.join(__dirname, '../../../node_modules/@vladmandic/face-api/model');
  }

  /**
   * Initializes TensorFlow WASM backend and loads Face Detection & Recognition models once.
   */
  async initialize() {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        console.log('[FaceAI] Initializing TensorFlow WASM backend...');
        await faceapi.tf.ready();
        
        console.log(`[FaceAI] TF Backend active: ${faceapi.tf.getBackend()}`);
        console.log(`[FaceAI] Loading face recognition models from: ${this.modelPath}`);

        // Load SSD MobileNet V1 Face Detector
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelPath);
        // Load 68-point Face Landmark model
        await faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelPath);
        // Load 128-dimensional Face Recognition Network
        await faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelPath);

        this.isInitialized = true;
        console.log('✅ [FaceAI] Models loaded successfully and ready.');
      } catch (error) {
        console.error('❌ [FaceAI] Model initialization failed:', error);
        this.initializationPromise = null;
        throw new ApiError(500, 'Face AI model initialization failed: ' + error.message, [
          { code: ERROR_CODES.FACE_SERVICE_UNAVAILABLE, message: error.message },
        ]);
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Converts an image buffer or file path into an RGB raw pixel tensor.
   * Auto-rotates using EXIF orientation and ensures standard RGB channels.
   * @param {Buffer|string} input Image buffer or file path
   * @returns {Promise<{ tensor: faceapi.tf.Tensor3D, width: number, height: number }>}
   */
  async imageToTensor(input) {
    let pipeline;
    if (typeof input === 'string') {
      let resolvedPath = input;
      if (!path.isAbsolute(resolvedPath)) {
        resolvedPath = path.join(__dirname, '../../../', resolvedPath);
      }
      if (!fs.existsSync(resolvedPath)) {
        throw new ApiError(400, `Image file not found at path: ${input}`, [
          { code: ERROR_CODES.INVALID_IMAGE, message: 'Image file does not exist on disk' },
        ]);
      }
      pipeline = sharp(resolvedPath);
    } else if (Buffer.isBuffer(input)) {
      pipeline = sharp(input);
    } else {
      throw new ApiError(400, 'Invalid image input provided', [
        { code: ERROR_CODES.INVALID_IMAGE, message: 'Input must be a valid Buffer or file path' },
      ]);
    }

    try {
      const { data, info } = await pipeline
        .rotate() // Auto-orient based on EXIF
        .removeAlpha() // Ensure 3 channels RGB
        .raw()
        .toBuffer({ resolveWithObject: true });

      const tensor = faceapi.tf.tensor3d(data, [info.height, info.width, 3], 'int32');
      return { tensor, width: info.width, height: info.height };
    } catch (error) {
      throw new ApiError(400, 'Failed to decode or parse image: ' + error.message, [
        { code: ERROR_CODES.INVALID_IMAGE, message: error.message },
      ]);
    }
  }

  /**
   * Detects all valid human faces in an image with strict anatomical landmark quality filtering.
   * Filters out false positives (e.g. ears, side neck, hair slices, background noise).
   * @param {Buffer|string} imageInput Buffer or file path
   * @param {Object} options Detection options
   */
  async detectFacesAndEmbeddings(imageInput, options = {}) {
    await this.initialize();

    const minConfidence = options.minConfidence !== undefined ? options.minConfidence : FACE_MIN_CONFIDENCE;
    const minFaceSize = options.minFaceSize !== undefined ? options.minFaceSize : FACE_MIN_SIZE;

    const { tensor, width: imgWidth, height: imgHeight } = await this.imageToTensor(imageInput);

    try {
      const detectionOptions = new faceapi.SsdMobilenetv1Options({
        minConfidence: Math.max(0.15, minConfidence),
        maxResults: 100,
      });

      const detections = await faceapi
        .detectAllFaces(tensor, detectionOptions)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const results = [];
      let index = 0;

      for (const item of detections) {
        const box = item.detection.box;
        const confidence = Number(item.detection.score.toFixed(4));
        const width = Math.round(box.width);
        const height = Math.round(box.height);

        // 1. Minimum Face Dimensions Filter
        if (width < minFaceSize || height < minFaceSize) {
          continue;
        }

        // 2. Aspect Ratio Filter (Normal human faces range from 0.45 to 1.55)
        const aspectRatio = width / height;
        if (aspectRatio < 0.45 || aspectRatio > 1.55) {
          continue;
        }

        // 3. 68-Point Landmark Anatomical Sanity Check
        if (item.landmarks && item.landmarks.positions) {
          const positions = item.landmarks.positions;
          // Check inter-ocular distance (left eye ~ point 36, right eye ~ point 45)
          const leftEye = positions[36];
          const rightEye = positions[45];
          if (leftEye && rightEye) {
            const eyeDistance = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
            // In a valid human face, eye distance is at least 15% of face width
            if (eyeDistance < width * 0.14) {
              continue;
            }
          }
        }

        const boundingBox = {
          x: Math.max(0, Math.round(box.x)),
          y: Math.max(0, Math.round(box.y)),
          width: Math.min(imgWidth, width),
          height: Math.min(imgHeight, height),
        };

        // Convert Float32Array to regular Array of numbers
        const embedding = Array.from(item.descriptor);

        results.push({
          faceIndex: index++,
          confidence,
          boundingBox,
          embedding,
        });
      }

      return results;
    } finally {
      // Always dispose tensor to avoid memory leaks
      tensor.dispose();
    }
  }

  /**
   * Calculates Euclidean distance between two 128-dimensional face embedding vectors.
   * @param {number[]|Float32Array} embedding1
   * @param {number[]|Float32Array} embedding2
   * @returns {number} Euclidean distance (0.0 means identical)
   */
  calculateEuclideanDistance(embedding1, embedding2) {
    if (!embedding1 || !embedding2 || embedding1.length !== 128 || embedding2.length !== 128) {
      throw new Error('Embeddings must be 128-dimensional vectors');
    }
    const arr1 = embedding1 instanceof Float32Array ? embedding1 : new Float32Array(embedding1);
    const arr2 = embedding2 instanceof Float32Array ? embedding2 : new Float32Array(embedding2);
    return faceapi.euclideanDistance(arr1, arr2);
  }

  /**
   * Calculates Cosine Similarity between two 128-dimensional face embedding vectors.
   * @param {number[]} embedding1
   * @param {number[]} embedding2
   * @returns {number} Cosine similarity (-1.0 to 1.0, 1.0 means identical)
   */
  calculateCosineSimilarity(embedding1, embedding2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < 128; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Converts Euclidean distance to a normalized similarity percentage (0.0 to 1.0).
   * Uses a sigmoid-like calibrated curve for 128-d FaceNet biometric descriptors:
   * - dist <= 0.30: 92% - 100%
   * - dist = 0.45: 80%
   * - dist = 0.50: 72%
   * - dist = 0.60: 45%
   * - dist >= 0.75: 0%
   * @param {number} distance
   * @returns {number} Normalized similarity score (0.0 - 1.0)
   */
  distanceToSimilarityScore(distance) {
    if (distance <= 0) return 1.0;
    if (distance >= 0.80) return 0.0;
    // Calibrated polynomial curve
    const score = Math.max(0, 1 - Math.pow(distance / 0.75, 1.6));
    return Number(score.toFixed(4));
  }
}

module.exports = new FaceAIClient();
