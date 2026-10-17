const RegisteredVendor = require('./registeredVendor.model');
const Vendor = RegisteredVendor;
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

    // 1. Check in Unified Vendor Table
    const existingVendor = await Vendor.findOne({
      phone: formattedPhone,
      status: 'ACTIVE',
    }).select('vendorId name phone category categoryCode isRegistered businessName rating totalOrdersHandled isVerified addedByUsers');

    if (existingVendor) {
      let preferredName = existingVendor.name || '';
      if (!existingVendor.isRegistered && currentUserId && Array.isArray(existingVendor.addedByUsers)) {
        const userEntry = existingVendor.addedByUsers.find(
          (u) => u.userId && u.userId.toString() === currentUserId.toString()
        );
        if (userEntry && userEntry.nameGiven) {
          preferredName = userEntry.nameGiven;
        }
      }

      return {
        isRegistered: existingVendor.isRegistered === true,
        vendor: {
          id: existingVendor._id,
          vendorId: existingVendor.vendorId,
          name: preferredName,
          phone: existingVendor.phone,
          category: existingVendor.category || 'Dhobi',
          categoryCode: existingVendor.categoryCode || 'DHOBI',
          businessName: existingVendor.businessName || '',
          rating: existingVendor.rating,
          totalOrdersHandled: existingVendor.totalOrdersHandled,
          isVerified: existingVendor.isVerified,
        },
      };
    }

    // 2. Check in Unregistered Vendors database (fallback)
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
          category: 'Dhobi',
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
        category: 'Dhobi',
        businessName: '',
        isVerified: false,
      },
    };
  }

  /**
   * Record or update vendor when creating a laundry order
   * Uses separate collections:
   * - Registered vendors updated in 'Vendor' collection
   * - Unregistered contact-based vendors stored in 'UnregisteredVendor' collection
   */
  async recordOrderVendor({ phone, name, userId }) {
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      throw new ApiError(400, 'Invalid phone number format');
    }

    const trimmedName = name ? String(name).trim() : '';

    // 1. Check if vendor is already registered in Vendor collection
    let regVendor = await Vendor.findOne({ phone: formattedPhone });
    if (regVendor) {
      regVendor.totalOrdersHandled = (regVendor.totalOrdersHandled || 0) + 1;
      await regVendor.save();
      return {
        isRegistered: true,
        vendor: regVendor,
      };
    }

    // 2. Unregistered vendor stored in UnregisteredVendor collection
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
      if (!unreg.name && trimmedName) {
        unreg.name = trimmedName;
      }
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

    return {
      isRegistered: false,
      vendor: unreg,
    };
  }

  /**
   * Sync hook called on user login / signup:
   * Checks if an unregistered vendor exists with this user's phone.
   * If found, sets isRegistered: true and updates existing Work Orders.
   */
  async syncUnregisteredToRegistered(user) {
    if (!user || !user.phone) return null;

    const formattedPhone = formatPhoneNumber(user.phone);

    // Check in unified Vendor table
    let vendor = await Vendor.findOne({ phone: formattedPhone });

    // Check if there are unregistered records for this phone
    const unreg = await UnregisteredVendor.findOne({
      phone: formattedPhone,
      isConvertedToRegistered: false,
    });

    if (!unreg && vendor && vendor.isRegistered) {
      return { converted: false, vendor };
    }

    if (unreg || (vendor && !vendor.isRegistered)) {
      if (!vendor) {
        const vendorName = user.name || unreg?.name || 'Laundry Vendor';
        vendor = await Vendor.create({
          name: vendorName,
          phone: formattedPhone,
          category: 'Dhobi',
          categoryCode: 'DHOBI',
          isRegistered: true,
          userId: user._id || user.id,
          status: 'ACTIVE',
          totalOrdersHandled: unreg?.totalOrders || 0,
        });
      } else {
        vendor.isRegistered = true;
        vendor.userId = user._id || user.id;
        if (user.name) vendor.name = user.name;
        await vendor.save();
      }

      if (unreg) {
        unreg.isConvertedToRegistered = true;
        unreg.convertedVendorId = vendor._id;
        unreg.convertedAt = new Date();
        await unreg.save();
      }

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

      // Dispatch FCM Push Notification to newly activated vendor
      try {
        const notificationService = require('../notification/notification.service');
        notificationService
          .sendToUser(user._id || user.id, {
            title: 'Vendor Hub Activated 🧺',
            body: `Your phone number has been linked to your laundry vendor profile "${vendor.name}". Past work orders are now in your dashboard!`,
            data: {
              type: 'VENDOR_ACTIVATED',
              vendorId: vendor._id.toString(),
            },
            type: 'VENDOR_ACTIVATED',
          })
          .catch((err) => console.warn('[FCM Vendor Sync Warning]:', err.message));
      } catch (fcmErr) {
        console.warn('[FCM Vendor Sync Warning]:', fcmErr.message);
      }

      return { converted: true, vendor };
    }

    return null;
  }
}

module.exports = new VendorService();
