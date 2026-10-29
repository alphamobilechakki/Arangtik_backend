require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../src/modules/category/category.model');
const CategoryService = require('../src/modules/categoryService/categoryService.model');
const Vendor = require('../src/modules/vendor/vendor.model');

const VENDOR_TEMPLATES = [
  // 1. WASHERMAN (LAUNDRY & DRY CLEAN)
  {
    categoryName: 'Washerman',
    name: 'Ramdhani Dhobi & Dry Cleaners',
    businessName: 'Shri Ramdhani Express Laundry & Steam Press',
    phone: '919810112233',
    rating: 4.85,
    totalOrdersHandled: 240,
    address: {
      street: 'Shop 4, Main Market, Sector 14',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122001',
    },
    location: {
      type: 'Point',
      coordinates: [77.0423, 28.4732],
    },
    priceMultiplier: 1.0,
  },
  {
    categoryName: 'Washerman',
    name: 'Apex Fabric Care & Express Press',
    businessName: 'Apex Premium Laundromat & Dry Clean',
    phone: '919811223344',
    rating: 4.92,
    totalOrdersHandled: 410,
    address: {
      street: 'B-12, Vaibhav Khand, Indirapuram',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      pincode: '201014',
    },
    location: {
      type: 'Point',
      coordinates: [77.3686, 28.6389],
    },
    priceMultiplier: 1.15,
  },

  // 2. TAILOR & ALTERATIONS
  {
    categoryName: 'Tailor & Alterations',
    name: 'Master Irfan Ahmed Tailors',
    businessName: 'Irfan Bespoke Tailoring & Alteration Studio',
    phone: '919820334455',
    rating: 4.90,
    totalOrdersHandled: 520,
    address: {
      street: 'G-8, Central Market, Mall Road',
      city: 'Kanpur',
      state: 'Uttar Pradesh',
      pincode: '208001',
    },
    location: {
      type: 'Point',
      coordinates: [80.3319, 26.4499],
    },
    priceMultiplier: 1.0,
  },
  {
    categoryName: 'Tailor & Alterations',
    name: 'Meenakshi Boutique & Alteration Hub',
    businessName: 'Meenakshi Couture & Precision Alterations',
    phone: '919821445566',
    rating: 4.78,
    totalOrdersHandled: 310,
    address: {
      street: '14/2, Central Market, Lajpat Nagar II',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110024',
    },
    location: {
      type: 'Point',
      coordinates: [77.2433, 28.5694],
    },
    priceMultiplier: 1.2,
  },

  // 3. SHOE CARE & COBBLER
  {
    categoryName: 'Shoe Care & Cobbler',
    name: 'Kishan Lal Cobbler & Leather Care',
    businessName: 'Kishan Royal Shoe Repair, Stitching & Care',
    phone: '919830556677',
    rating: 4.88,
    totalOrdersHandled: 670,
    address: {
      street: 'Stall 3, Near Metro Gate 2, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
    location: {
      type: 'Point',
      coordinates: [77.2195, 28.6315],
    },
    priceMultiplier: 1.0,
  },
  {
    categoryName: 'Shoe Care & Cobbler',
    name: 'The Sneaker Lab & Restoration Hub',
    businessName: 'Sneaker Clean Pro & Boot Care Studio',
    phone: '919831667788',
    rating: 4.95,
    totalOrdersHandled: 290,
    address: {
      street: 'Shop 18, Ground Floor, Galleria Market, DLF Phase 4',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122009',
    },
    location: {
      type: 'Point',
      coordinates: [77.0818, 28.4682],
    },
    priceMultiplier: 1.3,
  },

  // 4. FLOUR MILL (CHAKKI)
  {
    categoryName: 'Flour Mill (Chakki)',
    name: 'Brijwasi Shudh Atta Chakki',
    businessName: 'Brijwasi Fresh Stone Flour & Spice Mill',
    phone: '919840778899',
    rating: 4.92,
    totalOrdersHandled: 1150,
    address: {
      street: '21, Purani Anaj Mandi, Station Road',
      city: 'Alwar',
      state: 'Rajasthan',
      pincode: '301001',
    },
    location: {
      type: 'Point',
      coordinates: [76.6083, 27.5530],
    },
    priceMultiplier: 1.0,
  },
  {
    categoryName: 'Flour Mill (Chakki)',
    name: 'Annapurna Organic Fresh Mills',
    businessName: 'Annapurna Millet & Grain Processing Chakki',
    phone: '919841889900',
    rating: 4.86,
    totalOrdersHandled: 480,
    address: {
      street: 'Plot 9, Sector 3, Malviya Nagar',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302017',
    },
    location: {
      type: 'Point',
      coordinates: [75.8185, 26.8523],
    },
    priceMultiplier: 1.1,
  },

  // 5. MILK & FRESH DAIRY
  {
    categoryName: 'Milk & Fresh Dairy',
    name: 'Kailash Dairy & Pure Gau Seva',
    businessName: 'Kailash Fresh Cow & Buffalo Milk Booth',
    phone: '919850990011',
    rating: 4.94,
    totalOrdersHandled: 1680,
    address: {
      street: 'Booth 10, Civil Lines, Near Krishna Nagar',
      city: 'Mathura',
      state: 'Uttar Pradesh',
      pincode: '281001',
    },
    location: {
      type: 'Point',
      coordinates: [77.6737, 27.4924],
    },
    priceMultiplier: 1.0,
  },
  {
    categoryName: 'Milk & Fresh Dairy',
    name: 'Gowardhan Pure Dairy Depot',
    businessName: 'Gowardhan Farm Fresh Milk & Paneer Depot',
    phone: '919851001122',
    rating: 4.80,
    totalOrdersHandled: 590,
    address: {
      street: 'Shop 5, Sector 22 Market',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
    },
    location: {
      type: 'Point',
      coordinates: [77.3489, 28.5975],
    },
    priceMultiplier: 1.05,
  },

  // 6. CHIMNEY & APPLIANCE CARE
  {
    categoryName: 'Chimney & Appliance Care',
    name: 'Rajesh Appliance Care & RO Solutions',
    businessName: 'Rajesh Home Care & Chimney Deep Cleaning Experts',
    phone: '919860112233',
    rating: 4.87,
    totalOrdersHandled: 430,
    address: {
      street: 'Shop 102, Shankar Market, Outer Circle, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
    location: {
      type: 'Point',
      coordinates: [77.2218, 28.6329],
    },
    priceMultiplier: 1.0,
  },
];

async function seedVendors() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB:', mongoose.connection.name);
  console.log('Target Collection for Vendors:', Vendor.collection.name);

  const categories = await Category.find();
  const catByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]));

  let insertedCount = 0;
  let updatedCount = 0;

  for (const t of VENDOR_TEMPLATES) {
    const cat = catByName.get(t.categoryName.trim().toLowerCase());
    if (!cat) {
      console.warn(`⚠️ Category "${t.categoryName}" not found in DB, skipping vendor "${t.name}"`);
      continue;
    }

    // Load services belonging to this category
    const catServices = await CategoryService.find({ categoryId: cat._id });

    const vendorServices = catServices.map((srv) => {
      const base = srv.basePrice || srv.price || 50;
      const calculatedPrice = Math.round(base * (t.priceMultiplier || 1.0));
      return {
        serviceId: srv._id,
        name: srv.name,
        isOffered: true,
        price: calculatedPrice,
      };
    });

    const offeredNames = vendorServices.map((s) => s.name);

    const vendorPayload = {
      name: t.name,
      businessName: t.businessName,
      phone: t.phone,
      categoryId: cat._id,
      category: cat.name,
      primaryCategory: cat.name,
      categories: [cat.name],
      services: vendorServices,
      offeredServices: offeredNames,
      rating: t.rating,
      totalOrdersHandled: t.totalOrdersHandled,
      status: 'ACTIVE',
      isRegistered: true,
      isVerified: true,
      address: t.address,
      location: t.location,
    };

    const existing = await Vendor.findOne({ phone: t.phone });
    if (existing) {
      Object.assign(existing, vendorPayload);
      await existing.save();
      updatedCount++;
      console.log(`🔄 Updated vendor: ${t.name} (${cat.name}) - ${t.phone}`);
    } else {
      const created = new Vendor(vendorPayload);
      await created.save();
      insertedCount++;
      console.log(`➕ Created vendor: ${t.name} (${cat.name}) - ${t.phone} [ID: ${created.vendorId}]`);
    }
  }

  const totalInCollection = await Vendor.countDocuments();
  console.log('\n=============================================');
  console.log(`🎉 Vendor Seeding Completed!`);
  console.log(`Collection: "${Vendor.collection.name}"`);
  console.log(`Inserted: ${insertedCount}, Updated: ${updatedCount}, Total in DB: ${totalInCollection}`);
  console.log('=============================================\n');

  await mongoose.disconnect();
}

seedVendors().catch((err) => {
  console.error('❌ Error seeding vendors:', err);
  process.exit(1);
});
