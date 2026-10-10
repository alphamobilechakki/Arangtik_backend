const sharp = require('sharp');
const fs = require('fs');

/**
 * Intelligent Garment Inpainting & Occlusion-Fill Service
 * Automatically detects and fills missing fabric patches, notches, and holes caused by
 * occluding hands, fingers, arms, accessories, or background cutouts.
 */
class InpaintingService {
  /**
   * Inpaints holes and boundary notches in a segmented garment image.
   * 
   * @param {Buffer|string} input Image Buffer or file path
   * @param {Object} options Inpainting configuration
   * @param {number} [options.radius=22] Radius for morphological closing (in pixels)
   * @param {boolean} [options.protectCollar=true] Prevent closing the natural neck collar opening
   * @param {string} [options.outputFormat='webp'] Output image format ('webp' | 'png')
   * @returns {Promise<{ buffer: Buffer, inpaintedPixels: number, hasInpainted: boolean }>}
   */
  async inpaintGarment(input, options = {}) {
    const {
      radius = 22,
      protectCollar = true,
      outputFormat = 'webp',
    } = options;

    let inputBuffer;
    if (typeof input === 'string') {
      if (!fs.existsSync(input)) {
        throw new Error(`Inpainting input file not found: ${input}`);
      }
      inputBuffer = fs.readFileSync(input);
    } else if (Buffer.isBuffer(input)) {
      inputBuffer = input;
    } else {
      throw new Error('Inpainting input must be a valid Buffer or file path');
    }

    const { data: rawBytes, info } = await sharp(inputBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const totalPixels = width * height;

    // 1. Binary garment mask: 1 = fabric (alpha >= 128), 0 = transparent background
    const mask = new Uint8Array(totalPixels);
    let opaqueCount = 0;
    for (let i = 0; i < totalPixels; i++) {
      if (rawBytes[i * channels + 3] >= 128) {
        mask[i] = 1;
        opaqueCount++;
      }
    }

    // If image has virtually no fabric (< 3% pixels), skip inpainting safely
    if (opaqueCount < totalPixels * 0.03) {
      return {
        buffer: inputBuffer,
        inpaintedPixels: 0,
        hasInpainted: false,
      };
    }

    const R = Math.max(8, Math.min(45, radius));
    const step = 2; // Fast sampling step for performance

    // 2. Morphological Dilation
    const dilated = new Uint8Array(totalPixels);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let found = false;
        for (let dy = -R; dy <= R && !found; dy += step) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          const maxDx = Math.floor(Math.sqrt(Math.max(0, R * R - dy * dy)));
          for (let dx = -maxDx; dx <= maxDx; dx += step) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            if (mask[ny * width + nx] === 1) {
              dilated[y * width + x] = 1;
              found = true;
              break;
            }
          }
        }
      }
    }

    // 3. Morphological Erosion (to complete Morphological Closing: Dilate -> Erode)
    const closed = new Uint8Array(totalPixels);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let allOnes = true;
        for (let dy = -R; dy <= R && allOnes; dy += step) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) {
            allOnes = false;
            break;
          }
          const maxDx = Math.floor(Math.sqrt(Math.max(0, R * R - dy * dy)));
          for (let dx = -maxDx; dx <= maxDx; dx += step) {
            const nx = x + dx;
            if (nx < 0 || nx >= width || dilated[ny * width + nx] === 0) {
              allOnes = false;
              break;
            }
          }
        }
        closed[y * width + x] = allOnes ? 1 : 0;
      }
    }

    // 4. Identify Target Hole & Notch Pixels (closed === 1 && mask === 0)
    const toInpaint = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        // Collar opening protection: don't fill the central neck/collar opening
        if (protectCollar && y < height * 0.22 && x > width * 0.25 && x < width * 0.75) {
          continue;
        }

        if (closed[idx] === 1 && mask[idx] === 0) {
          toInpaint.push({ x, y, idx });
        }
      }
    }

    if (toInpaint.length === 0) {
      return {
        buffer: inputBuffer,
        inpaintedPixels: 0,
        hasInpainted: false,
      };
    }

    // 5. Inpaint Missing Pixels with Distance-Weighted Fabric Neighborhood Blending
    const inpaintedBytes = Buffer.from(rawBytes);
    const searchRadius = R * 2;

    for (const { x, y, idx } of toInpaint) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumWeight = 0;

      for (let dy = -searchRadius; dy <= searchRadius; dy += 3) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -searchRadius; dx <= searchRadius; dx += 3) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const nIdx = ny * width + nx;
          if (mask[nIdx] === 1) {
            const distSq = dx * dx + dy * dy;
            if (distSq === 0) continue;
            const weight = 1 / Math.pow(distSq, 1.25);
            const p = nIdx * channels;
            sumR += inpaintedBytes[p] * weight;
            sumG += inpaintedBytes[p + 1] * weight;
            sumB += inpaintedBytes[p + 2] * weight;
            sumWeight += weight;
          }
        }
      }

      if (sumWeight > 0) {
        const p = idx * channels;
        inpaintedBytes[p] = Math.round(sumR / sumWeight);
        inpaintedBytes[p + 1] = Math.round(sumG / sumWeight);
        inpaintedBytes[p + 2] = Math.round(sumB / sumWeight);
        inpaintedBytes[p + 3] = 255; // Restore opacity to seamless fabric
      }
    }

    let outputBuffer;
    if (outputFormat === 'png') {
      outputBuffer = await sharp(inpaintedBytes, { raw: { width, height, channels } })
        .png()
        .toBuffer();
    } else {
      outputBuffer = await sharp(inpaintedBytes, { raw: { width, height, channels } })
        .webp({ quality: 95 })
        .toBuffer();
    }

    return {
      buffer: outputBuffer,
      inpaintedPixels: toInpaint.length,
      hasInpainted: true,
    };
  }
}

module.exports = new InpaintingService();
