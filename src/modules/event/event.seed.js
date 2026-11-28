const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const EventType = require('./eventType.model');

const defaultEventTypes = [
  { name: 'Wedding', code: 'WEDDING', icon: 'heart', sortOrder: 1 },
  { name: 'Party & Celebration', code: 'PARTY', icon: 'party-popper', sortOrder: 2 },
  { name: 'Birthday', code: 'BIRTHDAY', icon: 'cake', sortOrder: 3 },
  { name: 'Date Night', code: 'DATE_NIGHT', icon: 'sparkles', sortOrder: 4 },
  { name: 'Office & Meeting', code: 'FORMAL_MEETING', icon: 'briefcase', sortOrder: 5 },
  { name: 'Festival & Puja', code: 'FESTIVAL', icon: 'flame', sortOrder: 6 },
  { name: 'Casual Outing', code: 'CASUAL_OUTING', icon: 'coffee', sortOrder: 7 },
  { name: 'Vacation & Travel', code: 'VACATION', icon: 'plane', sortOrder: 8 },
  { name: 'Sports & Fitness', code: 'SPORTS', icon: 'dumbbell', sortOrder: 9 },
];

const seedEventTypes = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arangtik';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB for seeding event types');
    }

    for (const item of defaultEventTypes) {
      await EventType.findOneAndUpdate(
        { code: item.code },
        { $set: item },
        { upsert: true, new: true }
      );
    }

    console.log(`Successfully seeded ${defaultEventTypes.length} EventTypes!`);
    if (require.main === module) {
      await mongoose.disconnect();
      process.exit(0);
    }
  } catch (err) {
    console.error('Failed to seed event types:', err);
    if (require.main === module) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  seedEventTypes();
}

module.exports = seedEventTypes;
