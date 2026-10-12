const mongoose = require('mongoose');
const WardrobeItem = require('../wardrobe/wardrobeItem.model');
const Wardrobe = require('../wardrobe/wardrobe.model');
const Outfit = require('./outfit.model');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_API_KEY } = require('../../config/env.config');
const ApiError = require('../../utils/apiError');
const { colord, extend: extendColord } = require('colord');
const namesPlugin = require('colord/plugins/names');
const a11yPlugin = require('colord/plugins/a11y');

extendColord([namesPlugin, a11yPlugin]);

// Standardized Slot Definitions
const SLOT_TYPES = {
  TOP: 'UPPER_WEAR',
  BOTTOM: 'LOWER_WEAR',
  ONE_PIECE: 'ONE_PIECE',
  OUTERWEAR: 'OUTERWEAR',
  FOOTWEAR: 'FOOTWEAR',
  ACCESSORIES: 'ACCESSORIES',
};

/**
 * Parses any color name or hex code dynamically using Colord library
 */
const parseFashionColor = (rawColor) => {
  if (!rawColor) return null;
  const str = rawColor.toString().toLowerCase().trim();

  // 1. Direct standard name / hex match
  let c = colord(str);
  if (c.isValid()) return c;

  // 2. Joined composite name (e.g. "dark blue" -> "darkblue", "royal blue" -> "royalblue")
  c = colord(str.replace(/[\s-]+/g, ''));
  if (c.isValid()) return c;

  // 3. First-word match (e.g. "navy blue" -> "navy", "olive green" -> "olive")
  const parts = str.split(/[\s-]+/);
  c = colord(parts[0]);
  if (c.isValid()) return c;

  // 4. Last-word fallback (e.g. "baby pink" -> "pink", "emerald green" -> "green")
  c = colord(parts[parts.length - 1]);
  return c.isValid() ? c : null;
};

/**
 * Determines if a color is a fashion neutral using HSL color physics & colord
 */
const isFashionNeutral = (colorObj, rawColorName = '') => {
  if (!colorObj) return false;
  const hsl = colorObj.toHsl();
  // Low saturation or extreme lightness levels define timeless fashion neutrals
  if (hsl.s <= 20 || hsl.l >= 90 || hsl.l <= 12) return true;
  const name = (rawColorName || '').toLowerCase();
  return ['navy', 'beige', 'tan', 'khaki', 'cream', 'taupe', 'charcoal'].some((n) => name.includes(n));
};

/**
 * Normalizes item primary color string
 */
const extractColor = (item) => {
  const c =
    item.color ||
    (item.attributes && (item.attributes.primaryColor || item.attributes.color)) ||
    '';
  return c.trim().toLowerCase();
};

/**
 * Normalizes item pattern string
 */
const extractPattern = (item) => {
  const p =
    item.pattern ||
    (item.attributes && (item.attributes.pattern || item.attributes.designPattern)) ||
    'solid';
  return p.trim().toLowerCase();
};

/**
 * Resolves the cleanest accessible image URL for an item (segmented > primary > raw)
 */
const getItemImageUrl = (item) => {
  if (Array.isArray(item.images) && item.images.length > 0) {
    const primary = item.images.find((img) => img.isPrimary);
    if (primary && primary.url) return primary.url;
    const segmented = item.images.find((img) => img.type === 'SEGMENTED');
    if (segmented && segmented.url) return segmented.url;
    return item.images[0].url || '';
  }
  return item.sourcePhotoUrl || '';
};

/**
 * Categorizes a wardrobe item into a semantic outfit slot
 */
