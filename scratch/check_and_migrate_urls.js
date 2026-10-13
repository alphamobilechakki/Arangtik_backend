const mongoose = require('mongoose');
require('dotenv').config();

const BASE_URL = (process.env.BASE_URL || 'https://api.arangtik.com').replace(/\/+$/, '');

function toFullUrl(val) {
  if (!val || typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${BASE_URL}${clean}`;
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB. Target BASE_URL:', BASE_URL);

  const db = mongoose.connection.db;

  // 1. Wardrobe items
  const items = await db.collection('wardrobeitems').find({}).toArray();
  let updatedItems = 0;
  for (const item of items) {
    let changed = false;
    let newSourcePhotoUrl = item.sourcePhotoUrl;
    if (item.sourcePhotoUrl && !item.sourcePhotoUrl.startsWith('http')) {
      newSourcePhotoUrl = toFullUrl(item.sourcePhotoUrl);
      changed = true;
    }

    let newImages = item.images;
    if (Array.isArray(item.images)) {
      newImages = item.images.map(img => {
        let imgChanged = false;
        let url = img.url;
        let thumb = img.thumbnailUrl;
        if (url && !url.startsWith('http')) {
          url = toFullUrl(url);
          imgChanged = true;
        }
        if (thumb && !thumb.startsWith('http')) {
          thumb = toFullUrl(thumb);
          imgChanged = true;
        }
        if (imgChanged) changed = true;
        return { ...img, url, thumbnailUrl: thumb };
      });
    }

    let newModel3d = item.model3d;
    if (item.model3d && item.model3d.url && !item.model3d.url.startsWith('http')) {
      newModel3d = { ...item.model3d, url: toFullUrl(item.model3d.url) };
      changed = true;
    }

    if (changed) {
      await db.collection('wardrobeitems').updateOne(
        { _id: item._id },
        {
          $set: {
            sourcePhotoUrl: newSourcePhotoUrl,
            images: newImages,
            model3d: newModel3d,
          }
        }
      );
      updatedItems++;
    }
  }
  console.log(`Updated ${updatedItems} / ${items.length} wardrobe items.`);

  // 2. Wardrobes
  const wardrobes = await db.collection('wardrobes').find({}).toArray();
  let updatedWardrobes = 0;
  for (const w of wardrobes) {
    let changed = false;
    let cover = w.coverImage;
    let face = w.ownerFaceImage;
    let refFace = w.referenceFace;

    if (cover && !cover.startsWith('http')) {
      cover = toFullUrl(cover);
      changed = true;
    }
    if (face && !face.startsWith('http')) {
      face = toFullUrl(face);
      changed = true;
    }
    if (refFace && refFace.imagePath && !refFace.imagePath.startsWith('http')) {
      refFace = { ...refFace, imagePath: toFullUrl(refFace.imagePath) };
      changed = true;
    }

    if (changed) {
      await db.collection('wardrobes').updateOne(
        { _id: w._id },
        { $set: { coverImage: cover, ownerFaceImage: face, referenceFace: refFace } }
      );
      updatedWardrobes++;
    }
  }
  console.log(`Updated ${updatedWardrobes} / ${wardrobes.length} wardrobes.`);

  // 3. Users
  const users = await db.collection('users').find({}).toArray();
  let updatedUsers = 0;
  for (const u of users) {
    let changed = false;
    let profile = u.profileImage;
    let refFace = u.referenceFace;

    if (profile && !profile.startsWith('http')) {
      profile = toFullUrl(profile);
      changed = true;
    }
    if (refFace && refFace.imagePath && !refFace.imagePath.startsWith('http')) {
      refFace = { ...refFace, imagePath: toFullUrl(refFace.imagePath) };
      changed = true;
    }

    if (changed) {
      await db.collection('users').updateOne(
        { _id: u._id },
        { $set: { profileImage: profile, referenceFace: refFace } }
      );
      updatedUsers++;
    }
  }
  console.log(`Updated ${updatedUsers} / ${users.length} users.`);

  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
