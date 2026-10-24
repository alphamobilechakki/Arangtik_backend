const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/my codes/Arangtik/backend/.env' });

const VendorCategory = require('../src/modules/admin/vendorCategory/vendorCategory.model');
const RegisteredVendor = require('../src/modules/vendor/registeredVendor.model');
const User = require('../src/modules/auth/user.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const Order = require('../src/modules/order/order.model');

const categoryServiceService = require('../src/modules/admin/vendorCategory/categoryService.service');
const vendorAuthService = require('../src/modules/vendor/vendorAuth.service');
const vendorService = require('../src/modules/vendor/vendor.service');
const laundryOrderService = require('../src/modules/order/laundry/laundryOrder.service');

describe('Category & Service Management Integration Tests', () => {
  let testCategory = null;
  let testUser = null;
  let vendorAllServices = null; // Offers Dry Cleaning & Ironing
  let vendorIronOnly = null;     // Offers only Ironing
  const wardrobeItems = [];

  before(async () => {
    process.env.OTP_DEV_MODE = 'true';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // 1. Ensure test category exists
    const catName = `Washerman_Test_${Date.now()}`;
    testCategory = await VendorCategory.create({
      name: catName,
      code: 'WASHERMAN_TEST',
      description: 'Test Washerman Category for Service Platform',
      isActive: true,
    });

    // 2. Create test user
    const userPhone = `91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    testUser = await User.create({
      phone: userPhone,
      name: 'Rohan Sharma',
      role: 'user',
    });

    // 3. Create 10 test wardrobe dresses for user
    for (let i = 1; i <= 10; i++) {
      const item = await WardrobeItem.create({
        userId: testUser._id,
        name: `Wardrobe Dress #${i}`,
        category: 'Dress',
        subCategory: i <= 4 ? 'DryCleanable Silk' : 'Cotton Daily',
        color: i <= 4 ? 'Royal Blue' : 'Crisp White',
        fabric: i <= 4 ? 'Pure Silk' : '100% Cotton',
        brand: 'Arangtik Couture',
        status: 'ACTIVE',
      });
      wardrobeItems.push(item);
    }
  });

  after(async () => {
    // Cleanup test artifacts
    if (testCategory) {
      await VendorCategory.findByIdAndDelete(testCategory._id);
    }
    if (testUser) {
      await Order.deleteMany({ userId: testUser._id });
      await WardrobeItem.deleteMany({ userId: testUser._id });
      await User.findByIdAndDelete(testUser._id);
    }
    if (vendorAllServices) {
      await RegisteredVendor.findByIdAndDelete(vendorAllServices._id);
    }
    if (vendorIronOnly) {
      await RegisteredVendor.findByIdAndDelete(vendorIronOnly._id);
    }
    await mongoose.disconnect();
  });

  // =========================================================================
  // SECTION 1: Admin Category & Service Management
  // =========================================================================
  describe('1. Admin Category & Service Management', () => {
    let createdServices = [];

    it('1.1 Admin creates multiple services under category', async () => {
      const serviceNames = ['Dry Cleaning', 'Ironing', 'Washing', 'Premium Cleaning'];
      const prices = [60, 15, 30, 100];

      for (let i = 0; i < serviceNames.length; i++) {
        const s = await categoryServiceService.createService(testCategory._id, {
          name: serviceNames[i],
          description: `${serviceNames[i]} service details`,
          price: prices[i],
          sortOrder: i + 1,
        });
        createdServices.push(s);
      }

      assert.equal(createdServices.length, 4);
      assert.equal(createdServices[0].name, 'Dry Cleaning');
      assert.equal(createdServices[0].code, 'DRY_CLEANING');
      assert.equal(createdServices[1].name, 'Ironing');
      assert.equal(createdServices[1].price, 15);
    });

    it('1.2 Duplicate service in same category is rejected with 409', async () => {
      await assert.rejects(
        async () => {
          await categoryServiceService.createService(testCategory._id, {
            name: 'Dry Cleaning',
            price: 70,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 409);
          assert.ok(err.message.includes('already exists'));
          return true;
        }
      );
    });

    it('1.3 Admin fetches category services and gets all active items', async () => {
      const services = await categoryServiceService.getServicesByCategory(testCategory._id);
      assert.equal(services.length, 4);
      assert.equal(services[0].name, 'Dry Cleaning');
      assert.equal(services[3].name, 'Premium Cleaning');
    });

    it('1.4 Admin updates service attributes via PATCH', async () => {
      const target = createdServices[3]; // Premium Cleaning
      const updated = await categoryServiceService.updateService(target._id, {
        price: 120,
        description: 'Updated premium hand wash and steam pressing',
      });

      assert.equal(updated.price, 120);
      assert.equal(updated.description, 'Updated premium hand wash and steam pressing');
    });

    it('1.5 Admin deactivates service and verifies inactive filter', async () => {
      const target = createdServices[2]; // Washing
      await categoryServiceService.toggleServiceStatus(target._id, false);

      const activeServices = await categoryServiceService.getServicesByCategory(testCategory._id, {
        includeInactive: false,
      });
      assert.equal(activeServices.length, 3);
      assert.ok(!activeServices.some((s) => s.name === 'Washing'));

      const allServices = await categoryServiceService.getServicesByCategory(testCategory._id, {
        includeInactive: true,
      });
      assert.equal(allServices.length, 4);

      // Re-activate for further tests
      await categoryServiceService.toggleServiceStatus(target._id, true);
    });
  });

  // =========================================================================
  // SECTION 2: Vendor Category & Service Selection
  // =========================================================================
  describe('2. Vendor Category & Service Selection', () => {
    it('2.1 Vendor registers with category and fetches available services', async () => {
      const phone1 = `91${Math.floor(7000000000 + Math.random() * 2999999999)}`;
      vendorAllServices = await RegisteredVendor.create({
        name: 'Suresh Multi Dhobi',
        phone: phone1,
        category: testCategory.name,
        primaryCategory: testCategory.name,
        categories: [testCategory.name],
        isRegistered: true,
      });

      const phone2 = `91${Math.floor(7000000000 + Math.random() * 2999999999)}`;
      vendorIronOnly = await RegisteredVendor.create({
        name: 'Ramesh Iron Only Store',
        phone: phone2,
        category: testCategory.name,
        primaryCategory: testCategory.name,
        categories: [testCategory.name],
        isRegistered: true,
      });

      // Fetch available services for the category
      const availableServices = await vendorAuthService.getCategoryServices(testCategory.name);
      assert.ok(availableServices.length >= 4);
      assert.ok(availableServices.some((s) => s.name === 'Dry Cleaning'));
      assert.ok(availableServices.some((s) => s.name === 'Ironing'));
    });

    it('2.2 Vendor selects only offered services (Vendor 1 selects Dry Cleaning + Ironing)', async () => {
      const updated = await vendorAuthService.updateVendorServices(vendorAllServices._id, {
        services: [
          { name: 'Dry Cleaning', isOffered: true, price: 60 },
          { name: 'Ironing', isOffered: true, price: 15 },
        ],
      });

      assert.equal(updated.services.length, 2);
      assert.deepEqual(updated.offeredServices.sort(), ['Dry Cleaning', 'Ironing'].sort());
    });

    it('2.3 Vendor selects single service (Vendor 2 selects ONLY Ironing, e.g. Milkman who only sells Milk)', async () => {
      const updated = await vendorAuthService.updateVendorServices(vendorIronOnly._id, {
        services: [
          { name: 'Ironing', isOffered: true, price: 12 },
        ],
      });

      assert.equal(updated.services.length, 1);
      assert.equal(updated.services[0].name, 'Ironing');
      assert.deepEqual(updated.offeredServices, ['Ironing']);
    });

    it('2.4 Vendor profile returns offered services', async () => {
      const profile1 = await vendorAuthService.getCurrentVendor(vendorAllServices._id);
      assert.equal(profile1.services.length, 2);
      assert.deepEqual(profile1.offeredServices.sort(), ['Dry Cleaning', 'Ironing'].sort());

      const profile2 = await vendorAuthService.getCurrentVendor(vendorIronOnly._id);
      assert.equal(profile2.services.length, 1);
      assert.deepEqual(profile2.offeredServices, ['Ironing']);
    });
  });

  // =========================================================================
  // SECTION 3: User App — Service Selection & Order Flow
  // =========================================================================
  describe('3. User App — Service Selection & Order Flow', () => {
    it('3.1 System checks eligible vendors: Vendor offering both is matched, single-service vendor filtered out', async () => {
      // User requires BOTH Dry Cleaning AND Ironing
      const eligible = await vendorService.getEligibleVendors({
        category: testCategory.name,
        requiredServices: ['Dry Cleaning', 'Ironing'],
      });

      assert.ok(eligible.length > 0);
      assert.ok(eligible.some((v) => v._id.toString() === vendorAllServices._id.toString()));
      assert.ok(!eligible.some((v) => v._id.toString() === vendorIronOnly._id.toString()));
    });

    it('3.2 User creates work order with 10 dresses: 4 Dry Cleaning, 6 Ironing with eligible vendor', async () => {
      // 4 dresses Dry Cleaning, 6 dresses Ironing
      const itemsPayload = wardrobeItems.map((item, idx) => ({
        wardrobeItemId: item._id,
        serviceName: idx < 4 ? 'Dry Cleaning' : 'Ironing',
        serviceType: idx < 4 ? 'DRY_CLEAN' : 'IRON',
      }));

      const today = new Date();
      const pickupDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const deliveryDate = new Date(today.getTime() + 72 * 60 * 60 * 1000);

      const order = await laundryOrderService.createWorkOrder(testUser._id, {
        vendorPhone: vendorAllServices.phone,
        vendorName: vendorAllServices.name,
        pickupDate: pickupDate.toISOString(),
        expectedDeliveryDate: deliveryDate.toISOString(),
        category: testCategory.name,
        items: itemsPayload,
      });

      assert.ok(order._id);
      assert.equal(order.totalItems, 10);
      assert.deepEqual(order.requestedServices.sort(), ['Dry Cleaning', 'Ironing'].sort());

      // Verify item-wise service mapping
      const dryCleanItems = order.items.filter((i) => i.serviceName === 'Dry Cleaning');
      const ironItems = order.items.filter((i) => i.serviceName === 'Ironing');

      assert.equal(dryCleanItems.length, 4);
      assert.equal(ironItems.length, 6);
      assert.equal(dryCleanItems[0].name, 'Wardrobe Dress #1');
      assert.equal(ironItems[0].name, 'Wardrobe Dress #5');
    });

    it('3.3 Order with ineligible vendor (who does not offer Dry Cleaning) is strictly rejected with 400', async () => {
      // Reset wardrobe items status so they can be tested again
      await WardrobeItem.updateMany(
        { userId: testUser._id },
        { status: 'ACTIVE' }
      );

      const itemsPayload = wardrobeItems.map((item, idx) => ({
        wardrobeItemId: item._id,
        serviceName: idx < 4 ? 'Dry Cleaning' : 'Ironing',
      }));

      const today = new Date();
      const pickupDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const deliveryDate = new Date(today.getTime() + 72 * 60 * 60 * 1000);

      // Attempt to place order with vendorIronOnly (who only offers Ironing, NOT Dry Cleaning)
      await assert.rejects(
        async () => {
          await laundryOrderService.createWorkOrder(testUser._id, {
            vendorPhone: vendorIronOnly.phone,
            vendorName: vendorIronOnly.name,
            pickupDate: pickupDate.toISOString(),
            expectedDeliveryDate: deliveryDate.toISOString(),
            category: testCategory.name,
            items: itemsPayload,
          });
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.ok(err.message.includes('Dry Cleaning'));
          return true;
        }
      );
    });
  });
});
