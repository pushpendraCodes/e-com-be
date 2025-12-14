const User = require("../models/User");
const Product = require("../models/Product");

exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("carts.product");

    res.json({
      success: true,
      carts: user.carts
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variantId } = req.body;

    const user = await User.findById(req.userId);

    // Already exists?
    const existing = user.carts.find(
      (item) =>
        item.product.toString() === productId &&
        (variantId ? item.variantId?.toString() === variantId : true)
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      user.carts.push({
        product: productId,
        quantity,
        variantId,
      });
    }

    await user.save();

    res.json({
      success: true,
      message: "Added to cart",
      carts: user.carts
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.updateQuantity = async (req, res) => {
  try {
    const { cartId, quantity } = req.body;

    const user = await User.findById(req.userId);

    const item = user.carts.id(cartId);
    if (!item)
      return res.status(404).json({ success: false, message: "Cart item not found" });

    item.quantity = quantity;

    await user.save();

    res.json({
      success: true,
      message: "Cart updated",
      carts: user.carts
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.removeFromCart = async (req, res) => {
  try {
    const { cartId } = req.params;

    const user = await User.findById(req.userId);

    user.carts = user.carts.filter((item) => item._id.toString() !== cartId);

    await user.save();

    res.json({
      success: true,
      message: "Item removed",
      carts: user.carts
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.clearCart = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    user.carts = [];
    await user.save();

    res.json({
      success: true,
      message: "Cart cleared",
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
