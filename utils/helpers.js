const generateSessionId = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};



const formattedUsers = (users) =>
  users.map(user => {
    const userObj = user.toObject();

    // 🛒 CART
    userObj.carts = userObj.carts.map(cart => {
      if (!cart.product) return cart;

      const selectedVariant = cart.product.variants?.find(
        v => v._id.toString() === cart.variantId?.toString()
      );

      return {
        ...cart,
        product: {
          name: cart.product.name || null,
          image: cart.product.images?.[0]?.url || null,
          variant: selectedVariant
            ? {
                _id: selectedVariant._id,
                size: selectedVariant.size,
                color: selectedVariant.color,
                colorCode: selectedVariant.colorCode,
                sku: selectedVariant.sku,
                price: selectedVariant.price,
                stock: selectedVariant.stock,
              }
            : null,
        }
      };
    });

    // ❤️ WISHLIST
    userObj.wishlist = userObj.wishlist.map(wish => {
      if (!wish.product) return wish;

      const defaultVariant = wish.product.variants?.[0];
      // console.log("Default Variant:", wish.product);

      return {
        ...wish,
        product: {
          name: wish.product.name || null,
          image: wish.product.images?.[0]?.url || null,
          price: defaultVariant?.price || null,
          variant: defaultVariant
            ? {
                _id: defaultVariant._id,
                size: defaultVariant.size,
                color: defaultVariant.color,
                colorCode: defaultVariant.colorCode,
                sku: defaultVariant.sku,
                stock: defaultVariant.stock,
              }
            : null,
        }
      };
    });

    return userObj;
  });



module.exports = {
  generateSessionId,
  formattedUsers
};



