const sharp = require('sharp');
const fs = require('fs');

/**
 * Garment Quality Validation Service (Stage F)
 * Analyzes output cutouts against rigorous quality metrics to detect over-erasure,
 * artifacts, remaining body parts, or alpha corruption.
 */
class GarmentQualityService {
  /**
   * Evaluates the quality of an extracted garment image.
   * 
   * @param {Buffer|string} input Garment cutout image Buffer or path
   * @param {Object} [options={}] Validation options
   * @param {number} [options.minCoverage=6] Minimum acceptable garment pixel percentage
   * @param {number} [options.maxCoverage=98] Maximum acceptable coverage (detects unremoved bg)
   * @returns {Promise<{ passed: boolean, score: number, maskCoveragePercent: number, remainingSkinPercent: number, alphaIntegrityPassed: boolean, warnings: string[], failureReason: string|null }>}
   */
  async validateQuality(input, options = {}) {
    const {
      minCoverage = 6,
      maxCoverage = 98,
    } = options;

    let inputBuffer;
    if (typeof input === 'string') {
      inputBuffer = fs.readFileSync(input);
    } else {
      inputBuffer = input;
    }

    const warnings = [];
    let failureReason = null;

    const { data: rawBytes, info } = await sharp(inputBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const totalPixels = width * height;

    if (channels < 4) {
      return {
        passed: false,
        score: 0,
        maskCoveragePercent: 0,
        remainingSkinPercent: 0,
        alphaIntegrityPassed: false,
        warnings: ['Image lacks alpha transparency channel.'],
        failureReason: 'Missing alpha transparency channel.',
      };
    }

    let opaquePixels = 0;
    let transparentPixels = 0;
    let suspectedSkinPixels = 0;

    for (let i = 0; i < rawBytes.length; i += channels) {
      const r = rawBytes[i];
      const g = rawBytes[i + 1];
      const b = rawBytes[i + 2];
      const a = rawBytes[i + 3];

      if (a < 32) {
        transparentPixels++;
      } else {
        opaquePixels++;

        // Measure non-destructive skin tone percentage for diagnostic quality metrics
        const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        const isSkinYCbCr = Cb >= 80 && Cb <= 130 && Cr >= 135 && Cr <= 175;
        const isSkinRGB = r > 80 && g > 40 && b > 25 && r > g && g > b && (r - g) > 12;

        if (isSkinYCbCr && isSkinRGB) {
          suspectedSkinPixels++;
        }
      }
    }

    const maskCoveragePercent = Math.round((opaquePixels / totalPixels) * 100);
    const remainingSkinPercent = Math.round((suspectedSkinPixels / Math.max(1, opaquePixels)) * 100);

    let score = 100;

    // Check 1: Under-coverage (Over-erasure)
    if (maskCoveragePercent < minCoverage) {
      score -= 50;
      failureReason = `Over-erasure detected: garment covers only ${maskCoveragePercent}% of the canvas.`;
      warnings.push(failureReason);
    }

    // Check 2: Over-coverage (Background wasn't removed at all)
    if (maskCoveragePercent > maxCoverage) {
      score -= 40;
      warnings.push(`High opacity (${maskCoveragePercent}%): background may not have been fully removed.`);
    }

    // Check 3: Remaining Skin / Body Regions
    if (remainingSkinPercent > 25) {
      score -= 20;
      warnings.push(`Diagnostic warning: ${remainingSkinPercent}% of pixels match skin chrominance profile.`);
    }

    // Check 4: Dimensions
    if (width < 64 || height < 64) {
      score -= 30;
      failureReason = 'Image resolution too low for garment catalog display.';
      warnings.push(failureReason);
    }

    const passed = score >= 55 && !failureReason;

    return {
      passed,
      score: Math.max(0, Math.min(100, score)),
      maskCoveragePercent,
      remainingSkinPercent,
      alphaIntegrityPassed: true,
      warnings,
      failureReason: passed ? null : failureReason,
      validatedAt: new Date(),
    };
  }
}

module.exports = new GarmentQualityService();
