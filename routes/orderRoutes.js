const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { auth, isAdmin } = require('../middilewares/auth');

// Public/User Routes
router.post('/create', auth, orderController.createOrder);
router.get('/my-orders', auth, orderController.getUserOrders);
router.get('/:id', auth, orderController.getOrderById);
router.post('/:id/cancel', auth, orderController.cancelOrder);
router.post('/:id/return', auth, orderController.returnOrder);

// Admin Routes
router.get('/', auth, isAdmin, orderController.getAllOrders);
router.put('/:id/status', auth, isAdmin, orderController.updateOrderStatus);
router.put('/:id/return-status', auth, isAdmin, orderController.updateReturnStatus);
router.put('/:id/payment-status', auth, isAdmin, orderController.updatePaymentStatus);
router.put('/:id/admin-notes', auth, isAdmin, orderController.addAdminNotes);
router.get('/stats/overview', auth, isAdmin, orderController.getOrderStatistics);
router.get('/stats/revenue', auth, isAdmin, orderController.getRevenueAnalytics);
router.delete('/:id', auth, orderController.deleteOrder);
module.exports = router;