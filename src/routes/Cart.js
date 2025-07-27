const express = require('express');
const { body } = require('express-validator');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  validateCart,
  applyCoupon
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// All cart routes require authentication
router.use(protect);

// Validation rules
const addToCartValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('quantity')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100')
];

const updateCartValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100')
];

const removeFromCartValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required')
];

const applyCouponValidation = [
  body('couponCode')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Coupon code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Coupon code must contain only uppercase letters and numbers')
];

// Routes
router.get('/', getCart);
router.get('/summary', getCartSummary);
router.post('/validate', validateCart);

router.post('/add', addToCartValidation, validateRequest, addToCart);
router.put('/update', updateCartValidation, validateRequest, updateCartItem);
router.delete('/remove', removeFromCartValidation, validateRequest, removeFromCart);
router.delete('/clear', clearCart);

router.post('/coupon', applyCouponValidation, validateRequest, applyCoupon);

module.exports = router;