const classifySlot = (item) => {
  const cat = (item.category || '').toUpperCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  // One-Piece Ensembles (Dresses, Gowns, Sarees, Kurta Sets)
  if (
    cat === 'TRADITIONAL' ||
    cat === 'DRESS' ||
    cat === 'ONE_PIECE' ||
    ['dress', 'gown', 'saree', 'sari', 'anarkali', 'lehenga', 'jumpsuit', 'romper', 'kurta set', 'salwar suit'].some(
      (k) => sub.includes(k) || name.includes(k)
    )
  ) {
    return SLOT_TYPES.ONE_PIECE;
  }

  // Outerwear (Blazers, Jackets, Coats, Shrugs)
  if (
    cat === 'OUTERWEAR' ||
    ['jacket', 'blazer', 'coat', 'shrug', 'cardigan', 'hoodie', 'overshirt', 'bomber'].some(
      (k) => sub.includes(k) || name.includes(k)
    )
  ) {
    return SLOT_TYPES.OUTERWEAR;
  }

  // Footwear (Shoes, Sneakers, Loafers, Heels, Boots)
  if (
    cat === 'FOOTWEAR' ||
    ['shoe', 'shoes', 'sneaker', 'sneakers', 'loafer', 'loafers', 'heel', 'heels', 'boot', 'boots', 'sandal', 'sandals', 'flat', 'flats'].some(
      (k) => sub.includes(k) || name.includes(k)
    )
  ) {
    return SLOT_TYPES.FOOTWEAR;
  }

  // Accessories (Belts, Bags, Watches, Sunglasses)
  if (
    cat === 'ACCESSORIES' ||
    ['belt', 'bag', 'handbag', 'watch', 'sunglasses', 'scarf', 'tie', 'cap', 'hat', 'jewellery', 'jewelry'].some(
      (k) => sub.includes(k) || name.includes(k)
    )
  ) {
    return SLOT_TYPES.ACCESSORIES;
  }

  // Lower Wear (Jeans, Trousers, Chinos, Pants, Shorts, Skirts)
  if (
    cat === 'LOWER_WEAR' ||
    cat === 'BOTTOMS' ||
    ['jean', 'jeans', 'trouser', 'trousers', 'pant', 'pants', 'chino', 'chinos', 'short', 'shorts', 'skirt', 'palazzo', 'salwar', 'jogger', 'joggers'].some(
      (k) => sub.includes(k) || name.includes(k)
    )
  ) {
    return SLOT_TYPES.BOTTOM;
  }

  // Upper Wear (Default for tops, shirts, t-shirts, kurtas)
  return SLOT_TYPES.TOP;
};

/**
 * Calculates Color Harmony Score using Color Theory & Colord library
 */
const evaluateColorHarmony = (color1, color2) => {
  const c1Str = (color1 || '').toLowerCase().trim();
  const c2Str = (color2 || '').toLowerCase().trim();

  if (!c1Str || !c2Str) {
    return { score: 75, harmonyType: 'BALANCED', contrast: 'MEDIUM' };
  }

  // Monochromatic exact match
  if (c1Str === c2Str) {
    return { score: 85, harmonyType: 'MONOCHROMATIC', contrast: 'LOW_TONAL' };
  }

  const c1 = parseFashionColor(c1Str);
  const c2 = parseFashionColor(c2Str);

  if (!c1 || !c2) {
    return { score: 78, harmonyType: 'BALANCED', contrast: 'MEDIUM' };
  }

  const isC1Neutral = isFashionNeutral(c1, c1Str);
  const isC2Neutral = isFashionNeutral(c2, c2Str);

  // Both Neutrals -> Timeless Elegance
  if (isC1Neutral && isC2Neutral) {
    return { score: 98, harmonyType: 'TIMELESS_NEUTRALS', contrast: 'HIGH_ELEGANCE' };
  }

  // Neutral + Color Pop
  if (isC1Neutral || isC2Neutral) {
    return { score: 95, harmonyType: 'ACCENT_POP', contrast: 'DYNAMIC' };
  }

  // Hue wheel angle analysis
  const h1 = c1.toHsl().h;
  const h2 = c2.toHsl().h;
  let hueDiff = Math.abs(h1 - h2);
  if (hueDiff > 180) hueDiff = 360 - hueDiff;

  if (hueDiff <= 25) {
    return { score: 88, harmonyType: 'MONOCHROMATIC', contrast: 'LOW_TONAL' };
  }
  if (hueDiff >= 150 && hueDiff <= 180) {
    return { score: 94, harmonyType: 'COMPLEMENTARY', contrast: 'BOLD_CONTRAST' };
  }
  if (hueDiff >= 30 && hueDiff <= 65) {
    return { score: 92, harmonyType: 'ANALOGOUS', contrast: 'NATURAL_FLOW' };
  }
  if (hueDiff >= 110 && hueDiff <= 140) {
    return { score: 90, harmonyType: 'TRIADIC', contrast: 'VIBRANT_BALANCE' };
  }

  return { score: 80, harmonyType: 'CASUAL_CONTRAST', contrast: 'MEDIUM' };
};

