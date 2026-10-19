const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_API_KEY, OPENAI_API_KEY } = require('../../config/env.config');
const segmentationService = require('../../services/segmentation/segmentation.service');
const { formatUploadUrl } = require('../../utils/url.util');

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
 * Fast Perceptual Difference Hash (dHash) using Sharp
 * Generates 64-bit fingerprint of luminance gradients across 8x8 grid.
 */
const calculatePerceptualHash = async (imagePathOrBuffer) => {
  if (!imagePathOrBuffer) return null;
  try {
    const rawPixels = await sharp(imagePathOrBuffer)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    let hash = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = rawPixels[row * 9 + col];
        const right = rawPixels[row * 9 + col + 1];
        hash += left > right ? '1' : '0';
      }
    }
    return BigInt('0b' + hash).toString(16).padStart(16, '0');
  } catch (err) {
    return null;
  }
};

/**
 * Calculates similarity (0.0 to 1.0) between two 64-bit dHashes using Hamming distance
 */
const calculateHashSimilarity = (hash1, hash2) => {
  if (!hash1 || !hash2) return 0;
  try {
    const b1 = BigInt('0x' + hash1);
    const b2 = BigInt('0x' + hash2);
    let xor = b1 ^ b2;
    let dist = 0;
    while (xor > 0n) {
      if (xor & 1n) dist++;
      xor >>= 1n;
    }
    return Math.max(0, 1 - dist / 64);
  } catch (e) {
    return 0;
  }
};

/**
 * Calculate Intersection-over-Union (IoU) between two bounding boxes [ymin, xmin, ymax, xmax]
 */
const calculateIoU = (boxA, boxB) => {
  if (!boxA || !boxB || boxA.length !== 4 || boxB.length !== 4) return 0;
  const [yminA, xminA, ymaxA, xmaxA] = boxA;
  const [yminB, xminB, ymaxB, xmaxB] = boxB;

  const yMinI = Math.max(yminA, yminB);
  const xMinI = Math.max(xminA, xminB);
  const yMaxI = Math.min(ymaxA, yminB);
  const xMaxI = Math.min(xmaxA, xmaxB);

  const interWidth = Math.max(0, xMaxI - xMinI);
  const interHeight = Math.max(0, Math.min(ymaxA, ymaxB) - Math.max(yminA, yminB));
  const interArea = interWidth * interHeight;

  const areaA = Math.max(0, ymaxA - yminA) * Math.max(0, xmaxA - xminA);
  const areaB = Math.max(0, ymaxB - yminB) * Math.max(0, xmaxB - xminB);
  const unionArea = areaA + areaB - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
};

/**
 * Call OpenAI GPT-4o-mini Vision for deep coordinate and clothing attribute extraction
 */
const analyzeWithOpenAIVision = async (visionBuffer, promptText) => {
  if (!OPENAI_API_KEY) return [];
  try {
    const startTime = Date.now();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert World-Class Fashion Vision AI specialized in Digital Wardrobe Clothing Extraction. Output ONLY a valid raw JSON array of objects without markdown formatting or code blocks.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${visionBuffer.toString('base64')}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    const data = await res.json();
    if (data.error) {
      console.warn('[aiVision] OpenAI Vision API error:', data.error.message);
      return [];
    }

    const content = data.choices?.[0]?.message?.content || '';
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    console.log(`[aiVision] Successfully analyzed image with OpenAI gpt-4o-mini (${parsed.length} items found in ${Date.now() - startTime}ms)`);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[aiVision] OpenAI Vision call failed:', err.message);
    return [];
  }
};

/**
 * Checks whether an item is Footwear, an Accessory, or Jewelry (Gehne)
 */
const isFootwearOrAccessory = (it) => {
  if (!it) return false;
  const c = (it.category || '').toUpperCase();
  const s = (it.subCategory || '').toLowerCase();
  const n = (it.name || '').toLowerCase();
  const accessoryKeywords = [
    'sunglasses', 'glasses', 'spectacles', 'watch', 'smartwatch', 'belt', 'cap', 'hat', 'beanie',
    'shoes', 'sneakers', 'sandals', 'heels', 'loafers', 'boots', 'slippers', 'flats', 'oxfords', 'derby', 'footwear',
    'jewelry', 'jewellery', 'necklace', 'earrings', 'earring', 'ring', 'rings', 'bracelet', 'bangle', 'bangles', 'chain', 'pendant', 'anklet', 'gehna', 'gehne',
    'bag', 'handbag', 'tote', 'clutch', 'purse', 'wallet', 'backpack', 'scarf', 'tie', 'bow-tie',
  ];
  return (
    c === 'ACCESSORIES' ||
    c === 'FOOTWEAR' ||
    accessoryKeywords.some((k) => s.includes(k) || n.includes(k))
  );
};

