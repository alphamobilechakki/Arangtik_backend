const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const items = await mongoose.connection.collection('wardrobeitems').find({ 'model3d.url': { $ne: null } }).toArray();
  console.log(JSON.stringify(items.map(i => ({ id: i._id, name: i.name, model3d: i.model3d, images: i.images })), null, 2));
  process.exit(0);
}
check();