/**
 * Occasion Appropriateness Scoring (Dynamic fallback)
 */
const scoreOccasionFit = (item, targetOccasion) => {
  const occ = (targetOccasion || 'CASUAL').toUpperCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const text = `${name} ${sub}`;

  const itemOccasions = Array.isArray(item.occasion)
    ? item.occasion.map((o) => o.toUpperCase())
    : [];

  let score = 50;
  if (itemOccasions.includes(occ)) {
    score += 35;
  }

  const isFormalOccasion = ['OFFICE', 'FORMAL', 'WORK'].includes(occ);
  const isCasualItem = /shorts|ripped|t-shirt|tee|hoodie|jogger|flip/.test(text);
  const isFormalItem = /shirt|trouser|chino|blazer|formal|suit|oxford|loafer/.test(text);

  if (isFormalOccasion) {
    if (isFormalItem) score += 25;
    if (isCasualItem) score -= 35;
  } else if (occ === 'CASUAL' || occ === 'DAILY') {
    if (isCasualItem || /jeans|casual|polo/.test(text)) score += 20;
    if (/tuxedo|sherwani|heavy gown/.test(text)) score -= 25;
  } else if (['WEDDING', 'FESTIVE', 'TRADITIONAL'].includes(occ)) {
    if (/saree|kurta|anarkali|lehenga|sherwani|silk|ethnic|festive/.test(text)) score += 35;
    if (isCasualItem) score -= 30;
  } else {
    score += 15;
  }

  return Math.max(10, Math.min(100, score));
};

/**
 * Builds dynamic outfit title
 */
const generateOutfitTitle = (archetype, top, bottom, outerwear, occasion) => {
  const occLabel = (occasion || 'Casual').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  if (archetype === 'ONE_PIECE') {
    return `${occLabel} Ensemble • ${top.name || top.subCategory || 'Look'}`;
  }
  const topDesc = top.name || top.subCategory || 'Top';
  const bottomDesc = bottom?.name || bottom?.subCategory || 'Bottom';
  if (outerwear) {
    return `Layered ${occLabel} • ${outerwear.name || 'Jacket'} Look`;
  }
  return `${occLabel} Pairing • ${topDesc} & ${bottomDesc}`;
};

/**
 * Builds actionable styling tips for fallback outfits
 */
const generateStylingAdvice = (archetype, top, bottom, outerwear, footwear) => {
  const tips = [];
  if (archetype === 'ONE_PIECE') {
    tips.push(`Highlight the silhouette of the ${top.name || 'ensemble'}.`);
  } else {
    tips.push(`Pair the ${top.name || 'top'} with the ${bottom?.name || 'bottom'} for a clean silhouette.`);
  }
  if (outerwear) tips.push(`Layer with ${outerwear.name} to add structure.`);
  if (footwear) tips.push(`Ground the look with ${footwear.name}.`);
  return tips.join(' ');
};

/**
 * Helper to construct standardized outfit object
 */
