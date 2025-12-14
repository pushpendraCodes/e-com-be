const Joi = require('joi');

// MongoDB ObjectId validation
const objectIdValidation = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid ID format');

// Create Order Validation
const createOrderValidation = Joi.object({
    items: Joi.array().items(
        Joi.object({
            product: objectIdValidation.required().messages({
                'any.required': 'Product ID is required',
                'string.pattern.base': 'Invalid product ID format'
            }),
            variant: Joi.object({
                size: Joi.string().valid('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '28', '30', '32', '34', '36', '38', '40', '42', 'Free Size').optional(),
                color: Joi.string().trim().max(50).optional(),
                colorCode: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional()
                    .messages({
                        'string.pattern.base': 'Color code must be a valid hex color (e.g., #FF5733)'
                    }),
                sku: Joi.string().trim().max(100).optional()
            }).optional(),
            quantity: Joi.number().integer().min(1).max(10).required()
                .messages({
                    'number.base': 'Quantity must be a number',
                    'number.min': 'Quantity must be at least 1',
                    'number.max': 'Maximum quantity per item is 10',
                    'any.required': 'Quantity is required'
                }),
            price: Joi.number().min(0).optional()
                .messages({
                    'number.min': 'Price cannot be negative'
                })
        })
    ).min(1).max(20).required()
    .messages({
        'array.min': 'At least one item is required',
        'array.max': 'Maximum 20 items per order',
        'any.required': 'Order items are required'
    }),
    
    shippingAddress: Joi.object({
        fullName: Joi.string().trim().min(3).max(100).required()
            .messages({
                'string.min': 'Full name must be at least 3 characters',
                'string.max': 'Full name cannot exceed 100 characters',
                'any.required': 'Full name is required'
            }),
        mobile: Joi.string().pattern(/^[6-9]\d{9}$/).required()
            .messages({
                'string.pattern.base': 'Please enter a valid 10-digit mobile number starting with 6-9',
                'any.required': 'Mobile number is required'
            }),
        alternateMobile: Joi.string().pattern(/^[6-9]\d{9}$/).optional()
            .allow('')
            .messages({
                'string.pattern.base': 'Please enter a valid 10-digit alternate mobile number'
            }),
        // email: Joi.string().email().optional().allow(''),
        addressLine1: Joi.string().trim().min(5).max(200).required()
            .messages({
                'string.min': 'Address must be at least 5 characters',
                'string.max': 'Address cannot exceed 200 characters',
                'any.required': 'Address line 1 is required'
            }),
        addressLine2: Joi.string().trim().max(200).optional().allow(''),
        landmark: Joi.string().trim().max(100).optional().allow(''),
        city: Joi.string().trim().min(2).max(100).required()
            .messages({
                'string.min': 'City name must be at least 2 characters',
                'any.required': 'City is required'
            }),
        state: Joi.string().trim().min(2).max(100).required()
            .messages({
                'any.required': 'State is required'
            }),
        pincode: Joi.string().pattern(/^\d{6}$/).required()
            .messages({
                'string.pattern.base': 'Please enter a valid 6-digit pincode',
                'any.required': 'Pincode is required'
            }),
        country: Joi.string().trim().default('India'),
        addressType: Joi.string().valid('Home', 'Work', 'Other').default('Home')
    }).required()
    .messages({
        'any.required': 'Shipping address is required'
    }),
    
    billingAddress: Joi.object({
        fullName: Joi.string().trim().min(3).max(100).optional(),
        mobile: Joi.string().pattern(/^[6-9]\d{9}$/).optional(),
        addressLine1: Joi.string().trim().min(5).max(200).optional(),
        addressLine2: Joi.string().trim().max(200).optional(),
        city: Joi.string().trim().min(2).max(100).optional(),
        state: Joi.string().trim().min(2).max(100).optional(),
        pincode: Joi.string().pattern(/^\d{6}$/).optional(),
        country: Joi.string().trim().optional()
    }).optional(),
    
    payment: Joi.object({
        method: Joi.string().valid('COD', 'Online', 'UPI', 'Card', 'Wallet', 'Net Banking').required()
            .messages({
                'any.only': 'Invalid payment method',
                'any.required': 'Payment method is required'
            }),
        transactionId: Joi.string().trim().max(100).optional()
            .when('method', {
                is: Joi.valid('Online', 'UPI', 'Card', 'Wallet', 'Net Banking'),
                then: Joi.optional(),
                otherwise: Joi.forbidden()
            }),
        paymentGateway: Joi.string().trim().max(50).optional()
    }).required(),
    
    coupon: Joi.object({
        code: Joi.string().trim().uppercase().max(50).optional()
            .messages({
                'string.max': 'Coupon code cannot exceed 50 characters'
            })
    }).optional(),
    
    customerNotes: Joi.string().trim().max(500).optional().allow('')
        .messages({
            'string.max': 'Customer notes cannot exceed 500 characters'
        }),

    useWalletBalance: Joi.boolean().optional().default(false)
});

// Update Order Status Validation
const updateOrderStatusValidation = Joi.object({
    status: Joi.string()
        .valid('Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded')
        .required()
        .messages({
            'any.only': 'Invalid order status',
            'any.required': 'Status is required'
        }),
    comment: Joi.string().trim().max(500).optional().allow('')
        .messages({
            'string.max': 'Comment cannot exceed 500 characters'
        }),
    shipping: Joi.object({
        courier: Joi.string().trim().max(100).optional()
            .messages({
                'string.max': 'Courier name cannot exceed 100 characters'
            }),
        trackingNumber: Joi.string().trim().max(100).optional()
            .messages({
                'string.max': 'Tracking number cannot exceed 100 characters'
            }),
        trackingUrl: Joi.string().uri().max(500).optional()
            .messages({
                'string.uri': 'Please enter a valid tracking URL',
                'string.max': 'Tracking URL cannot exceed 500 characters'
            }),
        estimatedDelivery: Joi.date().min('now').optional()
            .messages({
                'date.min': 'Estimated delivery date must be in the future'
            })
    }).optional()
        .when('status', {
            is: 'Shipped',
            then: Joi.required(),
            otherwise: Joi.optional()
        })
});

// Cancel Order Validation
const cancelOrderValidation = Joi.object({
    reason: Joi.string().trim().min(10).max(500).required()
        .messages({
            'string.min': 'Please provide a cancellation reason of at least 10 characters',
            'string.max': 'Cancellation reason cannot exceed 500 characters',
            'any.required': 'Cancellation reason is required'
        }),
    additionalComments: Joi.string().trim().max(500).optional().allow('')
});

// Return Order Validation
const returnOrderValidation = Joi.object({
    reason: Joi.string().trim().min(10).max(500).required()
        .messages({
            'string.min': 'Please provide a return reason of at least 10 characters',
            'string.max': 'Return reason cannot exceed 500 characters',
            'any.required': 'Return reason is required'
        }),
    returnType: Joi.string().valid('Refund', 'Exchange').default('Refund')
        .messages({
            'any.only': 'Return type must be either Refund or Exchange'
        }),
    items: Joi.array().items(
        Joi.object({
            orderItemId: Joi.string().required(),
            quantity: Joi.number().integer().min(1).required()
        })
    ).optional(),
    additionalComments: Joi.string().trim().max(500).optional().allow('')
});

// Approve/Reject Return Validation
const updateReturnStatusValidation = Joi.object({
    status: Joi.string().valid('Approved', 'Rejected', 'Picked Up', 'Completed').required()
        .messages({
            'any.only': 'Invalid return status',
            'any.required': 'Return status is required'
        }),
    comment: Joi.string().trim().max(500).optional().allow(''),
    refundAmount: Joi.number().min(0).optional()
        .when('status', {
            is: 'Approved',
            then: Joi.required(),
            otherwise: Joi.optional()
        })
        .messages({
            'number.min': 'Refund amount cannot be negative',
            'any.required': 'Refund amount is required when approving return'
        })
});

// Update Payment Status Validation
const updatePaymentStatusValidation = Joi.object({
    status: Joi.string().valid('Pending', 'Completed', 'Failed', 'Refunded', 'Partially Refunded').required()
        .messages({
            'any.only': 'Invalid payment status',
            'any.required': 'Payment status is required'
        }),
    transactionId: Joi.string().trim().max(100).optional()
        .messages({
            'string.max': 'Transaction ID cannot exceed 100 characters'
        }),
    paidAt: Joi.date().max('now').optional()
        .messages({
            'date.max': 'Payment date cannot be in the future'
        }),
    refundTransactionId: Joi.string().trim().max(100).optional()
        .when('status', {
            is: Joi.valid('Refunded', 'Partially Refunded'),
            then: Joi.optional(),
            otherwise: Joi.forbidden()
        }),
    refundAmount: Joi.number().min(0).optional()
        .when('status', {
            is: Joi.valid('Refunded', 'Partially Refunded'),
            then: Joi.required(),
            otherwise: Joi.forbidden()
        })
});

// Get Orders Query Validation
const getOrdersQueryValidation = Joi.object({
    page: Joi.number().integer().min(1).default(1)
        .messages({
            'number.min': 'Page must be at least 1',
            'number.base': 'Page must be a number'
        }),
    limit: Joi.number().integer().min(1).max(100).default(10)
        .messages({
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100'
        }),
    status: Joi.string().valid('Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded').optional(),
    paymentStatus: Joi.string().valid('Pending', 'Completed', 'Failed', 'Refunded', 'Partially Refunded').optional(),
    paymentMethod: Joi.string().valid('COD', 'Online', 'UPI', 'Card', 'Wallet', 'Net Banking').optional(),
    startDate: Joi.date().optional()
        .messages({
            'date.base': 'Start date must be a valid date'
        }),
    endDate: Joi.date().min(Joi.ref('startDate')).optional()
        .messages({
            'date.min': 'End date must be after start date',
            'date.base': 'End date must be a valid date'
        }),
    minAmount: Joi.number().min(0).optional(),
    maxAmount: Joi.number().min(Joi.ref('minAmount')).optional()
        .messages({
            'number.min': 'Max amount must be greater than min amount'
        }),
    search: Joi.string().trim().max(100).optional()
        .messages({
            'string.max': 'Search query cannot exceed 100 characters'
        }),
    sortBy: Joi.string().valid('createdAt', 'total', 'status', 'orderNumber', 'updatedAt').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc', '1', '-1').default('desc'),
    userId: objectIdValidation.optional()
});

// Add Admin Notes Validation
const addAdminNotesValidation = Joi.object({
    notes: Joi.string().trim().min(5).max(1000).required()
        .messages({
            'string.min': 'Admin notes must be at least 5 characters',
            'string.max': 'Admin notes cannot exceed 1000 characters',
            'any.required': 'Admin notes are required'
        })
});

// Update Shipping Details Validation
const updateShippingValidation = Joi.object({
    courier: Joi.string().trim().min(2).max(100).required()
        .messages({
            'string.min': 'Courier name must be at least 2 characters',
            'any.required': 'Courier name is required'
        }),
    trackingNumber: Joi.string().trim().min(5).max(100).required()
        .messages({
            'string.min': 'Tracking number must be at least 5 characters',
            'any.required': 'Tracking number is required'
        }),
    trackingUrl: Joi.string().uri().max(500).optional()
        .messages({
            'string.uri': 'Please enter a valid tracking URL'
        }),
    estimatedDelivery: Joi.date().min('now').optional()
        .messages({
            'date.min': 'Estimated delivery must be in the future'
        })
});

// Generate Invoice Validation
const generateInvoiceValidation = Joi.object({
    orderId: objectIdValidation.required()
        .messages({
            'any.required': 'Order ID is required'
        })
});

// Bulk Update Orders Validation
const bulkUpdateOrdersValidation = Joi.object({
    orderIds: Joi.array().items(objectIdValidation).min(1).max(50).required()
        .messages({
            'array.min': 'At least one order ID is required',
            'array.max': 'Maximum 50 orders can be updated at once',
            'any.required': 'Order IDs are required'
        }),
    status: Joi.string()
        .valid('Confirmed', 'Processing', 'Shipped', 'Cancelled')
        .required()
        .messages({
            'any.only': 'Invalid status for bulk update',
            'any.required': 'Status is required'
        }),
    comment: Joi.string().trim().max(500).optional().allow('')
});

// Apply Coupon Validation
const applyCouponValidation = Joi.object({
    couponCode: Joi.string().trim().uppercase().min(3).max(50).required()
        .messages({
            'string.min': 'Coupon code must be at least 3 characters',
            'string.max': 'Coupon code cannot exceed 50 characters',
            'any.required': 'Coupon code is required'
        }),
    cartTotal: Joi.number().min(0).required()
        .messages({
            'number.min': 'Cart total cannot be negative',
            'any.required': 'Cart total is required'
        })
});

// Order Statistics Date Range Validation
const orderStatsValidation = Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().min(Joi.ref('startDate')).optional(),
    groupBy: Joi.string().valid('day', 'week', 'month', 'year').default('day')
});

// Verify Payment Validation
const verifyPaymentValidation = Joi.object({
    orderId: objectIdValidation.required(),
    paymentId: Joi.string().trim().required()
        .messages({
            'any.required': 'Payment ID is required'
        }),
    signature: Joi.string().trim().required()
        .messages({
            'any.required': 'Payment signature is required'
        })
});

// Request Invoice Validation
const requestInvoiceValidation = Joi.object({
    orderId: objectIdValidation.required()
        .messages({
            'any.required': 'Order ID is required'
        }),
    email: Joi.string().email().optional()
        .messages({
            'string.email': 'Please enter a valid email address'
        })
});

module.exports = {
    createOrderValidation,
    updateOrderStatusValidation,
    cancelOrderValidation,
    returnOrderValidation,
    updateReturnStatusValidation,
    updatePaymentStatusValidation,
    getOrdersQueryValidation,
    addAdminNotesValidation,
    updateShippingValidation,
    generateInvoiceValidation,
    bulkUpdateOrdersValidation,
    applyCouponValidation,
    orderStatsValidation,
    verifyPaymentValidation,
    requestInvoiceValidation
};