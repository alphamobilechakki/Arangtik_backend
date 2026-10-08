const faceAIClient = require('./faceAI.client');
const {
  FACE_MATCH_THRESHOLD,
  FACE_MIN_CONFIDENCE,
  FACE_MIN_SIZE,
} = require('../../config/env.config');
const { ERROR_CODES } = require('../../modules/faceRecognition/faceRecognition.constants');
const ApiError = require('../../utils/apiError');

/**
 * High-Level Face AI Service
 * Business logic layer for Reference Face Extraction, Validation,
 * Gallery Multi-Face Detection, and High-Precision Similarity Comparison.
 */
class FaceAIService {
  /**
   * Validates and extracts exactly one reference face from the user's profile image.
   * Enforces strict quality criteria:
   * - Exactly 1 face
   * - Minimum confidence threshold
   * - Minimum face dimensions
   * @param {Buffer|string} imageInput Image buffer or file path
   * @returns {Promise<{ embedding: number[], boundingBox: { x: number, y: number, width: number, height: number }, confidence: number }>}
   */
  async extractReferenceFace(imageInput) {
    if (!imageInput) {
      throw new ApiError(400, 'Profile image is required for face recognition.', [
        { code: ERROR_CODES.PROFILE_IMAGE_NOT_FOUND, message: 'Profile image path or buffer is missing' },
      ]);
    }

    const faces = await faceAIClient.detectFacesAndEmbeddings(imageInput, {
      minConfidence: FACE_MIN_CONFIDENCE,
      minFaceSize: FACE_MIN_SIZE,
    });

    if (!faces || faces.length === 0) {
      throw new ApiError(422, 'No face detected in the profile image. Please upload a clear profile photo containing your face.', [
        { code: ERROR_CODES.PROFILE_FACE_NOT_FOUND, message: 'Zero faces detected in reference profile photo' },
      ]);
    }

    if (faces.length > 1) {
      throw new ApiError(422, `Multiple faces (${faces.length}) detected in the profile image. Please upload a photo with only yourself.`, [
        { code: ERROR_CODES.PROFILE_MULTIPLE_FACES, message: 'Reference photo must contain exactly one face' },
      ]);
    }

    const singleFace = faces[0];

    if (singleFace.confidence < FACE_MIN_CONFIDENCE) {
      throw new ApiError(422, 'Detected face in profile photo is of low quality/confidence. Please upload a clearer photo.', [
        { code: ERROR_CODES.PROFILE_FACE_LOW_QUALITY, message: `Detection confidence ${singleFace.confidence} below threshold ${FACE_MIN_CONFIDENCE}` },
      ]);
    }

    return singleFace;
  }

  /**
   * Detects all faces inside a gallery image and produces 128-d embeddings for each.
   * @param {Buffer|string} imageInput
   * @returns {Promise<Array<{ faceIndex: number, confidence: number, boundingBox: { x: number, y: number, width: number, height: number }, embedding: number[] }>>}
   */
  async detectGalleryFaces(imageInput, options = {}) {
    if (!imageInput) {
      throw new ApiError(400, 'Gallery image is required', [
        { code: ERROR_CODES.INVALID_IMAGE, message: 'Image payload is missing' },
      ]);
    }

    const minConfidence = options.minConfidence !== undefined ? options.minConfidence : 0.20;
    const minFaceSize = options.minFaceSize !== undefined ? options.minFaceSize : 25;

    const faces = await faceAIClient.detectFacesAndEmbeddings(imageInput, {
      minConfidence,
      minFaceSize,
    });

    return faces || [];
  }

  /**
   * Compares detected gallery faces against the user's reference face embedding.
   * Uses high-accuracy Euclidean distance and Cosine similarity.
   * Prevents false multiple identity detections within the same single photo.
   * @param {number[]} referenceEmbedding 128-d reference vector
   * @param {Array<Object>} detectedFaces Detected gallery faces
   * @param {number} threshold Optional custom distance threshold override
   */
  compareFaces(referenceEmbedding, detectedFaces = [], threshold = FACE_MATCH_THRESHOLD) {
    if (!referenceEmbedding || referenceEmbedding.length !== 128) {
      throw new ApiError(400, 'Valid reference face embedding is required for comparison.', [
        { code: ERROR_CODES.REFERENCE_EMBEDDING_MISSING, message: 'User reference embedding is missing or invalid' },
      ]);
    }

    const effectiveThreshold = Number(threshold) > 0 ? Number(threshold) : FACE_MATCH_THRESHOLD;
    
    // 1. Calculate metrics for all detected faces
    const evaluatedFaces = detectedFaces.map((face) => {
      const distance = faceAIClient.calculateEuclideanDistance(referenceEmbedding, face.embedding);
      const cosineSimilarity = faceAIClient.calculateCosineSimilarity(referenceEmbedding, face.embedding);
      const similarityScore = faceAIClient.distanceToSimilarityScore(distance);
      const isCandidateMatch = distance <= effectiveThreshold;

      return {
        faceIndex: face.faceIndex,
        detectionConfidence: face.confidence,
        distance: Number(distance.toFixed(4)),
        cosineSimilarity: Number(cosineSimilarity.toFixed(4)),
        similarity: similarityScore,
        isCandidateMatch,
        boundingBox: face.boundingBox,
      };
    });

    // 2. Sort candidate matches by lowest Euclidean distance (highest similarity)
    const matchingCandidates = evaluatedFaces
      .filter((f) => f.isCandidateMatch)
      .sort((a, b) => a.distance - b.distance);

    // All candidates passing the threshold are true matches (supports collages & multi-instance photos)
    const primaryMatchedIndices = new Set(matchingCandidates.map((c) => c.faceIndex));

    const matchedFaces = [];
    const allDetectedFaces = [];

    for (const face of evaluatedFaces) {
      const isTrueMatch = primaryMatchedIndices.has(face.faceIndex);

      const faceMetadata = {
        faceIndex: face.faceIndex,
        detectionConfidence: face.detectionConfidence,
        distance: face.distance,
        cosineSimilarity: face.cosineSimilarity,
        similarity: face.similarity,
        matched: isTrueMatch,
        boundingBox: face.boundingBox,
      };

      allDetectedFaces.push(faceMetadata);

      if (isTrueMatch) {
        matchedFaces.push({
          faceIndex: face.faceIndex,
          confidence: face.detectionConfidence,
          similarity: face.similarity,
          distance: face.distance,
          boundingBox: face.boundingBox,
        });
      }
    }

    return {
      matched: matchedFaces.length > 0,
      facesDetected: detectedFaces.length,
      matchedFaces,
      allDetectedFaces,
      thresholdUsed: effectiveThreshold,
    };
  }
}

module.exports = new FaceAIService();
