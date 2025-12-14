const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const {
    createOrderValidation,
    updateOrderStatusValidation,
    cancelOrderValidation,
    returnOrderValidation,
    updateReturnStatusValidation,
    updatePaymentStatusValidation,
    getOrdersQueryValidation,
    addAdminNotesValidation,
    updateShippingValidation,
    bulkUpdateOrdersValidation,
    applyCouponValidation,
    orderStatsValidation,
    verifyPaymentValidation,
    requestInvoiceValidation
} = require('../validations/orderValidators');

// ==================== USER CONTROLLERS ====================

// Create Order
exports.createOrder = async (req, res) => {
    try {
        // Validate request
        const { error, value } = createOrderValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        // Check product availability and calculate pricing
        let subtotal = 0;
        const orderItems = [];

        for (const item of value.items) {
            const product = await Product.findById(item.product);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product not found: ${item.product}`
                });
            }

            if (!product.isActive || product.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: `Product is not available: ${product.name}`
                });
            }

            // Check variant stock if variant specified
            let variantPrice = product.price.selling;
            if (item.variant && item.variant.sku) {
                const variant = product.variants.find(v => v.sku === item.variant.sku);
                if (!variant) {
                    return res.status(400).json({
                        success: false,
                        message: `Variant not found for product: ${product.name}`
                    });
                }
                if (variant.stock < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${product.name} - ${variant.size}. Available: ${variant.stock}`
                    });
                }
                variantPrice = variant.price || product.price.selling;
            } else {
                if (product.totalStock < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${product.name}. Available: ${product.totalStock}`
                    });
                }
            }

            const itemPrice = item.price || variantPrice;
            const itemSubtotal = itemPrice * item.quantity;

            orderItems.push({
                product: product._id,
                productName: product.name,
                productImage: product.images[0]?.url || '',
                variant: item.variant,
                quantity: item.quantity,
                price: itemPrice,
                discount: product.price.discount || 0,
                subtotal: itemSubtotal
            });

            subtotal += itemSubtotal;
        }

        // Calculate shipping and tax
        const shippingCharges = subtotal >= 500 ? 0 : 50; // Free shipping above ₹500
        const taxRate = 0.18; // 18% GST
        const tax = Math.round(subtotal * taxRate);

        // Apply coupon if provided
        let discountAmount = 0;
        if (value.coupon && value.coupon.code) {
            // TODO: Implement coupon validation logic
            // const coupon = await Coupon.findOne({ code: value.coupon.code, isActive: true });
            // if (coupon) {
            //     discountAmount = calculateDiscount(coupon, subtotal);
            // }
            discountAmount = 0;
        }

        const total = subtotal + shippingCharges + tax - discountAmount;

        // Create order
        const order = new Order({
            user: req.user._id,
            items: orderItems,
            pricing: {
                subtotal,
                discount: discountAmount,
                shippingCharges,
                tax,
                total
            },
            shippingAddress: value.shippingAddress,
            billingAddress: value.billingAddress || value.shippingAddress,
            payment: {
                method: value.payment.method,
                status: value.payment.method === 'COD' ? 'Pending' : 'Completed',
                transactionId: value.payment.transactionId,
                paymentGateway: value.payment.paymentGateway,
                paidAt: value.payment.method !== 'COD' ? new Date() : null
            },
            coupon: value.coupon,
            customerNotes: value.customerNotes,
            status: 'Pending'
        });


        order.statusHistory.push({
            status: "Pending",
            comment: `new order By ${req.user.name} `,
            updatedBy: req.user._id,
            timestamp: new Date()
        });
        await order.save();

        // Update product stock
        for (const item of orderItems) {
            const product = await Product.findById(item.product);

            if (item.variant && item.variant.sku) {
                // Update specific variant stock
                const variantIndex = product.variants.findIndex(v => v.sku === item.variant.sku);
                if (variantIndex !== -1) {
                    product.variants[variantIndex].stock -= item.quantity;
                }
            }

            // Update total stock
            product.totalStock -= item.quantity;
            product.sales.totalSold += item.quantity;
            product.sales.lastSoldAt = new Date();

            await product.save();
        }

        // Populate order details
        await order.populate('user', 'name email mobile');

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: order
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
};

// Get User Orders
exports.getUserOrders = async (req, res) => {
    try {
        const { error, value } = getOrdersQueryValidation.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const { page, limit, status, sortBy, sortOrder } = value;

        const query = { user: req.user._id };
        if (status) query.status = status;

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' || sortOrder === '1' ? 1 : -1;

        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate('items.product', 'name images slug price')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });

    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
};

// Get Order by ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email mobile')
            .populate('items.product', 'name images slug category brand price')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is authorized (user's own order or admin)
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order',
            error: error.message
        });
    }
};

// Cancel Order
exports.cancelOrder = async (req, res) => {
    try {
        const { error, value } = cancelOrderValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check authorization
        const isOwner = order.user.toString() === req.user._id.toString();
        const isAdmin = req.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this order'
            });
        }

        // Check if order can be cancelled
        if (!['Pending', 'Confirmed', 'Processing'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Order cannot be cancelled. Current status: ${order.status}`
            });
        }

        order.status = 'Cancelled';
        order.cancellation = {
            reason: value.reason,
            cancelledBy: isAdmin ? 'Admin' : 'User',
            cancelledAt: new Date()
        };

        // Update payment status if paid
        if (order.payment.status === 'Completed') {
            order.cancellation.refundStatus = 'Pending';
            order.cancellation.refundAmount = order.pricing.total;
            order.payment.status = 'Refunded';
        }

        // Restore stock
        for (const item of order.items) {
            const product = await Product.findById(item.product);

            if (product) {
                if (item.variant && item.variant.sku) {
                    const variantIndex = product.variants.findIndex(v => v.sku === item.variant.sku);
                    if (variantIndex !== -1) {
                        product.variants[variantIndex].stock += item.quantity;
                    }
                }

                product.totalStock += item.quantity;
                product.sales.totalSold = Math.max(0, product.sales.totalSold - item.quantity);
                await product.save();
            }
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling order',
            error: error.message
        });
    }
};

