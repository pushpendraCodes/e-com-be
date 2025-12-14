const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    // Product & User References
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product reference is required'],
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
        index: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        index: true
    },
    
    // Review Content
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
        index: true
    },
    title: {
        type: String,
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    comment: {
        type: String,
        required: [true, 'Review comment is required'],
        trim: true,
        minlength: [10, 'Comment must be at least 10 characters'],
        maxlength: [2000, 'Comment cannot exceed 2000 characters']
    },
    
    // Review Images (optional)
    images: [{
        url: {
            type: String,
            required: true
        },
        caption: String
    }],
    
    // Helpful votes
    helpful: {
        count: {
            type: Number,
            default: 0,
            min: 0
        },
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    
    // Purchase verification
    isVerifiedPurchase: {
        type: Boolean,
        default: false
    },
    
    // Review status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending',
        index: true
    },
    
    // Admin response
    adminResponse: {
        message: String,
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },
        respondedAt: Date
    },
    
    // Moderation
    reportCount: {
        type: Number,
        default: 0,
        min: 0
    },
    reports: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: {
            type: String,
            enum: ['spam', 'offensive', 'fake', 'inappropriate', 'other']
        },
        comment: String,
        reportedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Metadata
    variant: {
        size: String,
        color: String
    },
    
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
reviewSchema.index({ product: 1, user: 1 }, { unique: true }); // One review per user per product
reviewSchema.index({ product: 1, status: 1, rating: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

// Virtual for helpful percentage
reviewSchema.virtual('helpfulPercentage').get(function() {
    return this.helpful.count > 0 ? Math.round((this.helpful.count / 10) * 100) : 0;
});

// Update product rating after review save
reviewSchema.post('save', async function() {
    await updateProductRating(this.product);
});

// Update product rating after review update
reviewSchema.post('findOneAndUpdate', async function(doc) {
    if (doc) {
        await updateProductRating(doc.product);
    }
});

// Update product rating after review delete
reviewSchema.post('findOneAndDelete', async function(doc) {
    if (doc) {
        await updateProductRating(doc.product);
    }
});

// Helper function to update product rating
async function updateProductRating(productId) {
    const Product = mongoose.model('Product');
    const Review = mongoose.model('Review');
    
    const stats = await Review.aggregate([
        {
            $match: {
                product: productId,
                status: 'approved'
            }
        },
        {
            $group: {
                _id: '$product',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);
    
    if (stats.length > 0) {
        await Product.findByIdAndUpdate(productId, {
            'ratings.average': Math.round(stats[0].averageRating * 10) / 10,
            'ratings.count': stats[0].totalReviews
        });
    } else {
        await Product.findByIdAndUpdate(productId, {
            'ratings.average': 0,
            'ratings.count': 0
        });
    }
}

module.exports = mongoose.model('Review', reviewSchema);