const buildOutfitObject = ({ archetype, primaryItems, outerwear, footwear, accessory, occasion, colorHarmony, matchScore }) => {
  const outfitItems = primaryItems.map((it) => ({
    itemId: it._id,
    slot: classifySlot(it),
    name: it.name,
    category: it.category,
    subCategory: it.subCategory,
    color: extractColor(it),
    imageUrl: getItemImageUrl(it),
  }));

  const missingSlots = [];
  if (outerwear) {
    outfitItems.push({
      itemId: outerwear._id,
      slot: SLOT_TYPES.OUTERWEAR,
      name: outerwear.name,
      category: outerwear.category,
      subCategory: outerwear.subCategory,
      color: extractColor(outerwear),
      imageUrl: getItemImageUrl(outerwear),
    });
  }
  if (footwear) {
    outfitItems.push({
      itemId: footwear._id,
      slot: SLOT_TYPES.FOOTWEAR,
      name: footwear.name,
      category: footwear.category,
      subCategory: footwear.subCategory,
      color: extractColor(footwear),
      imageUrl: getItemImageUrl(footwear),
    });
  } else {
    missingSlots.push('footwear');
  }
  if (accessory) {
    outfitItems.push({
      itemId: accessory._id,
      slot: SLOT_TYPES.ACCESSORIES,
      name: accessory.name,
      category: accessory.category,
      subCategory: accessory.subCategory,
      color: extractColor(accessory),
      imageUrl: getItemImageUrl(accessory),
    });
  }

  const top = primaryItems[0];
  const bottom = primaryItems[1] || null;

  return {
    archetype: outerwear ? 'LAYERED_TWO_PIECE' : archetype,
    title: generateOutfitTitle(archetype, top, bottom, outerwear, occasion),
    occasion: occasion.toUpperCase(),
    items: outfitItems,
    colorHarmony: {
      palette: primaryItems.map((it) => extractColor(it)).filter(Boolean),
      harmonyType: colorHarmony.harmonyType || 'DYNAMIC_HARMONY',
      contrast: colorHarmony.contrast || 'BALANCED',
      score: colorHarmony.score || 85,
    },
    matchScore,
    missingSlots,
    stylingNotes: generateStylingAdvice(archetype, top, bottom, outerwear, footwear),
  };
};

/**
 * Intelligent Personal Fashion Stylist powered by Google Gemini AI
 * Evaluates real clothes, occasion nuances, textures, silhouettes, and aesthetic trends dynamically without hardcoding.
 */
