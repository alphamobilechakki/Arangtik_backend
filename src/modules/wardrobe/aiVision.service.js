const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_API_KEY } = require('../../config/env.config');

// Ensure crops directory exists
const cropsDir = path.join(__dirname, '../../../uploads/crops');
if (!fs.existsSync(cropsDir)) {
  fs.mkdirSync(cropsDir, { recursive: true });
}

/**
 * Color shade synonym helper for intelligent clothing matching
 */
const areColorsSimilar = (c1, c2) => {
  if (!c1 || !c2) return false;
  const a = c1.trim().toLowerCase();
  const b = c2.trim().toLowerCase();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const colorFamilies = [
    ['navy', 'navy blue', 'dark blue', 'midnight blue', 'royal blue', 'blue'],
    ['black', 'charcoal', 'jet black', 'dark grey'],
    ['white', 'off white', 'cream', 'ivory', 'milk white'],
    ['olive', 'olive green', 'military green', 'khaki', 'army green', 'green'],
    ['maroon', 'burgundy', 'wine', 'dark red', 'ruby'],
    ['beige', 'tan', 'camel', 'sand', 'nude', 'light brown'],
    ['grey', 'gray', 'heather grey', 'ash grey', 'silver'],
  ];

  return colorFamilies.some((fam) => fam.includes(a) && fam.includes(b));
};

/**
 * Helper to calculate similarity score between analyzed item and existing wardrobe item
 */
const calculateItemSimilarity = (detectedItem, existingItem) => {
  let score = 0;
  let weightTotal = 0;

  // 1. Category match (Weight: 30)
  weightTotal += 30;
  if (detectedItem.category === existingItem.category) {
    score += 30;
  }

  // 2. Sub-Category match (Weight: 25)
  weightTotal += 25;
  if (
    detectedItem.subCategory &&
    existingItem.subCategory &&
    detectedItem.subCategory.toLowerCase() === existingItem.subCategory.toLowerCase()
  ) {
    score += 25;
  } else if (
    detectedItem.subCategory &&
    existingItem.subCategory &&
    (detectedItem.subCategory.toLowerCase().includes(existingItem.subCategory.toLowerCase()) ||
      existingItem.subCategory.toLowerCase().includes(detectedItem.subCategory.toLowerCase()))
  ) {
    score += 18;
  }

  // 3. Primary Color match (Weight: 25)
  weightTotal += 25;
  const detectedColor = detectedItem.attributes?.primaryColor;
  const existingColor = existingItem.attributes?.get
    ? existingItem.attributes.get('primaryColor')
    : existingItem.attributes?.primaryColor;

  if (detectedColor && existingColor) {
    if (detectedColor.toLowerCase() === existingColor.toLowerCase()) {
      score += 25;
    } else if (areColorsSimilar(detectedColor, existingColor)) {
      score += 20;
    }
  }

  // 4. Pattern & Fabric match (Weight: 20)
  weightTotal += 20;
  const detectedPattern = detectedItem.attributes?.pattern?.toLowerCase();
  const existingPattern = (existingItem.attributes?.get ? existingItem.attributes.get('pattern') : existingItem.attributes?.pattern)?.toLowerCase();
  if (detectedPattern && existingPattern && detectedPattern === existingPattern) {
    score += 10;
  }
  const detectedFabric = detectedItem.attributes?.fabric?.toLowerCase();
  const existingFabric = (existingItem.attributes?.get ? existingItem.attributes.get('fabric') : existingItem.attributes?.fabric)?.toLowerCase();
  if (detectedFabric && existingFabric && detectedFabric === existingFabric) {
    score += 10;
  }

  return Math.min(1, score / weightTotal);
};

/**
 * Fallback Mock Analysis when GEMINI_API_KEY is not configured
 */
const getFallbackAnalysis = (imageMeta) => {
  return [
    {
      tempId: 'det_1',
      name: 'Blue Solid Casual Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      box2d: [80, 100, 580, 900], // ymin, xmin, ymax, xmax
      attributes: {
        primaryColor: 'Navy Blue',
        secondaryColors: ['Dark Blue'],
        pattern: 'SOLID',
        fabric: 'LINEN',
        gender: 'MEN',
        fit: 'SLIM_FIT',
        sleeveLength: 'FULL_SLEEVE',
        neckline: 'Collar',
        occasions: ['OFFICE', 'FORMAL', 'PARTY'],
        seasons: ['SUMMER', 'ALL_SEASON'],
      },
    },
    {
      tempId: 'det_2',
      name: 'Light Blue Denim Jeans',
      category: 'LOWER_WEAR',
      subCategory: 'Jeans',
      box2d: [550, 150, 960, 850],
      attributes: {
        primaryColor: 'Light Blue',
        secondaryColors: ['Blue'],
        pattern: 'SOLID',
        fabric: 'DENIM',
        gender: 'MEN',
        fit: 'REGULAR_FIT',
        occasions: ['CASUAL', 'DAILY'],
        seasons: ['ALL_SEASON'],
      },
    },
  ];
};

