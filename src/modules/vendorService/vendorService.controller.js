const vendorServiceService = require('./vendorService.service');
const ApiResponse = require('../../utils/apiResponse');
const ApiError = require('../../utils/apiError');

class VendorServiceController {
  /**
   * Add a single service to a vendor
   * (Used by logged-in vendor or admin)
   */
  addService = async (req, res, next) => {
    try {
      const vendorId = req.vendor?._id || req.body.vendorId || req.user?.id;
      if (!vendorId) {
        throw new ApiError(400, 'Vendor ID is required');
      }

      const result = await vendorServiceService.addVendorService(vendorId, req.body);
      return ApiResponse.created(res, result, 'Vendor service added successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk assign or sync multiple services for a vendor
   */
  bulkAssign = async (req, res, next) => {
    try {
      const vendorId = req.vendor?._id || req.body.vendorId || req.user?.id;
      if (!vendorId) {
        throw new ApiError(400, 'Vendor ID is required');
      }

      const result = await vendorServiceService.bulkAssignServices(vendorId, req.body.services);
      return ApiResponse.success(res, result, 'Services assigned successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get services for currently authenticated vendor
   */
  getMyServices = async (req, res, next) => {
    try {
      const vendorId = req.vendor?._id || req.user?.id;
      if (!vendorId) {
        throw new ApiError(401, 'Vendor authentication required');
      }

      const { isAvailable, status, categoryId } = req.query;
      const services = await vendorServiceService.getServicesByVendor(vendorId, {
        isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
        status,
        categoryId,
      });

      return ApiResponse.success(res, services, 'Vendor services retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all services of a specific vendor by vendorId
   * (Public or Customer route)
   */
  getServicesByVendor = async (req, res, next) => {
    try {
      const vendorId = req.params.vendorId || req.params.id;
      const { isAvailable, status, categoryId } = req.query;

      const services = await vendorServiceService.getServicesByVendor(vendorId, {
        isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
        status,
        categoryId,
      });

      return ApiResponse.success(res, services, 'Vendor services retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Find all vendors offering a specific service
   * (Customer discovery / comparison)
   */
  getVendorsByService = async (req, res, next) => {
    try {
      const serviceId = req.params.serviceId || req.params.id;
      const { isAvailable, status } = req.query;

      const vendors = await vendorServiceService.getVendorsByService(serviceId, {
        isAvailable: isAvailable !== undefined ? isAvailable === 'true' : true,
        status: status || 'ACTIVE',
      });

      return ApiResponse.success(res, vendors, 'Vendors offering service retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single vendor service document by ID
   */
  getById = async (req, res, next) => {
    try {
      const service = await vendorServiceService.getVendorServiceById(req.params.id);
      return ApiResponse.success(res, service, 'Vendor service retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update a vendor service assignment
   */
  updateVendorService = async (req, res, next) => {
    try {
      // If admin, vendorId can be null to allow override, otherwise restrict to logged in vendor
      const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'admin';
      const vendorId = isAdmin ? null : req.vendor?._id || req.user?.id;

      const updated = await vendorServiceService.updateVendorService(req.params.id, vendorId, req.body);
      return ApiResponse.success(res, updated, 'Vendor service updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Toggle service availability (on/off)
   */
  toggleAvailability = async (req, res, next) => {
    try {
      const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'admin';
      const vendorId = isAdmin ? null : req.vendor?._id || req.user?.id;

      const updated = await vendorServiceService.toggleAvailability(
        req.params.id,
        vendorId,
        req.body.isAvailable
      );
      return ApiResponse.success(res, updated, 'Service availability updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Toggle service status (ACTIVE/INACTIVE)
   */
  toggleStatus = async (req, res, next) => {
    try {
      const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'admin';
      const vendorId = isAdmin ? null : req.vendor?._id || req.user?.id;

      const updated = await vendorServiceService.toggleStatus(
        req.params.id,
        vendorId,
        req.body.status
      );
      return ApiResponse.success(res, updated, 'Service status updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete / Remove a service from vendor
   */
  deleteVendorService = async (req, res, next) => {
    try {
      const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'admin';
      const vendorId = isAdmin ? null : req.vendor?._id || req.user?.id;

      const result = await vendorServiceService.deleteVendorService(req.params.id, vendorId);
      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new VendorServiceController();