const generateOutfitsWithGemini = async (items, occasion, season, limit = 5, globalMissingSlots = []) => {
  if (!GEMINI_API_KEY || !items || items.length === 0) return null;

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const models = ['gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest'];

  const inventory = items.map((it) => ({
    id: it._id.toString(),
    name: it.name,
    category: it.category,
    subCategory: it.subCategory,
    slot: classifySlot(it),
    color: extractColor(it),
    pattern: extractPattern(it),
    fabric: it.fabric || it.attributes?.fabric || '',
    occasion: it.occasion || it.attributes?.occasions || [],
  }));

  const prompt = `You are an elite, world-class Celebrity Fashion Stylist & Color Theory Expert for the Arangtik Digital Wardrobe Mobile App.
The user wants elevated outfit recommendations for occasion: "${occasion.toUpperCase()}"${season ? ` and season: "${season.toUpperCase()}"` : ''}.

Here is the user's REAL wardrobe inventory (DO NOT INVENT ANY ITEMS OUTSIDE THIS LIST):
${JSON.stringify(inventory, null, 2)}

STRICT RULES:
1. ONLY use "id" values that exist in the inventory above. NEVER invent imaginary clothes.
2. An outfit MUST consist of either:
   - Upper Wear + Lower Wear (optionally layered with Outerwear, Footwear, Accessories if available in inventory)
   - OR a One-Piece Ensemble (Dress, Saree, Kurta Set) (optionally with Outerwear, Footwear, Accessories)
3. Do not combine two loud clashing patterns. Prioritize modern fashion aesthetics, flattering proportions, and harmonious color theory.
4. Curate up to ${limit} distinct, highly creative, occasion-perfect outfit combinations.

Return ONLY a raw JSON array of objects (no markdown, no backticks):
[
  {
    "title": "A chic, evocative high-fashion title (e.g. 'Effortless Riviera Linen', 'Urban Monochrome Edge')",
    "itemIds": ["id1", "id2"],
    "matchScore": 95,
    "colorHarmony": {
      "palette": ["Navy Blue", "Beige"],
      "harmonyType": "ACCENT_POP",
      "description": "2-3 sentences explaining why these specific colors, tones, and textures complement each other"
    },
    "stylingNotes": "2-3 sentences of practical styling tips on how to wear this outfit (e.g. cuffing, tucking, footwear pairing, accessories)"
  }
]`;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout on model ${modelName}`)), 4000)
      );
      const apiPromise = model.generateContent(prompt);
      const result = await Promise.race([apiPromise, timeoutPromise]);

      const text = result.response.text().trim();
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        const itemsById = new Map(items.map((it) => [it._id.toString(), it]));
        const curatedOutfits = [];

        for (let idx = 0; idx < parsed.length; idx++) {
          const combo = parsed[idx];
          if (!Array.isArray(combo.itemIds) || combo.itemIds.length === 0) continue;

          const resolvedItems = combo.itemIds
            .map((id) => itemsById.get(id?.toString()))
            .filter(Boolean);

          const hasTop = resolvedItems.some((it) => classifySlot(it) === SLOT_TYPES.TOP);
          const hasBottom = resolvedItems.some((it) => classifySlot(it) === SLOT_TYPES.BOTTOM);
          const hasOnePiece = resolvedItems.some((it) => classifySlot(it) === SLOT_TYPES.ONE_PIECE);

          if (!hasOnePiece && (!hasTop || !hasBottom)) continue;

          const outfitItems = resolvedItems.map((it) => ({
            itemId: it._id,
            slot: classifySlot(it),
            name: it.name,
            category: it.category,
            subCategory: it.subCategory,
            color: extractColor(it),
            imageUrl: getItemImageUrl(it),
          }));

          const missing = [];
          if (!resolvedItems.some((it) => classifySlot(it) === SLOT_TYPES.FOOTWEAR) && globalMissingSlots.includes('footwear')) {
            missing.push('footwear');
          }

          curatedOutfits.push({
            id: `outfit_${idx + 1}_${Date.now().toString(36)}`,
            archetype: hasOnePiece
              ? 'ONE_PIECE'
              : resolvedItems.some((it) => classifySlot(it) === SLOT_TYPES.OUTERWEAR)
              ? 'LAYERED_TWO_PIECE'
              : 'TWO_PIECE',
            title: combo.title || `Curated Look #${idx + 1}`,
            occasion: occasion.toUpperCase(),
            items: outfitItems,
            colorHarmony: {
              palette: combo.colorHarmony?.palette || resolvedItems.map((it) => extractColor(it)).filter(Boolean),
              harmonyType: combo.colorHarmony?.harmonyType || 'DYNAMIC_HARMONY',
              description: combo.colorHarmony?.description || '',
              score: combo.matchScore || 90,
            },
            matchScore: combo.matchScore || 92,
            missingSlots: missing,
            stylingNotes: combo.stylingNotes || '',
          });

          if (curatedOutfits.length >= limit) break;
        }

        if (curatedOutfits.length > 0) {
          console.log(`[OutfitStylist] Successfully generated ${curatedOutfits.length} AI outfits with model: ${modelName}`);
          return curatedOutfits;
        }
      }
    } catch (err) {
      console.warn(`[OutfitStylist] Model ${modelName} failed (${err.message}), trying next fallback...`);
    }
  }

  return null;
};

/**
 * Core Outfit Suggestion Engine
 */
