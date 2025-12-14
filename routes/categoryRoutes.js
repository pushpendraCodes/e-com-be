const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const categoryValidators = require('../validations/categoryValidator');
const validate = require('../middilewares/validate');
const { auth, isAdmin } = require('../middilewares/auth');
const upload = require('../utils/multer');
// const { authenticate, isAdmin } = require('../middleware/auth'); // Add your auth middleware

// Public routes
router.get('/hierarchy', categoryController.getCategoryHierarchy);
router.get('/featured', categoryController.getFeaturedCategories);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.get('/:id', validate(categoryValidators.categoryId, 'params'), categoryController.getCategoryById);
router.get('/', validate(categoryValidators.getCategories, 'query'), categoryController.getCategories);

// Protected routes (require admin authentication)
router.post('/', 
    auth, 
    isAdmin,
    validate(categoryValidators.createCategory), 
      upload.single("thumbnail"),
    categoryController.createCategory
);

router.put('/:id', 
    auth, 
    isAdmin,
    validate(categoryValidators.categoryId, 'params'),
    validate(categoryValidators.updateCategory), 
      upload.single("thumbnail"),
    categoryController.updateCategory
);

router.delete('/:id', 
    auth, 
    isAdmin,
    validate(categoryValidators.categoryId, 'params'),
    categoryController.deleteCategory
);

router.delete('/:id/permanent', 
    auth, 
    isAdmin,
    validate(categoryValidators.categoryId, 'params'),
    categoryController.permanentDeleteCategory
);

module.exports = router;