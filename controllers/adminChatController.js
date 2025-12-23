const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const ChatSession = require('../models/chatSession');
// const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/config');




// Get all active chat sessions
const getAllSessions = async (req, res) => {
  try {
    const sessions = await ChatSession.find()
      .select('sessionId customerId customerName messages status createdAt lastActivity')
      .sort({ lastActivity: -1 })
      .lean();
    
    const formattedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      customerId: session.customerId,
      customerName: session.customerName,
      messageCount: session.messages.length,
      unreadCount: session.messages.filter(m => m.sender === 'customer' && !m.read).length,
      lastActivity: session.lastActivity,
      status: session.status,
      createdAt: session.createdAt
    }));
    
    res.json({
      success: true,
      sessions: formattedSessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions'
    });
  }
};

// Get messages for a specific session
const getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await ChatSession.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: 'Chat session not found' 
      });
    }
    
    // Mark customer messages as read
    let updated = false;
    session.messages.forEach(msg => {
      if (msg.sender === 'customer' && !msg.read) {
        msg.read = true;
        updated = true;
      }
    });
    
    if (updated) {
      await session.save();
    }
    
    res.json({
      success: true,
      session: session
    });
  } catch (error) {
    console.error('Get session messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session messages'
    });
  }
};

// Send message from admin
const sendMessage = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId || !message) {
      return res.status(400).json({ 
        success: false,
        error: 'Session ID and message are required' 
      });
    }
    
    const session = await ChatSession.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: 'Chat session not found' 
      });
    }
    
    const newMessage = {
      sender: 'admin',
      text: message,
      timestamp: new Date(),
      read: false
    };
    
    session.messages.push(newMessage);
    session.lastActivity = new Date();
    await session.save();
    
    res.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
};

// Close chat session
const closeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await ChatSession.findOneAndUpdate(
      { sessionId },
      { 
        status: 'closed',
        closedAt: new Date()
      },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: 'Chat session not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Chat session closed'
    });
  } catch (error) {
    console.error('Close session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close session'
    });
  }
};

module.exports = {
 
  getAllSessions,
  getSessionMessages,
  sendMessage,
  closeSession
};
