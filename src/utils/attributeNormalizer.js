/**
 * AI Data Quality & Attribute Canonical Normalization Utility
 * Normalizes raw Gemini Vision attributes into structured, standardized vocabularies
 * while preserving raw AI fields.
 */

const CANONICAL_CATEGORIES = [
  'UPPER_WEAR',
  'LOWER_WEAR',
  'TRADITIONAL',
  'OUTERWEAR',
  'FOOTWEAR',
  'ACCESSORIES',
  'OTHER',
];

const CATEGORY_MAP = {
  // Tops / Upper
  tops: 'UPPER_WEAR',
  top: 'UPPER_WEAR',
  't-shirt': 'UPPER_WEAR',
  't-shirts': 'UPPER_WEAR',
  't-shirts & tops': 'UPPER_WEAR',
  shirt: 'UPPER_WEAR',
  blouse: 'UPPER_WEAR',
  polo: 'UPPER_WEAR',
  sweater: 'UPPER_WEAR',
  sweatshirt: 'UPPER_WEAR',
  hoodie: 'UPPER_WEAR',
  upper_wear: 'UPPER_WEAR',
  upperwear: 'UPPER_WEAR',

  // Bottoms / Lower
  bottoms: 'LOWER_WEAR',
  bottom: 'LOWER_WEAR',
  jeans: 'LOWER_WEAR',
  trousers: 'LOWER_WEAR',
  pants: 'LOWER_WEAR',
  chinos: 'LOWER_WEAR',
  shorts: 'LOWER_WEAR',
  skirt: 'LOWER_WEAR',
  lower_wear: 'LOWER_WEAR',
  lowerwear: 'LOWER_WEAR',

  // Traditional & Dresses
  dress: 'TRADITIONAL',
  dresses: 'TRADITIONAL',
  gown: 'TRADITIONAL',
  saree: 'TRADITIONAL',
  sari: 'TRADITIONAL',
  kurta: 'TRADITIONAL',
  kurti: 'TRADITIONAL',
  lehenga: 'TRADITIONAL',
  sherwani: 'TRADITIONAL',
  traditional: 'TRADITIONAL',

  // Outerwear
  outerwear: 'OUTERWEAR',
  jacket: 'OUTERWEAR',
  blazer: 'OUTERWEAR',
  coat: 'OUTERWEAR',
  cardigan: 'OUTERWEAR',

  // Footwear
  footwear: 'FOOTWEAR',
  shoes: 'FOOTWEAR',
  sneakers: 'FOOTWEAR',
  boots: 'FOOTWEAR',
  sandals: 'FOOTWEAR',

  // Accessories
  accessories: 'ACCESSORIES',
  belt: 'ACCESSORIES',
  hat: 'ACCESSORIES',
  scarf: 'ACCESSORIES',
  bag: 'ACCESSORIES',
};

const SUBCATEGORY_SYNONYMS = {
  tshirt: 'T-Shirt',
  't-shirt': 'T-Shirt',
  't shirt': 'T-Shirt',
  'crewneck tee': 'T-Shirt',
  tee: 'T-Shirt',
  shirt: 'Shirt',
  jeans: 'Jeans',
  denim: 'Jeans',
  trousers: 'Trousers',
  pants: 'Trousers',
  chinos: 'Trousers',
  gown: 'Gown',
  'evening gown': 'Evening Gown',
  frock: 'Dress',
  dress: 'Dress',
  kurta: 'Kurta',
  kurti: 'Kurti',
  lehenga: 'Lehenga',
  saree: 'Saree',
  sari: 'Saree',
  sherwani: 'Sherwani',
  blazer: 'Blazer',
  jacket: 'Jacket',
  hoodie: 'Hoodie',
  sweater: 'Sweater',
  sneakers: 'Sneakers',
  shoes: 'Shoes',
};

const COLOR_FAMILY_MAP = {
  // Blues
  navy: { name: 'navy', family: 'blue' },
  'dark navy': { name: 'navy', family: 'blue' },
  'navy blue': { name: 'navy', family: 'blue' },
  'midnight blue': { name: 'navy', family: 'blue' },
  blue: { name: 'blue', family: 'blue' },
  'royal blue': { name: 'royal blue', family: 'blue' },
  'sky blue': { name: 'sky blue', family: 'blue' },
  cyan: { name: 'cyan', family: 'blue' },
  indigo: { name: 'indigo', family: 'blue' },
  teal: { name: 'teal', family: 'blue' },

  // Black / Grey / White
  black: { name: 'black', family: 'black' },
  'jet black': { name: 'black', family: 'black' },
  charcoal: { name: 'charcoal', family: 'grey' },
  grey: { name: 'grey', family: 'grey' },
  gray: { name: 'grey', family: 'grey' },
  white: { name: 'white', family: 'white' },
  'off white': { name: 'off-white', family: 'white' },
  cream: { name: 'cream', family: 'white' },
  beige: { name: 'beige', family: 'brown' },

  // Reds / Pinks / Oranges
  red: { name: 'red', family: 'red' },
  maroon: { name: 'maroon', family: 'red' },
  burgundy: { name: 'burgundy', family: 'red' },
  crimson: { name: 'crimson', family: 'red' },
  pink: { name: 'pink', family: 'pink' },
  magenta: { name: 'magenta', family: 'pink' },
  orange: { name: 'orange', family: 'orange' },
  rust: { name: 'rust', family: 'orange' },

  // Greens / Yellows / Purples / Browns
  green: { name: 'green', family: 'green' },
  olive: { name: 'olive', family: 'green' },
  emerald: { name: 'emerald', family: 'green' },
  yellow: { name: 'yellow', family: 'yellow' },
  mustard: { name: 'mustard', family: 'yellow' },
  purple: { name: 'purple', family: 'purple' },
  violet: { name: 'violet', family: 'purple' },
  brown: { name: 'brown', family: 'brown' },
  tan: { name: 'tan', family: 'brown' },
};

