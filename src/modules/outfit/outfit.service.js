const mongoose = require('mongoose');
const WardrobeItem = require('../wardrobe/wardrobeItem.model');
const Wardrobe = require('../wardrobe/wardrobe.model');
const Outfit = require('./outfit.model');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GEMINI_API_KEY } = require('../../config/env.config');
const ApiError = require('../../utils/apiError');

// Standardized Slot Definitions
const SLOT_TYPES = {
  TOP: 'UPPER_WEAR',
  BOTTOM: 'LOWER_WEAR',
  ONE_PIECE: 'ONE_PIECE',
  OUTERWEAR: 'OUTERWEAR',
  FOOTWEAR: 'FOOTWEAR',
  ACCESSORIES: 'ACCESSORIES',
};

// Color Harmony Families & Relationships
const NEUTRALS = new Set([
  'white',
  'off white',
  'off-white',
  'cream',
  'ivory',
  'black',
  'jet black',
  'grey',
  'gray',
  'charcoal',
  'beige',
  'tan',
  'camel',
  'nude',
  'navy',
  'navy blue',
  'dark blue',
  'khaki',
  'taupe',
]);

const COLOR_PAIRS = [
  // Classic Harmonious Pairs
  ['navy', 'white'],
  ['navy', 'beige'],
  ['navy', 'grey'],
  ['navy', 'tan'],
  ['blue', 'white'],
  ['blue', 'grey'],
  ['blue', 'black'],
  ['black', 'white'],
  ['black', 'grey'],
  ['black', 'red'],
  ['black', 'beige'],
  ['black', 'olive'],
  ['olive', 'beige'],
  ['olive', 'white'],
  ['olive', 'black'],
  ['olive', 'tan'],
  ['maroon', 'black'],
  ['maroon', 'grey'],
  ['maroon', 'navy'],
  ['burgundy', 'white'],
  ['burgundy', 'black'],
  ['pink', 'white'],
  ['pink', 'grey'],
  ['pink', 'navy'],
  ['yellow', 'navy'],
  ['yellow', 'grey'],
  ['yellow', 'white'],
  ['green', 'white'],
  ['green', 'beige'],
  ['brown', 'cream'],
  ['brown', 'white'],
  ['brown', 'light blue'],
];

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
 * Helper to get clean image url for item
 */
const getItemImageUrl = (item) => {
  if (Array.isArray(item.images) && item.images.length > 0) {
    const primary = item.images.find((img) => img.isPrimary);
    if (primary && primary.url) return primary.url;
    // Prefer segmented over raw
    const segmented = item.images.find((img) => img.type === 'SEGMENTED');
    if (segmented && segmented.url) return segmented.url;
    return item.images[0].url || '';
  }
  return item.sourcePhotoUrl || '';
};

/**
 * Categorize a wardrobe item into semantic outfit slot
 */
