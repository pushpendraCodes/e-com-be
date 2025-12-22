const { default: mongoose } = require("mongoose");

const orderSchema = new mongoose.Schema({
    // Order Number
    orderNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // User Information
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true
    },
    
    // Order Items
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: {
            type: String,
            required: true
        },
        productImage: String,
        variant: {
            size: String,
            color: String,
            sku: String,
            id: mongoose.Schema.Types.ObjectId
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1']
        },
        price: {
            type: Number,
            required: true,
            min: [0, 'Price cannot be negative']
        },
        discount: {
            type: Number,
            default: 0,
            min: 0
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    
    // Pricing
    pricing: {
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },
        discount: {
            type: Number,
            default: 0,
            min: 0
        },
        shippingCharges: {
            type: Number,
            default: 0,
            min: 0
        },
        tax: {
            type: Number,
            default: 0,
            min: 0
        },
        total: {
            type: Number,
            required: true,
            min: 0
        }
    },
    
    // Shipping Address
    shippingAddress: {
        fullName: {
            type: String,
            required: true,
            trim: true
        },
        mobile: {
            type: String,
            required: true,
            trim: true
        },
        alternateMobile: {
            type: String,
            trim: true
        },
        addressLine1: {
            type: String,
            required: true,
            trim: true
        },
        addressLine2: {
            type: String,
            trim: true
        },
        landmark: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        state: {
            type: String,
            required: true,
            trim: true
        },
        pincode: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: String,
            default: 'India',
            trim: true
        },
        addressType: {
            type: String,
            enum: ['Home', 'Work', 'Other'],
            default: 'Home'
        }
    },
    
    // Billing Address (if different)
    billingAddress: {
        fullName: String,
        mobile: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        pincode: String,
        country: {
            type: String,
            default: 'India'
        }
    },
    
    // Payment Information
    payment: {
        method: {
            type: String,
            enum: ['COD', 'Online', 'UPI', 'Card', 'Wallet'],
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Failed', 'Refunded', 'Partially Refunded'],
            default: 'Pending',
            index: true
        },
        transactionId: String,
        paidAt: Date,
        paymentGateway: String
    },
    
    // Order Status
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'],
        default: 'Pending',
        index: true
    },
    
    // Status Timeline
    statusHistory: [{
        status: {
            type: String,
            required: true
        },
        comment: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin'
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Shipping Information
    shipping: {
        courier: String,
        trackingNumber: String,
        trackingUrl: String,
        shippedAt: Date,
        estimatedDelivery: Date,
        deliveredAt: Date
    },
    
    // Cancellation/Return Information
    cancellation: {
        reason: String,
        cancelledBy: {
            type: String,
            enum: ['User', 'Admin', 'System']
        },
        cancelledAt: Date,
        refundStatus: {
            type: String,
            enum: ['Pending', 'Processing', 'Completed', 'Failed']
        },
        refundAmount: Number,
        refundedAt: Date
    },
    
    return: {
        reason: String,
        requestedAt: Date,
        approvedAt: Date,
        status: {
            type: String,
            enum: ['Requested', 'Approved', 'Rejected', 'Picked Up', 'Completed']
        },
        refundAmount: Number
    },
    
    // Coupon/Discount
    coupon: {
        code: String,
        discountAmount: {
            type: Number,
            default: 0
        }
    },
    
    // Notes
    customerNotes: String,
    adminNotes: String,
    
    // Timestamps
    orderedAt: {
        type: Date,
        default: Date.now
    },
    
    // Invoice
    invoice: {
        number: String,
        url: String,
        generatedAt: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ orderedAt: -1 });
orderSchema.index({ 'items.product': 1 });

// Virtual for total items
orderSchema.virtual('totalItems').get(function() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual for can cancel
orderSchema.virtual('canCancel').get(function() {
    return ['Pending', 'Confirmed', 'Processing'].includes(this.status);
});

// Virtual for can return
orderSchema.virtual('canReturn').get(function() {
    if (this.status !== 'Delivered') return false;
    
    const deliveryDate = this.shipping.deliveredAt || this.createdAt;
    const daysSinceDelivery = Math.floor((Date.now() - deliveryDate) / (1000 * 60 * 60 * 24));
    
    return daysSinceDelivery <= 7; // 7 days return policy
});

// Generate order number
// Generate order number BEFORE validation
orderSchema.pre('validate', function() {
    if (!this.orderNumber) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.orderNumber = `ORD${year}${month}${random}`;
    }
});

// Add to status history if status changed
// orderSchema.pre('save', async function() {
//     if (this.isModified('status')) {
//         this.statusHistory.push({
//             status: this.status,
//             timestamp: new Date()
//         });
//     }
// });
// Update product stock on order
orderSchema.post('save', async function() {
    if (this.isNew && this.status === 'Confirmed') {
        const Product = mongoose.model('Product');
        
        for (const item of this.items) {
            await Product.findByIdAndUpdate(
                item.product,
                {
                    $inc: {
                        totalStock: -item.quantity,
                        'sales.totalSold': item.quantity
                    },
                    $set: { 'sales.lastSoldAt': new Date() }
                }
            );
        }
    }
});

module.exports = mongoose.model('Order', orderSchema);