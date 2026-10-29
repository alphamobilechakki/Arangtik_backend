require('dotenv').config();
const mongoose = require('mongoose');

const Vendor = require('../src/modules/vendor/vendor.model');
const VendorService = require('../src/modules/vendorService/vendorService.model');
const Category = require('../src/modules/category/category.model');
const CategoryService = require('../src/modules/categoryService/categoryService.model');

// ============================================================
// 25+ HIGH-QUALITY REALISTIC INDIAN VENDOR BLUEPRINTS
// ============================================================
const REALISTIC_VENDORS = [
  // ------------------------------------------------------------
  // 1. WASHERMAN / LAUNDRY & STEAM PRESS
  // ------------------------------------------------------------
  {
    name: 'Ramdhani Verma',
    businessName: 'Shri Ramdhani Express Laundry & Steam Press',
    phone: '919810112233',
    trade: 'Washerman',
    address: {
      street: 'Shop #4, Main Market, Sector 14',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122001',
    },
    location: { type: 'Point', coordinates: [77.0423, 28.4732] },
    rating: 4.85,
    totalOrdersHandled: 420,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-03-15T10:00:00.000Z'),
  },
  {
    name: 'Suresh Kumar Dhobi',
    businessName: 'Apex Premium Laundromat & Eco Steam Wash',
    phone: '919811223344',
    trade: 'Washerman',
    address: {
      street: 'B-12, Vaibhav Khand, Indirapuram',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      pincode: '201014',
    },
    location: { type: 'Point', coordinates: [77.3686, 28.6389] },
    rating: 4.9,
    totalOrdersHandled: 580,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-02-20T11:30:00.000Z'),
  },
  {
    name: 'Santosh Kanojia',
    businessName: 'Kanojia Express Dhobi Ghat & Rolling',
    phone: '919818334455',
    trade: 'Washerman',
    address: {
      street: 'Stall #18, Near Dhobi Ghat, Hauz Khas Village',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110016',
    },
    location: { type: 'Point', coordinates: [77.206, 28.5494] },
    rating: 4.75,
    totalOrdersHandled: 340,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-04-10T09:00:00.000Z'),
  },
  {
    name: 'Babu Lal Dhobi',
    businessName: 'QuickClean Steam Ironing & Wash Care',
    phone: '919829445566',
    trade: 'Washerman',
    address: {
      street: 'Plot 45, Gali #3, Raja Park',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302004',
    },
    location: { type: 'Point', coordinates: [75.8285, 26.8923] },
    rating: 4.8,
    totalOrdersHandled: 290,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-05-01T14:00:00.000Z'),
  },
  {
    name: 'Gopal Krishna',
    businessName: 'WhiteDove Professional Fabric Care',
    phone: '919845556677',
    trade: 'Washerman',
    address: {
      street: '88, 4th Block, 80 Feet Road, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560034',
    },
    location: { type: 'Point', coordinates: [77.6271, 12.9352] },
    rating: 4.92,
    totalOrdersHandled: 640,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-01-18T16:45:00.000Z'),
  },
  {
    name: 'Mukesh Kannaujia',
    businessName: 'Kannaujia Royal Ironing & Fabric Wash',
    phone: '919820667788',
    trade: 'Washerman',
    address: {
      street: 'Shop #8, Pali Hill Market, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
    },
    location: { type: 'Point', coordinates: [72.834, 19.0596] },
    rating: 4.88,
    totalOrdersHandled: 710,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-02-12T12:00:00.000Z'),
  },

  // ------------------------------------------------------------
  // 2. TAILOR & ALTERATIONS
  // ------------------------------------------------------------
  {
    name: 'Master Irfan Ahmed',
    businessName: 'Irfan Bespoke Tailoring & Alteration Studio',
    phone: '919820334455',
    trade: 'Tailor & Alterations',
    address: {
      street: 'G-8, Central Market, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
    location: { type: 'Point', coordinates: [77.2195, 28.6315] },
    rating: 4.95,
    totalOrdersHandled: 820,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-01-10T10:00:00.000Z'),
  },
  {
    name: 'Meenakshi Sundaram',
    businessName: 'Meenakshi Designer Boutique & Alteration Hub',
    phone: '919821445566',
    trade: 'Tailor & Alterations',
    address: {
      street: '14/2, Central Market, Lajpat Nagar II',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110024',
    },
    location: { type: 'Point', coordinates: [77.2433, 28.5694] },
    rating: 4.82,
    totalOrdersHandled: 510,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-03-25T15:30:00.000Z'),
  },
  {
    name: 'Mohammad Tariq',
    businessName: 'Tariq Master Fit Tailors & Suit Crafters',
    phone: '919822556677',
    trade: 'Tailor & Alterations',
    address: {
      street: 'Shop #22, Mall Road, Near Phoolbagh',
      city: 'Kanpur',
      state: 'Uttar Pradesh',
      pincode: '208001',
    },
    location: { type: 'Point', coordinates: [80.352, 26.467] },
    rating: 4.78,
    totalOrdersHandled: 390,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-04-14T11:00:00.000Z'),
  },
  {
    name: 'Naresh Chawla',
    businessName: 'Chawla Tailoring Point & Precision Alterations',
    phone: '919823667788',
    trade: 'Tailor & Alterations',
    address: {
      street: 'Booth 15, Sector 18 Market, Metro Gate 2',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
    },
    location: { type: 'Point', coordinates: [77.3259, 28.5708] },
    rating: 4.86,
    totalOrdersHandled: 460,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-02-28T14:15:00.000Z'),
  },
  {
    name: 'Gurpreet Singh',
    businessName: 'Singh Bespoke Tailors & Darning Specialists',
    phone: '919824778899',
    trade: 'Tailor & Alterations',
    address: {
      street: 'Shop 104, Galleria Market, DLF Phase 4',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122009',
    },
    location: { type: 'Point', coordinates: [77.0818, 28.4682] },
    rating: 4.91,
    totalOrdersHandled: 630,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-03-02T16:00:00.000Z'),
  },

  // ------------------------------------------------------------
  // 3. DRY CLEANING SPECIALISTS
  // ------------------------------------------------------------
  {
    name: 'Rajesh Khanna',
    businessName: 'Sparkle Prestige Dry Cleaners & Saree Rollers',
    phone: '919830112233',
    trade: 'Dry Cleaning',
    address: {
      street: 'Shop #31, Khan Market',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110003',
    },
    location: { type: 'Point', coordinates: [77.2285, 28.6002] },
    rating: 4.96,
    totalOrdersHandled: 950,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-01-05T09:00:00.000Z'),
  },
  {
    name: 'Vipul Singhal',
    businessName: 'Royal Rajputana Organic Dry Cleaners',
    phone: '919831223344',
    trade: 'Dry Cleaning',
    address: {
      street: 'B-14, M.I. Road, Near Panch Batti',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302001',
    },
    location: { type: 'Point', coordinates: [75.8115, 26.9182] },
    rating: 4.84,
    totalOrdersHandled: 440,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-04-18T10:30:00.000Z'),
  },
  {
    name: 'Deepak Mehrotra',
    businessName: 'Heritage Silk & Pashmina Dry Clean Studio',
    phone: '919832334455',
    trade: 'Dry Cleaning',
    address: {
      street: 'Shop #12, Hazratganj Main Market',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      pincode: '226001',
    },
    location: { type: 'Point', coordinates: [80.9462, 26.8524] },
    rating: 4.88,
    totalOrdersHandled: 520,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-03-11T13:20:00.000Z'),
  },
  {
    name: 'Anand Kulkarni',
    businessName: 'FabCare Eco Dry Cleaners & Suit Press',
    phone: '919833445566',
    trade: 'Dry Cleaning',
    address: {
      street: 'Plot 4, FC Road, Shivaji Nagar',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411005',
    },
    location: { type: 'Point', coordinates: [73.8425, 18.5284] },
    rating: 4.79,
    totalOrdersHandled: 370,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-05-08T15:00:00.000Z'),
  },

  // ------------------------------------------------------------
  // 4. SHOE CARE & COBBLER
  // ------------------------------------------------------------
  {
    name: 'Kishan Lal',
    businessName: 'Kishan Royal Shoe Repair, Stitching & Care',
    phone: '919830556677',
    trade: 'Shoe Care & Cobbler',
    address: {
      street: 'Stall #3, Metro Gate 2, Connaught Place',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
    location: { type: 'Point', coordinates: [77.2195, 28.6315] },
    rating: 4.88,
    totalOrdersHandled: 670,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-02-14T09:30:00.000Z'),
  },
  {
    name: 'Kabir Oberoi',
    businessName: 'Sneaker Lab & Premium Footwear Spa',
    phone: '919830445566',
    trade: 'Shoe Care & Cobbler',
    address: {
      street: 'DLF Cyber Hub, DLF Phase 2',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122002',
    },
    location: { type: 'Point', coordinates: [77.0878, 28.4595] },
    rating: 4.94,
    totalOrdersHandled: 780,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-01-22T11:00:00.000Z'),
  },
  {
    name: 'Ravi Shankar More',
    businessName: 'StepRight Leather Shoe Clinic & Heel Soling',
    phone: '919834667788',
    trade: 'Shoe Care & Cobbler',
    address: {
      street: 'Shop 7, Hill Road, Near Mehboob Studio, Bandra',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
    },
    location: { type: 'Point', coordinates: [72.8258, 19.0543] },
    rating: 4.86,
    totalOrdersHandled: 590,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-03-19T14:40:00.000Z'),
  },
  {
    name: 'Shankar Rao Cobbler',
    businessName: 'Shankar Heritage Cobbler Works & Sole Stitching',
    phone: '919835778899',
    trade: 'Shoe Care & Cobbler',
    address: {
      street: 'Kiosk 12, Commercial Street, Tasker Town',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
    },
    location: { type: 'Point', coordinates: [77.6085, 12.9818] },
    rating: 4.74,
    totalOrdersHandled: 310,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-04-29T10:15:00.000Z'),
  },

  // ------------------------------------------------------------
  // 5. BAGS & LEATHER CARE
  // ------------------------------------------------------------
  {
    name: 'Iqbal Mansoori',
    businessName: 'The Leather Doctor & Luxury Bag Spa',
    phone: '919840112233',
    trade: 'Bags & Leather Care',
    address: {
      street: 'Shop #15, Ground Floor, Defence Colony Market',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110024',
    },
    location: { type: 'Point', coordinates: [77.2312, 28.5744] },
    rating: 4.93,
    totalOrdersHandled: 620,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-01-30T12:00:00.000Z'),
  },
  {
    name: 'Sunil Rao',
    businessName: 'Urban Saddle Bag Spa & Luggage Doctor',
    phone: '919841223344',
    trade: 'Bags & Leather Care',
    address: {
      street: 'Shop 102, Sector 18 Market, Behind Wave Mall',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
    },
    location: { type: 'Point', coordinates: [77.3235, 28.5689] },
    rating: 4.81,
    totalOrdersHandled: 380,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-03-05T16:20:00.000Z'),
  },
  {
    name: 'Vikas Rathore',
    businessName: 'Pink City Leather Craft & Zipper Clinic',
    phone: '919842334455',
    trade: 'Bags & Leather Care',
    address: {
      street: 'Shop #42, Bapu Bazaar',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302003',
    },
    location: { type: 'Point', coordinates: [75.8239, 26.9204] },
    rating: 4.77,
    totalOrdersHandled: 270,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-04-02T11:45:00.000Z'),
  },

  // ------------------------------------------------------------
  // 6. DEFAULT TEST ACCOUNT (FOR INSTANT AUTHENTICATION)
  // ------------------------------------------------------------
  {
    name: 'Arangtik Partner Test Care',
    businessName: 'Arangtik Verified Test Partner Hub',
    phone: '918949056321', // Matches TEST_PHONE in env config
    trade: 'Washerman',
    address: {
      street: 'Unit #101, Test Center, DLF Cyber City',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122002',
    },
    location: { type: 'Point', coordinates: [77.0878, 28.4595] },
    rating: 5.0,
    totalOrdersHandled: 1250,
    status: 'ACTIVE',
    isVerified: true,
    verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
  },

  // ------------------------------------------------------------
  // 7. EDGE CASE VENDORS (INACTIVE & SUSPENDED FOR STATUS TESTING)
  // ------------------------------------------------------------
  {
    name: 'Prakash Chandra',
    businessName: 'Chandra Old School Laundry (Temporarily Closed)',
    phone: '919850112233',
    trade: 'Washerman',
    address: {
      street: 'Shop #9, Old Subzi Mandi',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110007',
    },
    location: { type: 'Point', coordinates: [77.2025, 28.675] },
    rating: 4.1,
    totalOrdersHandled: 180,
    status: 'INACTIVE',
    isVerified: false,
    verifiedAt: null,
  },
  {
    name: 'Dinesh Rathod',
    businessName: 'Rathod Quick Repair Services (Review Pending)',
    phone: '919851223344',
    trade: 'Shoe Care & Cobbler',
    address: {
      street: 'Plot #14, Sector 15 Market',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
    },
    location: { type: 'Point', coordinates: [77.3142, 28.5833] },
    rating: 3.9,
    totalOrdersHandled: 85,
    status: 'SUSPENDED',
    isVerified: false,
    verifiedAt: null,
  },
];

async function reseedVendors() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  await mongoose.connect(uri);
  console.log('✅ Connected to database:', mongoose.connection.name);

  // 1. Scan current vendor collection
  const existingVendorCount = await Vendor.countDocuments();
  console.log(`\n📊 Current vendors in database: ${existingVendorCount}`);

  // 2. Fetch all platform categories and services
  const categories = await Category.find();
  const categoryServices = await CategoryService.find();
  console.log(`📋 Found ${categories.length} platform categories and ${categoryServices.length} catalog services.`);

  const catMap = new Map();
  categories.forEach((c) => catMap.set(c.name.trim().toLowerCase(), c));

  // 3. Remove all existing documents from vendor collection
  console.log('\n🧹 Removing existing vendor documents from collection "vendor"...');
  const deleteResult = await Vendor.deleteMany({});
  console.log(`🗑️ Deleted ${deleteResult.deletedCount} documents from "vendor" collection.`);

  // Also reset vendor_services so we populate clean pricing relationships
  const deleteVsResult = await VendorService.deleteMany({});
  console.log(`🗑️ Cleared ${deleteVsResult.deletedCount} old entries from "vendorservices" collection.`);

  // 4. Insert new realistic vendors strictly adhering to vendor.model.js
  console.log('\n🚀 Inserting realistic vendors into "vendor" collection...');
  const createdVendors = [];

  for (let i = 0; i < REALISTIC_VENDORS.length; i++) {
    const raw = REALISTIC_VENDORS[i];
    const vendorId = `VND-2026-${String(i + 1).padStart(3, '0')}`;

    // Exactly matching vendor.model.js schema
    const vendorDoc = new Vendor({
      vendorId,
      name: raw.name,
      phone: raw.phone,
      businessName: raw.businessName,
      address: {
        street: raw.address.street,
        city: raw.address.city,
        state: raw.address.state,
        pincode: raw.address.pincode,
      },
      location: {
        type: 'Point',
        coordinates: raw.location.coordinates,
      },
      status: raw.status,
      isVerified: raw.isVerified,
      verifiedAt: raw.verifiedAt,
      rating: raw.rating,
      totalOrdersHandled: raw.totalOrdersHandled,
    });

    await vendorDoc.save();
    createdVendors.push({ vendor: vendorDoc, trade: raw.trade });

    console.log(
      `   ✅ [${vendorId}] ${vendorDoc.name} | ${vendorDoc.businessName} (${raw.trade}) | ${vendorDoc.phone} | Status: ${vendorDoc.status}`
    );
  }

  // 5. Ensure indexes on vendor collection
  console.log('\n⚙️ Ensuring indexes on "vendor" collection...');
  await Vendor.collection.createIndex({ phone: 1 }, { unique: true });
  await Vendor.collection.createIndex({ vendorId: 1 }, { unique: true });
  await Vendor.collection.createIndex({ location: '2dsphere' });
  await Vendor.collection.createIndex({ status: 1, isVerified: 1 });
  console.log('✅ Indexes verified: phone (unique), vendorId (unique), location (2dsphere), status & isVerified compound.');

  // 6. Populate vendor services in vendorservices collection
  console.log('\n🔗 Configuring offered services in "vendorservices" collection...');
  let totalServicesAssigned = 0;

  for (const { vendor, trade } of createdVendors) {
    if (vendor.status !== 'ACTIVE') continue;

    // Find services matching vendor trade
    let matchedCatNames = [trade];
    if (trade === 'Washerman') {
      matchedCatNames.push('Dry Cleaning'); // Most Indian dhobis also offer dry cleaning
    }

    const targetCatIds = categories
      .filter((c) => matchedCatNames.map((n) => n.toLowerCase()).includes(c.name.trim().toLowerCase()))
      .map((c) => c._id.toString());

    const availableServices = categoryServices.filter((cs) => targetCatIds.includes(cs.categoryId.toString()));

    for (const srv of availableServices) {
      // Realistic variance (-5% to +15% of base price)
      const variance = 0.95 + Math.random() * 0.2;
      const finalPrice = Math.max(10, Math.round(srv.basePrice * variance));

      const vs = new VendorService({
        vendorId: vendor._id,
        serviceId: srv._id,
        price: finalPrice,
        durationMinutes: [15, 30, 45, 60, 90, 120][Math.floor(Math.random() * 6)],
        isAvailable: true,
        status: 'ACTIVE',
      });

      await vs.save();
      totalServicesAssigned++;
    }
  }

  console.log(`✅ Successfully assigned ${totalServicesAssigned} custom services across active vendors.`);

  // 7. Update orders in DB to point to active vendors
  console.log('\n📦 Re-linking existing orders to new realistic vendors...');
  const activeVendors = createdVendors.filter((v) => v.vendor.status === 'ACTIVE');
  const Order = require('../src/modules/order/order.model');
  const existingOrders = await Order.find({ vendorId: { $ne: null } });

  let updatedOrdersCount = 0;
  for (let i = 0; i < existingOrders.length; i++) {
    const order = existingOrders[i];
    const assigned = activeVendors[i % activeVendors.length].vendor;

    order.vendorId = assigned._id;
    order.vendorName = assigned.businessName || assigned.name;
    order.vendorPhone = assigned.phone;
    order.isRegisteredVendor = true;
    await order.save();
    updatedOrdersCount++;
  }
  console.log(`✅ Re-linked ${updatedOrdersCount} orders to new active registered vendors.`);

  // 8. Final verification & schema check
  const finalVendorCount = await Vendor.countDocuments();
  const sampleDoc = await Vendor.findOne().lean();

  console.log('\n======================================================');
  console.log('🎉 REALISTIC VENDOR RESEED COMPLETED SUCCESSFULLY!');
  console.log(`Total vendors now in database: ${finalVendorCount}`);
  console.log('Sample Document from "vendor" collection:');
  console.log(JSON.stringify(sampleDoc, null, 2));
  console.log('======================================================\n');

  await mongoose.disconnect();
}

reseedVendors().catch((err) => {
  console.error('❌ Reseeding failed:', err);
  process.exit(1);
});

