const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatControllers');
const adminController = require('../controllers/adminChatController');
const { auth ,isAdmin} = require('../middilewares/auth');
// Customer routes
router.post('/session',auth, chatController.createSession);
router.post('/send', auth, chatController.sendMessage);
router.get('/messages/:sessionId', auth, chatController.getMessages);

// Protected routes (require authentication)
router.get('/sessions', auth ,isAdmin, adminController.getAllSessions);
router.get('/messages/:sessionId', auth ,isAdmin, adminController.getSessionMessages);
router.post('/admin/send', auth ,isAdmin, adminController.sendMessage);
router.post('/admin/close/:sessionId', auth ,isAdmin, adminController.closeSession);

module.exports = router;