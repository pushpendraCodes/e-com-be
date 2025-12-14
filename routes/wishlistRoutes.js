const express = require("express");
const router = express.Router();
 const { auth } = require("../middilewares/auth");
const wishlistController = require("../controllers/wishlistController");

router.get("/", auth, wishlistController.getWishlist);
router.post("/add", auth, wishlistController.addToWishlist);
router.delete("/remove/:productId", auth, wishlistController.removeFromWishlist);

module.exports = router;