// Return Order Request
exports.returnOrder = async (req, res) => {
    try {
        const { error, value } = returnOrderValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check authorization
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to return this order'
            });
        }

        // Check if order can be returned
        if (order.status !== 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Only delivered orders can be returned'
            });
        }

        // Check return window (7 days)
        const deliveryDate = order.shipping.deliveredAt || order.createdAt;
        const daysSinceDelivery = Math.floor((Date.now() - deliveryDate) / (1000 * 60 * 60 * 24));

        if (daysSinceDelivery > 7) {
            return res.status(400).json({
                success: false,
                message: 'Return window has expired. Returns are accepted within 7 days of delivery.'
            });
        }

        // Check if return already requested
        if (order.return && order.return.status) {
            return res.status(400).json({
                success: false,
                message: 'Return request already exists for this order'
            });
        }

        order.return = {
            reason: value.reason,
            requestedAt: new Date(),
            status: 'Requested',
            refundAmount: order.pricing.total,
            returnType: value.returnType || 'Refund'
        };

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Return request submitted successfully. Our team will review it shortly.',
            data: order
        });

    } catch (error) {
        console.error('Return order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing return request',
            error: error.message
        });
    }
};

// Track Order
exports.trackOrder = async (req, res) => {
    try {
        const { orderNumber } = req.params;

        const order = await Order.findOne({ orderNumber })
            .select('orderNumber status shipping statusHistory createdAt')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                orderNumber: order.orderNumber,
                status: order.status,
                shipping: order.shipping,
                statusHistory: order.statusHistory,
                orderedAt: order.createdAt
            }
        });

    } catch (error) {
        console.error('Track order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error tracking order',
            error: error.message
        });
    }
};

// ==================== ADMIN CONTROLLERS ====================

