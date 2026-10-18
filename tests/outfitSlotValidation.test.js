const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');
const outfitService = require('../src/modules/outfit/outfit.service');
const User = require('../src/modules/auth/user.model');

test('Outfit Slot Classification & Men\'s Upper/Lower Wear Suggestion Verification', async (t) => {
  await connectDB();

  const testUserId = new mongoose.Types.ObjectId();
  const testPhone = '97' + Date.now().toString().slice(-8);

  // Create test user (MALE)
  await User.create({
    _id: testUserId,
    name: 'Rohit Sharma',
    phone: testPhone,
    role: 'USER',
    gender: 'MALE',
    status: 'active',
  });

  const testWardrobe = await Wardrobe.create({
    userId: testUserId,
    name: 'Men Almari',
    isDefault: true,
  });

  await t.test('1. classifySlot: Upper wear with "short" or "kurta" in name is strictly TOP and NEVER LOWER_WEAR', () => {
    // Items with "short" in name / subCategory must NEVER be classified as LOWER_WEAR
    const shortSleeveShirt = outfitService.classifySlot({
      name: 'Short Sleeve Linen Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
    });
    assert.strictEqual(shortSleeveShirt, 'UPPER_WEAR', 'Short Sleeve Linen Shirt must be UPPER_WEAR');

    const shortKurtaUpper = outfitService.classifySlot({
      name: 'Short Kurta',
      category: 'UPPER_WEAR',
      subCategory: 'Kurta',
    });
    assert.strictEqual(shortKurtaUpper, 'UPPER_WEAR', 'Short Kurta with UPPER_WEAR must be UPPER_WEAR');

    const shortKurtaTrad = outfitService.classifySlot({
      name: 'Men Short Kurta',
      category: 'TRADITIONAL',
      subCategory: 'Kurta',
    });
    assert.strictEqual(shortKurtaTrad, 'UPPER_WEAR', 'Standalone Kurta with TRADITIONAL must be UPPER_WEAR');

    const shortSleevePolo = outfitService.classifySlot({
      name: 'Short Sleeve Polo T-Shirt',
      category: '',
      subCategory: 'Polo',
    });
    assert.strictEqual(shortSleevePolo, 'UPPER_WEAR', 'Short Sleeve Polo without explicit category must be UPPER_WEAR');

    const pantoneShirt = outfitService.classifySlot({
      name: 'Pantone Printed Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
    });
    assert.strictEqual(pantoneShirt, 'UPPER_WEAR', 'Shirt with "pant" in title must be UPPER_WEAR, not LOWER_WEAR');
  });

  await t.test('2. classifySlot: Lower wear items (shorts, chinos, jeans) are strictly LOWER_WEAR', () => {
    const chinoShorts = outfitService.classifySlot({
      name: 'Cotton Chino Shorts',
      category: 'LOWER_WEAR',
      subCategory: 'Shorts',
    });
    assert.strictEqual(chinoShorts, 'LOWER_WEAR', 'Chino Shorts must be LOWER_WEAR');

    const bermudaShorts = outfitService.classifySlot({
      name: 'Navy Bermuda Shorts',
      category: '',
      subCategory: 'Shorts',
    });
    assert.strictEqual(bermudaShorts, 'LOWER_WEAR', 'Shorts without explicit category must be LOWER_WEAR');

    const denimJeans = outfitService.classifySlot({
      name: 'Slim Fit Dark Blue Jeans',
      category: 'LOWER_WEAR',
      subCategory: 'Jeans',
    });
    assert.strictEqual(denimJeans, 'LOWER_WEAR', 'Jeans must be LOWER_WEAR');

    const trousers = outfitService.classifySlot({
      name: 'Formal Black Trousers',
      category: 'LOWER_WEAR',
      subCategory: 'Trousers',
    });
    assert.strictEqual(trousers, 'LOWER_WEAR', 'Trousers must be LOWER_WEAR');
  });

  await t.test('3. classifySlot: Traditional wear correctly distinguishes separates vs full ensembles', () => {
    const standaloneKurta = outfitService.classifySlot({
      name: 'Cotton Chikankari Kurta',
      category: 'TRADITIONAL',
      subCategory: 'Kurta',
    });
    assert.strictEqual(standaloneKurta, 'UPPER_WEAR', 'Standalone Kurta must be UPPER_WEAR');

    const kurtaSet = outfitService.classifySlot({
      name: 'Festive Kurta Set with Pajama',
      category: 'TRADITIONAL',
      subCategory: 'Kurta Set',
    });
    assert.strictEqual(kurtaSet, 'ONE_PIECE', 'Kurta Set must be ONE_PIECE ensemble');

    const traditionalDhoti = outfitService.classifySlot({
      name: 'Silk Dhoti',
      category: 'TRADITIONAL',
      subCategory: 'Dhoti',
    });
    assert.strictEqual(traditionalDhoti, 'LOWER_WEAR', 'Dhoti must be LOWER_WEAR');
  });

  await t.test('4. suggestOutfits: Men\'s wardrobe pairs Upper Wear as Top and Lower Wear as Bottom without mixing', async () => {
    // Add 1 Short Sleeve Shirt (Upper) + 1 Chino Shorts (Lower)
    const shirt = await WardrobeItem.create({
      userId: testUserId,
      wardrobeId: testWardrobe._id,
      name: 'Short Sleeve Linen Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      color: 'White',
      pattern: 'Solid',
      status: 'ACTIVE',
    });

    const shorts = await WardrobeItem.create({
      userId: testUserId,
      wardrobeId: testWardrobe._id,
      name: 'Navy Blue Chino Shorts',
      category: 'LOWER_WEAR',
      subCategory: 'Shorts',
      color: 'Navy Blue',
      pattern: 'Solid',
      status: 'ACTIVE',
    });

    const result = await outfitService.suggestOutfits(testUserId, {
      wardrobeId: testWardrobe._id.toString(),
      occasion: 'CASUAL',
      limit: 3,
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.outfits.length >= 1, 'Should generate at least 1 outfit');

    const firstOutfit = result.outfits[0];
    assert.strictEqual(firstOutfit.items.length, 2, '2-piece outfit must have 2 items');

    const topItem = firstOutfit.items.find((i) => i.slot === 'UPPER_WEAR');
    const bottomItem = firstOutfit.items.find((i) => i.slot === 'LOWER_WEAR');

    assert.ok(topItem, 'Outfit must have an UPPER_WEAR item');
    assert.ok(bottomItem, 'Outfit must have a LOWER_WEAR item');

    // Verify top is strictly the shirt, and bottom is strictly the shorts
    assert.strictEqual(topItem.name, 'Short Sleeve Linen Shirt', 'Top item must be the Short Sleeve Shirt');
    assert.strictEqual(bottomItem.name, 'Navy Blue Chino Shorts', 'Bottom item must be the Chino Shorts');

    // Clean items for next test
    await WardrobeItem.deleteMany({ userId: testUserId });
  });

  await t.test('5. suggestOutfits: Wardrobe with ONLY upper wear NEVER pairs two shirts as top + bottom', async () => {
    // Add TWO shirts, ZERO pants/bottoms
    await WardrobeItem.create({
      userId: testUserId,
      wardrobeId: testWardrobe._id,
      name: 'Short Sleeve Casual Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      color: 'Olive Green',
      status: 'ACTIVE',
    });

    await WardrobeItem.create({
      userId: testUserId,
      wardrobeId: testWardrobe._id,
      name: 'Classic White Formal Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      color: 'White',
      status: 'ACTIVE',
    });

    const result = await outfitService.suggestOutfits(testUserId, {
      wardrobeId: testWardrobe._id.toString(),
      occasion: 'CASUAL',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.count, 0, 'Must NOT generate outfits when only shirts exist');
    assert.strictEqual(result.outfits.length, 0, 'No combinations should be created from shirts alone');
    assert.ok(result.missingSlots.includes('bottoms'), 'Should flag bottoms as missing');

    await WardrobeItem.deleteMany({ userId: testUserId });
  });

  await t.test('6. suggestOutfits: Men\'s Kurta + Trousers properly pairs Kurta as Top and Trousers as Bottom', async () => {
    await WardrobeItem.create({
      userId: testUserId,
      wardrobeId: testWardrobe._id,
      name: 'Men White Linen Kurta',
      category: 'TRADITIONAL',
      subCategory: 'Kurta',
      color: 'White',
      status: 'ACTIVE',
    });

    await WardrobeItem.create({
      userId: testUserId,
      wardrobeId: testWardrobe._id,
      name: 'Beige Cotton Trousers',
      category: 'LOWER_WEAR',
      subCategory: 'Trousers',
      color: 'Beige',
      status: 'ACTIVE',
    });

    const result = await outfitService.suggestOutfits(testUserId, {
      wardrobeId: testWardrobe._id.toString(),
      occasion: 'FESTIVE',
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.outfits.length >= 1, 'Should generate festive kurta pairing');

    const outfit = result.outfits[0];
    const topItem = outfit.items.find((i) => i.slot === 'UPPER_WEAR');
    const bottomItem = outfit.items.find((i) => i.slot === 'LOWER_WEAR');

    assert.strictEqual(topItem.name, 'Men White Linen Kurta', 'Kurta must be UPPER_WEAR');
    assert.strictEqual(bottomItem.name, 'Beige Cotton Trousers', 'Trousers must be LOWER_WEAR');
  });

  // Cleanup
  await WardrobeItem.deleteMany({ userId: testUserId });
  await Wardrobe.deleteMany({ userId: testUserId });
  await User.deleteMany({ _id: testUserId });
  await mongoose.disconnect();
});
