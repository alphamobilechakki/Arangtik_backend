const mongoose = require('mongoose');
const VendorService = require('./vendorService.model');
const Vendor = require('../vendor/vendor.model');
const CategoryService = require('../categoryService/categoryService.model');
const ApiError = require('../../utils/apiError');

class VendorServiceService {
  /**
   * Add a single service to a vendor
   */
  async addVendorService(vendorId, data = {}) {
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      throw new ApiError(400, 'Valid Vendor ID is required');
    }

    const { serviceId, price, durationMinutes, isAvailable = true, status = 'ACTIVE' } = data;

    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
      throw new ApiError(400, 'Valid Service ID is required');
    }

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    // Verify service exists
    const service = await CategoryService.findById(serviceId);
    if (!service) {
      throw new ApiError(404, 'Category Service not found');
    }

    // Check if this service is already assigned to the vendor
    const existing = await VendorService.findOne({ vendorId, serviceId });
    if (existing) {
      throw new ApiError(409, 'This service is already assigned to this vendor');
    }

    const newVendorService = await VendorService.create({
      vendorId,
      serviceId,
      price: Number(price),
      durationMinutes: durationMinutes !== undefined && durationMinutes !== null ? Number(durationMinutes) : null,
      isAvailable: Boolean(isAvailable),
      status: status || 'ACTIVE',
    });

    return await VendorService.findById(newVendorService._id)
      .populate('serviceId', 'name icon imageUrl description basePrice unit categoryId')
      .populate('vendorId', 'name businessName phone rating location');
  }

  /**
   * Bulk assign or sync services for a vendor
   */
  async bulkAssignServices(vendorId, services = []) {
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      throw new ApiError(400, 'Valid Vendor ID is required');
    }

    if (!Array.isArray(services) || services.length === 0) {
      throw new ApiError(400, 'Services list must be a non-empty array');
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    const results = [];
    for (const item of services) {
      const sId = item.serviceId || item._id;
      if (!sId || !mongoose.Types.ObjectId.isValid(sId)) continue;

      const price = Number(item.price !== undefined ? item.price : 0);
      const duration = item.durationMinutes !== undefined && item.durationMinutes !== null ? Number(item.durationMinutes) : null;
      const isAvailable = item.isAvailable !== undefined ? Boolean(item.isAvailable) : true;
      const status = item.status || 'ACTIVE';

      const upserted = await VendorService.findOneAndUpdate(
        { vendorId, serviceId: sId },
        {
          $set: {
            price,
            durationMinutes: duration,
            isAvailable,
            status,
          },
        },
        { new: true, upsert: true, runValidators: true }
      );
      results.push(upserted);
    }

    return await this.getServicesByVendor(vendorId);
  }

  /**
   * Get all services assigned to a specific vendor
   */
  async getServicesByVendor(vendorId, { isAvailable, status, categoryId } = {}) {
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      throw new ApiError(400, 'Valid Vendor ID is required');
    }

    const query = { vendorId };
    if (status) query.status = status;
    if (isAvailable !== undefined) query.isAvailable = Boolean(isAvailable);

    let vendorServices = await VendorService.find(query)
      .populate({
        path: 'serviceId',
        select: 'name icon imageUrl description basePrice unit categoryId isActive',
        populate: {
          path: 'categoryId',
          select: 'name icon imageUrl storeType',
        },
      })
      .sort({ createdAt: -1 });

    if (categoryId) {
      const catIdStr = String(categoryId).trim();
      vendorServices = vendorServices.filter((vs) => {
        const cat = vs.serviceId?.categoryId;
        return cat && (String(cat._id) === catIdStr || String(cat) === catIdStr);
      });
    }

    return vendorServices;
  }

  /**
   * Get all vendors offering an available service
   */
  async getVendorsByService(serviceId, { isAvailable = true, status = 'ACTIVE' } = {}) {
    if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
      throw new ApiError(400, 'Valid Service ID is required');
    }

    const query = { serviceId };
    if (status) query.status = status;
    if (isAvailable !== undefined) query.isAvailable = Boolean(isAvailable);

    const vendorServices = await VendorService.find(query)
      .populate('vendorId', 'name businessName phone rating totalOrdersHandled location address status isVerified')
      .populate('serviceId', 'name icon imageUrl unit basePrice categoryId')
      .sort({ price: 1 });

    return vendorServices;
  }

  /**
   * Get a single vendor service by its ID
   */
  async getVendorServiceById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Valid VendorService ID is required');
    }

    const vendorService = await VendorService.findById(id)
      .populate('vendorId', 'name businessName phone rating location address')
      .populate({
        path: 'serviceId',
        select: 'name icon imageUrl description basePrice unit categoryId',
        populate: {
          path: 'categoryId',
          select: 'name icon imageUrl',
        },
      });

    if (!vendorService) {
      throw new ApiError(404, 'Vendor service assignment not found');
    }

    return vendorService;
  }

  /**
   * Update a vendor service (price, duration, availability, status)
   */
  async updateVendorService(id, vendorId, payload = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Valid VendorService ID is required');
    }

    const vendorService = await VendorService.findById(id);
    if (!vendorService) {
      throw new ApiError(404, 'Vendor service not found');
    }

    // Ownership check if vendorId is provided
    if (vendorId && vendorService.vendorId.toString() !== vendorId.toString()) {
      throw new ApiError(403, 'Forbidden: You can only modify your own services');
    }

    const { price, durationMinutes, isAvailable, status } = payload;

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        throw new ApiError(400, 'Price must be a non-negative number');
      }
      vendorService.price = parsedPrice;
    }

    if (durationMinutes !== undefined) {
      if (durationMinutes === null) {
        vendorService.durationMinutes = null;
      } else {
        const parsedDur = Number(durationMinutes);
        if (isNaN(parsedDur) || parsedDur < 1) {
          throw new ApiError(400, 'Duration must be at least 1 minute');
        }
        vendorService.durationMinutes = parsedDur;
      }
    }

    if (isAvailable !== undefined) {
      vendorService.isAvailable = Boolean(isAvailable);
    }

    if (status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(status)) {
        throw new ApiError(400, 'Status must be ACTIVE or INACTIVE');
      }
      vendorService.status = status;
    }

    await vendorService.save();

    return await this.getVendorServiceById(id);
  }

  /**
   * Toggle service availability
   */
  async toggleAvailability(id, vendorId, isAvailable) {
    if (isAvailable === undefined) {
      throw new ApiError(400, 'isAvailable (boolean) is required');
    }
    return await this.updateVendorService(id, vendorId, { isAvailable: Boolean(isAvailable) });
  }

  /**
   * Toggle service status
   */
  async toggleStatus(id, vendorId, status) {
    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      throw new ApiError(400, 'Valid status (ACTIVE or INACTIVE) is required');
    }
    return await this.updateVendorService(id, vendorId, { status });
  }

  /**
   * Delete / Remove service from vendor
   */
  async deleteVendorService(id, vendorId) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Valid VendorService ID is required');
    }

    const vendorService = await VendorService.findById(id);
    if (!vendorService) {
      throw new ApiError(404, 'Vendor service not found');
    }

    if (vendorId && vendorService.vendorId.toString() !== vendorId.toString()) {
      throw new ApiError(403, 'Forbidden: You can only remove your own services');
    }

    await VendorService.findByIdAndDelete(id);

    return { success: true, message: 'Vendor service removed successfully' };
  }
}

module.exports = new VendorServiceService();