const PATTERN_MAP = {
  solid: 'solid',
  plain: 'solid',
  floral: 'floral',
  'floral print': 'floral',
  'floral print pattern': 'floral',
  striped: 'striped',
  stripes: 'striped',
  checked: 'checked',
  checks: 'checked',
  plaid: 'plaid',
  printed: 'printed',
  print: 'printed',
  embellished: 'embellished',
  embroidered: 'embroidered',
};

const FABRIC_MAP = {
  cotton: 'cotton',
  'pure cotton': 'cotton',
  'pure cotton denim': 'denim',
  denim: 'denim',
  silk: 'silk',
  linen: 'linen',
  wool: 'wool',
  polyester: 'polyester',
  nylon: 'nylon',
  leather: 'leather',
  velvet: 'velvet',
};

const FIT_MAP = {
  slim: 'slim',
  'slim fit': 'slim',
  regular: 'regular',
  'regular fit': 'regular',
  loose: 'loose',
  'loose fit': 'loose',
  'oversized loose fit': 'loose',
  oversized: 'oversized',
  tailored: 'tailored',
};

const OCCASION_MAP = {
  casual: 'casual',
  'everyday casual wear': 'casual',
  formal: 'formal',
  'formal wear': 'formal',
  party: 'party',
  festive: 'festive',
  traditional: 'traditional',
  sports: 'sports',
  sportswear: 'sports',
};

function cleanString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalizes raw clothing attributes
 */
function normalizeGarmentAttributes(rawItem) {
  if (!rawItem) return rawItem;

  const rawAttrs = rawItem.attributes || {};
  const inputCategory = cleanString(rawItem.category);
  const canonicalCategory = CATEGORY_MAP[inputCategory] || (CANONICAL_CATEGORIES.includes(rawItem.category?.toUpperCase()) ? rawItem.category.toUpperCase() : 'OTHER');

  const inputSub = cleanString(rawItem.subCategory);
  const canonicalSub = SUBCATEGORY_SYNONYMS[inputSub] || rawItem.subCategory || 'Garment';

  const inputColor = cleanString(rawItem.color || rawAttrs.primaryColor || rawAttrs.color);
  const colorInfo = COLOR_FAMILY_MAP[inputColor] || {
    name: inputColor || 'unspecified',
    family: 'multi/other',
  };

  const inputPattern = cleanString(rawItem.pattern || rawAttrs.pattern || rawAttrs.designPattern);
  const canonicalPattern = PATTERN_MAP[inputPattern] || (inputPattern || 'solid');

  const inputFabric = cleanString(rawItem.fabric || rawAttrs.fabric || rawAttrs.material);
  const canonicalFabric = FABRIC_MAP[inputFabric] || (inputFabric || 'cotton');

  const inputFit = cleanString(rawItem.fit || rawAttrs.fit || rawAttrs.silhouette);
  const canonicalFit = FIT_MAP[inputFit] || (inputFit || 'regular');

  const inputOccasion = cleanString(rawItem.occasion || rawAttrs.occasion);
  const canonicalOccasion = OCCASION_MAP[inputOccasion] || (inputOccasion || 'casual');

  return {
    ...rawItem,
    category: canonicalCategory,
    subCategory: canonicalSub,
    color: colorInfo.name,
    colorFamily: colorInfo.family,
    pattern: canonicalPattern,
    fabric: canonicalFabric,
    fit: canonicalFit,
    occasion: canonicalOccasion,
    attributes: {
      ...rawAttrs,
      primaryColor: colorInfo.name,
      colorFamily: colorInfo.family,
      pattern: canonicalPattern,
      fabric: canonicalFabric,
      fit: canonicalFit,
      occasion: canonicalOccasion,
      rawCategory: rawItem.category,
      rawSubCategory: rawItem.subCategory,
      rawColor: rawItem.color || rawAttrs.primaryColor,
    },
  };
}

module.exports = {
  CANONICAL_CATEGORIES,
  CATEGORY_MAP,
  COLOR_FAMILY_MAP,
  PATTERN_MAP,
  FABRIC_MAP,
  FIT_MAP,
  OCCASION_MAP,
  normalizeGarmentAttributes,
};
