const tf = require('@tensorflow/tfjs');
const poseDetection = require('@tensorflow-models/pose-detection');
const sharp = require('sharp');
const fs = require('fs');

/**
 * Pose Validation Service (Arangtik Smart Garment Extraction Pipeline)
 * Evaluates human pose landmarks using MoveNet (Apache-2.0, commercially safe).
 * Prevents garment occlusion and ensures avatar-aligned catalog-quality input.
 */
class PoseValidationService {
  constructor() {
    this.detector = null;
    this.initPromise = null;
    this.isInitializing = false;
  }

  /**
   * Lazily loads and caches the MoveNet SinglePose detector.
   */
  async getDetector() {
    if (this.detector) return this.detector;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        await tf.ready();
        this.detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
          }
        );
        return this.detector;
      })();
    }

    return this.initPromise;
  }

  /**
   * Normalizes input image to 3-channel RGB raw buffer with proper EXIF orientation.
   */
  async preprocessImage(imageInput) {
    let pipeline = sharp(imageInput).rotate(); // Auto-rotates according to EXIF

    const metadata = await pipeline.metadata();
    const { width, height } = metadata;

    if (!width || !height) {
      throw new Error('Invalid image dimensions or corrupted image data.');
    }

    // Downscale large images to max 1024px for fast, bounded memory pose inference
    let targetWidth = width;
    let targetHeight = height;
    const maxDim = 1024;
    if (Math.max(width, height) > maxDim) {
      if (width > height) {
        targetWidth = maxDim;
        targetHeight = Math.round((height / width) * maxDim);
      } else {
        targetHeight = maxDim;
        targetWidth = Math.round((width / height) * maxDim);
      }
      pipeline = pipeline.resize(targetWidth, targetHeight, { fit: 'inside' });
    }

    const { data } = await pipeline
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      width: targetWidth,
      height: targetHeight,
      origWidth: width,
      origHeight: height,
    };
  }

  /**
   * Estimates 17 COCO keypoints and normalizes coordinates to [0, 1].
   */
  async estimatePose(imageInput) {
    const detector = await this.getDetector();
    const { buffer, width, height } = await this.preprocessImage(imageInput);

    let inputTensor = null;
    try {
      inputTensor = tf.tensor3d(new Uint8Array(buffer), [height, width, 3]);
      const poses = await detector.estimatePoses(inputTensor);

      if (!poses || poses.length === 0) {
        return {
          detected: false,
          poses: [],
          normalizedLandmarks: null,
          confidence: 0,
        };
      }

      const primaryPose = poses[0];
      const keypointsMap = {};

      for (const kp of primaryPose.keypoints) {
        keypointsMap[kp.name] = {
          x: Math.min(1, Math.max(0, kp.x / width)),
          y: Math.min(1, Math.max(0, kp.y / height)),
          score: Math.round((kp.score || 0) * 100) / 100,
        };
      }

      return {
        detected: true,
        poses,
        rawPose: primaryPose,
        normalizedLandmarks: {
          nose: keypointsMap['nose'] || null,
          leftEye: keypointsMap['left_eye'] || null,
          rightEye: keypointsMap['right_eye'] || null,
          leftEar: keypointsMap['left_ear'] || null,
          rightEar: keypointsMap['right_ear'] || null,
          leftShoulder: keypointsMap['left_shoulder'] || null,
          rightShoulder: keypointsMap['right_shoulder'] || null,
          leftElbow: keypointsMap['left_elbow'] || null,
          rightElbow: keypointsMap['right_elbow'] || null,
          leftWrist: keypointsMap['left_wrist'] || null,
          rightWrist: keypointsMap['right_wrist'] || null,
          leftHip: keypointsMap['left_hip'] || null,
          rightHip: keypointsMap['right_hip'] || null,
          leftKnee: keypointsMap['left_knee'] || null,
          rightKnee: keypointsMap['right_knee'] || null,
          leftAnkle: keypointsMap['left_ankle'] || null,
          rightAnkle: keypointsMap['right_ankle'] || null,
        },
        confidence: Math.round((primaryPose.score || 0) * 100) / 100,
      };
    } finally {
      if (inputTensor) {
        inputTensor.dispose();
      }
    }
  }

  /**
   * Validates pose alignment, hand clearance, and garment-category-specific criteria.
   * 
   * @param {string|Buffer} imageInput File path or buffer
   * @param {Object} options Configuration and garment metadata
   * @returns {Promise<Object>} Standardized pose validation response
   */
  async validatePose(imageInput, options = {}) {
    const garmentCategory = (options.category || options.garmentCategory || 'ETHNIC_WEAR').toUpperCase();
    const warnings = [];
    const recommendedActions = [];

    let estimation;
    try {
      estimation = await this.estimatePose(imageInput);
    } catch (err) {
      return {
        poseStatus: 'POSE_VALIDATION_ERROR',
        poseConfidence: 0,
        personCount: 0,
        handsOverlapGarment: 'UNKNOWN',
        landmarks: {},
        warnings: [`Pose estimation engine failed: ${err.message}`],
        canProceed: false,
        recommendedActions: ['Retry photo capture with better lighting and plain background.'],
      };
    }

    if (!estimation.detected || !estimation.normalizedLandmarks) {
      return {
        poseStatus: 'PERSON_NOT_DETECTED',
        poseConfidence: 0,
        personCount: 0,
        handsOverlapGarment: 'UNKNOWN',
        landmarks: {},
        warnings: ['No person detected in the photograph.'],
        canProceed: false,
        recommendedActions: [
          'Stand in front of the camera inside the avatar silhouette frame.',
          'Ensure good room lighting and face the camera directly.',
        ],
      };
    }

    const lm = estimation.normalizedLandmarks;
    const confidence = estimation.confidence;
    const personCount = estimation.poses.length;

    // Check multiple people
    if (personCount > 1) {
      warnings.push('Multiple people detected in frame. Only one person should be present.');
      recommendedActions.push('Take a standalone photo with only one person in frame.');
    }

    // 1. Overall Confidence Check
    const minConfidence = options.minConfidence || 0.25;
    if (confidence < minConfidence) {
      warnings.push('Low overall pose landmark confidence.');
      recommendedActions.push('Ensure proper lighting and clear view of the body.');
    }

    // 2. Shoulder Alignment & Visibility
    const ls = lm.leftShoulder;
    const rs = lm.rightShoulder;
    const shouldersPresent = ls && rs && ls.score >= 0.2 && rs.score >= 0.2;

    if (!shouldersPresent) {
      warnings.push('Shoulders are not clearly visible or partially cut off.');
      recommendedActions.push('Step back so your full shoulders and upper body are within the frame.');
    } else {
      // Check shoulder tilt (severe rotation/tilt)
      const shoulderDx = Math.abs(ls.x - rs.x);
      const shoulderDy = Math.abs(ls.y - rs.y);
      if (shoulderDx > 0.05 && shoulderDy / shoulderDx > 0.35) {
        warnings.push('Excessive body tilt or angle detected. Torso is leaning sideways.');
        recommendedActions.push('Stand straight facing the camera directly without tilting.');
      }
    }

    // 3. Torso & Hip Visibility
    const lh = lm.leftHip;
    const rh = lm.rightHip;
    const hipsPresent = lh && rh && lh.score >= 0.2 && rh.score >= 0.2;

    if (!hipsPresent && !['UPPER_WEAR', 'TOP', 'SHIRT', 'T_SHIRT'].includes(garmentCategory)) {
      warnings.push('Waist/hips boundary not fully visible for full-length garment.');
      recommendedActions.push('Step back so your waist and mid-body are clearly in the frame.');
    }

    // 4. Hand / Arm Occlusion Analysis (The Core Innovation)
    // Check if hands (wrists) overlap the central torso rectangle [xMinTorso, xMaxTorso]
    let handsOverlapGarment = 'NO';
    let overlapConfidence = 0.85;

    const lw = lm.leftWrist;
    const rw = lm.rightWrist;
    const wristsDetected = (lw && lw.score >= 0.2) || (rw && rw.score >= 0.2);

    if (!wristsDetected) {
      handsOverlapGarment = 'UNKNOWN';
      overlapConfidence = 0.4;
      warnings.push('Hand positions could not be determined with high confidence.');
      recommendedActions.push('Keep both hands clearly visible and slightly away from your sides.');
    } else if (shouldersPresent && hipsPresent) {
      // Torso bounding box
      const torsoXMin = Math.min(ls.x, rs.x, lh.x, rh.x);
      const torsoXMax = Math.max(ls.x, rs.x, lh.x, rh.x);
      const torsoYMin = Math.min(ls.y, rs.y);
      const torsoYMax = Math.max(lh.y, rh.y) + 0.05; // Slightly below hips

      let leftHandInTorso = false;
      let rightHandInTorso = false;

      if (lw && lw.score >= 0.2) {
        // Hand is considered overlapping if it's deeply inside torso area
        if (lw.x >= torsoXMin + 0.02 && lw.x <= torsoXMax - 0.02 && lw.y >= torsoYMin && lw.y <= torsoYMax) {
          leftHandInTorso = true;
        }
      }

      if (rw && rw.score >= 0.2) {
        if (rw.x >= torsoXMin + 0.02 && rw.x <= torsoXMax - 0.02 && rw.y >= torsoYMin && rw.y <= torsoYMax) {
          rightHandInTorso = true;
        }
      }

      if (leftHandInTorso || rightHandInTorso) {
        handsOverlapGarment = 'YES';
        warnings.push('Hands are resting on the garment/waist, which occludes the fabric.');
        recommendedActions.push('Keep arms slightly outward from your sides so the garment is unobstructed.');
      }
    }

    // 5. Category-Specific Lower-Body Landmark Checks
    const isLongGarment = [
      'ETHNIC_WEAR',
      'SAREE',
      'ANARKALI',
      'LEHENGA',
      'DRESS',
      'GOWN',
      'LOWER_WEAR',
      'TROUSERS',
    ].includes(garmentCategory);

    if (isLongGarment) {
      const lk = lm.leftKnee;
      const rk = lm.rightKnee;
      const kneesPresent = (lk && lk.score >= 0.2) || (rk && rk.score >= 0.2);

      if (!kneesPresent) {
        warnings.push('Lower hem of full-length garment appears clipped or out of frame.');
        recommendedActions.push('Step further back so the full length and flare of the outfit is visible.');
      }
    }

    // 6. Synthesize Final Status
    let poseStatus = 'POSE_VALID';
    let canProceed = true;

    if (!shouldersPresent) {
      poseStatus = 'POOR_POSE_ALIGNMENT';
      canProceed = false;
    } else if (handsOverlapGarment === 'YES') {
      poseStatus = 'OCCLUSION_DETECTED';
      // User can proceed if policy permits, but with occlusion warning
      canProceed = true;
    } else if (confidence < 0.3) {
      poseStatus = 'LANDMARKS_LOW_CONFIDENCE';
      canProceed = true;
    } else if (warnings.length > 0) {
      poseStatus = 'POOR_POSE_ALIGNMENT';
      canProceed = true;
    }

    return {
      poseStatus,
      poseConfidence: confidence,
      personCount,
      handsOverlapGarment,
      overlapConfidence,
      landmarks: lm,
      warnings,
      canProceed,
      recommendedActions: recommendedActions.length > 0 ? recommendedActions : ['Pose is aligned with avatar guide.'],
      garmentCategory,
    };
  }
}

module.exports = new PoseValidationService();
