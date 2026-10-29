const categoryService = require('./categoryService.service');
const ApiResponse = require('../../utils/apiResponse');

class CategoryServiceController {
  createService = async (req, res, next) => {
    try {
      const categoryId = req.params.categoryId || req.body.categoryId || req.body.category;
      const service = await categoryService.createService(categoryId, req.body, req.file);
      return ApiResponse.created(res, service, 'Service created successfully');
    } catch (error) {
      next(error);
    }
  };

  getServicesByCategory = async (req, res, next) => {
    try {
      const categoryId = req.params.categoryId || req.query.category;
      const includeInactive = req.query.includeInactive === 'true';
      const services = await categoryService.getServicesByCategory(categoryId, { includeInactive });
      return ApiResponse.success(res, services, 'Services retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getAllServices = async (req, res, next) => {
    try {
      const { categoryId, includeInactive } = req.query;
      const services = await categoryService.getAllServices({
        categoryId,
        includeInactive: includeInactive === 'true',
      });
      return ApiResponse.success(res, services, 'Services retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getServiceById = async (req, res, next) => {
    try {
      const service = await categoryService.getServiceById(req.params.id);
      return ApiResponse.success(res, service, 'Service retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateService = async (req, res, next) => {
    try {
      const updated = await categoryService.updateService(req.params.id, req.body, req.file);
      return ApiResponse.success(res, updated, 'Service updated successfully');
    } catch (error) {
      next(error);
    }
  };

  toggleServiceStatus = async (req, res, next) => {
    try {
      const result = await categoryService.toggleServiceStatus(req.params.id, req.body.isActive);
      return ApiResponse.success(res, result, 'Status updated');
    } catch (error) {
      next(error);
    }
  };

  deleteService = async (req, res, next) => {
    try {
      const result = await categoryService.deleteService(req.params.id, req.query.hard);
      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new CategoryServiceController();
