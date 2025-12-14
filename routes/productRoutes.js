const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/product.controller');
const  validate  = require('../middilewares/validate');
const {
    createProductValidation,
    updateProductValidation,
    queryValidation,
    updateStockValidation,
    bulkStockUpdateValidation
} = require('../validations/productValidator');

// Middleware (you'll need to implement these)
const { auth, isAdmin } = require('../middilewares/auth');
const upload = require('../utils/multer');

// Public routes
router.get(
    '/',
    validate(queryValidation, 'query'),
    ProductController.getAllProducts
);

router.get('/featured', ProductController.getFeaturedProducts);
router.get('/new-arrivals', ProductController.getNewArrivals);
router.get('/bestsellers', ProductController.getBestsellers);
router.get('/search', ProductController.searchProducts);
router.get('/slug/:slug', ProductController.getProductBySlug);
router.get('/:id', ProductController.getProductById);
router.get('/:id/related', ProductController.getRelatedProducts);
router.get('/get-filter/options', ProductController.getFilterOptions);

// Admin protected routes
router.post(
    '/',
    auth,
    isAdmin,
    validate(createProductValidation),
     upload.array("pictures", 5),

    ProductController.createProduct
);

router.put(
    '/:id',
    auth,
    isAdmin,
    validate(updateProductValidation),
    upload.array("pictures", 5),

    ProductController.updateProduct
);

router.delete(
    '/:id',
    auth,
    isAdmin,
    ProductController.deleteProduct
);

router.delete(
    '/:id/permanent',
    auth,
    isAdmin,
    ProductController.permanentDeleteProduct
);

router.patch(
    '/:id/stock',
    auth,
    isAdmin,
    validate(updateStockValidation),
    ProductController.updateStock
);

router.patch(
    '/:id/stock/bulk',
    auth,
    isAdmin,
    validate(bulkStockUpdateValidation),
    ProductController.bulkStockUpdate
);

router.get(
    '/inventory/low-stock',
    auth,
    isAdmin,
    ProductController.getLowStockProducts
);

router.get(
    '/inventory/out-of-stock',
    auth,
    isAdmin,
    ProductController.getOutOfStockProducts
);

module.exports = router;