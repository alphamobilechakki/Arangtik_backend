const path = require('path');
const fs = require('fs');

let sharp = null;
try {
  sharp = require('sharp');
  sharp.cache(false);
} catch (err) {
  console.warn('⚠️ Warning: sharp native module could not be loaded:', err.message);
}

// Safely require background removal module with fallback
let removeBackground = null;
try {
  const bgRemoval = require('@imgly/background-removal-node');
  removeBackground = bgRemoval.removeBackground;
} catch (err) {
  console.warn('⚠️ Warning: @imgly/background-removal-node native module could not be initialized at startup:', err.message);
}

// Ensure segmented crops storage directory exists
const segmentedCropsDir = path.join(__dirname, '../../../uploads/crops/segmented');
if (!fs.existsSync(segmentedCropsDir)) {
  fs.mkdirSync(segmentedCropsDir, { recursive: true });
}

const inpaintingService = require('../inpainting/inpainting.service');

/**
 * Isolated Clothing & Garment Background Removal / Segmentation Service
 * Separates foreground clothing pixels from background and produces transparent WebP/PNG cutouts.
 */
class SegmentationService {
  constructor() {
    this.minOpaquePercent = 5; // Fallback to rectangular crop if less than 5% pixels remain
    this.maxOpaquePercent = 99; // If 100% opaque, background wasn't removed but image is fine
  }

  /**
   * Analyzes the alpha channel of a buffer to measure transparency ratio.
   * @param {Buffer} buffer 
   * @returns {Promise<{ hasAlpha: boolean, transparentPercent: number, opaquePercent: number, totalPixels: number }>}
   */
  async analyzeAlpha(buffer) {
    const rawStats = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
    const { data: rawBytes, info } = rawStats;
    const { width, height, channels } = info;
    const totalPixels = width * height;

    if (channels < 4) {
      return {
        hasAlpha: false,
        transparentPercent: 0,
        opaquePercent: 100,
        totalPixels,
      };
    }

    let transparentPixels = 0;
    let opaquePixels = 0;

    for (let i = 0; i < rawBytes.length; i += channels) {
      const alpha = rawBytes[i + 3];
      if (alpha < 64) {
        transparentPixels++;
      } else {
        opaquePixels++;
      }
    }

    const transparentPercent = Math.round((transparentPixels / totalPixels) * 100);
    const opaquePercent = Math.round((opaquePixels / totalPixels) * 100);

    return {
      hasAlpha: true,
      transparentPercent,
      opaquePercent,
      totalPixels,
    };
  }

