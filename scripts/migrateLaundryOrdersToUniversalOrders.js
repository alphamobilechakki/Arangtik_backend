const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env.config');
const Order = require('../src/modules/order/order.model');

async function migrate() {
  console.log('[MIGRATION START]: Migrating laundryorders collection into universal orders collection...');
  await mongoose.connect(MONGODB_URI);
  console.log('[MongoDB Connected]');

  const db = mongoose.connection.db;

  // Check if laundryorders exists
  const collections = await db.listCollections().toArray();
  const hasLaundryOrders = collections.some((c) => c.name === 'laundryorders');

  if (!hasLaundryOrders) {
    console.log('[Notice]: laundryorders collection not found. No migration needed.');
    await mongoose.disconnect();
    return;
  }

  const laundryOrdersCollection = db.collection('laundryorders');
  const existingLaundryOrders = await laundryOrdersCollection.find().toArray();
  console.log(`Found ${existingLaundryOrders.length} orders in 'laundryorders'.`);

  const ordersCollection = db.collection('orders');

  let insertedCount = 0;
  let updatedCount = 0;

  for (const doc of existingLaundryOrders) {
    // Ensure orderCategory is explicitly 'Dhobi'
    if (!doc.orderCategory || doc.orderCategory === 'LAUNDRY') {
      doc.orderCategory = 'Dhobi';
    }
    if (!doc.orderType) {
      doc.orderType = 'SERVICE';
    }

    const res = await ordersCollection.replaceOne(
      { _id: doc._id },
      doc,
      { upsert: true }
    );

    if (res.upsertedCount > 0) {
      insertedCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(`[Universal Orders]: ${insertedCount} inserted, ${updatedCount} updated.`);

  // Sync indexes on the universal orders collection
  await Order.syncIndexes();
  console.log('[Universal Orders Indexes Synced]');

  // Verify total in orders
  const totalInOrders = await ordersCollection.countDocuments();
  console.log(`[Verification]: Total documents in 'orders' collection: ${totalInOrders}`);

  const breakdown = await ordersCollection.aggregate([
    { $group: { _id: '$orderCategory', count: { $sum: 1 } } },
  ]).toArray();
  console.log('Breakdown by orderCategory:', breakdown);

  await mongoose.disconnect();
  console.log('[MIGRATION COMPLETE]: Universal orders collection is active and ready.');
}

migrate().catch((err) => {
  console.error('[MIGRATION ERROR]:', err);
  process.exit(1);
});
