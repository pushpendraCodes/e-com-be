const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const uploadToCloudinary = require('../utils/cloudinary');
const { calculatePendingChange, calculateReportedChange } = require('../utils/helpers');

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

            let images = [];
            if (req.files && req.files.length > 0) {
                try {
                    const uploadPromises = req.files.map(async (file, index) => {
                        const upload = await uploadToCloudinary(
                            file.path,
                            file.originalname
                        );

                        const imageUrl = upload?.secure_url || upload?.url;

                        return {
                            url: imageUrl,

                            caption: `image-${index}`
                        };
                    });

                    images = await Promise.all(uploadPromises);

                    if (!images.length) {
                        return res.status(500).json({
                            success: false,
                            message: "Failed to upload product images"
                        });
                    }
                } catch (uploadError) {
                    console.error("Cloudinary upload error:", uploadError);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to upload images",
                        error: uploadError.message
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
                images,
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
                    .populate('user', 'name profilePicture mobile')
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

            const {
                rating,
                title,
                comment,
                variant,
                existingImages // array from frontend
            } = req.body;

            const review = await Review.findOne({ _id: id, user: userId });

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: "Review not found or unauthorized"
                });
            }

            /* ---------- Parse Existing Images ---------- */
            let parsedExistingImages = [];

            if (existingImages) {
                parsedExistingImages =
                    typeof existingImages === "string"
                        ? JSON.parse(existingImages)
                        : existingImages;
            }

            /* ---------- Upload New Images ---------- */
            let newImages = [];

            if (req.files && req.files.length > 0) {
                try {
                    const uploadPromises = req.files.map(async (file, index) => {
                        const upload = await uploadToCloudinary(
                            file.path,
                            file.originalname
                        );

                        const imageUrl = upload?.secure_url || upload?.url;

                        return {
                            url: imageUrl,
                            caption: `image-${Date.now()}-${index}`
                        };
                    });

                    newImages = await Promise.all(uploadPromises);
                } catch (uploadError) {
                    console.error("Cloudinary upload error:", uploadError);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to upload images",
                        error: uploadError.message
                    });
                }
            }

            /* ---------- Merge Images ---------- */
            review.images = [...parsedExistingImages, ...newImages];

            /* ---------- Update Fields ---------- */
            if (rating !== undefined) review.rating = rating;
            if (title !== undefined) review.title = title;
            if (comment !== undefined) review.comment = comment;
            if (variant !== undefined) review.variant = variant;

            review.isEdited = true;
            review.editedAt = new Date();
            review.status = "pending"; // needs re-approval

            await review.save();

            await review.populate("user", "name email profilePicture");

            return res.status(200).json({
                success: true,
                message: "Review updated successfully. Awaiting re-approval.",
                data: review
            });

        } catch (error) {
            console.error("Update review error:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to update review",
                error: error.message
            });
        }
    }
    ,

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
    deleteReviewForAdmin: async (req, res) => {
        try {
            const { id } = req.params;
            // const userId = req.user._id;

            const review = await Review.findByIdAndDelete(id);

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: 'Review not found '
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
    ,



    getReviewDashboard: async (req, res) => {
        try {
            // 1. Get overall statistics
            const [
                totalReviews,
                avgRatingData,
                pendingApproval,
                reportedReviews,
                previousTotalReviews,
                previousAvgRating
            ] = await Promise.all([
                // Total reviews count
                Review.countDocuments({ status: 'approved' }),

                // Average rating
                Review.aggregate([
                    { $match: { status: 'approved' } },
                    { $group: { _id: null, avgRating: { $avg: '$rating' } } }
                ]),

                // Pending approval count
                Review.countDocuments({ status: 'pending' }),

                // Reported reviews count
                Review.countDocuments({ reportCount: { $gt: 0 } }),

                // Previous period total (30 days ago)
                Review.countDocuments({
                    status: 'approved',
                    createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }),

                // Previous period average rating (30 days ago)
                Review.aggregate([
                    {
                        $match: {
                            status: 'approved',
                            createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                        }
                    },
                    { $group: { _id: null, avgRating: { $avg: '$rating' } } }
                ])
            ]);

            const currentAvgRating = avgRatingData[0]?.avgRating || 0;
            const prevAvgRating = previousAvgRating[0]?.avgRating || 0;

            // Calculate changes
            const reviewsChange = totalReviews - previousTotalReviews;
            const ratingChange = currentAvgRating - prevAvgRating;
            const pendingChange = await calculatePendingChange();
            const reportedChange = await calculateReportedChange();

            // 2. Get top reviewed products
            const topReviewedProducts = await Review.aggregate([
                { $match: { status: 'approved' } },
                {
                    $group: {
                        _id: '$product',
                        totalReviews: { $sum: 1 },
                        avgRating: { $avg: '$rating' },
                        rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                        rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                        rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                        rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                        rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
                    }
                },
                { $sort: { totalReviews: -1 } },
                { $limit: 4 },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'productDetails'
                    }
                },
                { $unwind: '$productDetails' },
                {
                    $project: {
                        productId: '$_id',
                        productName: '$productDetails.name',
                        productImage: {
                            $arrayElemAt: ['$productDetails.images.url', 0]
                        },
                        totalReviews: 1,
                        avgRating: { $round: ['$avgRating', 1] },
                        ratingDistribution: {
                            5: '$rating5',
                            4: '$rating4',
                            3: '$rating3',
                            2: '$rating2',
                            1: '$rating1'
                        }
                    }
                }
            ]);

            // 3. Format response
            const dashboardData = {
                statistics: {
                    totalReviews: {
                        count: totalReviews,
                        change: reviewsChange,
                        trend: reviewsChange > 0 ? 'up' : reviewsChange < 0 ? 'down' : 'stable'
                    },
                    avgRating: {
                        rating: parseFloat(currentAvgRating.toFixed(1)),
                        change: parseFloat(ratingChange.toFixed(1)),
                        trend: ratingChange > 0 ? 'up' : ratingChange < 0 ? 'down' : 'stable'
                    },
                    pendingApproval: {
                        count: pendingApproval,
                        change: pendingChange,
                        trend: pendingChange > 0 ? 'up' : pendingChange < 0 ? 'down' : 'stable'
                    },
                    reportedReviews: {
                        count: reportedReviews,
                        change: reportedChange,
                        trend: reportedChange > 0 ? 'up' : reportedChange < 0 ? 'down' : 'stable'
                    }
                },
                topReviewedProducts: topReviewedProducts.map(product => ({
                    id: product.productId,
                    name: product.productName,
                    image: product.productImage,
                    rating: product.avgRating,
                    totalReviews: product.totalReviews,
                    distribution: [
                        { star: 5, count: product.ratingDistribution[5] },
                        { star: 4, count: product.ratingDistribution[4] },
                        { star: 3, count: product.ratingDistribution[3] },
                        { star: 2, count: product.ratingDistribution[2] },
                        { star: 1, count: product.ratingDistribution[1] }
                    ]
                }))
            };

            res.status(200).json({
                success: true,
                data: dashboardData
            });

        } catch (error) {
            console.error('Dashboard data error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard data',
                error: error.message
            });
        }
    },

    getRecentActivity: async (req, res) => {
        try {
            const recentReviews = await Review.find({ status: 'approved' })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('user', 'name avatar')
                .populate('product', 'name images')
                .select('rating comment createdAt user product');

            res.status(200).json({
                success: true,
                data: recentReviews
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch recent activity',
                error: error.message
            });
        }
    }
    ,

    getRatingTrends: async (req, res) => {
        try {
            const { period = '30' } = req.query; // days
            const daysAgo = parseInt(period);

            const trends = await Review.aggregate([
                {
                    $match: {
                        status: 'approved',
                        createdAt: { $gte: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000) }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        avgRating: { $avg: '$rating' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            res.status(200).json({
                success: true,
                data: trends
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch rating trends',
                error: error.message
            });
        }
    },


};

module.exports = reviewController;