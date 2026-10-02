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
 * Helper to safely extract attribute value from Mongoose Map or plain object
 */
const getAttr = (item, key) => {
  if (!item) return undefined;
  const attrs = item.attributes;
  if (!attrs) return undefined;
  if (typeof attrs.get === 'function') return attrs.get(key);
  return attrs[key];
};

/**
 * Granular Color shade synonym helper for intelligent clothing matching
 */
const areColorsSimilar = (c1, c2) => {
  if (!c1 || !c2) return false;
  const a = c1.trim().toLowerCase();
  const b = c2.trim().toLowerCase();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const colorFamilies = [
    // Blues
    ['navy', 'navy blue', 'dark blue', 'midnight blue', 'royal blue', 'blue', 'sapphire', 'cobalt', 'cyan', 'sky blue', 'ice blue', 'indigo', 'powder blue', 'teal', 'turquoise'],
    // Reds & Pinks
    ['red', 'crimson', 'ruby', 'cherry', 'magenta', 'fuchsia', 'hot pink', 'baby pink', 'blush', 'rose', 'rose gold', 'coral', 'peach', 'salmon', 'pink'],
    // Maroons & Wines
    ['maroon', 'burgundy', 'wine', 'dark red', 'ruby', 'berry', 'plum', 'oxblood'],
    // Greens
    ['olive', 'olive green', 'military green', 'khaki', 'army green', 'green', 'emerald', 'mint', 'sage', 'bottle green', 'forest green', 'lime', 'pistachio', 'jade'],
    // Yellows & Golds
    ['yellow', 'mustard', 'lemon', 'canary', 'gold', 'antique gold', 'metallic gold', 'champagne', 'amber', 'rose gold'],
    // Purples & Lilacs
    ['purple', 'violet', 'lavender', 'lilac', 'mauve', 'eggplant', 'orchid'],
    // Whites & Neutrals
    ['white', 'off white', 'cream', 'ivory', 'milk white', 'beige', 'tan', 'camel', 'sand', 'nude', 'light brown', 'taupe'],
    // Blacks & Greys
    ['black', 'charcoal', 'jet black', 'dark grey', 'grey', 'gray', 'heather grey', 'ash grey', 'silver', 'metallic silver', 'slate'],
    // Oranges & Browns
    ['orange', 'rust', 'copper', 'terracotta', 'burnt orange', 'tangerine', 'brown', 'chocolate'],
  ];

  return colorFamilies.some((fam) => fam.includes(a) && fam.includes(b));
};

/**
 * Multi-Dimensional Similarity Engine between analyzed item and existing wardrobe item
 */
