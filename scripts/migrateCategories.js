const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arangtik');
  console.log('Connected to MongoDB');

  // 1. Check existing categories
  const categories = await mongoose.connection.collection('vendorcategories').find({}).toArray();
  console.log('Current Vendor Categories:', categories.map(c => c.name));

  // Determine target primary category for Washerman
  const targetCategory = categories.find(c => c.name.toLowerCase() === 'washerman')?.name || 'Washerman';

  // 2. Migrate Orders
  const orderRes = await mongoose.connection.collection('orders').updateMany(
    { orderCategory: { $regex: /^dhobi$/i } },
    { $set: { orderCategory: targetCategory } }
  );
  console.log(`Migrated ${orderRes.modifiedCount} orders from 'Dhobi' to '${targetCategory}'`);

  // 3. Migrate Registered Vendors
  const vendorRes1 = await mongoose.connection.collection('registeredvendors').updateMany(
    { category: { $regex: /^dhobi$/i } },
    { $set: { category: targetCategory } }
  );
  const vendorRes2 = await mongoose.connection.collection('registeredvendors').updateMany(
    { primaryCategory: { $regex: /^dhobi$/i } },
    { $set: { primaryCategory: targetCategory } }
  );
  const vendorRes3 = await mongoose.connection.collection('registeredvendors').updateMany(
    { categories: { $regex: /^dhobi$/i } },
    { $set: { 'categories.$[elem]': targetCategory } },
    { arrayFilters: [{ elem: { $regex: /^dhobi$/i } }] }
  );
  console.log(`Migrated registered vendors: category (${vendorRes1.modifiedCount}), primaryCategory (${vendorRes2.modifiedCount}), categories array (${vendorRes3.modifiedCount})`);

  // 4. Verify category distribution in orders
  const dist = await mongoose.connection.collection('orders').aggregate([
    { $group: { _id: '$orderCategory', count: { $sum: 1 } } }
  ]).toArray();
  console.log('Updated Order Categories Distribution:', dist);

  await mongoose.disconnect();
  console.log('Migration completed successfully.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
