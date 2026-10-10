const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_API_KEY } = require('../../config/env.config');
const segmentationService = require('../../services/segmentation/segmentation.service');

// Ensure crops directory exists
const cropsDir = path.join(__dirname, '../../../uploads/crops');
if (!fs.existsSync(cropsDir)) {
  fs.mkdirSync(cropsDir, { recursive: true });
}

/**
 * Helper to safely extract attribute value from Mongoose Document or Map or plain object
 */
const getAttr = (item, key) => {
  if (!item) return undefined;

  // 1. Check direct top-level Mongoose model fields
  if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
    return item[key];
  }
  if (key === 'primaryColor' && (item.color || item.primaryColor)) {
    return item.color || item.primaryColor;
  }
  if (key === 'pattern' && (item.pattern || item.designPattern)) {
    return item.pattern || item.designPattern;
  }
  if (key === 'fabric' && item.fabric) {
    return item.fabric;
  }
  if (key === 'fit' && item.fit) {
    return item.fit;
  }
  if (key === 'neckline' && item.neckline) {
    return item.neckline;
  }

  // 2. Check nested attributes Map or plain object
  const attrs = item.attributes;
  if (!attrs) return undefined;
  if (typeof attrs.get === 'function') {
    const val = attrs.get(key);
    if (val !== undefined && val !== null && val !== '') return val;
  }
  if (attrs[key] !== undefined && attrs[key] !== null && attrs[key] !== '') {
    return attrs[key];
  }
  if (key === 'primaryColor' && (attrs.color || attrs.primaryColor)) {
    return attrs.color || attrs.primaryColor;
  }
  if (key === 'pattern' && (attrs.pattern || attrs.designPattern)) {
    return attrs.pattern || attrs.designPattern;
  }

  return undefined;
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
 * Supported Gemini Vision Models in priority order (with auto-fallback on quota/spikes).
 */
