const path = require('path');
const fs = require('fs');
const User = require('../auth/user.model');
const faceAIService = require('../../services/faceAI/faceAI.service');
const { ERROR_CODES } = require('./faceRecognition.constants');
const ApiError = require('../../utils/apiError');

/**
 * Face Recognition Business Logic Service
 * Strictly enforces user isolation (User A cannot access or compare against User B's reference face).
 */
class FaceRecognitionService {
  /**
   * Resolves a stored image path/URL to an absolute filesystem path.
   * @param {string} imagePath 
   * @returns {string} Absolute path on disk
   */
  resolveImagePath(imagePath) {
    if (!imagePath) return '';
    let cleaned = imagePath.replace(/^[\\/]+/, '');
    // If it starts with uploads/, resolve from backend root
    const absolutePath = path.resolve(__dirname, '../../../', cleaned);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
    // Also try checking directly in uploads directory
    const uploadsPath = path.resolve(__dirname, '../../../uploads', path.basename(imagePath));
    if (fs.existsSync(uploadsPath)) {
      return uploadsPath;
    }
    return absolutePath;
  }

  /**
   * Validates the currently logged-in user's profile image for face recognition readiness.
   * Checks if exactly one clear face is present.
   * @param {string} userId Authenticated user's ID
   */
  async validateReferenceFace(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!user.profileImage || user.profileImage.trim() === '') {
      throw new ApiError(400, 'Profile image is required for face recognition. Please upload a profile photo first.', [
        { code: ERROR_CODES.PROFILE_IMAGE_NOT_FOUND, message: 'No profile image is attached to your account' },
      ]);
    }

    const resolvedPath = this.resolveImagePath(user.profileImage);
    if (!fs.existsSync(resolvedPath)) {
      throw new ApiError(400, 'Profile image file could not be found on server storage.', [
        { code: ERROR_CODES.PROFILE_IMAGE_NOT_FOUND, message: `File missing on disk: ${user.profileImage}` },
      ]);
    }

    // Attempt face extraction and validation
    const face = await faceAIService.extractReferenceFace(resolvedPath);

