/**
 * Realistic Data Generators for Load Testing
 */

const SAMPLE_NAMES = [
  'Royal Kundan Choker', 'Temple Gold Necklace', 'Polki Bridal Ring',
  'Diamond Solitaire Studs', 'Silver Ankle Bell Payal', 'Platinum Band',
  'Meenakari Jhumka', 'Rose Gold Pendant', 'Ruby Emerald Bangles',
];

const SAMPLE_MATERIALS = ['GOLD', 'SILVER', 'ARTIFICIAL', 'CUSTOM'];
const SAMPLE_STATUSES = ['IN_LOCKER', 'LEND', 'CLEANING', 'OTHER'];

export function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomFloat(min, max, decimals = 2) {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

export function generateJewelleryItemPayload(categoryId, boxId = null, setId = null) {
  const randomName = `${getRandomElement(SAMPLE_NAMES)} #${getRandomInt(100, 999)}`;
  const material = getRandomElement(SAMPLE_MATERIALS);
  
  const payload = {
    name: randomName,
    category: categoryId,
    material: {
      type: material,
      purity: material === 'GOLD' ? `${getRandomElement(['18K', '22K', '24K'])}` : '925 Sterling',
    },
    weight: {
      grossWeight: getRandomFloat(5.0, 85.0),
      netWeight: getRandomFloat(4.5, 80.0),
      unit: 'GRAMS',
    },
    valuation: {
      purchasePrice: getRandomInt(5000, 250000),
      currentEstimatedValue: getRandomInt(6000, 300000),
      currency: 'INR',
    },
    status: getRandomElement(SAMPLE_STATUSES),
  };

  if (boxId) payload.box = boxId;
  if (setId) payload.set = setId;

  return payload;
}

export function generateBoxPayload() {
  return {
    name: `LoadTest Safe Box #${getRandomInt(10, 999)}`,
    description: 'Automated load test jewellery storage box',
    isDefault: false,
  };
}

export function generateSetPayload() {
  return {
    name: `LoadTest Bridal Set #${getRandomInt(10, 999)}`,
    description: 'Automated load test matching jewellery collection',
  };
}
