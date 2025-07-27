const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate({
        path: 'items.product',
        select: 'name price images brand inventory isActive'
      });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
        totalItems: 0,
        totalPrice: 0
      });
    }

    // Filter out inactive products
    cart.items = cart.items.filter(item => item.product && item.product.isActive);
    
    // Recalculate totals if items were filtered
    if (cart.items.length !== cart.totalItems) {
      await cart.save();
    }

    res.status(200).json({
      success: true,
      data: {
        cart
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validate product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive'
      });
    }

    // Check inventory
    if (product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.inventory.quantity} items available in stock`
      });
    }

    // Find or create cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({
        user: req.user.id,
        items: []
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update existing item quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (product.inventory.quantity < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add ${quantity} items. Only ${product.inventory.quantity - cart.items[existingItemIndex].quantity} more available`
        });
      }

      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity,
        price: product.price
      });
    }

    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images brand inventory'
    });

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      data: {
        cart
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Check product inventory
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive'
      });
    }

    if (product.inventory.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.inventory.quantity} items available in stock`
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = product.price; // Update price in case it changed

    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images brand inventory'
    });

    res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      data: {
        cart
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Remove item from cart
    cart.items.splice(itemIndex, 1);
    await cart.save();

    // Populate cart for response
    await cart.populate({
      path: 'items.product',
      select: 'name price images brand inventory'
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      data: {
        cart
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        cart
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get cart summary
// @route   GET /api/cart/summary
// @access  Private
exports.getCartSummary = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    
    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalItems: 0,
          totalPrice: 0,
          isEmpty: true
        }
      });
    }

    const summary = {
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      itemsCount: cart.items.length,
      isEmpty: false
    };

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Validate cart before checkout
// @route   POST /api/cart/validate
// @access  Private
exports.validateCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'name price inventory isActive');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    const errors = [];
    const validItems = [];

    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        errors.push({
          productId: item.product?._id,
          message: 'Product is no longer available'
        });
        continue;
      }

      if (item.product.inventory.quantity < item.quantity) {
        errors.push({
          productId: item.product._id,
          productName: item.product.name,
          message: `Only ${item.product.inventory.quantity} items available, but ${item.quantity} requested`
        });
        continue;
      }

      // Check if price has changed
      if (Math.abs(item.price - item.product.price) > 0.01) {
        errors.push({
          productId: item.product._id,
          productName: item.product.name,
          message: `Price has changed from $${item.price} to $${item.product.price}`,
          type: 'price_change',
          oldPrice: item.price,
          newPrice: item.product.price
        });
      }

      validItems.push(item);
    }

    // Update cart if there were invalid items
    if (errors.length > 0 && validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }

    res.status(200).json({
      success: errors.length === 0,
      data: {
        cart,
        isValid: errors.length === 0,
        errors,
        validItemsCount: validItems.length
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Apply coupon to cart
// @route   POST /api/cart/coupon
// @access  Private
exports.applyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    
    // This is a placeholder - you would implement actual coupon logic
    const validCoupons = {
      'SAVE10': { discount: 10, type: 'percentage' },
      'WELCOME20': { discount: 20, type: 'percentage' },
      'FLAT50': { discount: 50, type: 'fixed' }
    };

    const coupon = validCoupons[couponCode];
    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (cart.totalPrice * coupon.discount) / 100;
    } else {
      discountAmount = Math.min(coupon.discount, cart.totalPrice);
    }

    const finalPrice = cart.totalPrice - discountAmount;

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        coupon: {
          code: couponCode,
          discount: coupon.discount,
          type: coupon.type
        },
        originalPrice: cart.totalPrice,
        discountAmount,
        finalPrice
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};