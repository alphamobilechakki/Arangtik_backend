const path = require('path');
const fs = require('fs');
const { formatUploadUrl } = require('../../utils/url.util');

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
   * Determines if an RGB color falls within the human skin color locus
   */
  isSkinPixel(r, g, b) {
    if (!(r > 50 && g > 30 && b > 15)) return false;
    if (!(r >= g && g >= b)) return false;
    if (r - g < 5) return false;
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) return true;
    const sum = r + g + b;
    if (sum > 0) {
      const nr = r / sum, ng = g / sum;
      if (nr > 0.36 && nr < 0.60 && ng > 0.28 && ng < 0.38) return true;
    }
    return false;
  }

  /**
   * Removes human skin pixels and isolates the primary garment body (Men's wear ghost mannequin mode)
   */
  removeSkinAndIsolateGarment(buffer, width, height, garmentColor = '') {
    const out = Buffer.from(buffer);
    const skinToneNames = ['nude', 'beige', 'tan', 'camel', 'peach', 'skin', 'flesh'];
    const isSkinColorFabric = skinToneNames.some((c) => (garmentColor || '').toLowerCase().includes(c));

    // If garment itself is not a skin-colored tone, remove skin pixels
    if (!isSkinColorFabric) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (out[idx + 3] < 30) continue;
          const r = out[idx];
          const g = out[idx + 1];
          const b = out[idx + 2];
          // Remove human skin or studio white background gap remnants
          if (this.isSkinPixel(r, g, b) || (r > 225 && g > 225 && b > 225)) {
            out[idx + 3] = 0;
          }
        }
      }
    }

    // Connected Component Analysis: keep only the main garment body (drops floating watch, detached wrist specks, etc.)
    const totalPixels = width * height;
    const visited = new Uint8Array(totalPixels);
    const components = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pIdx = y * width + x;
        if (visited[pIdx] || out[pIdx * 4 + 3] < 64) continue;

        const queue = [pIdx];
        visited[pIdx] = 1;
        const comp = [];
        let head = 0;

        while (head < queue.length) {
          const curr = queue[head++];
          comp.push(curr);
          const cy = Math.floor(curr / width);
          const cx = curr % width;
          const neighbors = [
            [cy - 1, cx],
            [cy + 1, cx],
            [cy, cx - 1],
            [cy, cx + 1],
          ];

          for (const [ny, nx] of neighbors) {
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const nIdx = ny * width + nx;
              if (!visited[nIdx] && out[nIdx * 4 + 3] >= 64) {
                visited[nIdx] = 1;
                queue.push(nIdx);
              }
            }
          }
        }
        components.push(comp);
      }
    }

    if (components.length > 0) {
      components.sort((a, b) => b.length - a.length);
      const largest = components[0];
      // Only keep the largest garment component if it represents a significant portion
      if (largest.length >= totalPixels * 0.08) {
        const mainMask = new Uint8Array(totalPixels);
        for (const p of largest) mainMask[p] = 1;
        for (let i = 0; i < totalPixels; i++) {
          if (!mainMask[i]) out[i * 4 + 3] = 0;
        }
      }
    }

    return out;
  }

  /**
   * Refines accessory & footwear cutouts: removes white halos/fringes via color decontamination,
   * suppresses faint alpha noise, and eliminates tiny disconnected shadow/background floaters.
   */
  cleanBoundaryEdges(buffer, width, height) {
    const out = Buffer.from(buffer);
    const total = width * height;

    // 1. Suppress faint background haze / alpha noise (< 32 out of 255)
    for (let i = 0; i < total * 4; i += 4) {
      if (out[i + 3] < 32) {
        out[i + 3] = 0;
      }
    }

    // 2. Color decontamination (Defringing): blend semi-transparent boundary pixels towards solid foreground
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const a = out[idx + 3];
        if (a >= 32 && a <= 220) {
          const neighbors = [
            ((y - 1) * width + x) * 4,
            ((y + 1) * width + x) * 4,
            (y * width + (x - 1)) * 4,
            (y * width + (x + 1)) * 4,
          ];
          let fgR = 0, fgG = 0, fgB = 0, fgCount = 0;
          for (const nIdx of neighbors) {
            if (out[nIdx + 3] > 220) {
              fgR += out[nIdx];
              fgG += out[nIdx + 1];
              fgB += out[nIdx + 2];
              fgCount++;
            }
          }
          if (fgCount > 0) {
            fgR = Math.round(fgR / fgCount);
            fgG = Math.round(fgG / fgCount);
            fgB = Math.round(fgB / fgCount);
            const blendRatio = 0.65;
            out[idx] = Math.round(out[idx] * (1 - blendRatio) + fgR * blendRatio);
            out[idx + 1] = Math.round(out[idx + 1] * (1 - blendRatio) + fgG * blendRatio);
            out[idx + 2] = Math.round(out[idx + 2] * (1 - blendRatio) + fgB * blendRatio);
          }
        }
      }
    }

    // 3. Remove tiny disconnected shadow specks and margin floaters (< 100 pixels)
    const visited = new Uint8Array(total);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pIdx = y * width + x;
        if (visited[pIdx] || out[pIdx * 4 + 3] < 35) continue;

        const queue = [pIdx];
        visited[pIdx] = 1;
        const comp = [];
        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          comp.push(curr);
          const cy = Math.floor(curr / width);
          const cx = curr % width;
          const nbrs = [
            [cy - 1, cx],
            [cy + 1, cx],
            [cy, cx - 1],
            [cy, cx + 1],
          ];
          for (const [ny, nx] of nbrs) {
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const nIdx = ny * width + nx;
              if (!visited[nIdx] && out[nIdx * 4 + 3] >= 35) {
                visited[nIdx] = 1;
                queue.push(nIdx);
              }
            }
          }
        }

        // Only prune small detached noise components, leaving valid paired items (e.g. shoes, earrings) untouched
        if (comp.length < Math.max(100, Math.round(total * 0.003))) {
          for (const p of comp) {
            out[p * 4 + 3] = 0;
          }
        }
      }
    }

    return out;
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
      excludeSkin = false,
      garmentColor = '',
      isAccessory = false,
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
    const outputUrl = formatUploadUrl(`/uploads/crops/segmented/${outputFilename}`);
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

      // For cloth garments: Boost fabric opacity for solid garment look (prevents faded/washed-out ghosting)
      // For accessories/footwear: Preserve smooth antialiased boundaries without harsh stair-step aliasing
      if (!isAccessory) {
        for (let i = 0; i < rawBytes.length; i += 4) {
          const a = rawBytes[i + 3];
          if (a > 64) {
            rawBytes[i + 3] = Math.min(255, Math.round(a * 1.15 + 20));
          }
        }
      }

      let finalBuffer = rawBytes;

      // Accessory & Footwear Defringing & Floater Pruning
      if (isAccessory) {
        finalBuffer = this.cleanBoundaryEdges(finalBuffer, width, height);
      }

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

      // 7. Men's Wear Skin Exclusion (removes bare neck, arms, hands and isolates pure garment)
      // STRICT: Never run on accessories or footwear (preserves tan leather, gold, brass, specular reflections)
      if (excludeSkin && !isAccessory) {
        try {
          finalBuffer = this.removeSkinAndIsolateGarment(finalBuffer, width, height, garmentColor);
        } catch (skinErr) {
          console.warn('[Segmentation] Skin exclusion fallback, keeping segmented cutout:', skinErr.message);
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
