const categoryService = require('./category.service');
const ApiResponse = require('../../utils/apiResponse');

class CategoryController {
  createCategory = async (req, res, next) => {
    try {
      const category = await categoryService.createCategory(req.body, req.file);
      return ApiResponse.created(res, category, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  };

  getAllCategories = async (req, res, next) => {
    try {
      const { includeInactive, storeType } = req.query;
      const categories = await categoryService.getAllCategories({
        includeInactive: includeInactive === 'true',
        storeType,
      });
      return ApiResponse.success(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getCategoryById = async (req, res, next) => {
    try {
      const category = await categoryService.getCategoryById(req.params.id);
      return ApiResponse.success(res, category, 'Category retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req, res, next) => {
    try {
      const updated = await categoryService.updateCategory(req.params.id, req.body, req.file);
      return ApiResponse.success(res, updated, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req, res, next) => {
    try {
      const result = await categoryService.deleteCategory(req.params.id, req.query.hard);
      return ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  };

  getCategoriesByStoreType = async (req, res, next) => {
    try {
      const categories = await categoryService.getCategoriesByStoreType(req.params.storeType);
      return ApiResponse.success(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getCategoriesByWardrobe = async (req, res, next) => {
    try {
      const categories = await categoryService.getCategoriesByWardrobe(req.params.wardrobeId);
      return ApiResponse.success(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new CategoryController();