    return {
      isValid: true,
      profileImage: user.profileImage,
      faceDetected: true,
      confidence: face.confidence,
      boundingBox: face.boundingBox,
      message: 'Profile image contains a valid single reference face ready for recognition.',
    };
  }

  /**
   * Generates and stores the reference face embedding for the logged-in user from their profile photo or uploaded file.
   * @param {string} userId Authenticated user's ID
   * @param {Object} file Optional uploaded file
   */
  async generateReferenceEmbedding(userId, file = null) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    let targetImagePath = '';
    let relativeUrl = '';

    if (file && file.filename) {
      targetImagePath = file.path;
      relativeUrl = `/uploads/${file.filename}`;
      user.profileImage = relativeUrl;
    } else {
      if (!user.profileImage || user.profileImage.trim() === '') {
        throw new ApiError(400, 'Profile image is required for face recognition. Please upload a profile photo.', [
          { code: ERROR_CODES.PROFILE_IMAGE_NOT_FOUND, message: 'No profile image found on account' },
        ]);
      }
      targetImagePath = this.resolveImagePath(user.profileImage);
      relativeUrl = user.profileImage;
    }

    if (!fs.existsSync(targetImagePath)) {
      throw new ApiError(400, 'Profile image file could not be found on server storage.', [
        { code: ERROR_CODES.PROFILE_IMAGE_NOT_FOUND, message: `File missing on disk: ${targetImagePath}` },
      ]);
    }

    // Extract exactly one face and 128-d descriptor vector
    const face = await faceAIService.extractReferenceFace(targetImagePath);

    // Save reference face into user record
    user.referenceFace = {
      embedding: face.embedding,
      boundingBox: face.boundingBox,
      detectionConfidence: face.confidence,
      lastGeneratedAt: new Date(),
      imagePath: relativeUrl,
    };

    await user.save();

    console.log(`[FaceRecognition] Reference embedding generated successfully for user: ${userId}`);

    // Return sanitized metadata (never expose raw embedding)
    return {
      hasReferenceFace: true,
      profileImage: user.profileImage,
      boundingBox: face.boundingBox,
      detectionConfidence: face.confidence,
      lastGeneratedAt: user.referenceFace.lastGeneratedAt,
    };
  }

  /**
   * Scans an uploaded gallery image against the target reference face embedding
   * (Uses wardrobe-specific face photo if available, otherwise falls back to user profile image).
   * @param {string} userId Authenticated user's ID
   * @param {Buffer|string} galleryImage File buffer or image path
   * @param {Object} fileMeta Metadata (filename, size, mimetype)
   * @param {number} customThreshold Optional custom threshold override
   * @param {string} wardrobeId Optional specific wardrobe ID to load owner face from
   */
  async scanGalleryImage(userId, galleryImage, fileMeta = {}, customThreshold = null, wardrobeId = null) {
    const startTime = Date.now();

    let referenceEmbedding = null;
    let targetPersonName = 'User';

    // 1. Check if a specific Wardrobe has its own reference face image / embedding
    if (wardrobeId) {
      try {
        const Wardrobe = require('../wardrobe/wardrobe.model');
        const wardrobe = await Wardrobe.findOne({ _id: wardrobeId, userId }).select('+referenceFace.embedding');
        if (wardrobe) {
          targetPersonName = wardrobe.ownerName || wardrobe.name;
          const wardrobeFaceImg = wardrobe.ownerFaceImage || wardrobe.coverImage;
          if (wardrobe.referenceFace?.embedding && wardrobe.referenceFace.embedding.length === 128) {
            referenceEmbedding = wardrobe.referenceFace.embedding;
            console.log(`[FaceRecognition] Using wardrobe-specific face for "${wardrobe.name}" (${targetPersonName})`);
          } else if (wardrobeFaceImg) {
            const resolvedPath = this.resolveImagePath(wardrobeFaceImg);
            if (fs.existsSync(resolvedPath)) {
              console.log(`[FaceRecognition] Generating face embedding for wardrobe "${wardrobe.name}" from ${wardrobeFaceImg}...`);
              const face = await faceAIService.extractReferenceFace(resolvedPath);
              wardrobe.referenceFace = {
                embedding: face.embedding,
                boundingBox: face.boundingBox,
                detectionConfidence: face.confidence,
                lastGeneratedAt: new Date(),
                imagePath: wardrobeFaceImg,
              };
              await wardrobe.save();
              referenceEmbedding = face.embedding;
            }
          }
        }
      } catch (wErr) {
        console.warn(`[FaceRecognition] Could not load wardrobe-specific face (${wErr.message}), falling back to user profile`);
      }
    }

    // 2. Fallback to main User profile if no wardrobe-specific embedding
    if (!referenceEmbedding || referenceEmbedding.length !== 128) {
      const user = await User.findById(userId).select('+referenceFace.embedding');
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      referenceEmbedding = user.referenceFace?.embedding;

      // If reference embedding doesn't exist yet, try to auto-generate if profileImage exists
      if (!referenceEmbedding || referenceEmbedding.length !== 128) {
        if (!user.profileImage) {
          throw new ApiError(400, 'Profile image or Wardrobe face photo is required for face recognition. Please upload a photo first.', [
            { code: ERROR_CODES.PROFILE_IMAGE_NOT_FOUND, message: 'Reference face embedding not found and no reference image is available' },
          ]);
        }

        console.log(`[FaceRecognition] Reference embedding missing for user ${userId}. Auto-generating from profileImage...`);
        const resolvedProfilePath = this.resolveImagePath(user.profileImage);
        const face = await faceAIService.extractReferenceFace(resolvedProfilePath);

        user.referenceFace = {
          embedding: face.embedding,
          boundingBox: face.boundingBox,
          detectionConfidence: face.confidence,
          lastGeneratedAt: new Date(),
          imagePath: user.profileImage,
        };

        await user.save();
        referenceEmbedding = face.embedding;
      }
    }

    // Detect all faces in the gallery image
    const detectedFaces = await faceAIService.detectGalleryFaces(galleryImage);

    // If 0 faces found in the gallery image
    if (!detectedFaces || detectedFaces.length === 0) {
      const processingTimeMs = Date.now() - startTime;
      console.log(`[FaceRecognition] Scan completed for user ${userId}. Faces detected: 0. Matched: false. Time: ${processingTimeMs}ms`);

      return {
        imageId: fileMeta.filename || null,
        matched: false,
        facesDetected: 0,
        matchedFaces: [],
        allDetectedFaces: [],
        processingTimeMs,
      };
    }

    // Compare detected faces against user reference face
    const comparison = faceAIService.compareFaces(referenceEmbedding, detectedFaces, customThreshold);
    const processingTimeMs = Date.now() - startTime;

    console.log(
      `[FaceRecognition] Scan completed for user ${userId}. Faces detected: ${comparison.facesDetected}. Matched: ${comparison.matched}. Time: ${processingTimeMs}ms`
    );

    return {
      imageId: fileMeta.filename || null,
      matched: comparison.matched,
      facesDetected: comparison.facesDetected,
      matchedFaces: comparison.matchedFaces,
      allDetectedFaces: comparison.allDetectedFaces,
      thresholdUsed: comparison.thresholdUsed,
      processingTimeMs,
    };
  }

  /**
   * Retrieves reference face status for the authenticated user without exposing the raw embedding.
   * @param {string} userId 
   */
  async getReferenceStatus(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const hasReferenceFace = !!(user.referenceFace && user.referenceFace.lastGeneratedAt);

    return {
      userId: user._id,
      hasProfileImage: !!user.profileImage,
      profileImage: user.profileImage || null,
      hasReferenceFace,
      referenceMetadata: hasReferenceFace
        ? {
            boundingBox: user.referenceFace.boundingBox,
            detectionConfidence: user.referenceFace.detectionConfidence,
            lastGeneratedAt: user.referenceFace.lastGeneratedAt,
            imagePath: user.referenceFace.imagePath,
          }
        : null,
    };
  }

  /**
   * Deletes / invalidates reference face embedding for the authenticated user.
   * @param {string} userId 
   */
  async deleteReferenceEmbedding(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.referenceFace = undefined;
    await user.save();

    return {
      success: true,
      message: 'Reference face embedding deleted successfully.',
    };
  }
}

module.exports = new FaceRecognitionService();
