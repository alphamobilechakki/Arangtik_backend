require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../src/modules/auth/user.model');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

async function generate() {
  try {
    await mongoose.connect(MONGO_URI);
    const user = await User.findOne({ phone: '918949056321' });
    const userId = user ? user._id : new mongoose.Types.ObjectId();
    const token = jwt.sign(
      { id: userId.toString(), role: 'user' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    console.log(token);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

generate();
