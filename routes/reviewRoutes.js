const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const reviewValidators = require('../validations/reviewValidator');
const validate = require('../middilewares/validate');
const { auth, isAdmin } = require('../middilewares/auth');

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
    reviewController.createReview
);

router.put('/:id',
    auth,
    validate(reviewValidators.reviewId, 'params'),
    validate(reviewValidators.updateReview),
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

router.patch('/:id/status',
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

module.exports = router;