const classifySlot = (item) => {
  const cat = (item.category || '').toUpperCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();

  // 1. One-Piece Ensembles (Dresses, Gowns, Sarees, Kurta Sets, Jumpsuits)
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

  // 2. Outerwear (Blazers, Jackets, Coats, Shrugs, Cardigans)
  if (
    cat === 'OUTERWEAR' ||
    ['jacket', 'blazer', 'coat', 'shrug', 'cardigan', 'hoodie', 'overshirt', 'bomber', 'trench'].some(
      (k) => sub.includes(k) || name.includes(k)
    )
  ) {
    return SLOT_TYPES.OUTERWEAR;
  }

  // 3. Footwear (Shoes, Sneakers, Loafers, Heels, Boots)
  if (
    cat === 'FOOTWEAR' ||
    ['shoe', 'shoes', 'sneaker', 'sneakers', 'loafer', 'loafers', 'heel', 'heels', 'boot', 'boots', 'sandal', 'sandals', 'flat', 'flats', 'slippers'].some(
      (k) => sub.includes(k) || name.includes(k)
    )
  ) {
    return SLOT_TYPES.FOOTWEAR;
  }

  // 4. Accessories (Belts, Bags, Watches, Sunglasses)
  if (
    cat === 'ACCESSORIES' ||
    ['belt', 'bag', 'handbag', 'watch', 'sunglasses', 'scarf', 'tie', 'cap', 'hat', 'jewellery', 'jewelry'].some(
      (k) => sub.includes(k) || name.includes(k)
    )
  ) {
    return SLOT_TYPES.ACCESSORIES;
  }

  // 5. Lower Wear (Jeans, Trousers, Chinos, Pants, Shorts, Skirts)
  if (
    cat === 'LOWER_WEAR' ||
    cat === 'BOTTOMS' ||
    ['jean', 'jeans', 'trouser', 'trousers', 'pant', 'pants', 'chino', 'chinos', 'short', 'shorts', 'skirt', 'palazzo', 'salwar', 'leggings', 'jogger', 'joggers'].some(
      (k) => sub.includes(k) || name.includes(k)
    )
  ) {
    return SLOT_TYPES.BOTTOM;
  }

  // 6. Upper Wear (Default for tops, shirts, t-shirts, kurtas)
  if (
    cat === 'UPPER_WEAR' ||
    cat === 'TOPS' ||
    ['shirt', 't-shirt', 'tshirt', 'tee', 'polo', 'top', 'blouse', 'kurta', 'sweater', 'sweatshirt'].some(
      (k) => sub.includes(k) || name.includes(k)
    )
  ) {
    return SLOT_TYPES.TOP;
  }

  // Fallback check
  return SLOT_TYPES.TOP;
};

/**
 * Calculate Color Harmony Score between two or three garments
 */
const evaluateColorHarmony = (color1, color2, color3 = null) => {
  const c1 = (color1 || '').toLowerCase();
  const c2 = (color2 || '').toLowerCase();
  const c3 = color3 ? color3.toLowerCase() : null;

  if (!c1 || !c2) {
    return { score: 75, harmonyType: 'BALANCED', contrast: 'MEDIUM' };
  }

  // Case 1: Monochromatic / Tonal Match (Same color family e.g. Navy + Light Blue, Grey + Charcoal)
  if (c1 === c2) {
    return { score: 85, harmonyType: 'MONOCHROMATIC', contrast: 'LOW_TONAL' };
  }

  const isC1Neutral = NEUTRALS.has(c1) || Array.from(NEUTRALS).some((n) => c1.includes(n));
  const isC2Neutral = NEUTRALS.has(c2) || Array.from(NEUTRALS).some((n) => c2.includes(n));

  // Case 2: Neutral + Color Pop (Guaranteed High Fashion Harmony)
  if (isC1Neutral && !isC2Neutral) {
    return { score: 95, harmonyType: 'ACCENT_POP', contrast: 'DYNAMIC' };
  }
  if (!isC1Neutral && isC2Neutral) {
    return { score: 95, harmonyType: 'ACCENT_POP', contrast: 'DYNAMIC' };
  }

  // Case 3: Both Neutrals (Sleek Minimalist e.g. Black + White, Navy + Beige, Grey + Black)
  if (isC1Neutral && isC2Neutral) {
    return { score: 98, harmonyType: 'TIMELESS_NEUTRALS', contrast: 'HIGH_ELEGANCE' };
  }

  // Case 4: Known harmonious pairs
  const pairMatch = COLOR_PAIRS.some(
    ([a, b]) =>
      (c1.includes(a) && c2.includes(b)) ||
      (c1.includes(b) && c2.includes(a))
  );
  if (pairMatch) {
    return { score: 92, harmonyType: 'COMPLEMENTARY', contrast: 'BALANCED' };
  }

  // Default pleasant combination
  return { score: 78, harmonyType: 'CASUAL_CONTRAST', contrast: 'MEDIUM' };
};

/**
 * Occasion Appropriateness Scoring
 */
