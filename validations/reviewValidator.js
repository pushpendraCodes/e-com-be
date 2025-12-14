const Joi = require('joi');

const reviewValidators = {
    // Create review validation
    createReview: Joi.object({
        product: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid product ID',
                'any.required': 'Product ID is required'
            }),
        
        rating: Joi.number()
            .integer()
            .min(1)
            .max(5)
            .required()
            .messages({
                'number.min': 'Rating must be at least 1',
                'number.max': 'Rating cannot exceed 5',
                'any.required': 'Rating is required'
            }),
        
        title: Joi.string()
            .trim()
            .max(200)
            .allow('')
            .messages({
                'string.max': 'Title cannot exceed 200 characters'
            }),
        
        comment: Joi.string()
            .trim()
            .min(10)
            .max(2000)
            .required()
            .messages({
                'string.min': 'Comment must be at least 10 characters',
                'string.max': 'Comment cannot exceed 2000 characters',
                'any.required': 'Review comment is required'
            }),
        
        order: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .allow(null)
            .messages({
                'string.pattern.base': 'Invalid order ID'
            }),
        
        variant: Joi.object({
            size: Joi.string().trim(),
            color: Joi.string().trim()
        }).optional()
    }),

    // Update review validation
    updateReview: Joi.object({
        rating: Joi.number()
            .integer()
            .min(1)
            .max(5)
            .messages({
                'number.min': 'Rating must be at least 1',
                'number.max': 'Rating cannot exceed 5'
            }),
        
        title: Joi.string()
            .trim()
            .max(200)
            .allow(''),
        
        comment: Joi.string()
            .trim()
            .min(10)
            .max(2000)
            .messages({
                'string.min': 'Comment must be at least 10 characters',
                'string.max': 'Comment cannot exceed 2000 characters'
            }),
        
        variant: Joi.object({
            size: Joi.string().trim(),
            color: Joi.string().trim()
        })
    }).min(1),

    // Get reviews query validation
    getReviews: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        product: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
        user: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
        rating: Joi.number().integer().min(1).max(5),
        status: Joi.string().valid('pending', 'approved', 'rejected', 'flagged'),
        isVerifiedPurchase: Joi.boolean(),
        sortBy: Joi.string().valid('createdAt', 'rating', 'helpful').default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    }),

    // Mark helpful validation
    markHelpful: Joi.object({
        helpful: Joi.boolean().required()
    }),

    // Report review validation
    reportReview: Joi.object({
        reason: Joi.string()
            .valid('spam', 'offensive', 'fake', 'inappropriate', 'other')
            .required()
            .messages({
                'any.required': 'Report reason is required',
                'any.only': 'Invalid report reason'
            }),
        
        comment: Joi.string()
            .trim()
            .max(500)
            .allow('')
            .messages({
                'string.max': 'Comment cannot exceed 500 characters'
            })
    }),

    // Admin response validation
    adminResponse: Joi.object({
        message: Joi.string()
            .trim()
            .min(10)
            .max(1000)
            .required()
            .messages({
                'string.min': 'Response must be at least 10 characters',
                'string.max': 'Response cannot exceed 1000 characters',
                'any.required': 'Response message is required'
            })
    }),

    // Update status validation
    updateStatus: Joi.object({
        status: Joi.string()
            .valid('pending', 'approved', 'rejected', 'flagged')
            .required()
            .messages({
                'any.required': 'Status is required',
                'any.only': 'Invalid status value'
            })
    }),

    // Review ID param validation
    reviewId: Joi.object({
        id: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid review ID format'
            })
    })
};

module.exports = reviewValidators;