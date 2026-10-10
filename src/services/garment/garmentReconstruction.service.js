const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const inpaintingService = require('../inpainting/inpainting.service');

const reconstructedCropsDir = path.join(__dirname, '../../../uploads/crops/reconstructed');
if (!fs.existsSync(reconstructedCropsDir)) {
  fs.mkdirSync(reconstructedCropsDir, { recursive: true });
}

/**
 * Garment Reconstruction & Inpainting Service (Stage D)
 * Reconstructs occluded fabric regions (e.g., where hands or arms covered the garment).
 * Preserves all original garment pixels and never hallucinates unverified details.
 */
class GarmentReconstructionService {
  /**
   * Reconstructs missing/occluded fabric regions in a garment cutout.
   * 
   * @param {Buffer|string} garmentImage Input transparent garment cutout
   * @param {Object} options Configuration options
   * @param {Buffer|string} [options.referenceImage=null] Original reference photo
   * @param {string} [options.garmentName='Garment'] Name/description of garment
   * @param {boolean} [options.protectCollar=true] Protect neck/collar opening
   * @param {number} [options.radius=22] Inpaint radius
   * @returns {Promise<{ success: boolean, buffer: Buffer, outputPath: string, outputUrl: string, status: string, isReconstructed: boolean, warnings: string[] }>}
   */
  async reconstructGarment(garmentImage, options = {}) {
    const {
      referenceImage = null,
      garmentName = 'Garment',
      protectCollar = true,
      radius = 22,
    } = options;

    const warnings = [];
    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;
    const outputFilename = `rec-${uniqueId}.webp`;
    const outputFilePath = path.join(reconstructedCropsDir, outputFilename);
    const outputUrl = `/uploads/crops/reconstructed/${outputFilename}`;

    let inputBuffer;
    if (typeof garmentImage === 'string') {
      inputBuffer = fs.readFileSync(garmentImage);
    } else {
      inputBuffer = garmentImage;
    }

    try {
      // 1. Run Local Content-Aware Inpainting (Fast, robust, local)
      const inpaintResult = await inpaintingService.inpaintGarment(inputBuffer, {
        radius,
        protectCollar,
        outputFormat: 'webp',
      });

      if (inpaintResult.hasInpainted && inpaintResult.inpaintedPixels > 0) {
        fs.writeFileSync(outputFilePath, inpaintResult.buffer);
        warnings.push(`AI reconstructed ${inpaintResult.inpaintedPixels} occluded fabric pixels using surrounding fabric texture.`);

        return {
          success: true,
          buffer: inpaintResult.buffer,
          outputPath: outputFilePath,
          outputUrl,
          status: 'INPAINTED_LOCAL',
          isReconstructed: true,
          warnings,
        };
      }

      // No inpainting was required (fabric had no holes/occlusions)
      fs.writeFileSync(outputFilePath, inputBuffer);
      return {
        success: true,
        buffer: inputBuffer,
        outputPath: outputFilePath,
        outputUrl,
        status: 'SKIPPED_NOT_NEEDED',
        isReconstructed: false,
        warnings: [],
      };
    } catch (err) {
      console.warn('[GarmentReconstruction] Reconstruction fallback to raw cutout:', err.message);
      fs.writeFileSync(outputFilePath, inputBuffer);

      return {
        success: true,
        buffer: inputBuffer,
        outputPath: outputFilePath,
        outputUrl,
        status: 'UNAVAILABLE',
        isReconstructed: false,
        warnings: ['Advanced generative reconstruction unavailable; original high-resolution cutout preserved.'],
      };
    }
  }
}

module.exports = new GarmentReconstructionService();