const configuredModel = process.env.GEMINI_VISION_MODEL;
const VISION_MODELS = [
  ...(configuredModel ? [configuredModel] : []),
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
].filter((model, idx, arr) => arr.indexOf(model) === idx);

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

  // Normalize face boxes to 0-1000 scale [ymin, xmin, ymax, xmax]
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

  let prompt = '';
  if (normalizedFaceBoxes.length > 0) {
    prompt = `
You are an expert World-Class Fashion Vision AI specialized in Ultra-Granular Digital Wardrobe Extraction.
We have identified the TARGET PERSON in this photo whose face is located at bounding box [ymin, xmin, ymax, xmax]: ${JSON.stringify(normalizedFaceBoxes)}.

CRITICAL MULTI-ITEM EXTRACTION INSTRUCTIONS:
1. Detect and return ALL distinct wearable items worn by THIS TARGET PERSON:
   - Upper wear (T-Shirt, Shirt, Polo, Kurta, Hoodie, Jacket, Blazer, etc.)
   - Lower wear (Jeans, Pants, Trousers, Shorts, Trackpants, etc.)
   - Footwear (Shoes, Sneakers, Loafers, Sandals, etc.)
   - Accessories (Sunglasses, Watch, Belt, Cap, Hat, etc.)
2. STRICTLY IGNORE garments worn by other people/companions in group photos.
3. For EACH distinct item found on the TARGET PERSON, return:
   - "name": Highly descriptive fashion title (e.g. "Black Mock-Neck Quarter-Zip Short-Sleeve T-Shirt", "Black Slim-Fit Denim Jeans", "Black Wayfarer Sunglasses", "Black Leather Strap Wristwatch")
   - "category": "UPPER_WEAR" | "LOWER_WEAR" | "TRADITIONAL" | "OUTERWEAR" | "FOOTWEAR" | "ACCESSORIES"
   - "subCategory": "T-Shirt" | "Shirt" | "Jeans" | "Trousers" | "Sunglasses" | "Watch" | "Shoes" | "Belt" | "Jacket" | "Dress" | "Kurta"
   - "box2d": [ymin, xmin, ymax, xmax] (0-1000 scale) covering the exact item boundaries.
   - "polygon": Array of 24 to 48 normalized [y, x] coordinates (0 to 1000 scale) tracing ONLY the outer fabric boundary contour of the garment. For Upper Wear (shirts/t-shirts/tops): stop cleanly right at the collar ribbing seam (NEVER include neck skin or throat), cut cleanly across sleeve cuff openings (NEVER include bare arms or hands), and cut at bottom waist hem (NEVER include pants/belt). For accessories, trace the accessory boundary.
   - "attributes": {
       "primaryColor": dominant color name (e.g. "Black", "White", "Navy Blue", "Olive Green"),
       "secondaryColors": array of secondary colors,
       "pattern": "SOLID" | "STRIPED" | "CHECKED" | "PRINTED" | "EMBROIDERED",
       "fabric": "COTTON" | "LINEN" | "DENIM" | "SILK" | "SYNTHETIC" | "SATIN" | "VELVET" | "LEATHER" | "PLASTIC" | "OTHER",
       "fit": "REGULAR_FIT" | "SLIM_FIT" | "LOOSE_FIT",
       "neckline": "Collar" | "Round Neck" | "V-Neck" | "Mandarin" | "Mock Neck" | "Other",
       "sleeveStyle": "FULL_SLEEVE" | "HALF_SLEEVE" | "SLEEVELESS"
     }

CRITICAL RULES:
- TRADITIONAL ENSEMBLE RULE: For Ethnic Wear (Anarkali, Kurti with Dupatta, Salwar Kameez, Lehenga, Saree), keep the matching dress and draped dupatta TOGETHER as ONE complete ensemble (e.g. "Anarkali Suit with Dupatta Set"). DO NOT separate or cut off the draped dupatta.
- Stop cleanly at sleeve cuff hems to exclude bare wrists/hands.
- NEVER detect bare skin, human face, or bare neck as a clothing item!
- Return ONLY a valid raw JSON array of objects without markdown backticks or commentary.
`;
  } else {
    prompt = `
You are an expert World-Class Fashion Vision AI specialized in Ultra-Granular Digital Wardrobe Extraction.
Analyze the uploaded image (which may contain a person wearing an outfit, clothes on hangers/mannequins, flat-lays, or showroom displays).
Identify EVERY distinct wearable item, garment, footwear, or fashion accessory present:
- Upper wear (T-Shirt, Shirt, Polo, Kurta, Hoodie, Jacket, Blazer, Top, etc.)
- Lower wear (Jeans, Pants, Trousers, Shorts, Skirt, etc.)
- Footwear (Shoes, Sneakers, Loafers, Heels, Sandals, etc.)
- Accessories (Sunglasses, Watch, Belt, Cap, Hat, Jewellery, etc.)
- Traditional / Gowns / Ethnic wear (Saree, Kurta, Sherwani, Lehenga, Gown, etc.)

For EACH distinct wearable item found, return a JSON object with:
- "name": Highly descriptive fashion title (e.g. "White Ribbed Crewneck Short-Sleeve T-Shirt", "Black Quarter-Zip Polo T-Shirt", "Black Slim-Fit Denim Jeans", "Black Square Sunglasses", "Brown Leather Strap Watch")
- "category": "UPPER_WEAR" | "LOWER_WEAR" | "TRADITIONAL" | "OUTERWEAR" | "FOOTWEAR" | "ACCESSORIES"
- "subCategory": "T-Shirt" | "Shirt" | "Jeans" | "Trousers" | "Sunglasses" | "Watch" | "Shoes" | "Belt" | "Jacket" | "Dress" | "Kurta"
- "box2d": Normalized bounding box [ymin, xmin, ymax, xmax] (0-1000 scale) covering ONLY this specific item.
- "polygon": Array of 24 to 48 normalized [y, x] coordinates (0 to 1000 scale) tracing ONLY the garment's outer fabric boundary contour. For upper garments (shirts/t-shirts/tops): stop cleanly right at collar seam (NEVER include neck skin), cut cleanly across sleeve cuff openings (NEVER include bare wrists/hands), and cut at bottom hem. For traditional dresses with draped dupatta, enclose the complete outfit ensemble together. For accessories, trace accessory boundary.
- "attributes": {
    "primaryColor": Dominant color shade (e.g. "White", "Black", "Navy Blue"),
    "secondaryColors": Array of accent colors,
    "pattern": "SOLID" | "STRIPED" | "CHECKED" | "PRINTED" | "EMBELLISHED" | "OTHER",
    "fabric": "COTTON" | "LINEN" | "DENIM" | "SILK" | "SYNTHETIC" | "SATIN" | "VELVET" | "LEATHER" | "PLASTIC" | "OTHER",
    "fit": "REGULAR_FIT" | "SLIM_FIT" | "LOOSE_FIT" | "A_LINE" | "FLARE",
    "neckline": "Round Neck" | "Collar" | "V-Neck" | "Mock Neck" | "Mandarin" | "Other",
    "sleeveStyle": "HALF_SLEEVE" | "FULL_SLEEVE" | "SLEEVELESS"
  }

CRITICAL RULES:
- Separate multi-piece outfits (e.g. separate T-shirt and Jeans into 2 items).
- TRADITIONAL ENSEMBLE RULE: For Ethnic Wear (Anarkali, Kurti with Dupatta, Salwar Kameez, Lehenga, Saree), keep the matching dress and draped dupatta TOGETHER as ONE complete ensemble (e.g. "Powder Blue Anarkali Suit with Dupatta Set"). DO NOT split or cut away the draped dupatta into a separate narrow strip.
- Cut cleanly right at sleeve cuff hems to exclude bare wrists and hands.
- NEVER detect bare skin, human face, or bare neck as a clothing item!
- Return ONLY a valid raw JSON array of objects without markdown backticks or commentary.
`;
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  let rawList = [];
  let lastError = null;

  // Multi-Model Cascade: Try working models in priority order
  for (const modelName of VISION_MODELS) {
    const modelStartTime = Date.now();
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
      const duration = Date.now() - modelStartTime;
      console.log(`[aiVision] Successfully analyzed image with model: ${modelName} (${rawList.length} items found in ${duration}ms)`);
      lastError = null;
      break;
    } catch (err) {
      const duration = Date.now() - modelStartTime;
      const nextModel = VISION_MODELS[VISION_MODELS.indexOf(modelName) + 1] || 'none';
      console.warn(`[aiVision] Model ${modelName} attempt failed after ${duration}ms (${err.message.slice(0, 100)}), cascading to fallback: ${nextModel}...`);
      lastError = err;
    }
  }

  if (rawList.length === 0) {
    if (lastError) {
      console.error('[aiVision] All Gemini Vision models failed or quota exceeded:', lastError.message);
    } else {
      console.log('[aiVision] No garments identified by Gemini Vision in uploaded image. Engaging smart default fallback...');
    }
    return getFallbackAnalysis(metadata);
  }

  // STRICT NON-GARMENT / FACE POST-FILTER
  const nonGarmentRegex = /\b(face|chin|beard|hair|human head|human face|bare skin|mannequin stand|dummy stand)\b/i;
  const filteredList = rawList.filter((item) => {
    const name = (item.name || '').toLowerCase();
    const sub = (item.subCategory || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();

    // Filter out non-garment body parts (except accessories like sunglasses, hats, watches)
    const isAccessory = cat === 'accessories' || sub === 'sunglasses' || sub === 'watch' || sub === 'belt' || cat === 'footwear';
    if (!isAccessory && (nonGarmentRegex.test(name) || nonGarmentRegex.test(sub))) {
      return false;
    }
    if (cat === 'other' && !item.attributes?.primaryColor) {
      return false;
    }

    // Check minimum dimensions (allow smaller bounds for accessories like sunglasses, watch)
    if (item.box2d && item.box2d.length === 4) {
      const [ymin, xmin, ymax, xmax] = item.box2d;
      const height = ymax - ymin;
      const width = xmax - xmin;
      const minDim = isAccessory ? 15 : 30;
      if (height < minDim || width < minDim) return false;

      // If target user face coordinates are known, ensure garment is horizontally aligned with the target person
      if (normalizedFaceBoxes.length > 0 && !isAccessory) {
        const isAlignedWithAnyUser = normalizedFaceBoxes.some(([fYmin, fXmin, fYmax, fXmax]) => {
          const faceCenterX = (fXmin + fXmax) / 2;
          const garmentCenterX = (xmin + xmax) / 2;
          const faceWidth = fXmax - fXmin;
          const maxHorizontalOffset = Math.max(120, faceWidth * 1.6);
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

  if (filteredList.length === 0) {
    console.log('[aiVision] Filtered list resulted in 0 garments. Engaging smart default fallback...');
    return getFallbackAnalysis(metadata);
  }

  return filteredList;
};

/**
 * Crop detected clothing items using Sharp with precision bounds and controlled concurrency (C=2).
 */
const cropDetectedItems = async (originalImagePath, detectedItems) => {
  if (!detectedItems || detectedItems.length === 0) {
    return [];
  }

  const metadata = await sharp(originalImagePath).metadata();
  const { width: imgWidth, height: imgHeight } = metadata;

  const isMultiItem = detectedItems.length > 1;
  const rawConcurrency = parseInt(process.env.SEGMENTATION_CONCURRENCY, 10) || 2;
  const concurrencyLimit = Math.max(1, Math.min(2, rawConcurrency));

  const results = new Array(detectedItems.length);
  let currentIndex = 0;
  const startTime = Date.now();

  const processGarment = async (item, index) => {
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

      // Smart Padding
      const padY = Math.round(rawHeight * (isMultiItem ? 0.02 : 0.04));
      const padX = Math.round(rawWidth * (isMultiItem ? 0.015 : 0.03));

      const top = Math.max(0, rawTop - padY);
      const left = Math.max(0, rawLeft - padX);
      const bottom = Math.min(imgHeight, rawBottom + padY);
      const right = Math.min(imgWidth, rawRight + padX);

      const width = right - left;
      const height = bottom - top;

      if (width > 20 && height > 20) {
        const uniqueCropName = `crop-${Date.now()}-${index}-${Math.round(Math.random() * 1e4)}.webp`;
        const cropFilePath = path.join(cropsDir, uniqueCropName);

        try {
          await sharp(originalImagePath)
            .extract({ left, top, width, height })
            .webp({ quality: 90 })
            .toFile(cropFilePath);

          cropFilename = uniqueCropName;
          cropUrl = `/uploads/crops/${uniqueCropName}`;

          // Map polygon coordinates to crop area for ghost mannequin body exclusion
          let relativePolygon = null;
          if (Array.isArray(item.polygon) && item.polygon.length >= 3 && imgWidth && imgHeight) {
            relativePolygon = item.polygon.map(([py, px]) => {
              const origX = (px / 1000) * imgWidth;
              const origY = (py / 1000) * imgHeight;
              const cropX = Math.max(0, Math.min(width, Math.round(origX - left)));
              const cropY = Math.max(0, Math.min(height, Math.round(origY - top)));
              return [cropY, cropX];
            });
          }

          // Perform Clothing Segmentation / Background Removal
          try {
            const segResult = await segmentationService.segmentClothing(cropFilePath, {
              filenamePrefix: `seg-${index}`,
              polygon: relativePolygon,
              usePolygonMask: false,
              autoInpaint: false,
            });
            if (segResult && segResult.outputUrl) {
              cropFilename = segResult.filename;
              cropUrl = segResult.outputUrl;
            }
          } catch (segErr) {
            console.warn(`[aiVision] Segmentation fallback to rectangular crop for item ${index}:`, segErr.message);
          }
        } catch (cropErr) {
          console.warn(`[aiVision] Sharp crop failed for item ${index}:`, cropErr.message);
        }
      }
    }

    return {
      ...item,
      croppedImageUrl: cropUrl,
      croppedFilename: cropFilename,
    };
  };

  const worker = async () => {
    while (currentIndex < detectedItems.length) {
      const idx = currentIndex++;
      results[idx] = await processGarment(detectedItems[idx], idx);
    }
  };

  const workerCount = Math.min(concurrencyLimit, detectedItems.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  const totalDuration = Date.now() - startTime;
  console.log(`[aiVision] Segmented & cropped ${detectedItems.length} garments with concurrency=${workerCount} in ${totalDuration}ms`);

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
      box2d: detected.box2d,
      polygon: detected.polygon,
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
  calculateItemSimilarity,
};
