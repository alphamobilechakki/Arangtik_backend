const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const productService = require('./product.service');

class ProductController {
  create = asyncHandler(async (req, res) => {
    const product = await productService.createProduct(req.body);
    return ApiResponse.created(res, product, 'Product created successfully');
  });

  createBulk = asyncHandler(async (req, res) => {
    const result = await productService.createBulkProducts(req.body);
    return ApiResponse.created(
      res,
      result,
      `Successfully created ${result.count} products in bulk`
    );
  });

  getAll = asyncHandler(async (req, res) => {
    const products = await productService.getAllProducts(req.query);
    return ApiResponse.success(res, products, 'Products retrieved successfully');
  });

  getById = asyncHandler(async (req, res) => {
    const product = await productService.getProductById(req.params.id);
    return ApiResponse.success(res, product, 'Product retrieved successfully');
  });

  update = asyncHandler(async (req, res) => {
    const product = await productService.updateProduct(req.params.id, req.body);
    return ApiResponse.success(res, product, 'Product updated successfully');
  });

  delete = asyncHandler(async (req, res) => {
    const result = await productService.deleteProduct(req.params.id);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new ProductController();
