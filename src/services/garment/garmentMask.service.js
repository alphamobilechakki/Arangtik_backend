const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

let removeBackground = null;
try {
  const bgRemoval = require('@imgly/background-removal-node');
  removeBackground = bgRemoval.removeBackground;
} catch (err) {
  console.warn('[GarmentMask] Warning: @imgly/background-removal-node could not be initialized:', err.message);
}

const segmentedCropsDir = path.join(__dirname, '../../../uploads/crops/segmented');
if (!fs.existsSync(segmentedCropsDir)) {
  fs.mkdirSync(segmentedCropsDir, { recursive: true });
}

/**
 * Garment Mask & Segmentation Service (Stage B & C)
 * Extracts the garment cleanly while preserving fabric, embroidery, lace, and colors intact.
 */
class GarmentMaskService {
  /**
   * Generates a transparent garment cutout and alpha mask from an image.
   * 
   * @param {string|Buffer} input Image file path or Buffer
   * @param {Object} options Configuration
   * @param {Array} [options.polygon=null] Optional boundary polygon guidance
   * @param {number} [options.featherBlur=2.0] Soft mask feathering to avoid jagged cuts
   * @param {string} [options.filenamePrefix='garment'] Output file prefix
   * @param {number} [options.quality=0.92] WebP quality
   * @returns {Promise<{ success: boolean, outputPath: string, outputUrl: string, buffer: Buffer, maskBuffer: Buffer, coveragePercent: number, dimensions: { width: number, height: number } }>}
   */
  async extractGarmentMask(input, options = {}) {
    const {
      polygon = null,
      featherBlur = 2.0,
      filenamePrefix = 'garment',
      quality = 0.92,
    } = options;

    let originalBuffer;
    if (typeof input === 'string') {
      if (!fs.existsSync(input)) {
        throw new Error(`Garment input image not found: ${input}`);
      }
      originalBuffer = fs.readFileSync(input);
    } else if (Buffer.isBuffer(input)) {
      originalBuffer = input;
    } else {
      throw new Error('Input must be a valid file path or Buffer');
    }

    // 1. Normalize orientation and ensure standard sRGB
    const normalizedImage = sharp(originalBuffer).rotate();
    const { data: rawRgba, info } = await normalizedImage
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height } = info;
    const totalPixels = width * height;

    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;
    const outputFilename = `${filenamePrefix}-${uniqueId}.webp`;
    const outputFilePath = path.join(segmentedCropsDir, outputFilename);
    const outputUrl = `/uploads/crops/segmented/${outputFilename}`;

    if (!removeBackground) {
      // Fallback if background removal model is missing
      const fallbackWebp = await sharp(originalBuffer).webp({ quality: 90 }).toBuffer();
      fs.writeFileSync(outputFilePath, fallbackWebp);
      return {
        success: true,
        outputPath: outputFilePath,
        outputUrl,
        buffer: fallbackWebp,
        maskBuffer: null,
        coveragePercent: 100,
        dimensions: { width, height },
        isFallback: true,
      };
    }

    // 2. Perform AI Foreground / Garment Segmentation using ONNX runtime
    const blobInput = new Blob([rawRgba], {
      type: `image/x-rgba8;width=${width};height=${height}`,
    });

    const outputBlob = await removeBackground(blobInput, {
      output: { format: 'image/x-rgba8', quality },
    });

    const rawBgRemoved = Buffer.from(await outputBlob.arrayBuffer());

    let finalBuffer = rawBgRemoved;

    // 3. Optional Soft Boundary Guidance (Never uses razor straight cuts)
    if (Array.isArray(polygon) && polygon.length >= 3) {
      try {
        const points = polygon
          .map(([y, x]) => `${Math.round(x)},${Math.round(y)}`)
          .join(' ');
        const svgMask = Buffer.from(
          `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">` +
          `<polygon points="${points}" fill="#ffffff" />` +
          `</svg>`
        );
        const softMaskPng = await sharp(svgMask)
          .resize(width, height)
          .blur(Math.max(1.0, featherBlur))
          .png()
          .toBuffer();

        const masked = await sharp(rawBgRemoved, {
          raw: { width, height, channels: 4 },
        })
          .composite([{ input: softMaskPng, blend: 'dest-in' }])
          .raw()
          .toBuffer();

        // Safety check: ensure mask didn't erase valid garment pixels
        let opaqueRemaining = 0;
        for (let i = 0; i < masked.length; i += 4) {
          if (masked[i + 3] >= 64) opaqueRemaining++;
        }
        if (opaqueRemaining >= totalPixels * 0.05) {
          finalBuffer = masked;
        }
      } catch (err) {
        console.warn('[GarmentMask] Soft polygon guidance skipped:', err.message);
      }
    }

    // 4. Measure coverage and extract pure 1-channel alpha mask buffer
    let opaquePixels = 0;
    const maskBytes = Buffer.alloc(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const alpha = finalBuffer[i * 4 + 3];
      maskBytes[i] = alpha;
      if (alpha >= 64) opaquePixels++;
    }

    const coveragePercent = Math.round((opaquePixels / totalPixels) * 100);

    // 5. Encode final transparent WebP
    const webpBuffer = await sharp(finalBuffer, {
      raw: { width, height, channels: 4 },
    })
      .webp({ quality: Math.round(quality * 100), alphaQuality: 100 })
      .toBuffer();

    fs.writeFileSync(outputFilePath, webpBuffer);

    return {
      success: true,
      outputPath: outputFilePath,
      outputUrl,
      buffer: webpBuffer,
      maskBuffer: maskBytes,
      coveragePercent,
      dimensions: { width, height },
      isFallback: false,
    };
  }
}

module.exports = new GarmentMaskService();
