const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../src/config/db.config');
const Order = require('../src/modules/order/order.model');
const LaundryOrder = Order;
const RegisteredVendor = require('../src/modules/vendor/washerman/registeredVendor.model');
const VendorCategory = require('../src/modules/admin/vendorCategory/vendorCategory.model');

async function migrate() {
  await connectDB();
  const categories = await VendorCategory.find().lean();
  console.log('Active categories:', categories.map(c => c.name));

  const orders = await LaundryOrder.find();
  for (const o of orders) {
    let resolved = null;
    if (o.vendorId) {
      const reg = await RegisteredVendor.findById(o.vendorId).lean();
      if (reg && reg.category) resolved = reg.category;
    }
    if (!resolved && o.vendorPhone) {
      const reg = await RegisteredVendor.findOne({ phone: o.vendorPhone }).lean();
      if (reg && reg.category) resolved = reg.category;
    }
    if (!resolved && o.vendorName) {
      for (const cat of categories) {
        if (new RegExp(cat.name, 'i').test(o.vendorName)) {
          resolved = cat.name;
          break;
        }
      }
    }
    if (!resolved) {
      resolved = 'Dhobi';
    }

    o.orderCategory = resolved;
    await o.save();
    console.log(`Order ${o.orderNumber} -> ${resolved} (vendor: ${o.vendorName}, phone: ${o.vendorPhone})`);
  }

  const check = await LaundryOrder.aggregate([
    { $group: { _id: '$orderCategory', count: { $sum: 1 } } }
  ]);
  console.log('Final Order Category Distribution:', check);
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
