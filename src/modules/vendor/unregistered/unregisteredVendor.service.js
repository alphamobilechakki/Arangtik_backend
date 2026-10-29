const Vendor = require('../vendor.model');
const UnregisteredVendor = require('./unregisteredVendor.model');
const VendorService = require('../../vendorService/vendorService.model');
const { formatPhoneNumber } = require('../../../utils/whatsapp.service');
const ApiError = require('../../../utils/apiError');

class UnregisteredVendorService {
  /**
   * Lookup vendor by phone number (Mobile App contact selection / manual typing)
   * Returns registered status, vendor identification, and name if available.
   */
  async lookupVendor(rawPhone, currentUserId = null) {
    if (!rawPhone) {
      throw new ApiError(400, 'Vendor phone number is required');
    }

    const formattedPhone = formatPhoneNumber(rawPhone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Invalid phone number format');
    }

    // 1. Check in Registered Vendor Table
    const existingVendor = await Vendor.findOne({
      phone: formattedPhone,
      status: 'ACTIVE',
    }).select('vendorId name phone businessName profileImage rating totalOrdersHandled isVerified address location status');

    if (existingVendor) {
      const vendorServices = await VendorService.find({
        vendorId: existingVendor._id,
        isAvailable: true,
        status: 'ACTIVE',
      }).populate('serviceId', 'name icon imageUrl unit basePrice');

      return {
        isRegistered: true,
        vendor: {
          id: existingVendor._id,
          vendorId: existingVendor.vendorId,
          name: existingVendor.name,
          phone: existingVendor.phone,
          businessName: existingVendor.businessName || '',
          profileImage: existingVendor.profileImage || '',
          rating: existingVendor.rating || 0,
          totalOrdersHandled: existingVendor.totalOrdersHandled || 0,
          isVerified: existingVendor.isVerified,
          services: vendorServices || [],
          address: existingVendor.address || {},
          location: existingVendor.location || null,
        },
      };
    }

    // 2. Check in Unregistered Vendors database
    const unregVendor = await UnregisteredVendor.findOne({ phone: formattedPhone });

    if (unregVendor) {
      let preferredName = unregVendor.name || '';
      if (currentUserId && Array.isArray(unregVendor.addedByUsers)) {
        const userEntry = unregVendor.addedByUsers.find(
          (u) => u.userId && u.userId.toString() === currentUserId.toString()
        );
        if (userEntry && userEntry.nameGiven) {
          preferredName = userEntry.nameGiven;
        }
      }

      return {
        isRegistered: false,
        vendor: {
          id: unregVendor._id,
          vendorId: null,
          name: preferredName,
          phone: unregVendor.phone,
          businessName: '',
          isVerified: false,
        },
      };
    }

    // 3. New / Untracked number
    return {
      isRegistered: false,
      vendor: {
        id: null,
        vendorId: null,
        name: '',
        phone: formattedPhone,
        businessName: '',
        isVerified: false,
      },
    };
  }

  /**
   * Record or update vendor when creating an order
   */
  async recordOrderVendor({ phone, name, userId }) {
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Invalid phone number format');
    }

    const trimmedName = name ? String(name).trim() : '';

    // 1. Check if vendor is registered
    const regVendor = await Vendor.findOne({ phone: formattedPhone });
    if (regVendor) {
      regVendor.totalOrdersHandled = (regVendor.totalOrdersHandled || 0) + 1;
      await regVendor.save();
      return { isRegistered: true, vendor: regVendor };
    }

    // 2. Store in UnregisteredVendor collection
    let unreg = await UnregisteredVendor.findOne({ phone: formattedPhone });
    if (!unreg) {
      unreg = await UnregisteredVendor.create({
        phone: formattedPhone,
        name: trimmedName,
        totalOrders: 1,
        isConvertedToRegistered: false,
        addedByUsers: userId
          ? [
              {
                userId,
                nameGiven: trimmedName,
                addedAt: new Date(),
              },
            ]
          : [],
      });
    } else {
      unreg.totalOrders = (unreg.totalOrders || 0) + 1;
      if (!unreg.name && trimmedName) unreg.name = trimmedName;
      if (userId && Array.isArray(unreg.addedByUsers)) {
        const exists = unreg.addedByUsers.some(
          (u) => u.userId && u.userId.toString() === userId.toString()
        );
        if (!exists) {
          unreg.addedByUsers.push({
            userId,
            nameGiven: trimmedName,
            addedAt: new Date(),
          });
        }
      }
      await unreg.save();
    }

    return { isRegistered: false, vendor: unreg };
  }

  /**
   * Sync hook called on user login / signup
   */
  async syncUnregisteredToRegistered(user) {
    if (!user || !user.phone) return null;

    const formattedPhone = formatPhoneNumber(user.phone);
    const vendor = await Vendor.findOne({ phone: formattedPhone });
    const unreg = await UnregisteredVendor.findOne({
      phone: formattedPhone,
      isConvertedToRegistered: false,
    });

    if (unreg && vendor) {
      unreg.isConvertedToRegistered = true;
      unreg.convertedVendorId = vendor._id;
      unreg.convertedAt = new Date();
      await unreg.save();
      return { converted: true, vendor };
    }

    return null;
  }

  async getUnregisteredVendors({ page = 1, limit = 50 } = {}) {
    const skip = (Math.max(1, page) - 1) * limit;
    const [list, total] = await Promise.all([
      UnregisteredVendor.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      UnregisteredVendor.countDocuments(),
    ]);

    return {
      list,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new UnregisteredVendorService();
