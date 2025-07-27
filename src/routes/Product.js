const express = require('express');
const { body, query, param } = require('express-validator');
const {
  getProducts,
  getProduct,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
  getReviews,
  updateInventory,
  getLowStockProducts,
  getRelatedProducts
} = require('../controllers/productController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const getProductsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  query('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'createdAt', 'ratings.average', 'brand'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const createProductValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('comparePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number'),
  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('brand')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Brand is required and cannot exceed 50 characters'),
  body('sku')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('SKU is required and cannot exceed 50 characters'),
  body('inventory.quantity')
    .isInt({ min: 0 })
    .withMessage('Inventory quantity must be a non-negative integer'),
  body('inventory.lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer'),
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .withMessage('Each tag must be a string')
];

const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('comparePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('brand')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Brand cannot exceed 50 characters'),
  body('inventory.quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Inventory quantity must be a non-negative integer'),
  body('inventory.lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer')
];

const addReviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Comment must be between 5 and 500 characters')
];

const updateInventoryValidation = [
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer')
];

const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// ID validation middleware
const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID')
];

// Public routes
router.get('/', getProductsValidation, validateRequest, getProducts);
router.get('/search', searchValidation, validateRequest, searchProducts);
router.get('/low-stock', protect, authorize('admin'), getLowStockProducts);
router.get('/:id', validateObjectId, validateRequest, getProduct);
router.get('/:id/related', validateObjectId, validateRequest, getRelatedProducts);
router.get('/:id/reviews', validateObjectId, validateRequest, getReviews);

// Protected routes - Customer
router.post('/:id/reviews', 
  protect, 
  validateObjectId, 
  addReviewValidation, 
  validateRequest, 
  addReview
);

// Protected routes - Admin only
router.post('/', 
  protect, 
  authorize('admin'), 
  upload.array('images', 5), 
  createProductValidation, 
  validateRequest, 
  createProduct
);

router.put('/:id', 
  protect, 
  authorize('admin'), 
  validateObjectId, 
  upload.array('images', 5), 
  updateProductValidation, 
  validateRequest, 
  updateProduct
);

router.delete('/:id', 
  protect, 
  authorize('admin'), 
  validateObjectId, 
  validateRequest, 
  deleteProduct
);

router.put('/:id/inventory', 
  protect, 
  authorize('admin'), 
  validateObjectId, 
  updateInventoryValidation, 
  validateRequest, 
  updateInventory
);

module.exports = router;