// Get All Orders (Admin)
exports.getAllOrders = async (req, res) => {
    try {
        const { error, value } = getOrdersQueryValidation.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const { page, limit, status, paymentStatus, paymentMethod, startDate, endDate, minAmount, maxAmount, search, sortBy, sortOrder, userId } = value;

        // Build query
        const query = {};

        if (status) query.status = status;
        if (paymentStatus) query['payment.status'] = paymentStatus;
        if (paymentMethod) query['payment.method'] = paymentMethod;
        if (userId) query.user = userId;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        if (minAmount !== undefined || maxAmount !== undefined) {
            query['pricing.total'] = {};
            if (minAmount !== undefined) query['pricing.total'].$gte = minAmount;
            if (maxAmount !== undefined) query['pricing.total'].$lte = maxAmount;
        }

        if (search) {
            query.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
                { 'shippingAddress.mobile': { $regex: search, $options: 'i' } },
                { 'shippingAddress.email': { $regex: search, $options: 'i' } }
            ];
        }

        // Sorting
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' || sortOrder === '1' ? 1 : -1;

        // Pagination
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate('user', 'name email mobile')
                .populate('items.product', 'name images slug')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: orders,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });

    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
};

// Update Order Status (Admin)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { error, value } = updateOrderStatusValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Validate status transition
        const validTransitions = {
            'Pending': ['Confirmed', 'Cancelled'],
            'Confirmed': ['Processing', 'Cancelled'],
            'Processing': ['Shipped', 'Cancelled'],
            'Shipped': ['Out for Delivery', 'Delivered'],
            'Out for Delivery': ['Delivered'],
            'Delivered': ['Returned'],
            'Returned': ['Refunded']
        };

        if (!validTransitions[order.status]?.includes(value.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${order.status} to ${value.status}`
            });
        }

        order.status = value.status;

        // Update shipping info if provided
        if (value.shipping) {
            order.shipping = {
                ...order.shipping,
                ...value.shipping
            };

            if (value.status === 'Shipped') {
                order.shipping.shippedAt = new Date();
            } else if (value.status === 'Delivered') {
                order.shipping.deliveredAt = new Date();
            }

        }


        // if (value.status === "Returned") {
        //     order.return = {
        //         reason: order.return.reason,
        //         requestedAt: order.return.requestedAt,
        //         status: 'Approved',
        //         approvedAt: new Date()

        //     };
        // }


        // Add to status history
        order.statusHistory.push({
            status: value.status,
            comment: value.comment,
            updatedBy: req.user._id,
            timestamp: new Date()
        });

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            data: order
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
};

// Update Return Status (Admin)
exports.updateReturnStatus = async (req, res) => {
    try {
        const { error, value } = updateReturnStatusValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        if (!order.return || !order.return.status) {
            return res.status(400).json({
                success: false,
                message: 'No return request found for this order'
            });
        }

        order.return.status = value.status;
        order.return.comment = value.comment;

        if (value.status === 'Approved') {
            order.return.approvedAt = new Date();
            order.return.refundAmount = value.refundAmount || order.pricing.total;
        } else if (value.status === 'Completed') {
            order.status = 'Refunded';
            order.payment.status = 'Refunded';
            order.cancellation.refundedAt = new Date();
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: `Return request ${value.status.toLowerCase()} successfully`,
            data: order
        });

    } catch (error) {
        console.error('Update return status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating return status',
            error: error.message
        });
    }
};

// Update Payment Status (Admin)
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { error, value } = updatePaymentStatusValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.payment.status = value.status;
        if (value.transactionId) order.payment.transactionId = value.transactionId;
        if (value.paidAt) order.payment.paidAt = value.paidAt;

        if (value.status === 'Completed' && !order.payment.paidAt) {
            order.payment.paidAt = new Date();
        }

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Payment status updated successfully',
            data: order
        });

    } catch (error) {
        console.error('Update payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating payment status',
            error: error.message
        });
    }
};

// Update Shipping Details (Admin)
exports.updateShippingDetails = async (req, res) => {
    try {
        const { error, value } = updateShippingValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.shipping = {
            ...order.shipping,
            ...value
        };

        await order.save();

        res.status(200).json({
            success: true,
            message: 'Shipping details updated successfully',
            data: order
        });

    } catch (error) {
        console.error('Update shipping error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating shipping details',
            error: error.message
        });
    }
};

// Add Admin Notes
exports.addAdminNotes = async (req, res) => {
    try {
        const { error, value } = addAdminNotesValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.adminNotes = value.notes;
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Admin notes added successfully',
            data: order
        });

    } catch (error) {
        console.error('Add admin notes error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding admin notes',
            error: error.message
        });
    }
};

// Bulk Update Orders (Admin)
exports.bulkUpdateOrders = async (req, res) => {
    try {
        const { error, value } = bulkUpdateOrdersValidation.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const { orderIds, status, comment } = value;

        const result = await Order.updateMany(
            { _id: { $in: orderIds } },
            {
                $set: { status },
                $push: {
                    statusHistory: {
                        status,
                        comment,
                        updatedBy: req.user._id,
                        timestamp: new Date()
                    }
                }
            }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} orders updated successfully`,
            data: {
                modified: result.modifiedCount,
                matched: result.matchedCount
            }
        });

    } catch (error) {
        console.error('Bulk update orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating orders',
            error: error.message
        });
    }
};

