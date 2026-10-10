const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ghostMannequinDir = path.join(__dirname, '../../../uploads/crops/ghost-mannequin');
if (!fs.existsSync(ghostMannequinDir)) {
  fs.mkdirSync(ghostMannequinDir, { recursive: true });
}

/**
 * Ghost Mannequin Presentation Service (Stage E)
 * Centers the garment on a standardized catalog canvas with uniform padding.
 * Preserves true fabric aspect ratios and never forces geometric distortion.
 */
class GhostMannequinService {
  /**
   * Generates a centered, normalized Ghost Mannequin catalog presentation image.
   * 
   * @param {Buffer|string} input Garment cutout image
   * @param {Object} options Configuration
   * @param {number} [options.targetWidth=1024] Canvas target width
   * @param {number} [options.targetHeight=1024] Canvas target height
   * @param {number} [options.paddingPercent=8] Canvas margin percentage (default: 8%)
   * @param {string} [options.backgroundColor='transparent'] Canvas background ('transparent' | 'white')
   * @param {string} [options.filenamePrefix='gm'] Output prefix
   * @returns {Promise<{ success: boolean, outputPath: string, outputUrl: string, buffer: Buffer, dimensions: { width: number, height: number } }>}
   */
  async generateGhostMannequin(input, options = {}) {
    const {
      targetWidth = 1024,
      targetHeight = 1024,
      paddingPercent = 8,
      backgroundColor = 'transparent',
      filenamePrefix = 'gm',
    } = options;

    let inputBuffer;
    if (typeof input === 'string') {
      inputBuffer = fs.readFileSync(input);
    } else {
      inputBuffer = input;
    }

    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;
    const outputFilename = `${filenamePrefix}-${uniqueId}.webp`;
    const outputFilePath = path.join(ghostMannequinDir, outputFilename);
    const outputUrl = `/uploads/crops/ghost-mannequin/${outputFilename}`;

    // 1. Trim surrounding empty transparent pixels to get the exact tight garment bounds
    const trimmed = await sharp(inputBuffer).trim().toBuffer({ resolveWithObject: true });
    const { data: trimmedBuffer, info: trimmedInfo } = trimmed;

    const garmentW = trimmedInfo.width;
    const garmentH = trimmedInfo.height;

    // 2. Compute available interior dimensions with padding
    const pad = Math.round(Math.min(targetWidth, targetHeight) * (paddingPercent / 100));
    const maxInnerW = targetWidth - pad * 2;
    const maxInnerH = targetHeight - pad * 2;

    // 3. Compute scale factor while strictly preserving aspect ratio
    const scale = Math.min(maxInnerW / garmentW, maxInnerH / garmentH);
    const scaledW = Math.round(garmentW * scale);
    const scaledH = Math.round(garmentH * scale);

    const scaledGarment = await sharp(trimmedBuffer)
      .resize(scaledW, scaledH, { fit: 'inside' })
      .toBuffer();

    // 4. Create target canvas with requested background
    const isWhiteBg = backgroundColor.toLowerCase() === 'white' || backgroundColor.toLowerCase() === '#ffffff';
    const bgConfig = isWhiteBg
      ? { r: 255, g: 255, b: 255, alpha: 1 }
      : { r: 0, g: 0, b: 0, alpha: 0 };

    const canvas = sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 4,
        background: bgConfig,
      },
    });

    // 5. Center garment precisely onto canvas
    const left = Math.round((targetWidth - scaledW) / 2);
    const top = Math.round((targetHeight - scaledH) / 2);

    const outputBuffer = await canvas
      .composite([{ input: scaledGarment, left, top }])
      .webp({ quality: 95, alphaQuality: 100 })
      .toBuffer();

    fs.writeFileSync(outputFilePath, outputBuffer);

    return {
      success: true,
      outputPath: outputFilePath,
      outputUrl,
      buffer: outputBuffer,
      dimensions: { width: targetWidth, height: targetHeight },
    };
  }
}

module.exports = new GhostMannequinService();