const suggestOutfits = async (userId, options = {}) => {
  const {
    wardrobeId = null,
    wardrobeIds = null,
    occasion = 'CASUAL',
    season = null,
    limit = 5,
  } = options;

  // STEP 1: Normalize selected wardrobe IDs (multi-wardrobe checklist support)
  let selectedWardrobeIds = [];
  if (Array.isArray(wardrobeIds) && wardrobeIds.length > 0) {
    selectedWardrobeIds = wardrobeIds.map((id) => id?.toString().trim()).filter((id) => id && id !== 'all');
  } else if (typeof wardrobeIds === 'string' && wardrobeIds.trim() && wardrobeIds.trim() !== 'all') {
    selectedWardrobeIds = wardrobeIds.split(',').map((id) => id.trim()).filter((id) => id && id !== 'all');
  } else if (Array.isArray(wardrobeId) && wardrobeId.length > 0) {
    selectedWardrobeIds = wardrobeId.map((id) => id?.toString().trim()).filter((id) => id && id !== 'all');
  } else if (typeof wardrobeId === 'string' && wardrobeId.trim() && wardrobeId.trim() !== 'all') {
    selectedWardrobeIds = [wardrobeId.trim()];
  }

  // STEP 2: Query Wardrobe Items strictly scoped to user & selected wardrobe(s)
  const query = { userId };

  if (selectedWardrobeIds.length > 0) {
    const defaultWardrobe = await Wardrobe.findOne({ userId, isDefault: true }).lean();
    const includesDefault =
      defaultWardrobe &&
      selectedWardrobeIds.some((id) => id.toString() === defaultWardrobe._id.toString());

    if (includesDefault) {
      query.$or = [
        { wardrobeId: { $in: selectedWardrobeIds } },
        { wardrobeId: null },
        { wardrobeId: { $exists: false } },
      ];
    } else {
      query.wardrobeId = { $in: selectedWardrobeIds };
    }
  }

  const items = await WardrobeItem.find(query).lean();

  if (!items || items.length === 0) {
    return {
      success: true,
      count: 0,
      availableItemsCount: 0,
      wardrobeId: selectedWardrobeIds.length === 1 ? selectedWardrobeIds[0] : (selectedWardrobeIds.length > 1 ? selectedWardrobeIds : 'all'),
      selectedWardrobeIds: selectedWardrobeIds.length > 0 ? selectedWardrobeIds : ['all'],
      selectedWardrobesCount: selectedWardrobeIds.length,
      occasion: occasion.toUpperCase(),
      outfits: [],
      message:
        selectedWardrobeIds.length > 0
          ? `No clothing items found in the ${selectedWardrobeIds.length} selected wardrobe(s). Please add clothes to receive personalized outfit combinations.`
          : 'No clothing items found in your wardrobe. Please add clothes to receive personalized outfit combinations.',
    };
  }

  // STEP 3: Segregate items into slots
  const slots = {
    tops: [],
    bottoms: [],
    one_piece: [],
    outerwear: [],
    footwear: [],
    accessories: [],
  };

  for (const item of items) {
    const slot = classifySlot(item);
    if (slot === SLOT_TYPES.TOP) slots.tops.push(item);
    else if (slot === SLOT_TYPES.BOTTOM) slots.bottoms.push(item);
    else if (slot === SLOT_TYPES.ONE_PIECE) slots.one_piece.push(item);
    else if (slot === SLOT_TYPES.OUTERWEAR) slots.outerwear.push(item);
    else if (slot === SLOT_TYPES.FOOTWEAR) slots.footwear.push(item);
    else if (slot === SLOT_TYPES.ACCESSORIES) slots.accessories.push(item);
  }

  const globalMissingSlots = [];
  if (slots.footwear.length === 0) globalMissingSlots.push('footwear');
  if (slots.outerwear.length === 0) globalMissingSlots.push('outerwear');
  if (slots.accessories.length === 0) globalMissingSlots.push('accessories');
  if (slots.tops.length === 0 && slots.one_piece.length === 0) globalMissingSlots.push('tops');
  if (slots.bottoms.length === 0 && slots.one_piece.length === 0) globalMissingSlots.push('bottoms');

  // STEP 4: PRIMARY ENGINE — Gemini AI Fashion Stylist
  if (GEMINI_API_KEY) {
    try {
      const aiOutfits = await generateOutfitsWithGemini(items, occasion, season, limit, globalMissingSlots);
      if (Array.isArray(aiOutfits) && aiOutfits.length > 0) {
        return {
          success: true,
          count: aiOutfits.length,
          availableItemsCount: items.length,
          wardrobeId: selectedWardrobeIds.length === 1 ? selectedWardrobeIds[0] : (selectedWardrobeIds.length > 1 ? selectedWardrobeIds : 'all'),
          selectedWardrobeIds: selectedWardrobeIds.length > 0 ? selectedWardrobeIds : ['all'],
          selectedWardrobesCount: selectedWardrobeIds.length,
          occasion: occasion.toUpperCase(),
          missingSlots: globalMissingSlots,
          outfits: aiOutfits,
          engine: 'GEMINI_AI_STYLIST',
        };
      }
    } catch (aiErr) {
      console.warn('[OutfitStylist] Gemini AI Stylist error, engaging clean fallback:', aiErr.message);
    }
  }

  // STEP 5: CLEAN DETERMINISTIC FALLBACK (Zero Downtime)
  const combinations = [];
  const chosenOuterwear = slots.outerwear.length > 0
    ? slots.outerwear.sort((a, b) => scoreOccasionFit(b, occasion) - scoreOccasionFit(a, occasion))[0]
    : null;
  const chosenFootwear = slots.footwear.length > 0
    ? slots.footwear.sort((a, b) => scoreOccasionFit(b, occasion) - scoreOccasionFit(a, occasion))[0]
    : null;
  const chosenAccessory = slots.accessories[0] || null;

  // Combination A: Tops + Bottoms
  for (const top of slots.tops) {
    const topOccScore = scoreOccasionFit(top, occasion);
    const topColor = extractColor(top);
    const topPattern = extractPattern(top);

    for (const bottom of slots.bottoms) {
      const bottomPattern = extractPattern(bottom);
      if (topPattern !== 'solid' && topPattern !== 'plain' && bottomPattern !== 'solid' && bottomPattern !== 'plain') {
        continue; // Prevent clashing busy patterns
      }

      const bottomColor = extractColor(bottom);
      const bottomOccScore = scoreOccasionFit(bottom, occasion);
      const harmony = evaluateColorHarmony(topColor, bottomColor);
      const totalScore = Math.round(((topOccScore + bottomOccScore) / 2) * 0.5 + harmony.score * 0.5);

      combinations.push(
        buildOutfitObject({
          archetype: 'TWO_PIECE',
          primaryItems: [top, bottom],
          outerwear: chosenOuterwear,
          footwear: chosenFootwear,
          accessory: chosenAccessory,
          occasion,
          colorHarmony: harmony,
          matchScore: totalScore,
        })
      );
    }
  }

  // Combination B: One-Piece Ensembles
  for (const piece of slots.one_piece) {
    const pieceOccScore = scoreOccasionFit(piece, occasion);
    combinations.push(
      buildOutfitObject({
        archetype: 'ONE_PIECE',
        primaryItems: [piece],
        outerwear: chosenOuterwear,
        footwear: chosenFootwear,
        accessory: chosenAccessory,
        occasion,
        colorHarmony: { harmonyType: 'SOLO_STATEMENT', contrast: 'HARMONIOUS', score: 95 },
        matchScore: Math.round(pieceOccScore * 0.7 + 95 * 0.3),
      })
    );
  }

  if (combinations.length === 0) {
    return {
      success: true,
      count: 0,
      availableItemsCount: items.length,
      wardrobeId: selectedWardrobeIds.length === 1 ? selectedWardrobeIds[0] : (selectedWardrobeIds.length > 1 ? selectedWardrobeIds : 'all'),
      selectedWardrobeIds: selectedWardrobeIds.length > 0 ? selectedWardrobeIds : ['all'],
      selectedWardrobesCount: selectedWardrobeIds.length,
      occasion: occasion.toUpperCase(),
      outfits: [],
      message: `You have ${items.length} item(s) in the ${selectedWardrobeIds.length > 0 ? selectedWardrobeIds.length + ' selected' : 'all'} wardrobe(s), but need complementary items (e.g. matching tops and bottoms, or dresses) to generate complete outfit combinations.`,
      missingSlots: globalMissingSlots,
    };
  }

  // Rank and deduplicate
  combinations.sort((a, b) => b.matchScore - a.matchScore);
  const seenKeys = new Set();
  const diverseOutfits = [];

  for (const combo of combinations) {
    const key = combo.items.map((i) => i.itemId.toString()).sort().join('-');
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      diverseOutfits.push({
        ...combo,
        id: `outfit_${diverseOutfits.length + 1}_${Date.now().toString(36)}`,
      });
    }
    if (diverseOutfits.length >= limit) break;
  }

  return {
    success: true,
    count: diverseOutfits.length,
    availableItemsCount: items.length,
    wardrobeId: selectedWardrobeIds.length === 1 ? selectedWardrobeIds[0] : (selectedWardrobeIds.length > 1 ? selectedWardrobeIds : 'all'),
    selectedWardrobeIds: selectedWardrobeIds.length > 0 ? selectedWardrobeIds : ['all'],
    selectedWardrobesCount: selectedWardrobeIds.length,
    occasion: occasion.toUpperCase(),
    missingSlots: globalMissingSlots,
    outfits: diverseOutfits,
  };
};