// Get Order Statistics (Admin)
exports.getOrderStatistics = async (req, res) => {
    try {
        const { error, value } = orderStatsValidation.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const { startDate, endDate } = value;

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        const matchStage = Object.keys(dateFilter).length > 0
            ? { createdAt: dateFilter }
            : {};

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await Order.aggregate([
            { $match: matchStage },
            {
                $facet: {
                    totalOrders: [{ $count: 'count' }],
                    totalRevenue: [
                        { $match: { 'payment.status': 'Completed' } },
                        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
                    ],
                    todayOrders: [
                        { $match: { createdAt: { $gte: today } } },
                        { $count: 'count' }
                    ],
                    todayRevenue: [
                        {
                            $match: {
                                createdAt: { $gte: today },
                                'payment.status': 'Completed'
                            }
                        },
                        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
                    ],
                    statusCounts: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    paymentMethodCounts: [
                        { $group: { _id: '$payment.method', count: { $sum: 1 } } }
                    ],
                    paymentStatusCounts: [
                        { $group: { _id: '$payment.status', count: { $sum: 1 } } }
                    ],
                    averageOrderValue: [
                        {
                            $match: { 'payment.status': 'Completed' }
                        },
                        {
                            $group: {
                                _id: null,
                                avg: { $avg: '$pricing.total' }
                            }
                        }
                    ]
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalOrders: stats[0].totalOrders[0]?.count || 0,
                totalRevenue: stats[0].totalRevenue[0]?.total || 0,
                todayOrders: stats[0].todayOrders[0]?.count || 0,
                todayRevenue: stats[0].todayRevenue[0]?.total || 0,
                averageOrderValue: Math.round(stats[0].averageOrderValue[0]?.avg || 0),
                statusCounts: stats[0].statusCounts,
                paymentMethodCounts: stats[0].paymentMethodCounts,
                paymentStatusCounts: stats[0].paymentStatusCounts
            }
        });

    } catch (error) {
        console.error('Get order statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order statistics',
            error: error.message
        });
    }
};


exports.getRevenueAnalytics = async (req, res) => {
    try {
        const { error, value } = orderStatsValidation.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                error: error.details[0].message
            });
        }

        const { startDate, endDate, groupBy } = value;

        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.$lte = end;
        }

        const matchStage = Object.keys(dateFilter).length > 0
            ? { createdAt: dateFilter, 'payment.status': 'Completed' }
            : { 'payment.status': 'Completed' };

        // Group by format
        let dateFormat;
        switch (groupBy) {
            case 'day':
                dateFormat = '%Y-%m-%d';
                break;
            case 'week':
                dateFormat = '%Y-W%U';
                break;
            case 'month':
                dateFormat = '%Y-%m';
                break;
            case 'year':
                dateFormat = '%Y';
                break;
            default:
                dateFormat = '%Y-%m-%d';
        }

        const analytics = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
                    revenue: { $sum: '$pricing.total' },
                    orders: { $sum: 1 },
                    averageOrderValue: { $avg: '$pricing.total' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('Get revenue analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching revenue analytics',
            error: error.message
        });
    }
};

// Delete Order (Admin - Soft Delete)
exports.deleteOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Only allow deletion of cancelled orders
        if (order.status !== 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Only cancelled orders can be deleted'
            });
        }

        await order.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });

    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting order',
            error: error.message
        });
    }
};

// Get Revenue Analytics (Admin)