  /**
   * Segments a cropped clothing image to remove background and create a transparent cutout.
   * Falls back gracefully to original rectangular crop if segmentation fails or erases the image.
   * 
   * @param {string|Buffer} input Image file path or Buffer
   * @param {Object} options Configuration options
   * @returns {Promise<{ success: boolean, outputPath: string, outputUrl: string, filename: string, isTransparent: boolean, stats?: Object, fallback: boolean }>}
   */
  async segmentClothing(input, options = {}) {
    const {
      outputFormat = 'image/webp',
      quality = 0.9,
      filenamePrefix = 'seg',
      polygon = null,
      usePolygonMask = false,
      autoInpaint = false,
    } = options;

    let originalBuffer;

    if (typeof input === 'string') {
      if (!fs.existsSync(input)) {
        throw new Error(`Input image does not exist at path: ${input}`);
      }
      originalBuffer = fs.readFileSync(input);
    } else if (Buffer.isBuffer(input)) {
      originalBuffer = input;
    } else {
      throw new Error('Input must be a valid file path or Buffer');
    }

    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;
    const extension = outputFormat === 'image/png' ? 'png' : 'webp';
    const outputFilename = `${filenamePrefix}-${uniqueId}.${extension}`;
    const outputFilePath = path.join(segmentedCropsDir, outputFilename);
    const outputUrl = `/uploads/crops/segmented/${outputFilename}`;
    if (!sharp || !removeBackground) {
      fs.writeFileSync(outputFilePath, originalBuffer);
      return {
        success: true,
        outputPath: outputFilePath,
        outputUrl,
        filename: outputFilename,
        isTransparent: false,
        fallback: true,
      };
    }

    try {
      // 1. Get original image metadata and calculate contextual padding to stabilize aspect ratio
      const meta = await sharp(originalBuffer).metadata();
      const { width, height } = meta;
      const maxDim = Math.max(width, height);

      // Neural segmentation models (U2Net/ISNet) expect square ~1:1 inputs with background margin.
      // Skewed aspect ratios and border-touching crops cause mask inversion or extreme transparency.
      const padX = Math.round(Math.max(24, Math.floor((maxDim - width) / 2 + maxDim * 0.08)));
      const padY = Math.round(Math.max(24, Math.floor((maxDim - height) / 2 + maxDim * 0.08)));
      const paddedWidth = width + padX * 2;
      const paddedHeight = height + padY * 2;

      // 2. Pad using edge replication so the neural model has clear background boundary context
      const { data: paddedRgba } = await sharp(originalBuffer)
        .extend({
          top: padY,
          bottom: padY,
          left: padX,
          right: padX,
          extendWith: 'copy',
        })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Wrap as image/x-rgba8 Blob with dimensions in MIME parameters (bypasses internal Sharp to avoid GLib conflict)
      const inputBlob = new Blob([paddedRgba], {
        type: `image/x-rgba8;width=${paddedWidth};height=${paddedHeight}`,
      });

      // 3. Perform AI Segmentation / Background Removal directly to raw RGBA
      const outputBlob = await removeBackground(inputBlob, {
        output: {
          format: 'image/x-rgba8',
          quality: quality,
        },
      });

      const rawOutputBuffer = Buffer.from(await outputBlob.arrayBuffer());

      // 4. Crop back the padding using Sharp to restore exact original dimensions and framing
      const { data: rawBytes } = await sharp(rawOutputBuffer, {
        raw: { width: paddedWidth, height: paddedHeight, channels: 4 },
      })
        .extract({ left: padX, top: padY, width, height })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // 5. Inversion & Opacity Protection: Check corner vs center alpha to prevent inverted/ghosted masks
      const cornerIdxs = [
        0, // top-left
        (width - 1) * 4, // top-right
        ((height - 1) * width) * 4, // bottom-left
        ((height - 1) * width + width - 1) * 4, // bottom-right
      ];
      const avgCornerAlpha = (rawBytes[cornerIdxs[0] + 3] + rawBytes[cornerIdxs[1] + 3] + rawBytes[cornerIdxs[2] + 3] + rawBytes[cornerIdxs[3] + 3]) / 4;
      const centerIdx = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
      const centerAlpha = rawBytes[centerIdx + 3];

      // If corners are opaque while center is hollow/transparent, model inverted foreground & background
      if (avgCornerAlpha > 180 && centerAlpha < 60) {
        console.warn('[Segmentation] Inverted mask detected. Inverting alpha channel to recover garment.');
        for (let i = 0; i < rawBytes.length; i += 4) {
          rawBytes[i + 3] = 255 - rawBytes[i + 3];
        }
      }

      // Boost fabric opacity for solid garment look (prevents faded/washed-out ghosting)
      for (let i = 0; i < rawBytes.length; i += 4) {
        const a = rawBytes[i + 3];
        if (a > 64) {
          rawBytes[i + 3] = Math.min(255, Math.round(a * 1.15 + 20));
        }
      }

      let finalBuffer = rawBytes;
      let transparentPixels = 0;
      let opaquePixels = 0;
      const totalPixels = width * height;

      // 6. Quality Control & Body / Skin Exclusion via Polygon Mask (if requested)
      if (usePolygonMask && Array.isArray(polygon) && polygon.length >= 3 && sharp) {
        try {
          const points = polygon
            .map(([y, x]) => `${Math.round(x)},${Math.round(y)}`)
            .join(' ');
          const svgMask = Buffer.from(
            `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">` +
            `<polygon points="${points}" fill="#ffffff" />` +
            `</svg>`
          );
          const maskPng = await sharp(svgMask)
            .resize(width, height)
            .blur(2.5)
            .png()
            .toBuffer();

          const maskedRaw = await sharp(finalBuffer, {
            raw: { width, height, channels: 4 },
          })
            .composite([{ input: maskPng, blend: 'dest-in' }])
            .raw()
            .toBuffer();

          let maskedOpaque = 0;
          for (let i = 0; i < maskedRaw.length; i += 4) {
            if (maskedRaw[i + 3] >= 64) maskedOpaque++;
          }
          const maskedOpaquePercent = Math.round((maskedOpaque / totalPixels) * 100);
          if (maskedOpaquePercent >= this.minOpaquePercent) {
            finalBuffer = maskedRaw;
          }
        } catch (polyErr) {
          console.warn('[Segmentation] Polygon mask compositing failed, keeping standard bg removal:', polyErr.message);
        }
      }

      for (let i = 0; i < finalBuffer.length; i += 4) {
        const alpha = finalBuffer[i + 3];
        if (alpha < 64) {
          transparentPixels++;
        } else {
          opaquePixels++;
        }
      }

      const transparentPercent = Math.round((transparentPixels / totalPixels) * 100);
      const opaquePercent = Math.round((opaquePixels / totalPixels) * 100);
      const alphaStats = {
        hasAlpha: true,
        transparentPercent,
        opaquePercent,
        totalPixels,
      };

      // If segmentation resulted in an empty image (< 5% opaque pixels), trigger fallback
      if (opaquePercent < this.minOpaquePercent) {
        console.warn(
          `[Segmentation] Over-erasure detected (${opaquePercent}% opaque). Falling back to rectangular crop.`
        );
        await sharp(originalBuffer)
          .webp({ quality: 90 })
          .toFile(outputFilePath);

        return {
          success: true,
          outputPath: outputFilePath,
          outputUrl,
          filename: outputFilename,
          isTransparent: false,
          fallback: true,
          stats: alphaStats,
        };
      }

      // 7. Intelligent Inpainting: Auto-fill notches, holes, and hand occlusion gaps (if enabled)
      let hasInpaintedBuffer = false;
      if (autoInpaint) {
        try {
          const rawPng = await sharp(finalBuffer, {
            raw: { width, height, channels: 4 },
          })
            .png()
            .toBuffer();

          const inpaintResult = await inpaintingService.inpaintGarment(rawPng, {
            radius: options.inpaintRadius || 22,
            protectCollar: options.protectCollar !== false,
            outputFormat: outputFormat === 'image/png' ? 'png' : 'webp',
          });

          if (inpaintResult.hasInpainted && inpaintResult.buffer) {
            fs.writeFileSync(outputFilePath, inpaintResult.buffer);
            hasInpaintedBuffer = true;
          }
        } catch (inpaintErr) {
          console.warn('[Segmentation] Inpainting fallback, keeping raw cutout:', inpaintErr.message);
        }
      }

      // 8. Encode clean transparent cutout if not already saved by inpainting
      if (!hasInpaintedBuffer) {
        if (outputFormat === 'image/png') {
          await sharp(finalBuffer, {
            raw: { width, height, channels: 4 },
          })
            .png()
            .toFile(outputFilePath);
        } else {
          await sharp(finalBuffer, {
            raw: { width, height, channels: 4 },
          })
            .webp({ quality: Math.round(quality * 100), alphaQuality: 100 })
            .toFile(outputFilePath);
        }
      }

      return {
        success: true,
        outputPath: outputFilePath,
        outputUrl,
        filename: outputFilename,
        isTransparent: transparentPercent > 0,
        fallback: false,
        stats: alphaStats,
      };
    } catch (error) {
      console.error('[Segmentation] Background removal failed:', error.message);

      // Graceful Fallback: write original rectangular crop so the pipeline never breaks
      try {
        await sharp(originalBuffer)
          .webp({ quality: 90 })
          .toFile(outputFilePath);

        return {
          success: true,
          outputPath: outputFilePath,
          outputUrl,
          filename: outputFilename,
          isTransparent: false,
          fallback: true,
          error: error.message,
        };
      } catch (fallbackErr) {
        throw new Error(`Both segmentation and fallback saving failed: ${fallbackErr.message}`);
      }
    }
  }
}

const segmentationService = new SegmentationService();
module.exports = segmentationService;
