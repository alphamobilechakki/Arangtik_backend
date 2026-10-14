const Vendor = require('./vendor.model');
const UnregisteredVendor = require('./unregisteredVendor.model');
const { formatPhoneNumber } = require('../../utils/whatsapp.service');
const ApiError = require('../../utils/apiError');

class VendorService {
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

    // 1. Check in Registered Vendors
    const registeredVendor = await Vendor.findOne({
      phone: formattedPhone,
      status: 'ACTIVE',
    }).select('vendorId name phone businessName rating totalOrdersHandled isVerified');

    if (registeredVendor) {
      return {
        isRegistered: true,
        vendor: {
          id: registeredVendor._id,
          vendorId: registeredVendor.vendorId,
          name: registeredVendor.name,
          phone: registeredVendor.phone,
          businessName: registeredVendor.businessName || '',
          rating: registeredVendor.rating,
          totalOrdersHandled: registeredVendor.totalOrdersHandled,
          isVerified: registeredVendor.isVerified,
        },
      };
    }

    // 2. Check in Unregistered Vendors database
    const unregVendor = await UnregisteredVendor.findOne({
      phone: formattedPhone,
    });

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
   * Record or update vendor when creating a laundry order
   */
  async recordOrderVendor({ phone, name, userId }) {
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Invalid phone number format');
    }

    // Check if registered
    const registeredVendor = await Vendor.findOne({
      phone: formattedPhone,
      status: 'ACTIVE',
    });

    if (registeredVendor) {
      registeredVendor.totalOrdersHandled = (registeredVendor.totalOrdersHandled || 0) + 1;
      await registeredVendor.save();
      return {
        isRegistered: true,
        vendor: registeredVendor,
      };
    }

    // Handle Unregistered Vendor
    let unreg = await UnregisteredVendor.findOne({ phone: formattedPhone });
    const trimmedName = name ? String(name).trim() : '';

    if (!unreg) {
      unreg = await UnregisteredVendor.create({
        phone: formattedPhone,
        name: trimmedName,
        totalOrders: 1,
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
      if (!unreg.name && trimmedName) {
        unreg.name = trimmedName;
      }
      if (userId) {
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

    return {
      isRegistered: false,
      vendor: unreg,
    };
  }

  /**
   * Sync hook called on user login / signup:
   * Checks if an unregistered vendor exists with this user's phone.
   * If found, transfers / creates a registered Vendor profile and updates existing Work Orders.
   */
  async syncUnregisteredToRegistered(user) {
    if (!user || !user.phone) return null;

    const formattedPhone = formatPhoneNumber(user.phone);

    // Check if user is already a registered vendor
    let vendor = await Vendor.findOne({ phone: formattedPhone });

    // Check if there are unregistered records for this phone
    const unreg = await UnregisteredVendor.findOne({
      phone: formattedPhone,
      isConvertedToRegistered: false,
    });

    if (!unreg && vendor) {
      return { converted: false, vendor };
    }

    if (unreg) {
      if (!vendor) {
        const vendorName = user.name || unreg.name || 'Laundry Vendor';
        vendor = await Vendor.create({
          name: vendorName,
          phone: formattedPhone,
          userId: user._id || user.id,
          status: 'ACTIVE',
          totalOrdersHandled: unreg.totalOrders || 0,
        });
      } else if (!vendor.userId) {
        vendor.userId = user._id || user.id;
        await vendor.save();
      }

      unreg.isConvertedToRegistered = true;
      unreg.convertedVendorId = vendor._id;
      unreg.convertedAt = new Date();
      await unreg.save();

      // Update past laundry orders linked to this vendor phone
      const LaundryOrder = require('../laundry/laundryOrder.model');
      if (LaundryOrder) {
        await LaundryOrder.updateMany(
          { vendorPhone: formattedPhone, isRegisteredVendor: false },
          {
            $set: {
              vendorId: vendor._id,
              isRegisteredVendor: true,
              vendorName: vendor.name,
            },
          }
        );
      }

      return { converted: true, vendor };
    }

    return null;
  }
}

module.exports = new VendorService();