const calculateItemSimilarity = (detectedItem, existingItem) => {
  let score = 0;
  let weightTotal = 0;

  // 1. Broad Category Match (Weight: 15)
  weightTotal += 15;
  if (detectedItem.category === existingItem.category) {
    score += 15;
  } else if (
    (detectedItem.category === 'TRADITIONAL' && existingItem.category === 'UPPER_WEAR') ||
    (detectedItem.category === 'UPPER_WEAR' && existingItem.category === 'TRADITIONAL')
  ) {
    score += 10;
  }

  // 2. Specific Sub-Category Match (Weight: 15)
  weightTotal += 15;
  const detSub = (detectedItem.subCategory || '').toLowerCase();
  const existSub = (existingItem.subCategory || '').toLowerCase();
  if (detSub && existSub) {
    if (detSub === existSub) {
      score += 15;
    } else if (detSub.includes(existSub) || existSub.includes(detSub)) {
      score += 12;
    }
  }

  // 3. Color & Theme Match (Weight: 25)
  weightTotal += 25;
  const detColor = (getAttr(detectedItem, 'primaryColor') || '').toLowerCase();
  const existColor = (getAttr(existingItem, 'primaryColor') || '').toLowerCase();

  if (detColor && existColor) {
    if (detColor === existColor) {
      score += 25;
    } else if (areColorsSimilar(detColor, existColor)) {
      score += 20;
    }
  }

  // 4. Design Pattern & Embellishments / Work Match (Weight: 15)
  weightTotal += 15;
  const detPattern = (getAttr(detectedItem, 'designPattern') || getAttr(detectedItem, 'pattern') || '').toLowerCase();
  const existPattern = (getAttr(existingItem, 'designPattern') || getAttr(existingItem, 'pattern') || '').toLowerCase();
  if (detPattern && existPattern) {
    if (detPattern === existPattern) {
      score += 15;
    } else if (
      (detPattern.includes('embellish') && existPattern.includes('sequin')) ||
      (detPattern.includes('sequin') && existPattern.includes('embellish')) ||
      (detPattern.includes('zari') && existPattern.includes('embroider')) ||
      (detPattern.includes('embroider') && existPattern.includes('zari'))
    ) {
      score += 11;
    }
  }

  // 5. Fabric & Texture Match (Weight: 15)
  weightTotal += 15;
  const detFabric = (getAttr(detectedItem, 'fabric') || '').toLowerCase();
  const existFabric = (getAttr(existingItem, 'fabric') || '').toLowerCase();
  if (detFabric && existFabric && (detFabric === existFabric || detFabric.includes(existFabric) || existFabric.includes(detFabric))) {
    score += 10;
  }
  const detTex = (getAttr(detectedItem, 'fabricTexture') || '').toLowerCase();
  const existTex = (getAttr(existingItem, 'fabricTexture') || '').toLowerCase();
  if (detTex && existTex && detTex === existTex) {
    score += 5;
  }

  // 6. Silhouette & Fit Match (Weight: 10)
  weightTotal += 10;
  const detSil = (getAttr(detectedItem, 'silhouette') || getAttr(detectedItem, 'fit') || '').toLowerCase();
  const existSil = (getAttr(existingItem, 'silhouette') || getAttr(existingItem, 'fit') || '').toLowerCase();
  if (detSil && existSil && (detSil === existSil || detSil.includes(existSil) || existSil.includes(detSil))) {
    score += 10;
  }

  // 7. Neckline & Sleeve Style (Weight: 5)
  weightTotal += 5;
  const detNeck = (getAttr(detectedItem, 'neckline') || '').toLowerCase();
  const existNeck = (getAttr(existingItem, 'neckline') || '').toLowerCase();
  if (detNeck && existNeck && detNeck === existNeck) {
    score += 5;
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
 * Supported Gemini Vision Models in priority order (with auto-fallback on quota/spikes)
 */
const VISION_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

/**
 * Call Gemini Vision AI to detect garments and extract attributes specifically for the matched user
 */
const analyzeImageWithGemini = async (imagePath, userFaceBoxes = []) => {
  const metadata = await sharp(imagePath).metadata();
  const { width: imgWidth, height: imgHeight } = metadata;

  if (!GEMINI_API_KEY) {
    return getFallbackAnalysis(metadata);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const mimeType = imagePath.endsWith('.png')
    ? 'image/png'
    : imagePath.endsWith('.webp')
    ? 'image/webp'
    : 'image/jpeg';

  // Normalize face boxes to 0-1000 scale
  const normalizedFaceBoxes = (userFaceBoxes || [])
    .map((box) => {
      if (!box) return null;
      const x = box.x ?? box._x ?? 0;
      const y = box.y ?? box._y ?? 0;
      const w = box.width ?? box._width ?? 0;
      const h = box.height ?? box._height ?? 0;
      if (!imgWidth || !imgHeight) return null;
      return [
        Math.max(0, Math.floor((y / imgHeight) * 1000)),
        Math.max(0, Math.floor((x / imgWidth) * 1000)),
        Math.min(1000, Math.ceil(((y + h) / imgHeight) * 1000)),
        Math.min(1000, Math.ceil(((x + w) / imgWidth) * 1000)),
      ];
    })
    .filter(Boolean);

  let userFaceContext = '';
  if (normalizedFaceBoxes.length > 0) {
    userFaceContext = `
TARGET PERSON IDENTIFICATION:
The authenticated user's face has been verified at the following normalized bounding box coordinates [ymin, xmin, ymax, xmax] (0-1000 scale):
${JSON.stringify(normalizedFaceBoxes)}

CRITICAL MULTI-PERSON / GROUP PHOTO INSTRUCTION:
- ONLY detect and extract the clothing articles worn by the target user identified above (located directly below their face coordinates).
- STRICTLY IGNORE and DO NOT return clothes worn by other people, friends, or strangers standing next to or around the target user!
`;
  }

  const prompt = `
You are an expert World-Class Haute Couture & Fashion Vision AI specialized in Ultra-Granular Digital Wardrobe Extraction & Garment Re-identification.
Analyze the uploaded image (which may contain multiple dresses on mannequins/hangers, single garments, showroom displays, or people wearing clothes).
Identify EVERY distinct wearable clothing item, gown, dress, ethnic wear, footwear, or accessory present.
${userFaceContext}
CRITICAL INSTRUCTIONS FOR MULTIPLE DRESSES / MANNEQUINS / RACKS:
- If there are multiple garments/gowns side-by-side (e.g. 2, 3 or more dresses on mannequins or showroom display), extract EACH individual dress as a separate item in the JSON array!
- For full-length dresses, gowns, anarkalis, frocks, sarees, lehengas, sherwanis, suits:
  * Category: "TRADITIONAL" or "UPPER_WEAR"
  * SubCategory: "Gown", "Evening Gown", "Dress", "Maxi Dress", "Anarkali", "Saree", "Lehenga", "Sherwani", "Kurta", "Shirt", "Jeans", "Blazer", etc.
  * Bounding box [ymin, xmin, ymax, xmax] (0 to 1000 scale):
    - ymin: Top straps/shoulders/collar neckline of that specific dress (do NOT include mannequin neck/head/cap).
    - ymax: Complete bottom hemline, skirt flare, or train reaching down to the floor.
    - xmin & xmax: Exact horizontal fabric boundaries of that dress (including flared skirts/trains), without cutting into neighboring garments.

CRITICAL NEGATIVE FILTER (STRICT):
- NEVER detect or crop human faces, bare skin, necks, mannequin heads/stands, or background furniture as items!
- ONLY detect physical wearable fabric clothing.

For each distinct item found, return a JSON array containing objects with:
- "name": Highly descriptive, elegant fashion title (e.g. "Royal Blue Beaded Deep-Plunge Tulle Gown", "Magenta Glossy Satin Sweetheart Flare Gown", "Rose Gold Sequin Mermaid Trumpet Gown", "Midnight Navy Blue Slim Fit Linen Shirt")
- "category": Broad category ("UPPER_WEAR", "LOWER_WEAR", "TRADITIONAL", "OUTERWEAR", "FOOTWEAR", "ACCESSORIES", "OTHER")
- "subCategory": Specific garment type ("Evening Gown", "Gown", "Dress", "Shirt", "T-Shirt", "Kurta", "Jeans", "Trousers", "Sherwani", "Sneakers", "Saree", "Jacket", etc.)
- "box2d": Normalized bounding box [ymin, xmin, ymax, xmax] (0-1000 scale) covering the exact full garment.
- "attributes": Object with:
  - "primaryColor": Dominant color shade (e.g. "Royal Blue", "Magenta", "Rose Gold", "Emerald Green", "Midnight Navy", "Ruby Red", "Ivory White", "Champagne Gold")
  - "secondaryColors": Array of accent/contrast shades (e.g. ["Ice Blue", "Navy Blue"], ["Silver", "Blush Pink"])
  - "colorTheme": "MONOCHROMATIC" | "DUAL_TONE" | "PASTEL" | "JEWEL_TONE" | "METALLIC" | "OMBRE" | "EARTHY" | "MULTICOLOR"
  - "designPattern": "SOLID" | "EMBELLISHED_BEADED" | "SEQUINED" | "ZARI_WORK" | "EMBROIDERED" | "CHIKANKARI" | "MIRROR_WORK" | "FLORAL_PRINT" | "GEOMETRIC_PRINT" | "STRIPED" | "CHECKED" | "TEXTURED"
  - "pattern": "EMBELLISHED" | "SEQUINED" | "SOLID" | "EMBROIDERED" | "PRINTED"
  - "fabric": "SATIN" | "SILK" | "NET_TULLE" | "VELVET" | "ORGANZA" | "GEORGETTE" | "CHIFFON" | "COTTON" | "LINEN" | "DENIM" | "CREPE" | "BROCADE" | "BLEND" | "OTHER"
  - "fabricTexture": "GLOSSY_SHEEN" | "MATTE" | "GLITTER_SPARKLE" | "EMBOSSED" | "CRINKLED" | "SMOOTH"
  - "silhouette": "A_LINE" | "MERMAID_TRUMPET" | "BALL_GOWN" | "STRAIGHT_SHEATH" | "FIT_AND_FLARE" | "BODYCON" | "ANARKALI" | "EMPIRE_WAIST" | "SLIM_FIT" | "REGULAR_FIT"
  - "fit": "FLARE" | "MERMAID" | "A_LINE" | "SLIM_FIT" | "REGULAR_FIT" | "LOOSE_FIT"
  - "dressLength": "FLOOR_LENGTH" | "MAXI" | "TRAIN_EXTENDED" | "MIDI" | "KNEE_LENGTH" | "MINI" | "STANDARD"
  - "neckline": "Sweetheart" | "Deep V-Neck" | "V-Neck" | "Sleeveless" | "Strapless" | "Off-Shoulder" | "Square" | "Halter" | "Boat Neck" | "Mandarin" | "Collar" | "Round Neck" | "Other"
  - "sleeveStyle": "SLEEVELESS" | "SPAGHETTI_STRAPS" | "CAP_SLEEVE" | "HALF_SLEEVE" | "FULL_SLEEVE" | "OFF_SHOULDER" | "THREE_QUARTER"
  - "workPlacement": "BODICE_AND_FLARE" | "BODICE_ONLY" | "ALL_OVER" | "BORDER_HEM_ONLY" | "MINIMAL_CLEAN"
  - "styleAesthetic": "ROYAL_BRIDAL" | "EVENING_COCKTAIL" | "RED_CARPET" | "TRADITIONAL_FESTIVE" | "MODERN_CHIC" | "MINIMALIST_FORMAL" | "CASUAL_CHIC"
  - "gender": "WOMEN" | "MEN" | "UNISEX" | "KIDS"
  - "occasions": Array from ["WEDDING", "RECEPTION", "PARTY", "RED_CARPET", "FESTIVE", "FORMAL", "CASUAL", "OFFICE", "DAILY"]
  - "seasons": Array from ["ALL_SEASON", "SUMMER", "WINTER", "MONSOON"]

Return ONLY raw JSON without markdown backticks or commentary.
`;

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  let rawList = [];
  let lastError = null;

  // Multi-Model Cascade: Try working models in priority order
  for (const modelName of VISION_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
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
      rawList = Array.isArray(parsed) ? parsed : parsed.items || [];
      console.log(`[aiVision] Successfully analyzed image with model: ${modelName} (${rawList.length} items found)`);
      lastError = null;
      break;
    } catch (err) {
      console.warn(`[aiVision] Model ${modelName} attempt failed (${err.message.slice(0, 100)}), cascading to next model...`);
      lastError = err;
    }
  }

  if (lastError && rawList.length === 0) {
    console.error('[aiVision] All Gemini Vision models failed or quota exceeded:', lastError.message);
    return getFallbackAnalysis(metadata);
  }

  // STRICT NON-GARMENT / FACE POST-FILTER (Whole word matching to avoid false positives like "v-neck" or "bodycon")
  const nonGarmentRegex = /\b(face|chin|beard|hair|human head|human face|bare skin|mannequin stand|dummy stand)\b/i;
  return rawList.filter((item) => {
    const name = (item.name || '').toLowerCase();
    const sub = (item.subCategory || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();

    // Filter out non-garment body parts
    if (nonGarmentRegex.test(name) || nonGarmentRegex.test(sub)) {
      return false;
    }
    if (cat === 'other' && !item.attributes?.primaryColor) {
      return false;
    }

    // Check minimum dimensions (skip tiny false crops)
    if (item.box2d && item.box2d.length === 4) {
      const [ymin, xmin, ymax, xmax] = item.box2d;
      const height = ymax - ymin;
      const width = xmax - xmin;
      if (height < 50 || width < 40) return false;

      // If target user face coordinates are known, ensure garment is horizontally aligned with the user
      if (normalizedFaceBoxes.length > 0) {
        const isAlignedWithAnyUser = normalizedFaceBoxes.some(([fYmin, fXmin, fYmax, fXmax]) => {
          const faceCenterX = (fXmin + fXmax) / 2;
          const garmentCenterX = (xmin + xmax) / 2;
          const maxHorizontalOffset = Math.max(250, (fXmax - fXmin) * 2.5);
          return Math.abs(faceCenterX - garmentCenterX) <= maxHorizontalOffset && ymax >= fYmin;
        });
        if (!isAlignedWithAnyUser) {
          console.log(`[aiVision] Discarding garment "${item.name}" as it belongs to another person in the group photo.`);
          return false;
        }
      }
    }

    return true;
  });
};

/**
 * Crop detected clothing items using Sharp with precision bounds
 */
const cropDetectedItems = async (originalImagePath, detectedItems) => {
  const image = sharp(originalImagePath);
  const metadata = await image.metadata();
  const { width: imgWidth, height: imgHeight } = metadata;

  const results = [];
  const isMultiItem = (detectedItems || []).length > 1;

  for (let i = 0; i < detectedItems.length; i++) {
    const item = detectedItems[i];
    let cropFilename = null;
    let cropUrl = null;

    if (item.box2d && item.box2d.length === 4 && imgWidth && imgHeight) {
      const [ymin, xmin, ymax, xmax] = item.box2d;

      // Calculate raw pixel coordinates
      const rawTop = Math.floor((Math.max(0, ymin) / 1000) * imgHeight);
      const rawLeft = Math.floor((Math.max(0, xmin) / 1000) * imgWidth);
      const rawBottom = Math.ceil((Math.min(1000, ymax) / 1000) * imgHeight);
      const rawRight = Math.ceil((Math.min(1000, xmax) / 1000) * imgWidth);

      const rawHeight = rawBottom - rawTop;
      const rawWidth = rawRight - rawLeft;

      // Smart Padding: Tight for multi-item images to avoid bleed, comfortable for single items
      const padY = Math.round(rawHeight * (isMultiItem ? 0.02 : 0.04));
      const padX = Math.round(rawWidth * (isMultiItem ? 0.015 : 0.03));

      const top = Math.max(0, rawTop - padY);
      const left = Math.max(0, rawLeft - padX);
      const bottom = Math.min(imgHeight, rawBottom + padY);
      const right = Math.min(imgWidth, rawRight + padX);

      const width = right - left;
      const height = bottom - top;

      if (width > 20 && height > 20) {
        const uniqueCropName = `crop-${Date.now()}-${i}-${Math.round(Math.random() * 1e4)}.webp`;
        const cropFilePath = path.join(cropsDir, uniqueCropName);

        await sharp(originalImagePath)
          .extract({ left, top, width, height })
          .webp({ quality: 90 })
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
    // >= 0.72 -> EXACT_MATCH (Same dress! Increment wear count)
    // 0.52 - 0.71 -> AMBIGUOUS_MATCH (Ask user confirmation)
    // < 0.52 -> NEW_ITEM
    let matchStatus = 'NEW_ITEM';
    let matchMessage = 'New dress detected! Ready to add to wardrobe.';
    let matchedItem = null;

    if (highestScore >= 0.72) {
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
    } else if (highestScore >= 0.52) {
      matchStatus = 'AMBIGUOUS_MATCH';
      matchMessage = `We found a similar item in your wardrobe: "${bestMatch.name}". Is this the same item or a new one?`;
    }

    return {
      tempDetectionId: detected.tempId || `det_${Math.random().toString(36).substr(2, 9)}`,
      name: detected.name,
      category: detected.category,
      subCategory: detected.subCategory,
      croppedImageUrl: detected.croppedImageUrl,
      croppedFilename: detected.croppedFilename,
      attributes: detected.attributes,
      matchType: matchStatus === 'EXACT_MATCH' ? 'EXISTING_ITEM' : 'NEW_ITEM',
      matchedItem: matchedItem,
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
