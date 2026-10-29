/**
 * Arangtik Realistic Database Seeder
 * 
 * Generates and seeds:
 * - 4 Store Types (Wardrobe, Footwear, Home Care, Luxury)
 * - 5 Service Categories (Washerman, Tailor, Dry Clean, Shoe Care, Leather Repair)
 * - 35 Category Services with standard pricing and units
 * - 200 Realistic Users (Indian names, phones, cities, addresses)
 * - 30 Registered Vendors (Full business profiles, coordinates, categories)
 * - 40 Unregistered Customer-Saved Vendors (Local neighborhood dhobis & tailors)
 * - 180+ Vendor-Service Price Overrides
 * - 220 User Wardrobes
 * - 500 Wardrobe Items with brands, fabrics, colors & wear counts
 * - 60 Styled Outfits
 * - 500 Orders spanning 9 months with realistic statuses, items, and totals
 * - 500 Payment Transactions
 * - 350 User Notifications
 * - 150 FCM Device Tokens
 * - 30 Recent OTP Records
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Models
const StoreType = require('../src/modules/admin/storeType/storeType.model');
const Category = require('../src/modules/category/category.model');
const CategoryService = require('../src/modules/categoryService/categoryService.model');
const User = require('../src/modules/auth/user.model');
const Vendor = require('../src/modules/vendor/vendor.model');
const UnregisteredVendor = require('../src/modules/vendor/unregistered/unregisteredVendor.model');
const VendorService = require('../src/modules/vendorService/vendorService.model');
const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const Outfit = require('../src/modules/outfit/outfit.model');
const Order = require('../src/modules/order/order.model');
const Transaction = require('../src/modules/order/transaction.model');
const Notification = require('../src/modules/notification/notification.model');
const DeviceToken = require('../src/modules/notification/deviceToken.model');
const Otp = require('../src/modules/auth/otp.model');

// ==========================================
// REALISTIC DATA GENERATORS & CONSTANTS
// ==========================================

const FIRST_NAMES_MALE = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Muhammad', 'Sai', 'Arnav', 'Aayush',
  'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Advaith', 'Aryan', 'Dhruv', 'Kabir',
  'Ritvik', 'Darsh', 'Kian', 'Rohan', 'Veer', 'Ayaan', 'Rudra', 'Ansh', 'Dev', 'Aarush',
  'Siddharth', 'Harsh', 'Yash', 'Kunal', 'Sameer', 'Alok', 'Nikhil', 'Gaurav', 'Manan', 'Shivam',
  'Varun', 'Tushar', 'Saurabh', 'Rahul', 'Amit', 'Abhishek', 'Deepak', 'Neeraj', 'Manish', 'Tarun',
  'Vikas', 'Sanjay', 'Rajesh', 'Suresh', 'Ramesh', 'Mukesh', 'Ajay', 'Sunil', 'Anil', 'Pankaj'
];

const FIRST_NAMES_FEMALE = [
  'Diya', 'Saanvi', 'Ananya', 'Aadhya', 'Pari', 'Anika', 'Navya', 'Angel', 'Myra', 'Avni',
  'Sara', 'Riya', 'Aarohi', 'Anaya', 'Shanaya', 'Siya', 'Kiara', 'Ira', 'Prisha', 'Ishita',
  'Rashi', 'Kashvi', 'Tanvi', 'Samaira', 'Bhavna', 'Sneha', 'Pooja', 'Neha', 'Priya', 'Ritu',
  'Meera', 'Shweta', 'Deepa', 'Sunita', 'Kavita', 'Rekha', 'Anita', 'Geeta', 'Nisha', 'Aarti',
  'Divya', 'Komal', 'Payal', 'Simran', 'Swati', 'Preeti', 'Richa', 'Pallavi', 'Shruti', 'Sonali'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Shah', 'Mehta', 'Joshi', 'Rao',
  'Nair', 'Iyer', 'Nambiar', 'Reddy', 'Choudhury', 'Das', 'Roy', 'Banerjee', 'Chatterjee', 'Mukherjee',
  'Sen', 'Bose', 'Dutta', 'Ghosh', 'Kulkarni', 'Deshmukh', 'Patil', 'Shinde', 'Pawar', 'More',
  'Bhat', 'Hegde', 'Pai', 'Shetty', 'Nayak', 'Agarwal', 'Bansal', 'Mittal', 'Goel', 'Garg',
  'Jindal', 'Singhal', 'Goyal', 'Kapoor', 'Malhotra', 'Khanna', 'Chopra', 'Sethi', 'Grover', 'Arora'
];

const CITIES = [
  { city: 'New Delhi', state: 'Delhi', pincode: '110001', lat: 28.6139, lng: 77.2090, areas: ['Connaught Place', 'Lajpat Nagar', 'South Extension', 'Hauz Khas', 'Karol Bagh', 'Vasant Kunj'] },
  { city: 'Gurugram', state: 'Haryana', pincode: '122001', lat: 28.4595, lng: 77.0266, areas: ['DLF Phase 1', 'DLF Phase 5', 'Sector 14', 'Sector 56', 'Golf Course Road', 'Cyber Hub'] },
  { city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', lat: 28.5355, lng: 77.3910, areas: ['Sector 18', 'Sector 62', 'Sector 50', 'Sector 137', 'Expressway Sector 128'] },
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400001', lat: 19.0760, lng: 72.8777, areas: ['Bandra West', 'Andheri West', 'Juhu', 'Powai', 'Colaba', 'Dadar West', 'Thane West'] },
  { city: 'Bengaluru', state: 'Karnataka', pincode: '560001', lat: 12.9716, lng: 77.5946, areas: ['Koramangala 4th Block', 'Indiranagar 100ft Rd', 'HSR Layout Sector 2', 'Whitefield', 'JP Nagar 6th Phase'] },
  { city: 'Pune', state: 'Maharashtra', pincode: '411001', lat: 18.5204, lng: 73.8567, areas: ['Koregaon Park', 'Baner', 'Viman Nagar', 'Kothrud', 'Hinjewadi Phase 1'] },
  { city: 'Hyderabad', state: 'Telangana', pincode: '500001', lat: 17.3850, lng: 78.4867, areas: ['Banjara Hills Rd 12', 'Jubilee Hills Rd 36', 'Gachibowli', 'Madhapur Hitec City', 'Kondapur'] },
  { city: 'Jaipur', state: 'Rajasthan', pincode: '302001', lat: 26.9124, lng: 75.7873, areas: ['C-Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Raja Park', 'Mansarovar'] },
  { city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', lat: 26.8467, lng: 80.9462, areas: ['Gomti Nagar Phase 2', 'Hazratganj', 'Aliganj', 'Indira Nagar'] },
  { city: 'Kolkata', state: 'West Bengal', pincode: '700001', lat: 22.5726, lng: 88.3639, areas: ['Salt Lake Sector 1', 'Park Street', 'Ballygunge Circular Rd', 'New Town Action Area 1'] }
];

const BRANDS = ['Zara', 'Marks & Spencer', 'Raymond', 'FabIndia', "Levi's", 'H&M', 'Manyavar', 'Allen Solly', 'Peter England', 'Louis Philippe', 'Van Heusen', 'Nike', 'Adidas', 'Puma', 'Clarks', 'Woodland', 'Biba', 'W for Woman', 'Tommy Hilfiger', 'Arrow'];
const FABRICS = ['100% Egyptian Cotton', 'Pure Linen', 'Raw Silk', 'Chanderi Cotton', 'Denim', 'Italian Wool', 'Satin', 'Georgette', 'Chiffon', 'Polyester Blend', 'Cashmere', 'Fine Corduroy'];
const COLORS = ['Navy Blue', 'Charcoal Grey', 'Olive Green', 'Classic White', 'Jet Black', 'Maroon', 'Pastel Pink', 'Beige', 'Mustard Yellow', 'Sky Blue', 'Royal Blue', 'Emerald Green', 'Burgundy', 'Ivory'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function getRandomDate(startDate, endDate) {
  return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
}

async function seedDatabase() {
  console.log('===============================================================');
  console.log('🌱 STARTING REALISTIC DATABASE POPULATION SUITE FOR ARANGTIK');
  console.log('===============================================================\n');

  const mongoUri = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arangtik').replace(
    /^(mongodb(?:\+srv)?:\/\/[^\/]+)\/\/+/i,
    '$1/'
  );
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB:', mongoose.connection.name);

  // ==========================================
  // 1. STORE TYPES
  // ==========================================
  console.log('\n--- 1. Creating Store Types ---');
  const storeTypesDef = [
    { name: 'Wardrobe & Apparel Care', code: 'WARDROBE', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=400&q=80' },
    { name: 'Footwear & Leather Studio', code: 'FOOTWEAR', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80' },
    { name: 'Home Furnishings & Drapes', code: 'HOME_CARE', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80' },
    { name: 'Luxury Couture & Designer', code: 'LUXURY', image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=400&q=80' }
  ];

  const storeTypeDocs = [];
  for (const st of storeTypesDef) {
    let doc = await StoreType.findOne({ code: st.code });
    if (!doc) {
      doc = await StoreType.create({ ...st, isActive: true });
    }
    storeTypeDocs.push(doc);
  }
  console.log(`✅ Seeded ${storeTypeDocs.length} Store Types.`);

  // ==========================================
  // 2. CATEGORIES
  // ==========================================
  console.log('\n--- 2. Creating Categories ---');
  const categoriesDef = [
    {
      name: 'Washerman',
      icon: 'local_laundry_service',
      description: 'Daily laundry, steam iron, starch press, and express wash by trusted local & premium dhobis.',
      storeTypes: [storeTypeDocs[0]._id, storeTypeDocs[2]._id],
      imageUrl: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=400&q=80',
      sortOrder: 1,
    },
    {
      name: 'Tailor & Alterations',
      icon: 'content_cut',
      description: 'Master tailors for size adjustments, waist tapering, zipper fixes, sleeve styling, and custom stitch.',
      storeTypes: [storeTypeDocs[0]._id, storeTypeDocs[3]._id],
      imageUrl: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=400&q=80',
      sortOrder: 2,
    },
    {
      name: 'Dry Cleaning',
      icon: 'dry_cleaning',
      description: 'Chemical-safe specialized fabric dry cleaning for suits, lehengas, silk sarees, and coats.',
      storeTypes: [storeTypeDocs[0]._id, storeTypeDocs[3]._id],
      imageUrl: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=400&q=80',
      sortOrder: 3,
    },
    {
      name: 'Shoe Care & Cobbler',
      icon: 'roller_skating',
      description: 'Deep sneaker cleaning, leather polish, sole re-stitching, heel tips, and shoe restoration.',
      storeTypes: [storeTypeDocs[1]._id],
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80',
      sortOrder: 4,
    },
    {
      name: 'Bags & Leather Care',
      icon: 'shopping_bag',
      description: 'Designer handbag rejuvenation, leather belt punching, zipper replacements, and strap fixing.',
      storeTypes: [storeTypeDocs[1]._id, storeTypeDocs[3]._id],
      imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80',
      sortOrder: 5,
    }
  ];

  const categoryDocs = [];
  for (const cat of categoriesDef) {
    let doc = await Category.findOne({ name: cat.name });
    if (!doc) {
      doc = await Category.create({ ...cat, isActive: true });
    }
    categoryDocs.push(doc);
  }
  console.log(`✅ Seeded ${categoryDocs.length} Categories.`);

  // ==========================================
  // 3. CATEGORY SERVICES
  // ==========================================
  console.log('\n--- 3. Creating Category Services ---');
  const servicesDef = [
    // Washerman
    { categoryName: 'Washerman', name: 'Wash & Steam Iron', basePrice: 30, unit: 'PIECE', icon: 'iron', description: 'Complete wash cycle followed by heavy wrinkle-free steam ironing.' },
    { categoryName: 'Washerman', name: 'Wash & Fold', basePrice: 20, unit: 'PIECE', icon: 'checkroom', description: 'Hygiene-certified machine wash and neat fabric folding.' },
    { categoryName: 'Washerman', name: 'Express Steam Press Only', basePrice: 15, unit: 'PIECE', icon: 'electric_bolt', description: 'Instant high-pressure steam press for crisp crease.' },
    { categoryName: 'Washerman', name: 'Heavy Woolen Wash', basePrice: 150, unit: 'PIECE', icon: 'ac_unit', description: 'Gentle wool cycle wash with fabric softener to avoid shrinkage.' },
    { categoryName: 'Washerman', name: 'Silk Garment Handwash', basePrice: 120, unit: 'PIECE', icon: 'spa', description: 'Zero-rub gentle cleansing for delicate tussar, raw silk & georgette.' },
    { categoryName: 'Washerman', name: 'Quilt & Blanket Care', basePrice: 350, unit: 'PIECE', icon: 'bed', description: 'Large industrial tumble drum sanitize wash for heavy quilts and rajais.' },
    { categoryName: 'Washerman', name: 'Bedsheet & Linen Wash', basePrice: 70, unit: 'PIECE', icon: 'single_bed', description: 'Deep wash, stain removal and crease-free roller press for bed linens.' },

    // Tailor & Alterations
    { categoryName: 'Tailor & Alterations', name: 'Trouser / Jeans Length Hemming', basePrice: 90, unit: 'PIECE', icon: 'straighten', description: 'Shorten or lengthen trouser cuff with factory-matched thread stitching.' },
    { categoryName: 'Tailor & Alterations', name: 'Waist Tightening / Loosening', basePrice: 140, unit: 'PIECE', icon: 'tune', description: 'Precision waist darts and seam adjustments for perfect fit.' },
    { categoryName: 'Tailor & Alterations', name: 'Metallic Zipper Replacement', basePrice: 120, unit: 'PIECE', icon: 'lock', description: 'Genuine high-durability YKK metal zipper installation.' },
    { categoryName: 'Tailor & Alterations', name: 'Sleeve Length / Slimming', basePrice: 160, unit: 'PIECE', icon: 'pan_tool', description: 'Sleeve tapering and cuff adjustment for shirts, blazers and kurtas.' },
    { categoryName: 'Tailor & Alterations', name: 'Custom Blouse Stitching', basePrice: 650, unit: 'PIECE', icon: 'style', description: 'Master bespoke stitching as per customer size measurements.' },
    { categoryName: 'Tailor & Alterations', name: 'Suit / Blazer Fitting Alteration', basePrice: 500, unit: 'PIECE', icon: 'how_to_reg', description: 'Full body silhouette profile sculpting and shoulder balancing.' },
    { categoryName: 'Tailor & Alterations', name: 'Tear Repair & Darning (Raffu)', basePrice: 80, unit: 'PIECE', icon: 'healing', description: 'Invisible micro-darning to seal cloth tears and rips.' },

    // Dry Cleaning
    { categoryName: 'Dry Cleaning', name: '2-Piece Formal Suit Dry Clean', basePrice: 350, unit: 'PAIR', icon: 'dry_cleaning', description: 'Perchloroethylene-free eco dry clean with form-preserving press.' },
    { categoryName: 'Dry Cleaning', name: '3-Piece Tuxedo Dry Clean', basePrice: 520, unit: 'PAIR', icon: 'star', description: 'Complete tuxedo, waistcoat, and trouser premium rejuvenation.' },
    { categoryName: 'Dry Cleaning', name: 'Heavy Bridal Lehenga Dry Clean', basePrice: 950, unit: 'PIECE', icon: 'diamond', description: 'Zari and sequin protected solvent treatment with anti-tarnish finish.' },
    { categoryName: 'Dry Cleaning', name: 'Silk Saree Dry Clean & Roll Press', basePrice: 280, unit: 'PIECE', icon: 'auto_awesome', description: 'Heritage saree cleansing and traditional wooden roller polishing.' },
    { categoryName: 'Dry Cleaning', name: 'Sherwani & Kurta Set Dry Clean', basePrice: 600, unit: 'PAIR', icon: 'person', description: 'Royal groom sherwani stain extraction, steam finishing and dust-wrap.' },
    { categoryName: 'Dry Cleaning', name: 'Winter Trench Coat Dry Clean', basePrice: 420, unit: 'PIECE', icon: 'severe_cold', description: 'Heavy trench, leather collar and cashmere coat deep clean.' },
    { categoryName: 'Dry Cleaning', name: 'Pashmina Shawl Hand Care', basePrice: 320, unit: 'PIECE', icon: 'light_mode', description: 'Ultra-gentle dry clean safeguarding fine cashmere natural oils.' },

    // Shoe Care & Cobbler
    { categoryName: 'Shoe Care & Cobbler', name: 'Sneaker Deep Cleansing & Ozone Sanitization', basePrice: 380, unit: 'PAIR', icon: 'cleaning_services', description: 'Upper mesh foam treatment, midsole stain purge, and odor extraction.' },
    { categoryName: 'Shoe Care & Cobbler', name: 'Leather Shoe Cream Polish & Buffing', basePrice: 200, unit: 'PAIR', icon: 'auto_fix_high', description: 'Beeswax cream nourishment, edge staining, and mirror shine buff.' },
    { categoryName: 'Shoe Care & Cobbler', name: 'Sole Re-Glazing & Heavy Stitching', basePrice: 180, unit: 'PAIR', icon: 'build', description: 'High-strength industrial adhesive bond and welt stitching.' },
    { categoryName: 'Shoe Care & Cobbler', name: 'Complete Rubber Sole Replacement', basePrice: 550, unit: 'PAIR', icon: 'construction', description: 'Brand-new anti-slip Vibram or high-grade rubber outsole fitting.' },
    { categoryName: 'Shoe Care & Cobbler', name: 'High Heel Tip & Cap Replacement', basePrice: 190, unit: 'PAIR', icon: 'height', description: 'Durable polyurethane quiet-step heel cap replacement.' },
    { categoryName: 'Shoe Care & Cobbler', name: 'Suede & Nubuck Boot Restoration', basePrice: 480, unit: 'PAIR', icon: 'brush', description: 'Nap restoration, dry sponge dirt lift, and water-repellent spray.' },

    // Bags & Leather Care
    { categoryName: 'Bags & Leather Care', name: 'Handbag Deep Cleansing & Deodorization', basePrice: 480, unit: 'PIECE', icon: 'sanitizer', description: 'Interior lining vacuuming, fabric shampoo, and hardware polishing.' },
    { categoryName: 'Bags & Leather Care', name: 'Leather Bag Color Touch-up & Conditioning', basePrice: 850, unit: 'PIECE', icon: 'format_paint', description: 'Color restoration on scuffed corners and intensive lanolin moisturizing.' },
    { categoryName: 'Bags & Leather Care', name: 'Runner & Heavy Zipper Replacement', basePrice: 220, unit: 'PIECE', icon: 'merge', description: 'Heavy-duty zipper track re-stitching with matching puller.' },
    { categoryName: 'Bags & Leather Care', name: 'Belt Hole Punching & Size Trimming', basePrice: 80, unit: 'PIECE', icon: 'linear_scale', description: 'Precision diameter hole punch and buckle rivet re-setting.' },
    { categoryName: 'Bags & Leather Care', name: 'Backpack Strap Stitching Reinforcement', basePrice: 150, unit: 'PIECE', icon: 'backpack', description: 'Cross-stitch bar-tack reinforcement for heavy carry luggage.' }
  ];

  const categoryServiceDocs = [];
  for (const s of servicesDef) {
    const parentCat = categoryDocs.find((c) => c.name === s.categoryName);
    if (!parentCat) continue;

    let doc = await CategoryService.findOne({ categoryId: parentCat._id, name: s.name });
    if (!doc) {
      doc = await CategoryService.create({
        categoryId: parentCat._id,
        name: s.name,
        basePrice: s.basePrice,
        unit: s.unit,
        icon: s.icon,
        description: s.description,
        isActive: true,
      });
    }
    categoryServiceDocs.push(doc);
  }
  console.log(`✅ Seeded ${categoryServiceDocs.length} Category Services.`);

  // ==========================================
  // 4. USERS (200 REALISTIC USERS)
  // ==========================================
  console.log('\n--- 4. Creating 200 Realistic Users ---');
  const userDocs = [];
  const existingUsersCount = await User.countDocuments();
  const targetUserCount = 200;

  // Real profile pictures from Unsplash portraits
  const AVATAR_URLS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80'
  ];

  const now = new Date();
  const nineMonthsAgo = new Date(now.getTime() - 270 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < targetUserCount; i++) {
    const isFemale = i % 2 === 0;
    const firstName = isFemale ? FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length] : FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length];
    const lastName = LAST_NAMES[(i * 3 + 7) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const phone = `91981${String(100000 + i).slice(1)}`;
    const cityObj = CITIES[i % CITIES.length];
    const area = cityObj.areas[i % cityObj.areas.length];
    const createdAt = getRandomDate(nineMonthsAgo, now);

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.create({
        name: fullName,
        phone,
        role: 'user',
        status: i === 195 ? 'inactive' : 'active',
        gender: isFemale ? 'FEMALE' : 'MALE',
        accountType: i % 15 === 0 ? 'COMMERCIAL' : 'INDIVIDUAL',
        country: 'India',
        currency: 'INR',
        preferredLanguage: i % 7 === 0 ? 'hi' : 'en',
        profileImage: getRandomItem(AVATAR_URLS),
        createdAt,
        updatedAt: createdAt
      });
    }
    userDocs.push(user);
  }
  console.log(`✅ Loaded/Created ${userDocs.length} Users.`);

  // ==========================================
  // 5. REGISTERED VENDORS (30 REALISTIC VENDORS)
  // ==========================================
  console.log('\n--- 5. Creating 30 Registered Vendors ---');
  const VENDOR_BLUEPRINTS = [
    // Washerman / Dhobis
    { name: 'Ramdhani Dhobi & Sons', bName: 'Shri Ramdhani Express Steam Laundry', cat: 'Washerman', cityIdx: 0, mult: 1.0 },
    { name: 'Apex Fabric Care Laundromat', bName: 'Apex Premium Eco Laundromat & Ironers', cat: 'Washerman', cityIdx: 1, mult: 1.15 },
    { name: 'Dwarka Smart Laundry Hub', bName: 'Smart Care Washers & Ironing Point', cat: 'Washerman', cityIdx: 0, mult: 0.95 },
    { name: 'Koramangala Express Dhobi', bName: 'Koramangala High-Speed Laundry & Press', cat: 'Washerman', cityIdx: 4, mult: 1.2 },
    { name: 'Bandra Coastal Laundromat', bName: 'Ocean Fresh Fabric Care & Press Studio', cat: 'Washerman', cityIdx: 3, mult: 1.25 },
    { name: 'Gomti Nagar Cleaners', bName: 'Nawab Steam Wash & Traditional Dhobi', cat: 'Washerman', cityIdx: 8, mult: 0.9 },
    { name: 'Cyber City Corporate Laundry', bName: 'Executive Fabric & Uniform Cleaners', cat: 'Washerman', cityIdx: 1, mult: 1.3 },
    { name: 'Pink City Royal Dhobi Ghat', bName: 'Rajputana Heritage Wash & Starch Center', cat: 'Washerman', cityIdx: 7, mult: 1.0 },

    // Tailor & Alterations
    { name: 'Master Irfan Ahmed Tailor', bName: 'Irfan Bespoke Alteration & Suiting Studio', cat: 'Tailor & Alterations', cityIdx: 0, mult: 1.1 },
    { name: 'Meenakshi Boutique & Alterations', bName: 'Meenakshi Couture & Precision Tailoring', cat: 'Tailor & Alterations', cityIdx: 0, mult: 1.25 },
    { name: 'Whitefield Master Tailors', bName: 'Stitch & Fit Studio Whitefield', cat: 'Tailor & Alterations', cityIdx: 4, mult: 1.15 },
    { name: 'Banjara Perfect Stitches', bName: 'Royal Silhouette Bespoke Tailoring', cat: 'Tailor & Alterations', cityIdx: 6, mult: 1.2 },
    { name: 'Colaba Heritage Tailors', bName: 'Bombay Vintage Alteration & Raffu Master', cat: 'Tailor & Alterations', cityIdx: 3, mult: 1.3 },
    { name: 'Pune Stitching Point', bName: 'Koregaon Tailoring & Fitting Hub', cat: 'Tailor & Alterations', cityIdx: 5, mult: 1.0 },

    // Dry Cleaning
    { name: 'SnowWhite Premium Dry Cleaners', bName: 'SnowWhite Eco Dry Cleaners & Dyers', cat: 'Dry Cleaning', cityIdx: 0, mult: 1.2 },
    { name: 'Royal Heritage Silk Restorers', bName: 'Banaras Zari & Silk Saree Care Studio', cat: 'Dry Cleaning', cityIdx: 8, mult: 1.4 },
    { name: 'Cloud9 Woolens & Tuxedo Cleaners', bName: 'Cloud9 Luxury Organic Dry Cleaning', cat: 'Dry Cleaning', cityIdx: 1, mult: 1.35 },
    { name: 'Indiranagar Fabric Spa', bName: 'Fabric Spa Luxury Dry Care Bangalore', cat: 'Dry Cleaning', cityIdx: 4, mult: 1.25 },
    { name: 'Juhu Star Dry Cleaners', bName: 'Celebrity Wardrobe Care & Dry Cleaning', cat: 'Dry Cleaning', cityIdx: 3, mult: 1.5 },
    { name: 'Salt Lake Elite Dry Care', bName: 'Calcutta Pristine Dry Cleaners', cat: 'Dry Cleaning', cityIdx: 9, mult: 1.05 },

    // Shoe Care & Cobbler
    { name: 'Kishan Lal Cobbler & Leather Care', bName: 'Kishan Royal Shoe Repair, Stitching & Care', cat: 'Shoe Care & Cobbler', cityIdx: 0, mult: 1.0 },
    { name: 'SneakerHeads Spa & Restoration', bName: 'SneakerHeads Lab & Deodorization Hub', cat: 'Shoe Care & Cobbler', cityIdx: 1, mult: 1.3 },
    { name: 'Bandra Cobbler Corner', bName: 'Bandra Footwear Surgeon & Heel Clinic', cat: 'Shoe Care & Cobbler', cityIdx: 3, mult: 1.15 },
    { name: 'HSR Shoe Polish & Stitch Works', bName: 'StepRight Ortho & Shoe Revival Lab', cat: 'Shoe Care & Cobbler', cityIdx: 4, mult: 1.1 },
    { name: 'Deccan Cobbler Studio', bName: 'Pune Traditional & Modern Footwear Clinic', cat: 'Shoe Care & Cobbler', cityIdx: 5, mult: 0.95 },

    // Bags & Leather Care
    { name: 'LeatherCraft Rejuvenation Studio', bName: 'Luxury Leather Bag & Luggage Doctor', cat: 'Bags & Leather Care', cityIdx: 0, mult: 1.35 },
    { name: 'Urban Saddle Bag Spa', bName: 'Urban Saddle Handbag & Belt Restoration', cat: 'Bags & Leather Care', cityIdx: 1, mult: 1.25 },
    { name: 'Jubilee Leather Restorations', bName: 'Hyderabad Luxury Purse & Zipper Clinic', cat: 'Bags & Leather Care', cityIdx: 6, mult: 1.3 },
    { name: 'Malabar Leather & Bag Works', bName: 'Malabar Luggage, Belt & Purse Care', cat: 'Bags & Leather Care', cityIdx: 3, mult: 1.1 },
    { name: 'Pink City Leather Master', bName: 'Jaipur Camel Leather & Bag Polishing Works', cat: 'Bags & Leather Care', cityIdx: 7, mult: 0.95 }
  ];

  const vendorDocs = [];
  for (let i = 0; i < VENDOR_BLUEPRINTS.length; i++) {
    const bp = VENDOR_BLUEPRINTS[i];
    const vendorId = `VND-2026-${String(i + 1).padStart(3, '0')}`;
    const phone = `91982${String(200000 + i).slice(1)}`;
    const cityObj = CITIES[bp.cityIdx];
    const area = cityObj.areas[i % cityObj.areas.length];

    let vendor = await Vendor.findOne({ phone });
    if (!vendor) {
      vendor = await Vendor.create({
        vendorId,
        name: bp.name,
        phone,
        businessName: bp.bName,
        category: bp.cat,
        primaryCategory: bp.cat,
        categories: [bp.cat],
        profileImage: getRandomItem(AVATAR_URLS),
        address: {
          street: `Shop #${12 + i}, Main Boulevard, ${area}`,
          city: cityObj.city,
          state: cityObj.state,
          pincode: cityObj.pincode,
        },
        location: {
          type: 'Point',
          coordinates: [cityObj.lng + getRandomFloat(-0.02, 0.02, 4), cityObj.lat + getRandomFloat(-0.02, 0.02, 4)],
        },
        status: i === 28 ? 'INACTIVE' : i === 29 ? 'SUSPENDED' : 'ACTIVE',
        isVerified: i < 27,
        verifiedAt: i < 27 ? new Date(Date.now() - 180 * 24 * 3600 * 1000) : null,
        rating: getRandomFloat(4.25, 4.95, 2),
        totalOrdersHandled: getRandomInt(120, 850),
        addedByUsers: [
          { userId: userDocs[i % userDocs.length]._id, nameGiven: bp.name.split(' ')[0], addedAt: new Date(Date.now() - 90 * 24 * 3600 * 1000) }
        ]
      });
    }
    vendorDocs.push(vendor);
  }
  console.log(`✅ Loaded/Created ${vendorDocs.length} Registered Vendors.`);

  // ==========================================
  // 6. UNREGISTERED VENDORS (40 LOCAL DHOBIS & TAILORS)
  // ==========================================
  console.log('\n--- 6. Creating 40 Unregistered Customer-Saved Vendors ---');
  const UNREG_NAMES = [
    'Ramesh Dhobi Sector 14', 'Bablu Master Alterations', 'Shyam Cobbler Stall CP', 'Pappu Ironing Wala',
    'Chhotu Laundry Service', 'Suresh Tailor Gali 4', 'Mahesh Shoe Polisher', 'Munna Press Wala',
    'Guddu Dryclean Corner', 'Laxman Dhobi Ghat', 'Kalu Cobbler Opp Metro', 'Santosh Alteration Master',
    'Bhola Press Cart', 'Dinesh Saree Polisher', 'Jagdish Leather Bag Repair', 'Raju Dry Cleaning Shop',
    'Harish Dhobi DLF', 'Anil Tailoring Shop', 'Vicky Sneaker Polish', 'Satish Steam Presser',
    'Kallu Dhobi Lane 2', 'Nathu Tailor Mandi', 'Subhash Shoe Repairs', 'Brijesh Iron Wala',
    'Gopal Dhobi Hauz Khas', 'Aslam Master Alterations', 'Radhe Cobbler Point', 'Pradeep Press Corner',
    'Deepak Dhobi Sector 56', 'Naresh Tailors Market', 'Manoj Shoe Works', 'Pawan Steam Iron',
    'Ramdhari Dhobi Ghat 3', 'Khurshid Suit Fitting', 'Shankar Cobbler Booth', 'Sunil Iron Cart',
    'Vinod Laundry Point', 'Tariq Tailor Shop', 'Mohan Shoe Mender', 'Balram Press Wala'
  ];

  const unregDocs = [];
  for (let i = 0; i < UNREG_NAMES.length; i++) {
    const phone = `91983${String(300000 + i).slice(1)}`;
    const addedByUser1 = userDocs[(i * 2) % userDocs.length];
    const addedByUser2 = userDocs[(i * 3 + 1) % userDocs.length];

    let unreg = await UnregisteredVendor.findOne({ phone });
    if (!unreg) {
      const isConverted = i >= 35;
      unreg = await UnregisteredVendor.create({
        phone,
        name: UNREG_NAMES[i],
        addedByUsers: [
          { userId: addedByUser1._id, nameGiven: UNREG_NAMES[i].split(' ')[0], addedAt: new Date(Date.now() - 120 * 24 * 3600 * 1000) },
          { userId: addedByUser2._id, nameGiven: UNREG_NAMES[i], addedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000) }
        ],
        totalOrders: getRandomInt(15, 95),
        isConvertedToRegistered: isConverted,
        convertedVendorId: isConverted ? vendorDocs[i % vendorDocs.length]._id : null,
        convertedAt: isConverted ? new Date(Date.now() - 20 * 24 * 3600 * 1000) : null
      });
    }
    unregDocs.push(unreg);
  }
  console.log(`✅ Loaded/Created ${unregDocs.length} Unregistered Vendors.`);

  // ==========================================
  // 7. VENDOR SERVICES (PRICE OVERRIDES)
  // ==========================================
  console.log('\n--- 7. Linking Services to Vendors with Custom Prices ---');
  let vendorServicesCount = 0;
  for (const vendor of vendorDocs) {
    const parentCategory = categoryDocs.find((c) => c.name === vendor.category);
    if (!parentCategory) continue;

    const applicableServices = categoryServiceDocs.filter((s) => s.categoryId.toString() === parentCategory._id.toString());
    const blueprint = VENDOR_BLUEPRINTS.find((b) => b.name === vendor.name);
    const multiplier = blueprint ? blueprint.mult : 1.0;

    for (const s of applicableServices) {
      const exists = await VendorService.findOne({ vendorId: vendor._id, serviceId: s._id });
      if (!exists) {
        await VendorService.create({
          vendorId: vendor._id,
          serviceId: s._id,
          price: Math.round(s.basePrice * multiplier),
          durationMinutes: getRandomItem([15, 30, 45, 60, 120]),
          isAvailable: true,
          status: 'ACTIVE'
        });
        vendorServicesCount++;
      }
    }
  }
  console.log(`✅ Configured ${vendorServicesCount} Vendor-Service relationships.`);

  // ==========================================
  // 8. WARDROBES & WARDROBE ITEMS
  // ==========================================
  console.log('\n--- 8. Creating User Wardrobes & Items ---');
  const wardrobeDocs = [];
  const WARDROBE_NAMES = ['Primary Wardrobe', 'Ethnic & Festive', 'Office & Formal Wear', 'Winter & Woolens', 'Casual & Weekend'];

  for (let i = 0; i < userDocs.length; i++) {
    const user = userDocs[i];
    const wName = WARDROBE_NAMES[i % WARDROBE_NAMES.length];

    let w = await Wardrobe.findOne({ userId: user._id, name: wName });
    if (!w) {
      w = await Wardrobe.create({
        userId: user._id,
        name: wName,
        storeTypeId: storeTypeDocs[0]._id,
        type: i % 10 === 0 ? 'FAMILY' : 'PERSONAL',
        ownerName: user.name,
        isDefault: true,
      });
    }
    wardrobeDocs.push(w);
  }
  console.log(`✅ Loaded/Created ${wardrobeDocs.length} Wardrobes.`);

  // 500 Wardrobe Items
  const GARMENT_TYPES = [
    { name: 'Slim Fit Cotton Formal Shirt', cat: 'Upperwear', sub: 'Formal Shirt', occasion: ['Office', 'Formal'] },
    { name: 'Classic Indigo Denim Jeans', cat: 'Lowerwear', sub: 'Jeans', occasion: ['Casual', 'Weekend'] },
    { name: 'Chanderi Silk Festive Kurta', cat: 'Ethnic', sub: 'Kurta', occasion: ['Festive', 'Traditional'] },
    { name: 'Italian Wool 2-Piece Blazer', cat: 'Outerwear', sub: 'Blazer', occasion: ['Party', 'Formal'] },
    { name: 'Banarasi Brocade Saree', cat: 'Ethnic', sub: 'Saree', occasion: ['Wedding', 'Festive'] },
    { name: 'Chino Trousers Beige', cat: 'Lowerwear', sub: 'Trousers', occasion: ['Smart Casual', 'Office'] },
    { name: 'Casual Polo T-Shirt', cat: 'Upperwear', sub: 'T-Shirt', occasion: ['Casual', 'Gym'] },
    { name: 'Embroidered Anarkali Suit', cat: 'Ethnic', sub: 'Suit', occasion: ['Festive', 'Wedding'] },
    { name: 'Running Sport Sneakers', cat: 'Footwear', sub: 'Sneakers', occasion: ['Sports', 'Casual'] },
    { name: 'Handcrafted Oxford Leather Shoes', cat: 'Footwear', sub: 'Formal Shoes', occasion: ['Formal', 'Black Tie'] },
    { name: 'Heavy Puffer Winter Jacket', cat: 'Outerwear', sub: 'Jacket', occasion: ['Travel', 'Winter'] },
    { name: 'Pure Linen Half Sleeve Shirt', cat: 'Upperwear', sub: 'Casual Shirt', occasion: ['Summer', 'Vacation'] }
  ];

  const CLOTHES_PHOTOS = [
    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80'
  ];

  console.log('\n--- Seeding 500 Wardrobe Items ---');
  const wardrobeItemDocs = [];
  const targetItems = 500;
  const currentItemCount = await WardrobeItem.countDocuments();

  if (currentItemCount < targetItems) {
    const toCreate = targetItems - currentItemCount;
    for (let i = 0; i < toCreate; i++) {
      const user = userDocs[i % userDocs.length];
      const wardrobe = wardrobeDocs[i % wardrobeDocs.length];
      const gType = GARMENT_TYPES[i % GARMENT_TYPES.length];
      const brand = getRandomItem(BRANDS);
      const fabric = getRandomItem(FABRICS);
      const color = getRandomItem(COLORS);
      const photoUrl = getRandomItem(CLOTHES_PHOTOS);

      const item = await WardrobeItem.create({
        userId: user._id,
        wardrobeId: wardrobe._id,
        name: `${brand} ${color} ${gType.sub}`,
        images: [
          { url: photoUrl, type: 'ORIGINAL', isPrimary: true }
        ],
        sourceType: 'CAMERA_CAPTURE',
        category: gType.cat,
        subCategory: gType.sub,
        color,
        fabric,
        brand,
        size: getRandomItem(['S', 'M', 'L', 'XL', '32', '34', '36', 'UK 8', 'UK 9']),
        occasion: gType.occasion,
        season: ['ALL_SEASON'],
        status: 'ACTIVE',
        isFavorite: i % 6 === 0,
        wearCount: getRandomInt(2, 35),
        lastWornAt: getRandomDate(new Date(Date.now() - 30 * 24 * 3600 * 1000), now)
      });
      wardrobeItemDocs.push(item);
    }
    console.log(`✅ Created ${wardrobeItemDocs.length} Wardrobe Items.`);
  } else {
    const existing = await WardrobeItem.find().limit(500);
    wardrobeItemDocs.push(...existing);
    console.log(`✅ Loaded ${wardrobeItemDocs.length} existing Wardrobe Items.`);
  }

  // ==========================================
  // 9. OUTFITS (60 REALISTIC OUTFITS)
  // ==========================================
  console.log('\n--- 9. Creating 60 Styled Outfits ---');
  const outfitCount = await Outfit.countDocuments();
  if (outfitCount < 60) {
    const OUTFIT_TITLES = [
      'Boardroom Monday Look', 'Saturday Brunch Casual', 'Diwali Gala Celebration', 'Wedding Sangeet Attire',
      'Weekend Roadtrip Comfort', 'Client Dinner Formal', 'Cocktail Night Ensemble', 'Airport Style Clean',
      'Art Gallery Evening', 'Sunday Casual Stroll', 'Festive Pooja Splendor', 'Summer Breeze Linens'
    ];

    for (let i = 0; i < 60; i++) {
      const user = userDocs[i % userDocs.length];
      const wardrobe = wardrobeDocs[i % wardrobeDocs.length];
      const userItems = wardrobeItemDocs.filter((it) => it.userId.toString() === user._id.toString());
      const selectedItem = userItems.length > 0 ? getRandomItem(userItems) : getRandomItem(wardrobeItemDocs);

      await Outfit.create({
        userId: user._id,
        wardrobeId: wardrobe._id,
        title: `${OUTFIT_TITLES[i % OUTFIT_TITLES.length]} #${i + 1}`,
        occasion: getRandomItem(['CASUAL', 'FORMAL', 'PARTY', 'WEDDING', 'WORK', 'FESTIVE']),
        season: getRandomItem(['SUMMER', 'WINTER', 'MONSOON', 'ALL_SEASON']),
        items: [
          {
            itemId: selectedItem._id,
            slot: 'UPPER_WEAR',
            name: selectedItem.name,
            category: selectedItem.category,
            subCategory: selectedItem.subCategory,
            color: selectedItem.color,
            imageUrl: selectedItem.images[0]?.url
          }
        ]
      });
    }
    console.log('✅ Created 60 Outfits.');
  } else {
    console.log(`✅ 60+ Outfits already present.`);
  }

  // ==========================================
  // 10. ORDERS (500 REALISTIC ORDERS OVER 9 MONTHS)
  // ==========================================
  console.log('\n--- 10. Creating 500 Realistic Orders & Transactions ---');
  const currentOrderCount = await Order.countDocuments();
  const targetOrders = 500;
  const orderDocs = [];

  const STATUS_DISTRIBUTION = [
    'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', // 60%
    'IN_PROCESS', 'READY_FOR_DELIVERY', 'PICKED_UP', // 15%
    'PENDING_PICKUP', // 10%
    'PARTIALLY_DELIVERED', // 5%
    'CANCELLED' // 10%
  ];

  if (currentOrderCount < targetOrders) {
    const ordersToCreate = targetOrders - currentOrderCount;

    for (let i = 0; i < ordersToCreate; i++) {
      const user = userDocs[i % userDocs.length];
      const isReg = i % 4 !== 0; // 75% registered, 25% unregistered
      const vendor = isReg ? vendorDocs[i % vendorDocs.length] : null;
      const unregVendor = !isReg ? unregDocs[i % unregDocs.length] : null;

      const orderCategory = vendor ? vendor.category : getRandomItem(['Washerman', 'Tailor & Alterations', 'Dry Cleaning', 'Shoe Care & Cobbler']);
      const categoryServices = categoryServiceDocs.filter((cs) => {
        const cat = categoryDocs.find((c) => c.name === orderCategory);
        return cat && cs.categoryId.toString() === cat._id.toString();
      });

      // Status & dates
      const status = getRandomItem(STATUS_DISTRIBUTION);
      const isRecent = status === 'PENDING_PICKUP' || status === 'IN_PROCESS' || status === 'PICKED_UP';
      const orderDate = isRecent
        ? getRandomDate(new Date(now.getTime() - 4 * 24 * 3600 * 1000), now)
        : getRandomDate(nineMonthsAgo, new Date(now.getTime() - 5 * 24 * 3600 * 1000));

      const pickupDate = new Date(orderDate.getTime() + getRandomInt(6, 24) * 3600 * 1000);
      const expectedDeliveryDate = new Date(pickupDate.getTime() + getRandomInt(24, 72) * 3600 * 1000);
      const deliveredAt = (status === 'DELIVERED' || status === 'PARTIALLY_DELIVERED')
        ? new Date(expectedDeliveryDate.getTime() + getRandomInt(-4, 12) * 3600 * 1000)
        : null;

      // Realistic Items
      const itemCount = getRandomInt(1, 6);
      const orderItems = [];
      let subtotal = 0;

      for (let j = 0; j < itemCount; j++) {
        const service = categoryServices.length > 0 ? getRandomItem(categoryServices) : getRandomItem(categoryServiceDocs);
        const itemGarment = getRandomItem(GARMENT_TYPES);
        const qty = getRandomInt(1, 3);
        const price = service ? service.basePrice : 40;
        subtotal += price * qty;

        orderItems.push({
          name: `${itemGarment.name}`,
          quantity: qty,
          price,
          serviceId: service ? service._id : null,
          serviceName: service ? service.name : 'Standard Service',
          serviceType: 'SERVICE',
          category: itemGarment.cat,
          subCategory: itemGarment.sub,
          color: getRandomItem(COLORS),
          fabric: getRandomItem(FABRICS),
          brand: getRandomItem(BRANDS),
          imageUrl: getRandomItem(CLOTHES_PHOTOS),
          status: status === 'DELIVERED' ? 'DELIVERED' : 'PENDING',
          deliveredAt: status === 'DELIVERED' ? deliveredAt : null,
          specialInstructions: j === 0 && i % 5 === 0 ? 'Handle delicate fabric carefully. No strong fragrance.' : ''
        });
      }

      const deliveryFee = subtotal > 500 ? 0 : 40;
      const totalAmount = subtotal + deliveryFee;
      const isPaid = status === 'DELIVERED' || status === 'PARTIALLY_DELIVERED' || (status === 'IN_PROCESS' && i % 2 === 0);

      // Status history array
      const statusHistory = [
        { status: 'PENDING_PICKUP', changedBy: 'USER', changedAt: orderDate, note: 'Order placed by customer via Arangtik App' }
      ];

      if (['PICKED_UP', 'IN_PROCESS', 'READY_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED'].includes(status)) {
        statusHistory.push({
          status: 'PICKED_UP',
          changedBy: 'VENDOR',
          changedAt: pickupDate,
          note: 'Vendor collected laundry bundle from customer address'
        });
      }

      if (['IN_PROCESS', 'READY_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED'].includes(status)) {
        statusHistory.push({
          status: 'IN_PROCESS',
          changedBy: 'VENDOR',
          changedAt: new Date(pickupDate.getTime() + 8 * 3600 * 1000),
          note: 'Garments undergoing sorting, inspection and wash cycle'
        });
      }

      if (['READY_FOR_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED'].includes(status)) {
        statusHistory.push({
          status: 'READY_FOR_DELIVERY',
          changedBy: 'VENDOR',
          changedAt: new Date(expectedDeliveryDate.getTime() - 6 * 3600 * 1000),
          note: 'Ironed, inspected, packaged and tagged ready for doorstep dispatch'
        });
      }

      if (status === 'DELIVERED') {
        statusHistory.push({
          status: 'DELIVERED',
          changedBy: 'VENDOR',
          changedAt: deliveredAt,
          note: 'Handed over to customer successfully. OTP verified.'
        });
      } else if (status === 'PARTIALLY_DELIVERED') {
        statusHistory.push({
          status: 'PARTIALLY_DELIVERED',
          changedBy: 'VENDOR',
          changedAt: deliveredAt,
          note: '2 items delivered; 1 woolen coat kept for second dry clean stain cycle.'
        });
      } else if (status === 'CANCELLED') {
        statusHistory.push({
          status: 'CANCELLED',
          changedBy: 'USER',
          changedAt: new Date(orderDate.getTime() + 2 * 3600 * 1000),
          note: 'Customer rescheduled travel plans. Order cancelled.'
        });
      }

      const orderNumber = `WO-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(10000 + i)}`;

      const order = await Order.create({
        orderNumber,
        orderCategory,
        orderType: 'SERVICE',
        userId: user._id,
        userName: user.name,
        userPhone: user.phone,
        vendorId: vendor ? vendor._id : null,
        vendorPhone: vendor ? vendor.phone : unregVendor.phone,
        vendorName: vendor ? (vendor.businessName || vendor.name) : unregVendor.name,
        isRegisteredVendor: !!vendor,
        pickupDate,
        expectedDeliveryDate,
        deliveredAt,
        specialInstructions: i % 4 === 0 ? 'Please call before arriving at the security gate.' : '',
        items: orderItems,
        totalItems: orderItems.length,
        requestedServices: [...new Set(orderItems.map((it) => it.serviceName))],
        subtotal,
        deliveryFee,
        totalAmount,
        payment: {
          status: isPaid ? 'PAID' : 'UNPAID',
          transactionId: isPaid ? `TXN-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(20000 + i)}` : null,
          paidAt: isPaid ? (deliveredAt || orderDate) : null,
          updatedBy: isPaid ? (vendor ? 'VENDOR' : 'SYSTEM') : 'SYSTEM',
        },
        status,
        deliveredItemsCount: status === 'DELIVERED' ? orderItems.length : status === 'PARTIALLY_DELIVERED' ? Math.max(1, orderItems.length - 1) : 0,
        deliveredAmount: status === 'DELIVERED' ? totalAmount : status === 'PARTIALLY_DELIVERED' ? Math.round(totalAmount * 0.7) : 0,
        partialDeliveryNotes: status === 'PARTIALLY_DELIVERED' ? 'Pending items undergo second finishing run.' : '',
        statusHistory,
        createdAt: orderDate,
        updatedAt: deliveredAt || orderDate
      });

      orderDocs.push(order);

      // Create linked Transaction record
      await Transaction.create({
        transactionNumber: `TXN-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(50000 + i)}`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        vendorId: order.vendorId,
        vendorPhone: order.vendorPhone,
        vendorName: order.vendorName,
        userId: order.userId,
        userName: order.userName,
        userPhone: order.userPhone,
        orderCategory: order.orderCategory,
        amount: order.totalAmount,
        totalAmount: order.totalAmount,
        deliveredAmount: order.deliveredAmount,
        deliveredItemsCount: order.deliveredItemsCount,
        totalItems: order.totalItems,
        orderStatus: order.status,
        status: isPaid ? 'PAID' : 'UNPAID',
        paidAt: isPaid ? (deliveredAt || orderDate) : null,
        updatedBy: isPaid ? 'SYSTEM' : 'USER',
        note: isPaid ? `UPI payment verified for ${order.orderNumber}` : `Pending settlement upon doorstep hand-off`,
        createdAt: orderDate,
        updatedAt: deliveredAt || orderDate
      });
    }
    console.log(`✅ Seeded ${orderDocs.length} Orders & corresponding Transactions.`);
  } else {
    console.log(`✅ 500+ Orders already present.`);
  }

  // ==========================================
  // 11. NOTIFICATIONS (350 USER NOTIFICATIONS)
  // ==========================================
  console.log('\n--- 11. Creating 350 User Notifications ---');
  const notifCount = await Notification.countDocuments();
  if (notifCount < 350) {
    const NOTIF_TEMPLATES = [
      { title: 'Laundry Bundle Collected', body: 'Your garments have been picked up and are safely en route to the laundry center.', type: 'LAUNDRY_ORDER_STATUS' },
      { title: 'Order Delivered!', body: 'Your freshly cleaned and pressed clothes have been handed over. Thank you for using Arangtik!', type: 'LAUNDRY_ORDER_STATUS' },
      { title: 'Wardrobe Item Digitized', body: 'New garment successfully analyzed by AI and added to your Smart Wardrobe.', type: 'WARDROBE_DIGITIZED' },
      { title: 'Exclusive Weekend Offer', body: 'Enjoy 20% off dry cleaning for all traditional sarees & festive suits this Sunday.', type: 'SYSTEM' },
      { title: 'Vendor Activated Near You', body: 'A top-rated master tailor is now servicing your neighborhood!', type: 'VENDOR_ACTIVATED' }
    ];

    for (let i = 0; i < 350; i++) {
      const user = userDocs[i % userDocs.length];
      const tmpl = NOTIF_TEMPLATES[i % NOTIF_TEMPLATES.length];
      const isRead = i % 3 !== 0;

      await Notification.create({
        userId: user._id,
        title: tmpl.title,
        body: tmpl.body,
        type: tmpl.type,
        isRead,
        readAt: isRead ? new Date(Date.now() - getRandomInt(1, 48) * 3600 * 1000) : null,
        status: 'DELIVERED',
        createdAt: new Date(Date.now() - getRandomInt(1, 180) * 24 * 3600 * 1000)
      });
    }
    console.log('✅ Seeded 350 Notifications.');
  } else {
    console.log('✅ Notifications already populated.');
  }

  // ==========================================
  // 12. DEVICE TOKENS (150 ACTIVE TOKENS)
  // ==========================================
  console.log('\n--- 12. Creating 150 FCM Device Tokens ---');
  const tokenCount = await DeviceToken.countDocuments();
  if (tokenCount < 150) {
    const DEVICES = [
      { model: 'Samsung Galaxy S24 Ultra', platform: 'ANDROID' },
      { model: 'Apple iPhone 15 Pro Max', platform: 'IOS' },
      { model: 'OnePlus 12', platform: 'ANDROID' },
      { model: 'Google Pixel 8 Pro', platform: 'ANDROID' },
      { model: 'Apple iPhone 14', platform: 'IOS' }
    ];

    for (let i = 0; i < 150; i++) {
      const user = userDocs[i % userDocs.length];
      const dev = DEVICES[i % DEVICES.length];

      await DeviceToken.create({
        userId: user._id,
        token: `fcm_token_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`,
        platform: dev.platform,
        deviceId: `DEV-${10000 + i}`,
        deviceModel: dev.model,
        appVersion: '2.4.1',
        isActive: true,
        lastUsedAt: new Date(Date.now() - getRandomInt(1, 72) * 3600 * 1000)
      });
    }
    console.log('✅ Seeded 150 FCM Device Tokens.');
  }

  // ==========================================
  // 13. OTPS (30 RECENT LOGIN ATTEMPTS)
  // ==========================================
  console.log('\n--- 13. Creating 30 OTP Records ---');
  for (let i = 0; i < 30; i++) {
    const user = userDocs[i % userDocs.length];
    await Otp.create({
      phone: user.phone,
      otp: String(getRandomInt(1000, 9999)),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });
  }
  console.log('✅ Seeded 30 OTP records.');

  // ==========================================
  // FINAL COLLECTION AUDIT SUMMARY
  // ==========================================
  console.log('\n===============================================================');
  console.log('📊 FINAL DATABASE RECORD AUDIT (MongoDB Atlas):');
  console.log('===============================================================');
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const c of collections) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(` • ${c.name.padEnd(25)} : ${count} documents`);
  }

  console.log('\n🎉 ALL COLLECTIONS POPULATED WITH 100% REALISTIC INDIAN COMMERCE DATA!');
  await mongoose.disconnect();
}

seedDatabase().catch((err) => {
  console.error('❌ Database Seeding Error:', err);
  process.exit(1);
});

