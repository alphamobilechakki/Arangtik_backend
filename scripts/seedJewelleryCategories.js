require('dotenv').config();
const mongoose = require('mongoose');
const JewelleryCategory = require('../src/modules/jewellery/category/jewelleryCategory.model');

const DEFAULT_CATEGORIES = [
  { name: 'Necklace', code: 'NECKLACE', description: 'Chokers, chains, collars, and beaded necklaces' },
  { name: 'Earring', code: 'EARRING', description: 'Studs, drops, hoops, jhumkas, and chandeliers' },
  { name: 'Ring', code: 'RING', description: 'Bands, cocktail rings, and engagement rings' },
  { name: 'Bracelet', code: 'BRACELET', description: 'Chain, cuff, tennis, and charm bracelets' },
  { name: 'Bangle', code: 'BANGLE', description: 'Traditional and modern bangles' },
  { name: 'Anklet', code: 'ANKLET', description: 'Payals and ankle chains' },
  { name: 'Pendant', code: 'PENDANT', description: 'Lockets and stone pendants' },
  { name: 'Brooch', code: 'BROOCH', description: 'Pins and ornamental brooches' },
  { name: 'Maangtika', code: 'MAANGTIKA', description: 'Hairline forehead jewellery' },
  { name: 'Nose Ring', code: 'NOSERING', description: 'Naths and nose pins' },
  { name: 'Other', code: 'OTHER', description: 'Miscellaneous jewellery pieces' },
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await JewelleryCategory.findOne({ code: cat.code }).withDeleted();
      if (!existing) {
        await JewelleryCategory.create(cat);
        console.log(`Created category: ${cat.name} (${cat.code})`);
      } else if (existing.isDeleted) {
        await existing.restore();
        console.log(`Restored category: ${cat.name} (${cat.code})`);
      } else {
        console.log(`Already exists: ${cat.name} (${cat.code})`);
      }
    }

    console.log('Jewellery categories seeding complete');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
