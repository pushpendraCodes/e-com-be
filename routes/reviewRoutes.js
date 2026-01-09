const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const reviewValidators = require('../validations/reviewValidator');
const validate = require('../middilewares/validate');
const { auth, isAdmin } = require('../middilewares/auth');
const upload = require('../utils/multer');

// Public routes
router.get('/',
    validate(reviewValidators.getReviews, 'query'),
    reviewController.getReviews
);

router.get('/product/:productId',
    reviewController.getProductReviews
);

router.get('/:id',
    validate(reviewValidators.reviewId, 'params'),
    reviewController.getReviewById
);

// Protected routes (require authentication)
router.post('/',
    auth,
    validate(reviewValidators.createReview),
    upload.array("pictures", 5),
    reviewController.createReview
);

router.put('/:id',
    auth,
    validate(reviewValidators.reviewId, 'params'),
    validate(reviewValidators.updateReview),
    upload.array("pictures", 5),
    reviewController.updateReview
);

router.delete('/:id',
    auth,
    validate(reviewValidators.reviewId, 'params'),
    reviewController.deleteReview
);


router.post('/:id/helpful',
    auth,
    validate(reviewValidators.reviewId, 'params'),
    validate(reviewValidators.markHelpful),
    reviewController.markHelpful
);

router.post('/:id/report',
    auth,
    validate(reviewValidators.reviewId, 'params'),
    validate(reviewValidators.reportReview),
    reviewController.reportReview
);

// Admin routes
router.get('/stats',
    auth,
    isAdmin,
    reviewController.getReviewStats
);


router.delete('/:id/admin',
    auth,
    isAdmin,
    validate(reviewValidators.reviewId, 'params'),
    reviewController.deleteReviewForAdmin
);
router.patch('/:id/admin/status',
    auth,
    isAdmin,
    validate(reviewValidators.reviewId, 'params'),
    validate(reviewValidators.updateStatus),
    reviewController.updateReviewStatus
);

router.post('/:id/admin-response',
    auth,
    isAdmin,
    validate(reviewValidators.reviewId, 'params'),
    validate(reviewValidators.adminResponse),
    reviewController.addAdminResponse
);


// dashboard data

router.get("/admin/dashboard", auth,
    isAdmin, reviewController.getReviewDashboard)
router.get("/admin/dashboard/recent-activity", auth,
    isAdmin, reviewController.getRecentActivity)
router.get("/admin/dashboard/recent-trends", auth,
    isAdmin, reviewController.getRatingTrends)

module.exports = router;