const scoreOccasionFit = (item, targetOccasion) => {
  const occ = (targetOccasion || 'CASUAL').toUpperCase();
  const sub = (item.subCategory || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const color = extractColor(item);
  const pattern = extractPattern(item);

  // Check item's existing occasion tags
  const itemOccasions = Array.isArray(item.occasion)
    ? item.occasion.map((o) => o.toUpperCase())
    : [];

  let score = 50;

  if (itemOccasions.includes(occ)) {
    score += 35;
  }

  switch (occ) {
    case 'OFFICE':
    case 'FORMAL':
    case 'WORK':
      if (['shirt', 'trouser', 'trousers', 'chino', 'chinos', 'blazer', 'formal', 'loafer', 'oxford'].some((w) => sub.includes(w) || name.includes(w))) {
        score += 30;
      }
      if (['t-shirt', 'tee', 'shorts', 'ripped', 'hoodie', 'joggers', 'flip'].some((w) => sub.includes(w) || name.includes(w))) {
        score -= 40;
      }
      if (['white', 'blue', 'navy', 'grey', 'black', 'beige', 'charcoal'].some((c) => color.includes(c))) {
        score += 15;
      }
      if (pattern === 'solid' || pattern.includes('stripe')) {
        score += 10;
      }
      break;

    case 'CASUAL':
    case 'DAILY':
      if (['t-shirt', 'tshirt', 'tee', 'polo', 'jeans', 'chino', 'sneaker', 'hoodie', 'casual'].some((w) => sub.includes(w) || name.includes(w))) {
        score += 25;
      }
      if (['tuxedo', 'sherwani', 'heavy gown', 'silk saree'].some((w) => sub.includes(w) || name.includes(w))) {
        score -= 30;
      }
      break;

    case 'PARTY':
    case 'NIGHT_OUT':
    case 'EVENING':
      if (['blazer', 'dress', 'leather', 'dark', 'black', 'heels', 'boots', 'party', 'stylish'].some((w) => sub.includes(w) || name.includes(w) || color.includes(w))) {
        score += 30;
      }
      if (['formal trousers', 'pyjama', 'joggers', 'sleep'].some((w) => sub.includes(w) || name.includes(w))) {
        score -= 25;
      }
      break;

    case 'WEDDING':
    case 'FESTIVE':
    case 'TRADITIONAL':
      if (['saree', 'kurta', 'anarkali', 'lehenga', 'sherwani', 'silk', 'embroidered', 'ethnic', 'traditional', 'festive'].some((w) => sub.includes(w) || name.includes(w))) {
        score += 45;
      }
      if (['t-shirt', 'jeans', 'hoodie', 'shorts', 'gym'].some((w) => sub.includes(w) || name.includes(w))) {
        score -= 40;
      }
      break;

    case 'DATE':
    case 'DATE_NIGHT':
      if (['shirt', 'dress', 'blazer', 'fitted', 'polo', 'chic', 'clean jeans', 'chinos'].some((w) => sub.includes(w) || name.includes(w))) {
        score += 25;
      }
      if (['sweatpants', 'oversized tee', 'gym', 'shorts'].some((w) => sub.includes(w) || name.includes(w))) {
        score -= 30;
      }
      break;

    case 'TRAVEL':
    case 'VACATION':
      if (['comfort', 'cotton', 'linen', 'sneaker', 'chino', 't-shirt', 'jacket', 'travel', 'shorts', 'hoodie'].some((w) => sub.includes(w) || name.includes(w))) {
        score += 30;
      }
      if (['heels', 'formal suit', 'heavy saree', 'blazer'].some((w) => sub.includes(w) || name.includes(w))) {
        score -= 25;
      }
      break;

    default:
      score += 15;
      break;
  }

  return Math.max(10, Math.min(100, score));
};

/**
 * Generate diverse styling titles based on combination
 */
const generateOutfitTitle = (archetype, top, bottom, outerwear, occasion) => {
  const occ = (occasion || 'Casual').toUpperCase();
  const occLabel = occ.charAt(0) + occ.slice(1).toLowerCase();

  if (archetype === 'ONE_PIECE') {
    const dressName = top.subCategory || top.name;
    return `${dressName} Elegance • ${occLabel}`;
  }

  if (outerwear) {
    return `Smart Layered ${occLabel} Look`;
  }

  const topColor = extractColor(top) || 'Classic';
  const bottomName = bottom?.subCategory || 'Trouser';
  const capTopColor = topColor.charAt(0).toUpperCase() + topColor.slice(1);

  if (occ === 'OFFICE' || occ === 'FORMAL') {
    return `Crisp Corporate • ${capTopColor} & ${bottomName}`;
  }
  if (occ === 'PARTY') {
    return `Chic Evening • ${capTopColor} Statement`;
  }
  if (occ === 'DATE') {
    return `Refined Charm • ${capTopColor} Ensemble`;
  }
  if (occ === 'WEDDING' || occ === 'FESTIVE') {
    return `Royal Celebration • Festive Ensemble`;
  }
  return `Effortless ${occLabel} • ${capTopColor} & ${bottomName}`;
};

/**
 * Generate actionable styling advice based on actual clothes
 */
const generateStylingAdvice = (archetype, top, bottom, outerwear, footwear, accessories, occasion) => {
  const occ = (occasion || 'Casual').toUpperCase();
  const tips = [];

  if (archetype === 'ONE_PIECE') {
    tips.push(`Let this ${top.subCategory || 'piece'} be the hero of your look.`);
    if (outerwear) {
      tips.push(`Drape the ${outerwear.name} over your shoulders for a modern silhouette.`);
    }
  } else {
    // Top & Bottom advice
    const topType = (top.subCategory || top.name || '').toLowerCase();
    const bottomType = (bottom?.subCategory || bottom?.name || '').toLowerCase();

    if (topType.includes('shirt')) {
      if (occ === 'OFFICE' || occ === 'FORMAL') {
        tips.push(`Tuck in the ${top.name} cleanly into your ${bottom.name} for a sharp, executive line.`);
      } else {
        tips.push(`Roll the sleeves twice and leave the collar open for relaxed sophistication.`);
      }
    } else if (topType.includes('t-shirt') || topType.includes('polo')) {
      if (bottomType.includes('chino') || bottomType.includes('trouser')) {
        tips.push(`A subtle half-tuck at the front adds structure while keeping it relaxed.`);
      } else {
        tips.push(`Pair the ${top.name} naturally over the ${bottom.name} for balanced casual comfort.`);
      }
    }

    if (outerwear) {
      tips.push(`Keep the ${outerwear.name} unbuttoned to create vertical lengthening lines.`);
    }
  }

  if (footwear) {
    tips.push(`Ground the ensemble with your ${footwear.name}.`);
  }

  if (accessories) {
    tips.push(`Accentuate with your ${accessories.name} to finish the aesthetic.`);
  }

  return tips.join(' ');
};

/**
 * Core Outfit Suggestion Engine
 */
const suggestOutfits = async (userId, options = {}) => {
  const {
    wardrobeId = null,
    occasion = 'CASUAL',
    season = null,
    limit = 5,
  } = options;

  // STEP 1: Query Wardrobe Items strictly scoped to user & selected wardrobe
  const query = { userId };

  if (wardrobeId && wardrobeId !== 'all') {
    // Check if wardrobe exists
    const targetWardrobe = await Wardrobe.findOne({ _id: wardrobeId, userId });
    if (targetWardrobe?.isDefault) {
      // Default wardrobe also includes items with null wardrobeId
      query.$or = [{ wardrobeId }, { wardrobeId: null }, { wardrobeId: { $exists: false } }];
    } else {
      query.wardrobeId = wardrobeId;
    }
  }

  const items = await WardrobeItem.find(query).lean();

  if (!items || items.length === 0) {
    return {
      success: true,
      count: 0,
      availableItemsCount: 0,
      wardrobeId: wardrobeId || 'all',
      occasion: occasion.toUpperCase(),
      outfits: [],
      message:
        'No clothing items found in the selected wardrobe. Please add clothes to receive personalized outfit combinations.',
    };
  }

  // STEP 2: Segregate available items into semantic slots
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

  // Identify what slots are absent in user's wardrobe
  const globalMissingSlots = [];
  if (slots.footwear.length === 0) globalMissingSlots.push('footwear');
  if (slots.outerwear.length === 0) globalMissingSlots.push('outerwear');
  if (slots.accessories.length === 0) globalMissingSlots.push('accessories');
  if (slots.tops.length === 0 && slots.one_piece.length === 0) globalMissingSlots.push('tops');
  if (slots.bottoms.length === 0 && slots.one_piece.length === 0) globalMissingSlots.push('bottoms');

  const combinations = [];

  // Helper to pick best compatible accessory (if available in wardrobe)
  const pickAccessory = (baseItems) => {
    if (slots.accessories.length === 0) return null;
    return slots.accessories[0]; // Available accessory from DB
  };

  // Helper to pick best compatible footwear (if available in wardrobe)
  const pickFootwear = (occasionTarget) => {
    if (slots.footwear.length === 0) return null;
    // Score footwears for occasion
    const scored = [...slots.footwear].sort(
      (a, b) => scoreOccasionFit(b, occasionTarget) - scoreOccasionFit(a, occasionTarget)
    );
    return scored[0];
  };

  // STEP 3: Generate Combinations from Available Wardrobe Items

  // COMBINATION TYPE 1: Top + Bottom combinations
  for (const top of slots.tops) {
    const topOccScore = scoreOccasionFit(top, occasion);
    const topColor = extractColor(top);
    const topPattern = extractPattern(top);

    for (const bottom of slots.bottoms) {
      const bottomOccScore = scoreOccasionFit(bottom, occasion);
      const bottomColor = extractColor(bottom);
      const bottomPattern = extractPattern(bottom);

      // Pattern balance rule: Never combine two loud prints
      const hasClashingPatterns =
        topPattern !== 'solid' &&
        topPattern !== 'plain' &&
        bottomPattern !== 'solid' &&
        bottomPattern !== 'plain';
      if (hasClashingPatterns) continue;

      const harmony = evaluateColorHarmony(topColor, bottomColor);
      const avgOccScore = (topOccScore + bottomOccScore) / 2;
      const totalScore = Math.round(avgOccScore * 0.5 + harmony.score * 0.5);

      // Check for available outerwear layer
      const compatibleOuterwear =
        slots.outerwear.length > 0
          ? slots.outerwear.find((o) => scoreOccasionFit(o, occasion) >= 50) || null
          : null;

      const chosenFootwear = pickFootwear(occasion);
      const chosenAccessory = pickAccessory([top, bottom]);

      const outfitItems = [
        {
          itemId: top._id,
          slot: SLOT_TYPES.TOP,
          name: top.name,
          category: top.category,
          subCategory: top.subCategory,
          color: topColor,
          imageUrl: getItemImageUrl(top),
        },
        {
          itemId: bottom._id,
          slot: SLOT_TYPES.BOTTOM,
          name: bottom.name,
          category: bottom.category,
          subCategory: bottom.subCategory,
          color: bottomColor,
          imageUrl: getItemImageUrl(bottom),
        },
      ];

      const missing = [];
      if (!chosenFootwear) missing.push('footwear');
      if (!compatibleOuterwear && slots.outerwear.length === 0) missing.push('outerwear');
      if (!chosenAccessory && slots.accessories.length === 0) missing.push('accessories');

      if (compatibleOuterwear) {
        outfitItems.push({
          itemId: compatibleOuterwear._id,
          slot: SLOT_TYPES.OUTERWEAR,
          name: compatibleOuterwear.name,
          category: compatibleOuterwear.category,
          subCategory: compatibleOuterwear.subCategory,
          color: extractColor(compatibleOuterwear),
          imageUrl: getItemImageUrl(compatibleOuterwear),
        });
      }

      if (chosenFootwear) {
        outfitItems.push({
          itemId: chosenFootwear._id,
          slot: SLOT_TYPES.FOOTWEAR,
          name: chosenFootwear.name,
          category: chosenFootwear.category,
          subCategory: chosenFootwear.subCategory,
          color: extractColor(chosenFootwear),
          imageUrl: getItemImageUrl(chosenFootwear),
        });
      }

      if (chosenAccessory) {
        outfitItems.push({
          itemId: chosenAccessory._id,
          slot: SLOT_TYPES.ACCESSORIES,
          name: chosenAccessory.name,
          category: chosenAccessory.category,
          subCategory: chosenAccessory.subCategory,
          color: extractColor(chosenAccessory),
          imageUrl: getItemImageUrl(chosenAccessory),
        });
      }

      combinations.push({
        archetype: compatibleOuterwear ? 'LAYERED_TWO_PIECE' : 'TWO_PIECE',
        title: generateOutfitTitle('TWO_PIECE', top, bottom, compatibleOuterwear, occasion),
        occasion: occasion.toUpperCase(),
        items: outfitItems,
        colorHarmony: {
          palette: [topColor, bottomColor].filter(Boolean),
          harmonyType: harmony.harmonyType,
          contrast: harmony.contrast,
          score: harmony.score,
        },
        matchScore: totalScore,
        missingSlots: missing,
        stylingNotes: generateStylingAdvice(
          'TWO_PIECE',
          top,
          bottom,
          compatibleOuterwear,
          chosenFootwear,
          chosenAccessory,
          occasion
        ),
      });
    }
  }

  // COMBINATION TYPE 2: One-Piece Ensembles (Dresses, Sarees, Kurta Sets)
  for (const piece of slots.one_piece) {
    const pieceOccScore = scoreOccasionFit(piece, occasion);
    const pieceColor = extractColor(piece);

    const compatibleOuterwear =
      slots.outerwear.length > 0
        ? slots.outerwear.find((o) => scoreOccasionFit(o, occasion) >= 50) || null
        : null;

    const chosenFootwear = pickFootwear(occasion);
    const chosenAccessory = pickAccessory([piece]);

    const outfitItems = [
      {
        itemId: piece._id,
        slot: SLOT_TYPES.ONE_PIECE,
        name: piece.name,
        category: piece.category,
        subCategory: piece.subCategory,
        color: pieceColor,
        imageUrl: getItemImageUrl(piece),
      },
    ];

    const missing = [];
    if (!chosenFootwear) missing.push('footwear');
    if (!compatibleOuterwear && slots.outerwear.length === 0) missing.push('outerwear');
    if (!chosenAccessory && slots.accessories.length === 0) missing.push('accessories');

    if (compatibleOuterwear) {
      outfitItems.push({
        itemId: compatibleOuterwear._id,
        slot: SLOT_TYPES.OUTERWEAR,
        name: compatibleOuterwear.name,
        category: compatibleOuterwear.category,
        subCategory: compatibleOuterwear.subCategory,
        color: extractColor(compatibleOuterwear),
        imageUrl: getItemImageUrl(compatibleOuterwear),
      });
    }

    if (chosenFootwear) {
      outfitItems.push({
        itemId: chosenFootwear._id,
        slot: SLOT_TYPES.FOOTWEAR,
        name: chosenFootwear.name,
        category: chosenFootwear.category,
        subCategory: chosenFootwear.subCategory,
        color: extractColor(chosenFootwear),
        imageUrl: getItemImageUrl(chosenFootwear),
      });
    }

    if (chosenAccessory) {
      outfitItems.push({
        itemId: chosenAccessory._id,
        slot: SLOT_TYPES.ACCESSORIES,
        name: chosenAccessory.name,
        category: chosenAccessory.category,
        subCategory: chosenAccessory.subCategory,
        color: extractColor(chosenAccessory),
        imageUrl: getItemImageUrl(chosenAccessory),
      });
    }

    combinations.push({
      archetype: 'ONE_PIECE',
      title: generateOutfitTitle('ONE_PIECE', piece, null, compatibleOuterwear, occasion),
      occasion: occasion.toUpperCase(),
      items: outfitItems,
      colorHarmony: {
        palette: [pieceColor].filter(Boolean),
        harmonyType: 'SOLO_STATEMENT',
        contrast: 'HARMONIOUS',
        score: 95,
      },
      matchScore: Math.round(pieceOccScore * 0.7 + 95 * 0.3),
      missingSlots: missing,
      stylingNotes: generateStylingAdvice(
        'ONE_PIECE',
        piece,
        null,
        compatibleOuterwear,
        chosenFootwear,
        chosenAccessory,
        occasion
      ),
    });
  }

  // Edge Case: User has only tops or only bottoms or only single items
  if (combinations.length === 0) {
    // Generate solo item guidance without inventing clothes
    const anyAvailableItem = items[0];
    const itemColor = extractColor(anyAvailableItem);
    return {
      success: true,
      count: 0,
      availableItemsCount: items.length,
      wardrobeId: wardrobeId || 'all',
      occasion: occasion.toUpperCase(),
      outfits: [],
      message: `You have ${items.length} item(s) in this wardrobe, but need complementary items (e.g. matching tops and bottoms, or dresses) to generate complete outfit combinations.`,
      missingSlots: globalMissingSlots,
    };
  }

  // STEP 4: Rank combinations by match score & ensure diversity
  combinations.sort((a, b) => b.matchScore - a.matchScore);

  // Filter for unique, diverse top/bottom pairs
  const seenPairKeys = new Set();
  const diverseOutfits = [];

  for (const combo of combinations) {
    const itemIds = combo.items.map((i) => i.itemId.toString()).sort().join('-');
    if (!seenPairKeys.has(itemIds)) {
      seenPairKeys.add(itemIds);
      diverseOutfits.push({
        ...combo,
        id: `outfit_${diverseOutfits.length + 1}_${Date.now().toString(36)}`,
      });
    }
    if (diverseOutfits.length >= limit) break;
  }

  // STEP 5: Fast Gemini AI Polish (Enriches descriptions & advice without changing items)
  if (GEMINI_API_KEY && diverseOutfits.length > 0) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const promptData = diverseOutfits.map((o, idx) => ({
        index: idx,
        title: o.title,
        items: o.items.map((i) => `${i.name} (${i.color || ''} ${i.subCategory || i.category})`),
      }));

      const prompt = `You are an elite high-fashion stylist for Arangtik Digital Wardrobe.
The user requested outfits for the occasion: "${occasion.toUpperCase()}".
Here are curated outfit combinations constructed strictly from the user's closet:
${JSON.stringify(promptData, null, 2)}

For each combination, provide:
1. A punchy, glamorous high-fashion title (e.g. "Effortless Parisian Minimalist", "Monochrome Power Casual").
2. 2-3 sentences of practical, elevated styling advice on how to wear it (e.g. cuffing, tucking, silhouette balance, event etiquette).

Respond with a raw JSON array of objects:
[
  {
    "index": 0,
    "title": "...",
    "stylingNotes": "..."
  }
]
Return ONLY JSON, no backticks or markdown.`;

      // 3.5 second timeout to prevent slow network from degrading UX
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI Polish Timeout')), 3500)
      );
      const aiPromise = model.generateContent(prompt);

      const result = await Promise.race([aiPromise, timeoutPromise]);
      const responseText = result.response.text().trim();
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedAiTips = JSON.parse(cleanJson);

      if (Array.isArray(parsedAiTips)) {
        for (const tip of parsedAiTips) {
          if (diverseOutfits[tip.index]) {
            if (tip.title) diverseOutfits[tip.index].title = tip.title;
            if (tip.stylingNotes) diverseOutfits[tip.index].stylingNotes = tip.stylingNotes;
          }
        }
      }
    } catch (aiErr) {
      // Graceful fallback to deterministic rule engine notes
      // No failure shown to user
    }
  }

  return {
    success: true,
    count: diverseOutfits.length,
    availableItemsCount: items.length,
    wardrobeId: wardrobeId || 'all',
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

  // Validate that items belong to this user
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
