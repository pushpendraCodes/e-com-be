const User = require("../models/User");

exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist.product");

    res.json({
      success: true,
      wishlist: user.wishlist,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    const user = await User.findById(req.user._id);

    const exists = user.wishlist.find(
      (item) => item.product.toString() === productId
    );

    if (exists) {
      return res.json({
        success: true,
        message: "Already in wishlist",
      });
    }

    user.wishlist.push({ product: productId });

    await user.save();

    res.json({
      success: true,
      message: "Added to wishlist",
      wishlist: user.wishlist
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user._id);

    user.wishlist = user.wishlist.filter(
      (item) => item.product.toString() !== productId
    );

    await user.save();

    res.json({
      success: true,
      message: "Removed from wishlist",
      wishlist: user.wishlist
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
