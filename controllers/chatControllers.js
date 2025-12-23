const ChatSession = require('../models/chatSession');
const { generateSessionId } = require('../utils/helpers');

// Create new chat session
const createSession = async (req, res) => {
  try {
    // const {  customerName, customerEmail } = req.body;
    
    const sessionId = generateSessionId();
    
    const newSession = await ChatSession.create({
      sessionId,
      customerId: req.userId || 'guest_' + Date.now(),
      customerName: req.user?.name || 'Guest',
      customerEmail: req.user?.email || null,
      messages: [],
      status: 'active'
    });
    
    res.json({
      success: true,
      sessionId: newSession.sessionId,
      message: 'Chat session created'
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
};

// Send message from customer
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
      sender: 'customer',
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

// Get messages for a session
const getMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await ChatSession.findOne({ sessionId });
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: 'Chat session not found' 
      });
    }
    
    res.json({
      success: true,
      messages: session.messages,
      session: {
        sessionId: session.sessionId,
        customerName: session.customerName,
        status: session.status
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve messages'
    });
  }
};

module.exports = {
  createSession,
  sendMessage,
  getMessages
};