/**
 * Save an outfit to user's saved/bookmarked outfits
 */
const saveOutfit = async (userId, outfitData) => {
  const {
    wardrobeId = null,
    title,
    occasion,
    season = 'ALL_SEASON',
    items,
    stylingNotes = '',
    colorHarmony = {},
    matchScore = 90,
    missingSlots = [],
  } = outfitData;

  if (!title || !occasion || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Title, occasion, and clothing items are required to save an outfit');
  }

  const itemIds = items.map((i) => i.itemId);
  const foundItems = await WardrobeItem.find({
    _id: { $in: itemIds },
    userId,
  }).lean();

  if (foundItems.length === 0) {
    throw new ApiError(400, 'Invalid items: None of the items belong to this user wardrobe');
  }

  const saved = await Outfit.create({
    userId,
    wardrobeId: wardrobeId || null,
    title,
    occasion: occasion.toUpperCase(),
    season,
    items,
    stylingNotes,
    colorHarmony,
    matchScore,
    missingSlots,
    isFavorite: true,
  });

  return saved;
};

/**
 * Get all saved outfits for user
 */
const getSavedOutfits = async (userId, queryParams = {}) => {
  const { wardrobeId, occasion } = queryParams;
  const filter = { userId };

  if (wardrobeId && wardrobeId !== 'all') {
    filter.wardrobeId = wardrobeId;
  }
  if (occasion) {
    filter.occasion = occasion.toUpperCase();
  }

  const outfits = await Outfit.find(filter)
    .populate('items.itemId', 'name category subCategory images color pattern isFavorite')
    .sort({ createdAt: -1 })
    .lean();

  return outfits;
};

/**
 * Delete a saved outfit
 */
const deleteSavedOutfit = async (userId, outfitId) => {
  const deleted = await Outfit.findOneAndDelete({ _id: outfitId, userId });
  if (!deleted) {
    throw new ApiError(404, 'Saved outfit not found');
  }
  return { success: true, message: 'Outfit removed successfully' };
};

module.exports = {
  suggestOutfits,
  saveOutfit,
  getSavedOutfits,
  deleteSavedOutfit,
  classifySlot,
  evaluateColorHarmony,
  scoreOccasionFit,
};
