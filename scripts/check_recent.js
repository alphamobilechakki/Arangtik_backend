const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');

async function checkRecent() {
  await connectDB();
  const items = await WardrobeItem.find().sort({ createdAt: -1 }).limit(10).lean();
  console.log('=== RECENT 10 WARDROBE ITEMS IN DB ===');
  items.forEach((it, idx) => {
    console.log(`[#${idx + 1}] ID: ${it._id}`);
    console.log(`  User: ${it.userId}`);
    console.log(`  Name: ${it.name}`);
    console.log(`  Category: ${it.category}`);
    console.log(`  Status: ${it.processingStatus}`);
    console.log(`  Created: ${it.createdAt}`);
    console.log(`  SourcePhoto: ${it.sourcePhotoUrl}`);
    console.log(`  Images:`, JSON.stringify(it.images));
    console.log('-----------------------------------------');
  });
  await mongoose.disconnect();
}
checkRecent().catch(console.error);
