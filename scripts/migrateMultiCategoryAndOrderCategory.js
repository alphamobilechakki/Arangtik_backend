const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env.config');
const RegisteredVendor = require('../src/modules/vendor/washerman/registeredVendor.model');
const Order = require('../src/modules/order/order.model');
const LaundryOrder = Order;

async function migrate() {
  console.log('[MIGRATION START]: Synchronizing multi-category vendor support and explicit orderCategory...');
  await mongoose.connect(MONGODB_URI);
  console.log('[MongoDB Connected]');

  // 1. Migrate Registered Vendors
  const vendors = await RegisteredVendor.find();
  console.log(`Found ${vendors.length} registered vendors to check/update.`);

  let vendorsUpdated = 0;
  for (const vendor of vendors) {
    let changed = false;
    if (!Array.isArray(vendor.categories) || vendor.categories.length === 0) {
      vendor.categories = [vendor.category || 'Dhobi'];
      changed = true;
    }
    if (!vendor.primaryCategory) {
      vendor.primaryCategory = vendor.categories[0] || vendor.category || 'Dhobi';
      changed = true;
    }
    if (vendor.category !== vendor.primaryCategory) {
      vendor.category = vendor.primaryCategory;
      changed = true;
    }
    if (changed) {
      await vendor.save();
      vendorsUpdated++;
    }
  }
  console.log(`[Vendors Migrated]: ${vendorsUpdated} updated.`);

  // 2. Migrate Orders: Explicit orderCategory: 'Dhobi' for cloth/laundry work orders
  // The 2 orders that had 'Doodh Wala' are laundry orders (containing jeans, sarees, shirts, dresses)
  const laundryClothOrders = await LaundryOrder.find({
    $or: [
      { orderCategory: 'Doodh Wala' },
      { orderCategory: 'LAUNDRY' },
      { orderCategory: null },
      { orderCategory: { $exists: false } },
      { orderCategory: '' },
    ],
  });

  console.log(`Found ${laundryClothOrders.length} orders needing explicit 'Dhobi' category.`);
  let ordersUpdated = 0;
  for (const order of laundryClothOrders) {
    order.orderCategory = 'Dhobi';
    await order.save();
    ordersUpdated++;
  }
  console.log(`[Orders Migrated]: ${ordersUpdated} orders explicitly set to 'Dhobi'.`);

  // 3. Ensure MongoDB Indexes are created
  await RegisteredVendor.syncIndexes();
  console.log('[RegisteredVendor Indexes Synced]');

  await LaundryOrder.syncIndexes();
  console.log('[LaundryOrder Indexes Synced]');

  // 4. Verify results
  const updatedVendors = await RegisteredVendor.find().select('name phone category categories primaryCategory').lean();
  console.log('\n--- Registered Vendors After Migration ---');
  console.log(JSON.stringify(updatedVendors, null, 2));

  const orderStats = await LaundryOrder.aggregate([
    { $group: { _id: '$orderCategory', count: { $sum: 1 } } },
  ]);
  console.log('\n--- Orders Breakdown By Category ---');
  console.log(JSON.stringify(orderStats, null, 2));

  await mongoose.disconnect();
  console.log('\n[MIGRATION COMPLETE]: All multi-category vendor records and explicit Dhobi orders in sync.');
}

migrate().catch((err) => {
  console.error('[MIGRATION ERROR]:', err);
  process.exit(1);
});
