const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

const reviewController = {
    // Create a new review
    createReview: async (req, res) => {
        try {
            const { product, rating, title, comment, order, variant } = req.body;
            const userId = req.user._id; // From auth middleware

            // Check if product exists
            const productExists = await Product.findById(product);
            if (!productExists) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Check if user already reviewed this product
            const existingReview = await Review.findOne({ product, user: userId });
            if (existingReview) {
                return res.status(409).json({
                    success: false,
                    message: 'You have already reviewed this product'
                });
            }

            // Verify purchase if order is provided
            let isVerifiedPurchase = false;
            if (order) {
                const orderExists = await Order.findOne({
                    _id: order,
                    user: userId,
                    'items.product': product,
                    status: 'Delivered'
                });
                
                if (orderExists) {
                    isVerifiedPurchase = true;
                } else {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid order or product not purchased'
                    });
                }
            }

            // Create review
            const review = new Review({
                product,
                user: userId,
                order,
                rating,
                title,
                comment,
                variant,
                isVerifiedPurchase,
                status: 'pending' // Needs admin approval
            });

            await review.save();

            // Populate review data
            await review.populate('user', 'name email profilePicture');

            res.status(201).json({
                success: true,
                message: 'Review submitted successfully. Awaiting approval.',
                data: review
            });
        } catch (error) {
            console.error('Create review error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create review',
                error: error.message
            });
        }
    },

    // Get all reviews with filters
    getReviews: async (req, res) => {
        try {
            const {
                page,
                limit,
                product,
                user,
                rating,
                status,
                isVerifiedPurchase,
                sortBy,
                sortOrder
            } = req.query;

            // Build query
            const query = {};
            if (product) query.product = product;
            if (user) query.user = user;
            if (rating) query.rating = parseInt(rating);
            if (status) query.status = status;
            if (isVerifiedPurchase !== undefined) {
                query.isVerifiedPurchase = isVerifiedPurchase === 'true';
            }

            // Sorting
            const sort = {};
            if (sortBy === 'rating') {
                sort.rating = sortOrder === 'asc' ? 1 : -1;
            } else if (sortBy === 'helpful') {
                sort['helpful.count'] = sortOrder === 'asc' ? 1 : -1;
            } else {
                sort.createdAt = sortOrder === 'asc' ? 1 : -1;
            }

            // Pagination
            const skip = (page - 1) * limit;

            const [reviews, total, ratingDistribution] = await Promise.all([
                Review.find(query)
                    .populate('user', 'name profilePicture')
                    .populate('product', 'name images')
                    .populate('adminResponse.respondedBy', 'name')
                    .sort(sort)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                Review.countDocuments(query),
                // Get rating distribution
                Review.aggregate([
                    { $match: { ...query, status: 'approved' } },
                    {
                        $group: {
                            _id: '$rating',
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: -1 } }
                ])
            ]);

            res.status(200).json({
                success: true,
                data: reviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                },
                ratingDistribution: {
                    5: ratingDistribution.find(r => r._id === 5)?.count || 0,
                    4: ratingDistribution.find(r => r._id === 4)?.count || 0,
                    3: ratingDistribution.find(r => r._id === 3)?.count || 0,
                    2: ratingDistribution.find(r => r._id === 2)?.count || 0,
                    1: ratingDistribution.find(r => r._id === 1)?.count || 0
                }
            });
        } catch (error) {
            console.error('Get reviews error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch reviews',
                error: error.message
            });
        }
    },

    // Get single review by ID
    getReviewById: async (req, res) => {
        try {
            const { id } = req.params;

            const review = await Review.findById(id)
                .populate('user', 'name profilePicture')
                .populate('product', 'name images price')
                .populate('adminResponse.respondedBy', 'name');

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }

            res.status(200).json({
                success: true,
                data: review
            });
        } catch (error) {
            console.error('Get review error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch review',
                error: error.message
            });
        }
    },

    // Get reviews by product
    getProductReviews: async (req, res) => {
        try {
            const { productId } = req.params;
            const { page = 1, limit = 10, rating, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

            // Verify product exists
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const query = {
                product: productId,
                status: 'approved'
            };

            if (rating) query.rating = parseInt(rating);

            const sort = {};
            if (sortBy === 'rating') {
                sort.rating = sortOrder === 'asc' ? 1 : -1;
            } else if (sortBy === 'helpful') {
                sort['helpful.count'] = sortOrder === 'asc' ? 1 : -1;
            } else {
                sort.createdAt = sortOrder === 'asc' ? 1 : -1;
            }

            const skip = (page - 1) * limit;

            const [reviews, total, stats] = await Promise.all([
                Review.find(query)
                    .populate('user', 'name profilePicture')
                    .sort(sort)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                Review.countDocuments(query),
                Review.aggregate([
                    { $match: query },
                    {
                        $group: {
                            _id: null,
                            averageRating: { $avg: '$rating' },
                            totalReviews: { $sum: 1 },
                            verifiedPurchases: {
                                $sum: { $cond: ['$isVerifiedPurchase', 1, 0] }
                            }
                        }
                    }
                ])
            ]);

            res.status(200).json({
                success: true,
                data: reviews,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                },
                stats: stats[0] || {
                    averageRating: 0,
                    totalReviews: 0,
                    verifiedPurchases: 0
                }
            });
        } catch (error) {
            console.error('Get product reviews error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch product reviews',
                error: error.message
            });
        }
    },

    // Update own review
    updateReview: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user._id;
            const updates = req.body;

            const review = await Review.findOne({ _id: id, user: userId });

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found or unauthorized'
                });
            }

            // Update fields
            Object.keys(updates).forEach(key => {
                review[key] = updates[key];
            });

            review.isEdited = true;
            review.editedAt = new Date();
            review.status = 'pending'; // Re-submit for approval

            await review.save();

            res.status(200).json({
                success: false,
                message: 'Review updated successfully. Awaiting re-approval.',
                data: review
            });
        } catch (error) {
            console.error('Update review error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update review',
                error: error.message
            });
        }
    },

    // Delete own review
    deleteReview: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            const review = await Review.findOneAndDelete({ _id: id, user: userId });

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found or unauthorized'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Review deleted successfully'
            });
        } catch (error) {
            console.error('Delete review error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete review',
                error: error.message
            });
        }
    },

    // Mark review as helpful
    markHelpful: async (req, res) => {
        try {
            const { id } = req.params;
            const { helpful } = req.body;
            const userId = req.user._id;

            const review = await Review.findById(id);

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }

            const userIndex = review.helpful.users.indexOf(userId);

            if (helpful) {
                // Add helpful vote
                if (userIndex === -1) {
                    review.helpful.users.push(userId);
                    review.helpful.count += 1;
                }
            } else {
                // Remove helpful vote
                if (userIndex !== -1) {
                    review.helpful.users.splice(userIndex, 1);
                    review.helpful.count -= 1;
                }
            }

            await review.save();

            res.status(200).json({
                success: true,
                message: helpful ? 'Marked as helpful' : 'Removed helpful mark',
                data: {
                    helpfulCount: review.helpful.count
                }
            });
        } catch (error) {
            console.error('Mark helpful error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update helpful status',
                error: error.message
            });
        }
    },

    // Report a review
    reportReview: async (req, res) => {
        try {
            const { id } = req.params;
            const { reason, comment } = req.body;
            const userId = req.user._id;

            const review = await Review.findById(id);

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }

            // Check if user already reported this review
            const alreadyReported = review.reports.some(
                report => report.user.toString() === userId.toString()
            );

            if (alreadyReported) {
                return res.status(409).json({
                    success: false,
                    message: 'You have already reported this review'
                });
            }

            review.reports.push({
                user: userId,
                reason,
                comment
            });

            review.reportCount += 1;

            // Auto-flag if too many reports
            if (review.reportCount >= 5) {
                review.status = 'flagged';
            }

            await review.save();

            res.status(200).json({
                success: true,
                message: 'Review reported successfully'
            });
        } catch (error) {
            console.error('Report review error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to report review',
                error: error.message
            });
        }
    },

    // ===== ADMIN ACTIONS =====

    // Update review status (admin)
    updateReviewStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const review = await Review.findByIdAndUpdate(
                id,
                { status },
                { new: true }
            );

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }

            res.status(200).json({
                success: true,
                message: `Review ${status} successfully`,
                data: review
            });
        } catch (error) {
            console.error('Update review status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update review status',
                error: error.message
            });
        }
    },

    // Add admin response to review
    addAdminResponse: async (req, res) => {
        try {
            const { id } = req.params;
            const { message } = req.body;
            const adminId = req.user._id;

            const review = await Review.findByIdAndUpdate(
                id,
                {
                    adminResponse: {
                        message,
                        respondedBy: adminId,
                        respondedAt: new Date()
                    }
                },
                { new: true }
            ).populate('adminResponse.respondedBy', 'name');

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Admin response added successfully',
                data: review
            });
        } catch (error) {
            console.error('Add admin response error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add admin response',
                error: error.message
            });
        }
    },

    // Get review statistics
    getReviewStats: async (req, res) => {
        try {
            const stats = await Review.aggregate([
                {
                    $facet: {
                        statusCount: [
                            { $group: { _id: '$status', count: { $sum: 1 } } }
                        ],
                        ratingDistribution: [
                            { $match: { status: 'approved' } },
                            { $group: { _id: '$rating', count: { $sum: 1 } } },
                            { $sort: { _id: -1 } }
                        ],
                        totalStats: [
                            {
                                $group: {
                                    _id: null,
                                    totalReviews: { $sum: 1 },
                                    averageRating: { $avg: '$rating' },
                                    verifiedPurchases: {
                                        $sum: { $cond: ['$isVerifiedPurchase', 1, 0] }
                                    },
                                    totalReports: { $sum: '$reportCount' }
                                }
                            }
                        ]
                    }
                }
            ]);

            res.status(200).json({
                success: true,
                data: stats[0]
            });
        } catch (error) {
            console.error('Get review stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch review statistics',
                error: error.message
            });
        }
    }
};

module.exports = reviewController;