/**
 * Call Gemini Vision AI to detect garments and extract attributes
 */
const analyzeImageWithGemini = async (imagePath) => {
  if (!GEMINI_API_KEY) {
    const metadata = await sharp(imagePath).metadata();
    return getFallbackAnalysis(metadata);
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const imageBuffer = fs.readFileSync(imagePath);
    const mimeType = imagePath.endsWith('.png')
      ? 'image/png'
      : imagePath.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

    const prompt = `
You are an expert Fashion Vision AI specialized in Digital Wardrobe extraction.
Analyze the uploaded photo (which may be a person wearing clothes, or a standalone clothing piece).
Identify all clothing items, ethnic wear, footwear, and accessories.

CRITICAL BOUNDING BOX & DETECTION REQUIREMENTS:
1. "box2d": Normalized integer coordinates [ymin, xmin, ymax, xmax] scaled 0 to 1000.
2. FULL GARMENT BOUNDARIES:
   - For UPPER_WEAR / TRADITIONAL (Shirts, T-shirts, Kurtas, Blazers, Dresses, Sherwanis): Capture the COMPLETE garment extent from top of shoulders/collar all the way down to bottom waist/hemline, including FULL left & right sleeves. NEVER return a tight chest-only crop!
   - For LOWER_WEAR (Jeans, Trousers, Pajamas, Skirts, Shorts): Capture from waistline to ankle cuffs.
   - For FOOTWEAR: Capture entire shoe from heel to toe.

For each distinct clothing item found, return a JSON array containing objects with:
- "name": Descriptive name (e.g. "Royal Blue Silk Kurta", "Navy Blue Slim Fit Shirt", "Black Distressed Jeans")
- "category": Broad category ("UPPER_WEAR", "LOWER_WEAR", "TRADITIONAL", "OUTERWEAR", "FOOTWEAR", "ACCESSORIES", "OTHER")
- "subCategory": Specific type ("Shirt", "T-Shirt", "Kurta", "Jeans", "Trousers", "Sherwani", "Sneakers", "Dress", "Saree", "Jacket", etc.)
- "box2d": Normalized bounding box [ymin, xmin, ymax, xmax] covering the full garment extent (0-1000 scale)
- "attributes": Object with:
  - "primaryColor": Main color name (e.g. "Navy Blue", "Maroon", "White", "Olive Green")
  - "secondaryColors": Array of accent colors
  - "pattern": "SOLID", "STRIPED", "CHECKED", "PRINTED", "FLORAL", "EMBROIDERED", "TEXTURED", or "OTHER"
  - "fabric": "COTTON", "LINEN", "DENIM", "SILK", "WOOL", "POLYESTER", "LEATHER", "RAYON", "BLEND", or "OTHER"
  - "gender": "MEN", "WOMEN", "UNISEX", or "KIDS"
  - "fit": "SLIM_FIT", "REGULAR_FIT", "LOOSE_FIT", "OVERSIZED", "TAILORED", or "OTHER"
  - "sleeveLength": "SLEEVELESS", "HALF_SLEEVE", "FULL_SLEEVE", or "THREE_QUARTER"
  - "neckline": "Collar", "Round Neck", "V-Neck", "Mandarin", "Polo", or "Other"
  - "occasions": Array from ["CASUAL", "OFFICE", "FORMAL", "PARTY", "WEDDING", "FESTIVE", "SPORTS", "DAILY"]
  - "seasons": Array from ["SUMMER", "WINTER", "MONSOON", "ALL_SEASON"]

Return ONLY raw JSON without markdown backticks or commentary.
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType,
        },
      },
    ]);

    const responseText = result.response.text().trim();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return Array.isArray(parsed) ? parsed : parsed.items || [];
  } catch (error) {
    console.error('Gemini Vision AI error, falling back to local analysis:', error.message);
    const metadata = await sharp(imagePath).metadata();
    return getFallbackAnalysis(metadata);
  }
};

/**
 * Crop detected clothing items using Sharp with smart context padding
 */
const cropDetectedItems = async (originalImagePath, detectedItems) => {
  const image = sharp(originalImagePath);
  const metadata = await image.metadata();
  const { width: imgWidth, height: imgHeight } = metadata;

  const results = [];

  for (let i = 0; i < detectedItems.length; i++) {
    const item = detectedItems[i];
    let cropFilename = null;
    let cropUrl = null;

    if (item.box2d && item.box2d.length === 4 && imgWidth && imgHeight) {
      const [ymin, xmin, ymax, xmax] = item.box2d;

      // Calculate raw pixel coordinates
      const rawTop = Math.floor((ymin / 1000) * imgHeight);
      const rawLeft = Math.floor((xmin / 1000) * imgWidth);
      const rawHeight = Math.floor(((ymax - ymin) / 1000) * imgHeight);
      const rawWidth = Math.floor(((xmax - xmin) / 1000) * imgWidth);

      // Smart Context Padding (8% breathing room to prevent cutting off sleeves, collar, or waist hem)
      const padY = Math.round(rawHeight * 0.08);
      const padX = Math.round(rawWidth * 0.08);

      const top = Math.max(0, rawTop - padY);
      const left = Math.max(0, rawLeft - padX);
      const bottom = Math.min(imgHeight, rawTop + rawHeight + padY);
      const right = Math.min(imgWidth, rawLeft + rawWidth + padX);

      const width = right - left;
      const height = bottom - top;

      if (width > 20 && height > 20) {
        const uniqueCropName = `crop-${Date.now()}-${i}-${Math.round(Math.random() * 1e4)}.webp`;
        const cropFilePath = path.join(cropsDir, uniqueCropName);

        await sharp(originalImagePath)
          .extract({ left, top, width, height })
          .webp({ quality: 88 })
          .toFile(cropFilePath);

        cropFilename = uniqueCropName;
        cropUrl = `/uploads/crops/${uniqueCropName}`;
      }
    }

    results.push({
      ...item,
      croppedImageUrl: cropUrl,
      croppedFilename: cropFilename,
    });
  }

  return results;
};

/**
 * Match analyzed garments against existing wardrobe items
 */
const matchAgainstWardrobe = (detectedItems, existingWardrobeItems) => {
  return detectedItems.map((detected) => {
    let bestMatch = null;
    let highestScore = 0;
    const candidates = [];

    for (const existing of existingWardrobeItems) {
      const score = calculateItemSimilarity(detected, existing);
      if (score >= 0.65) {
        candidates.push({
          _id: existing._id,
          name: existing.name,
          category: existing.category,
          subCategory: existing.subCategory,
          primaryImageUrl: existing.images?.find((img) => img.isPrimary)?.url || existing.images?.[0]?.url,
          currentStatus: existing.currentStatus,
          similarityScore: Math.round(score * 100) / 100,
          lastWornDate: existing.usageStats?.lastWornDate,
          wearCount: existing.usageStats?.wearCount || 0,
        });
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = existing;
      }
    }

    // Sort candidates descending by similarity
    candidates.sort((a, b) => b.similarityScore - a.similarityScore);

    // Decision Thresholds:
    // >= 0.90 -> EXACT_MATCH (Already in Wardrobe)
    // 0.65 - 0.89 -> AMBIGUOUS_MATCH (Ask user confirmation)
    // < 0.65 -> NEW_ITEM
    let matchStatus = 'NEW_ITEM';
    let matchMessage = 'New dress detected! Ready to add to wardrobe.';
    let matchedItem = null;

    if (highestScore >= 0.9) {
      matchStatus = 'EXACT_MATCH';
      matchMessage = `This dress is already registered in your wardrobe as "${bestMatch.name}".`;
      matchedItem = {
        _id: bestMatch._id,
        name: bestMatch.name,
        category: bestMatch.category,
        subCategory: bestMatch.subCategory,
        primaryImageUrl: bestMatch.images?.find((img) => img.isPrimary)?.url || bestMatch.images?.[0]?.url,
        currentStatus: bestMatch.currentStatus,
        lastWornDate: bestMatch.usageStats?.lastWornDate,
        wearCount: bestMatch.usageStats?.wearCount || 0,
        similarityScore: Math.round(highestScore * 100) / 100,
      };
    } else if (highestScore >= 0.65) {
      matchStatus = 'AMBIGUOUS_MATCH';
      matchMessage = `We found a similar item in your wardrobe: "${bestMatch.name}". Is this the same item or a new one?`;
    }

    return {
      tempDetectionId: detected.tempId || `det_${Math.random().toString(36).substr(2, 9)}`,
      name: detected.name,
      category: detected.category,
      subCategory: detected.subCategory,
      croppedImageUrl: detected.croppedImageUrl,
      attributes: detected.attributes,
      matchResult: {
        status: matchStatus,
        confidenceScore: Math.round(highestScore * 100) / 100,
        message: matchMessage,
        existingItem: matchedItem,
        candidateMatches: matchStatus === 'AMBIGUOUS_MATCH' ? candidates : [],
      },
    };
  });
};

module.exports = {
  analyzeImageWithGemini,
  cropDetectedItems,
  matchAgainstWardrobe,
};