/**
 * Multi-Dimensional Similarity Engine between analyzed item and existing wardrobe item
 * Incorporates dynamic normalized weighting, color-family constraints, and perceptual visual cues.
 */
const calculateItemSimilarity = (detectedItem, existingItem) => {
  if (!detectedItem || !existingItem) return 0;

  // 1. Broad Category Compatibility Check
  const detCat = (detectedItem.category || '').toUpperCase();
  const existCat = (existingItem.category || '').toUpperCase();

  const isCatExact = detCat && existCat && detCat === existCat;
  const isCatRelated =
    (detCat === 'TRADITIONAL' && existCat === 'UPPER_WEAR') ||
    (detCat === 'UPPER_WEAR' && existCat === 'TRADITIONAL') ||
    (detCat === 'ONE_PIECE' && (existCat === 'DRESS' || existCat === 'TRADITIONAL')) ||
    (existCat === 'ONE_PIECE' && (detCat === 'DRESS' || detCat === 'TRADITIONAL'));

  // Incompatible categories (e.g. UPPER_WEAR vs LOWER_WEAR, FOOTWEAR vs UPPER_WEAR) can never match
  if (detCat && existCat && !isCatExact && !isCatRelated) {
    return 0;
  }

  let score = 0;
  let weightTotal = 0;

  // Base Category Weight: 20
  weightTotal += 20;
  if (isCatExact) {
    score += 20;
  } else if (isCatRelated) {
    score += 15;
  }

  // 2. Sub-Category Match (Weight: 25)
  const detSub = (detectedItem.subCategory || '').trim().toLowerCase();
  const existSub = (existingItem.subCategory || '').trim().toLowerCase();

  if (detSub && existSub) {
    weightTotal += 25;
    if (detSub === existSub) {
      score += 25;
    } else if (
      (detSub === 'shirt' && existSub === 't-shirt') ||
      (detSub === 't-shirt' && existSub === 'shirt') ||
      (detSub === 'polo' && existSub === 't-shirt') ||
      (detSub === 't-shirt' && existSub === 'polo')
    ) {
      // Related top garments but distinct styles: give partial score
      score += 8;
    } else if (detSub.includes(existSub) || existSub.includes(detSub)) {
      score += 18;
    }
  }

  // 3. Color & Theme Match (Weight: 35)
  const detColor = (getAttr(detectedItem, 'primaryColor') || '').trim().toLowerCase();
  const existColor = (getAttr(existingItem, 'primaryColor') || '').trim().toLowerCase();
  let colorConflict = false;

  if (detColor && existColor) {
    weightTotal += 35;
    if (detColor === existColor) {
      score += 35;
    } else if (areColorsSimilar(detColor, existColor)) {
      score += 28;
    } else {
      // Confirmed distinct color families (e.g. Red vs Blue, Green vs Black)
      colorConflict = true;
    }
  }

  // 4. Design Pattern & Work Match (Weight: 20)
  const detPattern = (getAttr(detectedItem, 'designPattern') || getAttr(detectedItem, 'pattern') || '').trim().toLowerCase();
  const existPattern = (getAttr(existingItem, 'designPattern') || getAttr(existingItem, 'pattern') || '').trim().toLowerCase();

  if (detPattern && existPattern) {
    weightTotal += 20;
    if (detPattern === existPattern) {
      score += 20;
    } else if (
      (detPattern.includes('embellish') && existPattern.includes('sequin')) ||
      (detPattern.includes('sequin') && existPattern.includes('embellish')) ||
      (detPattern.includes('zari') && existPattern.includes('embroider')) ||
      (detPattern.includes('embroider') && existPattern.includes('zari'))
    ) {
      score += 15;
    }
  }

  // 5. Fabric & Texture Match (Weight: 10 - Evaluated only when specified in both items)
  const detFabric = (getAttr(detectedItem, 'fabric') || '').trim().toLowerCase();
  const existFabric = (getAttr(existingItem, 'fabric') || '').trim().toLowerCase();
  if (detFabric && existFabric) {
    weightTotal += 10;
    if (detFabric === existFabric || detFabric.includes(existFabric) || existFabric.includes(detFabric)) {
      score += 10;
    }
  }

  // 6. Silhouette & Fit Match (Weight: 10 - Evaluated only when specified in both items)
  const detSil = (getAttr(detectedItem, 'silhouette') || getAttr(detectedItem, 'fit') || '').trim().toLowerCase();
  const existSil = (getAttr(existingItem, 'silhouette') || getAttr(existingItem, 'fit') || '').trim().toLowerCase();
  if (detSil && existSil) {
    weightTotal += 10;
    if (detSil === existSil || detSil.includes(existSil) || existSil.includes(detSil)) {
      score += 10;
    }
  }

  // 7. Neckline Style (Weight: 5 - Evaluated only when specified in both items)
  const detNeck = (getAttr(detectedItem, 'neckline') || '').trim().toLowerCase();
  const existNeck = (getAttr(existingItem, 'neckline') || '').trim().toLowerCase();
  if (detNeck && existNeck) {
    weightTotal += 5;
    if (detNeck === existNeck) {
      score += 5;
    }
  }

  if (weightTotal === 0) return 0;

  let calculatedScore = Math.min(1, score / weightTotal);

  // If two garments have explicitly different, non-matching colors, they can never be the same dress
  if (colorConflict) {
    calculatedScore = Math.min(calculatedScore, 0.40);
  }

  return calculatedScore;
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
 * Fast flash models prioritized for sub-2s multimodal clothing analysis.
 */
const configuredModel = process.env.GEMINI_VISION_MODEL;
const VISION_MODELS = [
  ...(configuredModel ? [configuredModel] : []),
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
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

  // Pre-compress image to max 1024x1024 JPEG in-memory for ultra-fast Gemini upload & inference.
  // Shrinks payload by ~95% (e.g. 8MB camera photo -> ~45KB), accelerating inference from 15s to ~2s.
  let visionBuffer;
  let visionMimeType = 'image/jpeg';
  try {
    visionBuffer = await sharp(imagePath)
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();
  } catch (resizeErr) {
    console.warn('[aiVision] Vision buffer pre-compression fallback to raw file buffer:', resizeErr.message);
    visionBuffer = fs.readFileSync(imagePath);
    visionMimeType = imagePath.endsWith('.png')
      ? 'image/png'
      : imagePath.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';
  }

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
You are an expert World-Class Fashion Vision AI specialized in Digital Wardrobe Clothing Extraction.
We have identified the TARGET PERSON in this photo whose face is located at bounding box [ymin, xmin, ymax, xmax]: ${JSON.stringify(normalizedFaceBoxes)}.

CRITICAL EXTRACTION RULES (STRICT COMPLIANCE REQUIRED):
1. ONLY EXTRACT CORE CLOTHING GARMENTS worn by THIS TARGET PERSON:
   - Upper wear (T-Shirt, Shirt, Polo, Top, Hoodie, Jacket, Blazer, etc.)
   - Lower wear (Jeans, Pants, Trousers, Shorts, Trackpants, Skirt, etc.)
   - Traditional / Full Body (Saree, Kurta Set, Salwar Suit, Anarkali, Lehenga Choli, One-piece Dress, Gown)
2. STRICTLY DO NOT EXTRACT ACCESSORIES, JEWELRY (GEHNE), OR FOOTWEAR from this person's outfit photo:
   - DO NOT extract sunglasses, spectacles, watches, belts, caps, hats, rings, bracelets, necklaces, earrings, chains, or shoes from a person's photo! Only extract actual garments of clothing. Never extract accessories worn on human bodies.
3. SEVERELY CUTOFF / HALF-VISIBLE GARMENT RULE (VERY IMPORTANT):
   - If a garment is cut off by the camera frame such that only a small portion is visible (for example: only half a T-shirt or collar is visible because the photo starts at mid-chest, but the pants/jeans are fully visible), DO NOT DETECT THE HALF T-SHIRT! Extract ONLY the fully visible pants/jeans. A garment must be prominently visible (>60% of the piece in frame) to be extracted.
4. WOMEN'S ETHNIC / TRADITIONAL ENSEMBLE RULES (NO AWKWARD FRAGMENTATION):
   - SAREE & BLOUSE: When a woman is wearing a Saree, DO NOT split the Saree and Blouse! The Saree and Blouse form ONE complete unified ensemble (category: "TRADITIONAL", subCategory: "Saree"). The bounding box MUST cover the entire saree outfit from shoulders down to the bottom pallu/pleats. DO NOT create a separate blouse piece!
   - SUITS & KURTA SETS: When a woman is wearing a Kurta with Salwar/Palazzo and Dupatta, keep the entire suit together as ONE unified traditional ensemble (e.g. "Pink Embroidered Kurta Suit Set").
   - LEHENGA CHOLI: Keep the lehenga, choli, and dupatta together as ONE complete ensemble.
   - WESTERN SEPARATES: If wearing distinct 2-piece modern clothing (e.g. Crop Top / Shirt + Jeans / Trousers / Skirt), extract Upper Wear and Lower Wear separately.
5. STRICTLY IGNORE garments worn by other people/companions in group photos.

For EACH valid garment found on the TARGET PERSON, return:
- "name": Highly descriptive fashion title (e.g. "Black Mock-Neck Quarter-Zip Short-Sleeve T-Shirt", "Black Slim-Fit Denim Jeans", "Red Banarasi Silk Saree with Blouse Ensemble")
- "category": "UPPER_WEAR" | "LOWER_WEAR" | "TRADITIONAL" | "OUTERWEAR"
- "subCategory": "T-Shirt" | "Shirt" | "Jeans" | "Trousers" | "Saree" | "Kurta" | "Dress" | "Skirt" | "Jacket"
- "box2d": [ymin, xmin, ymax, xmax] (0-1000 scale) covering the exact item boundaries.
- "polygon": Array of 24 to 48 normalized [y, x] coordinates (0 to 1000 scale) tracing ONLY the outer fabric boundary contour of the garment. Stop cleanly right at collar seam (NEVER include neck skin), cut cleanly across sleeve cuff openings (NEVER include bare arms/hands), and cut at bottom waist hem.
- "attributes": {
    "primaryColor": dominant color name (e.g. "Black", "White", "Navy Blue"),
    "secondaryColors": array of secondary colors,
    "pattern": "SOLID" | "STRIPED" | "CHECKED" | "PRINTED" | "EMBROIDERED",
    "fabric": "COTTON" | "LINEN" | "DENIM" | "SILK" | "SYNTHETIC" | "SATIN" | "VELVET" | "OTHER",
    "fit": "REGULAR_FIT" | "SLIM_FIT" | "LOOSE_FIT",
    "neckline": "Collar" | "Round Neck" | "V-Neck" | "Mandarin" | "Mock Neck" | "Other",
    "sleeveStyle": "FULL_SLEEVE" | "HALF_SLEEVE" | "SLEEVELESS"
  }

- Return ONLY a valid raw JSON array of objects without markdown backticks or commentary.
`;
  } else {
    prompt = `
You are an expert World-Class Fashion Vision AI specialized in Digital Wardrobe Clothing Extraction.
Analyze the uploaded image (which may contain a person wearing an outfit, clothes on hangers, flat-lays, or showroom displays).

CRITICAL EXTRACTION RULES (STRICT COMPLIANCE REQUIRED):
1. IF THE PHOTO CONTAINS A PERSON WEARING AN OUTFIT OR HUMAN BODY:
   - Extract ONLY the primary clothing garments (Upper Wear, Lower Wear, Traditional, Outerwear).
   - STRICTLY NEVER EXTRACT ACCESSORIES, JEWELRY (GEHNE), OR FOOTWEAR from a person or human body!
   - DO NOT detect shoes on human feet, watches on wrists, jewelry (necklaces, earrings, rings, bangles) on human skin/neck/ears, sunglasses on faces, or belts on waists. Only extract actual garments of clothing.
2. DEDICATED STANDALONE PRODUCT / ACCESSORY / FOOTWEAR / JEWELRY EXCEPTION:
   - Footwear (Shoes, Sneakers, Loafers, Heels, Boots, Sandals), Accessories (Watches, Bags, Belts, Caps, Sunglasses) and Jewelry / Gehne (Necklaces, Earrings, Rings, Bracelets, Bangles, Chains) must ONLY be detected if the uploaded photo is a DEDICATED STANDALONE product photo of that item alone (e.g. flat-lay of shoes on the floor/shelf, watch on a table/box, jewelry in a box/tray, with NO person wearing them).
   - For standalone items, return:
     * category: "FOOTWEAR" (for shoes, sneakers, loafers, heels, boots, sandals)
     * category: "ACCESSORIES" (for watches, bags, belts, caps, sunglasses, and jewelry/gehne like necklaces, earrings, rings, bracelets, bangles, chains)
     * subCategory: Exact type (e.g. "Shoes", "Sneakers", "Loafers", "Heels", "Watch", "Necklace", "Earrings", "Ring", "Bracelet", "Bag", "Belt", "Sunglasses")
     * name: Descriptive fashion title (e.g. "Black Oxford Leather Formal Shoes", "Rose Gold Chronograph Watch", "Kundan Gold Choker Necklace", "Tan Leather Crossbody Bag")
3. SEVERELY CUTOFF / HALF-VISIBLE GARMENT RULE (VERY IMPORTANT):
   - If a garment is cut off by the edge of the image frame such that only a partial portion is visible (for example: a photo starting below the chest showing only the bottom half of a T-shirt, but showing full pants/jeans), DO NOT DETECT THE HALF T-SHIRT! Detect ONLY the fully visible pants/jeans. A garment must be prominently visible (>60% of the item in frame) to be extracted.
4. WOMEN'S ETHNIC / TRADITIONAL ENSEMBLE RULES (NO AWKWARD FRAGMENTATION):
   - SAREE & BLOUSE: When a woman is wearing a Saree, DO NOT split the Saree and Blouse into two pieces! The Saree, Blouse, and Pallu form ONE complete unified ensemble (category: "TRADITIONAL", subCategory: "Saree"). The bounding box covers from the shoulders down to the floor. NEVER extract a separate tiny blouse!
   - KURTA SETS / SUITS: For Kurta with Salwar/Palazzo and Dupatta, Anarkali Suits, or Lehenga Choli, detect the entire outfit as ONE complete unified ensemble. Do not chop it into fragmented pieces.
   - WESTERN SEPARATES: When wearing distinct 2-piece separates (e.g. Top/Shirt + Jeans/Trousers/Skirt), extract Upper Wear and Lower Wear separately.
5. NEVER detect bare skin, human face, bare neck, or mannequin stand as a clothing item!

For EACH valid wearable item found, return a JSON object with:
- "name": Highly descriptive fashion title.
  * JEANS & PANTS SPECIAL INSTRUCTION: Carefully inspect the bounding box coordinates to identify the exact denim wash (e.g. "Vintage Acid Wash", "Bleached Light Blue Wash", "Mid Stonewash Blue", "Classic Medium Indigo", "Dark Raw Navy", "Charcoal/Black") and leg cut/fit (e.g. "Wide-Leg", "Straight-Leg", "Tapered Mom Fit", "Relaxed Baggy", "Flared", "Skinny"). NEVER label all blue jeans with the identical generic string "Light Blue Wash Denim Jeans"; make the title distinctively match its visual characteristics!
- "category": "UPPER_WEAR" | "LOWER_WEAR" | "TRADITIONAL" | "OUTERWEAR" | "FOOTWEAR" | "ACCESSORIES"
- "subCategory": "T-Shirt" | "Shirt" | "Jeans" | "Trousers" | "Saree" | "Kurta" | "Dress" | "Shoes" | "Watch" | "Necklace" | "Bag"
- "box2d": Normalized bounding box [ymin, xmin, ymax, xmax] (0-1000 scale) covering ONLY this specific item.
- "polygon": Array of 24 to 48 normalized [y, x] coordinates (0 to 1000 scale) tracing ONLY the garment's outer fabric boundary contour.
- "attributes": {
    "primaryColor": Dominant color shade (e.g. "White", "Black", "Navy Blue"),
    "secondaryColors": Array of accent colors,
    "pattern": "SOLID" | "STRIPED" | "CHECKED" | "PRINTED" | "EMBELLISHED" | "OTHER",
    "fabric": "COTTON" | "LINEN" | "DENIM" | "SILK" | "SYNTHETIC" | "SATIN" | "VELVET" | "OTHER",
    "fit": "REGULAR_FIT" | "SLIM_FIT" | "LOOSE_FIT" | "A_LINE" | "FLARE",
    "neckline": "Round Neck" | "Collar" | "V-Neck" | "Mock Neck" | "Mandarin" | "Other",
    "sleeveStyle": "HALF_SLEEVE" | "FULL_SLEEVE" | "SLEEVELESS"
  }

- Return ONLY a valid raw JSON array of objects without markdown backticks or commentary.
`;
  }

  let rawList = [];
  let lastError = null;

  // Primary Provider Check: If AI_VISION_PROVIDER is explicitly set to 'openai', invoke OpenAI first
  if (process.env.AI_VISION_PROVIDER === 'openai' && OPENAI_API_KEY) {
    console.log('[aiVision] AI_VISION_PROVIDER is configured to openai. Engaging OpenAI gpt-4o-mini as primary vision engine...');
    rawList = await analyzeWithOpenAIVision(visionBuffer, prompt);
  }

  // If OpenAI was not requested or returned 0, use Gemini Vision cascade
  if (rawList.length === 0 && GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Multi-Model Cascade: Try working models in priority order
    for (const modelName of VISION_MODELS) {
      const modelStartTime = Date.now();
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: visionBuffer.toString('base64'),
              mimeType: visionMimeType,
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
  }

  // Fallback: If Gemini cascade failed or returned 0, try OpenAI gpt-4o-mini
  if (rawList.length === 0 && OPENAI_API_KEY) {
    console.log('[aiVision] Gemini Vision models exhausted. Engaging OpenAI gpt-4o-mini as intelligent fallback...');
    rawList = await analyzeWithOpenAIVision(visionBuffer, prompt);
  }

  if (rawList.length === 0) {
    if (lastError) {
      console.error('[aiVision] All Vision models failed or quota exceeded:', lastError.message);
    } else {
      console.log('[aiVision] No garments identified by Vision AI in uploaded image. Engaging smart default fallback...');
    }
    return getFallbackAnalysis(metadata);
  }

  // COMPREHENSIVE PROGRAMMATIC VALIDATION & FILTERING ENGINE
  const nonGarmentRegex = /\b(face|chin|beard|hair|human head|human face|bare skin|mannequin stand|dummy stand)\b/i;

  // 1. Initial cleanup of non-garments and malformed items
  let validItems = rawList.filter((item) => {
    if (!item || !item.name) return false;
    const name = (item.name || '').toLowerCase();
    const sub = (item.subCategory || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    if (nonGarmentRegex.test(name) || nonGarmentRegex.test(sub)) return false;
    if (cat === 'other' && !item.attributes?.primaryColor) return false;
    if (!Array.isArray(item.box2d) || item.box2d.length !== 4) return false;
    const [ymin, xmin, ymax, xmax] = item.box2d;
    if (ymax <= ymin || xmax <= xmin) return false;
    return true;
  });

  // Coordinate-based Non-Maximum Suppression (IoU Deduplication)
  // If multiple detected bounding boxes overlap >= 0.50 on the same garment category, keep the larger box and drop duplicate box
  const deduplicatedItems = [];
  for (const item of validItems) {
    const isDuplicateBox = deduplicatedItems.some((existing) => {
      const isSameCategory = (existing.category || '').toUpperCase() === (item.category || '').toUpperCase();
      const iou = calculateIoU(existing.box2d, item.box2d);
      return isSameCategory && iou >= 0.50;
    });
    if (!isDuplicateBox) {
      deduplicatedItems.push(item);
    } else {
      console.log(`[aiVision] Dropped duplicate garment coordinate box for "${item.name}" (IoU overlap >= 0.50).`);
    }
  }
  validItems = deduplicatedItems;

  if (validItems.length === 0) {
    console.log('[aiVision] Valid items resulted in 0 garments. Engaging smart default fallback...');
    return getFallbackAnalysis(metadata);
  }

  // 2. Identify if this photo contains Core Clothing (Upper Wear, Lower Wear, Traditional, Dress)
  const isCoreGarment = (it) => {
    const c = (it.category || '').toUpperCase();
    const s = (it.subCategory || '').toLowerCase();
    const n = (it.name || '').toLowerCase();
    return (
      c === 'UPPER_WEAR' ||
      c === 'LOWER_WEAR' ||
      c === 'TRADITIONAL' ||
      c === 'OUTERWEAR' ||
      c === 'FULL_BODY' ||
      ['shirt', 't-shirt', 'top', 'polo', 'hoodie', 'jacket', 'blazer', 'jeans', 'pant', 'trousers', 'shorts', 'skirt', 'saree', 'kurta', 'dress', 'gown', 'suit', 'lehenga'].some((k) => s.includes(k) || n.includes(k))
    );
  };

  const hasCoreGarments = validItems.some(isCoreGarment);

  // RULE: In a person's outfit / clothing photo, STRICTLY FILTER OUT ACCESSORIES & FOOTWEAR!
  // Accessories / footwear are only kept if they are standalone product photos (no core clothes present).
  if (hasCoreGarments) {
    const beforeCount = validItems.length;
    validItems = validItems.filter((it) => !isFootwearOrAccessory(it));
    if (validItems.length < beforeCount) {
      console.log(`[aiVision] Filtered out ${beforeCount - validItems.length} accessory/footwear item(s) from full outfit photo.`);
    }
  }

  // 3. WOMEN'S SAREE & BLOUSE ENSEMBLE CONSOLIDATION
  // If Saree and separate Blouse/Choli are detected in the same photo, merge them into ONE Saree ensemble!
  const sareeIdx = validItems.findIndex((it) => {
    const n = (it.name || '').toLowerCase();
    const s = (it.subCategory || '').toLowerCase();
    return n.includes('saree') || s.includes('saree') || n.includes('sari') || s.includes('sari');
  });

  if (sareeIdx !== -1) {
    const saree = validItems[sareeIdx];
    const blouseIndices = [];
    validItems.forEach((it, idx) => {
      if (idx === sareeIdx) return;
      const n = (it.name || '').toLowerCase();
      const s = (it.subCategory || '').toLowerCase();
      const isBlouse = n.includes('blouse') || s.includes('blouse') || n.includes('choli') || s.includes('choli');
      if (isBlouse) {
        blouseIndices.push(idx);
      }
    });

    if (blouseIndices.length > 0) {
      let [sYmin, sXmin, sYmax, sXmax] = saree.box2d;
      blouseIndices.forEach((bIdx) => {
        const [bYmin, bXmin, bYmax, bXmax] = validItems[bIdx].box2d;
        sYmin = Math.min(sYmin, bYmin);
        sXmin = Math.min(sXmin, bXmin);
        sYmax = Math.max(sYmax, bYmax);
        sXmax = Math.max(sXmax, bXmax);
      });
      saree.box2d = [sYmin, sXmin, sYmax, sXmax];
      saree.category = 'TRADITIONAL';
      saree.subCategory = 'Saree';
      if (!saree.name.toLowerCase().includes('ensemble')) {
        saree.name = `${saree.name} with Blouse Ensemble`;
      }
      validItems = validItems.filter((_, idx) => !blouseIndices.includes(idx));
      console.log(`[aiVision] Consolidated Saree and Blouse into a single unified ensemble.`);
    }
  }

  // 4. SEVERELY CUTOFF / HALF-VISIBLE GARMENTS VALIDATION
  const uppers = validItems.filter((it) => (it.category || '').toUpperCase() === 'UPPER_WEAR');
  const lowers = validItems.filter((it) => (it.category || '').toUpperCase() === 'LOWER_WEAR');
  const itemsToDrop = new Set();

  // If there's a prominent full Lower Wear (height > 340) and an Upper Wear that is cut off at the top frame:
  if (lowers.length > 0) {
    const maxLowerHeight = Math.max(...lowers.map((it) => it.box2d[2] - it.box2d[0]));
    uppers.forEach((upper) => {
      const [uYmin, , uYmax] = upper.box2d;
      const uHeight = uYmax - uYmin;
      // Cut off at the top frame (ymin <= 25) AND significantly shorter than the lower wear (< 240)
      if (uYmin <= 25 && uHeight < 240 && maxLowerHeight > 340) {
        console.log(`[aiVision] Discarding truncated/half Upper Wear "${upper.name}" (height: ${uHeight}) as Lower Wear is fully visible.`);
        itemsToDrop.add(upper);
      }
    });
  }

  // If there's a prominent full Upper Wear (height > 380) and a Lower Wear that is cut off at the bottom frame:
  if (uppers.length > 0) {
    const maxUpperHeight = Math.max(...uppers.map((it) => it.box2d[2] - it.box2d[0]));
    lowers.forEach((lower) => {
      const [, , lYmax] = lower.box2d;
      const lHeight = lYmax - lower.box2d[0];
      // Cut off at the bottom frame (ymax >= 975) AND significantly shorter than the upper wear (< 200)
      if (lYmax >= 975 && lHeight < 200 && maxUpperHeight > 380) {
        console.log(`[aiVision] Discarding truncated/half Lower Wear "${lower.name}" (height: ${lHeight}) as Upper Wear is fully visible.`);
        itemsToDrop.add(lower);
      }
    });
  }

  // Filter out any items in itemsToDrop or sliver fragments
  validItems = validItems.filter((item) => {
    if (itemsToDrop.has(item)) return false;
    const [ymin, , ymax] = item.box2d;
    const height = ymax - ymin;
    if (validItems.length > 1 && height < 130) {
      console.log(`[aiVision] Discarding garment fragment "${item.name}" (height ${height} < 130 threshold).`);
      return false;
    }
    return true;
  });

  // 5. Target User Face Alignment Filter (for group photos)
  if (normalizedFaceBoxes.length > 0) {
    validItems = validItems.filter((item) => {
      const [ymin, xmin, ymax, xmax] = item.box2d;
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
      return true;
    });
  }

  if (validItems.length === 0) {
    console.log('[aiVision] Filtered list resulted in 0 garments. Engaging smart default fallback...');
    return getFallbackAnalysis(metadata);
  }

  return validItems;
};

/**
 * Crop detected clothing items using Sharp with precision bounds and controlled concurrency (C=2).
 */
const cropDetectedItems = async (originalImagePath, detectedItems, options = {}) => {
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
          cropUrl = formatUploadUrl(`/uploads/crops/${uniqueCropName}`);

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

          // Identify Ladies vs Menswear (User Rule: Skin exclusion is enabled strictly for men's garments, never for ladies)
          const isLadiesGarment = (it) => {
            const g = (it.gender || it.attributes?.gender || '').toUpperCase();
            if (g === 'WOMEN' || g === 'FEMALE') return true;
            const s = (it.subCategory || '').toLowerCase();
            const c = (it.category || '').toUpperCase();
            const n = (it.name || '').toLowerCase();
            return ['saree', 'sari', 'blouse', 'lehenga', 'choli', 'salwar', 'anarkali', 'dress', 'gown', 'skirt', 'kurti', 'dupatta'].some(
              (k) => s.includes(k) || n.includes(k) || c.includes(k)
            );
          };

          const isAccessory = isFootwearOrAccessory(item);
          // Skin exclusion should only run if explicitly requested in options and never for ladies or accessories
          const shouldExcludeSkin = Boolean(options.excludeSkin) && !isLadiesGarment(item) && !isAccessory;

          // Background Removal: Run neural segmentation by default so dress/item background is cleanly removed
          const shouldSegment = options.removeBackground !== false && process.env.DISABLE_SEGMENTATION !== 'true';
          if (shouldSegment) {
            try {
              const segResult = await segmentationService.segmentClothing(cropFilePath, {
                filenamePrefix: `seg-${index}`,
                polygon: relativePolygon,
                usePolygonMask: false,
                excludeSkin: shouldExcludeSkin,
                garmentColor: item.attributes?.primaryColor || item.color || '',
                autoInpaint: false,
                isAccessory: isAccessory,
              });
              if (segResult && segResult.outputUrl) {
                cropFilename = segResult.filename;
                cropUrl = segResult.outputUrl;
              }
            } catch (segErr) {
              console.warn(`[aiVision] Segmentation fallback to rectangular crop for item ${index}:`, segErr.message);
            }
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
      if (score >= 0.50) {
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

    const buildMatchedItemSummary = (item, simScore) => {
      if (!item) return null;
      const directColor = item.color || item.primaryColor;
      const attrColor = item.attributes ? (item.attributes.color || item.attributes.primaryColor) : undefined;
      const directFabric = item.fabric;
      const attrFabric = item.attributes ? item.attributes.fabric : undefined;
      const directPattern = item.pattern || item.designPattern;
      const attrPattern = item.attributes ? (item.attributes.pattern || item.attributes.designPattern) : undefined;

      return {
        _id: item._id,
        name: item.name,
        category: item.category,
        subCategory: item.subCategory,
        color: directColor || attrColor || '',
        fabric: directFabric || attrFabric || '',
        pattern: directPattern || attrPattern || '',
        primaryImageUrl: item.images?.find((img) => img.isPrimary)?.url || item.images?.[0]?.url,
        currentStatus: item.currentStatus,
        lastWornDate: item.usageStats?.lastWornDate || item.lastWornAt,
        wearCount: item.usageStats?.wearCount || item.wearCount || 0,
        similarityScore: Math.round(simScore * 100) / 100,
      };
    };

    if (highestScore >= 0.72) {
      matchStatus = 'EXACT_MATCH';
      matchMessage = `This dress is already registered in your wardrobe as "${bestMatch.name}".`;
      matchedItem = buildMatchedItemSummary(bestMatch, highestScore);
    } else if (highestScore >= 0.52) {
      matchStatus = 'AMBIGUOUS_MATCH';
      matchMessage = `We found a similar item in your wardrobe: "${bestMatch.name}". Is this the same item or a new one?`;
      matchedItem = buildMatchedItemSummary(bestMatch, highestScore);
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
      matchType: matchStatus === 'EXACT_MATCH' ? 'EXISTING_ITEM' : (matchStatus === 'AMBIGUOUS_MATCH' ? 'POTENTIAL_DUPLICATE' : 'NEW_ITEM'),
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
  analyzeWithOpenAIVision,
  cropDetectedItems,
  matchAgainstWardrobe,
  calculateItemSimilarity,
  calculatePerceptualHash,
  calculateHashSimilarity,
  calculateIoU,
};
