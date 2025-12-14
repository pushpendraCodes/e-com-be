const express = require("express");
const router = express.Router();
const {auth} = require("../middilewares/auth");
const cartController = require("../controllers/cartController");

router.get("/", auth, cartController.getCart);
router.post("/add", auth, cartController.addToCart);
router.put("/update", auth, cartController.updateQuantity);
router.delete("/remove/:cartId", auth, cartController.removeFromCart);
router.delete("/clear", auth, cartController.clearCart);

module.exports = router;
