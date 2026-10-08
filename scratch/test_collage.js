const faceAI = require('../src/services/faceAI/faceAI.service');
const User = require('../src/modules/auth/user.model');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arangtik');
  const imgPath = path.resolve('uploads/img_muzhw5ae_a856f3.png');
  const faces = await faceAI.detectGalleryFaces(imgPath);
  console.log('Total faces detected in collage:', faces.length);

  const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');
  const wardrobes = await Wardrobe.find().select('+referenceFace.embedding');
  console.log('Wardrobes count:', wardrobes.length);
  for (const w of wardrobes) {
    console.log('Wardrobe:', w.name, 'owner:', w.ownerName, 'refFace:', w.referenceFace?.embedding?.length);
    if (w.referenceFace?.embedding) {
      const comp = faceAI.compareFaces(w.referenceFace.embedding, faces, 0.55);
      console.log(`Wardrobe "${w.name}" matched faces (threshold 0.55):`, comp.matchedFaces.length);
      console.log('Matched faces details:', comp.matchedFaces);
    }
  }
  process.exit(0);
}

run().catch(console.error);
