const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware.js');
const Conversation = require('../models/conversation.model.js');
const Message = require('../models/message.model.js');

// Start or get conversation
router.post('/conversations/start', protect, async (req, res) => {
  try {
    const { receiverId, gigId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required',
      });
    }

    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start conversation with yourself',
      });
    }

    const conversation = await Conversation.findOrCreate(
      req.user._id,
      receiverId,
      gigId
    );

    // Get last 20 messages
    const messages = await Message.find({
      conversationId: conversation._id,
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('sender', 'name email picture')
    .lean();

    // Mark messages as read
    const unreadMessages = messages.filter(msg => 
      msg.receiver.toString() === req.user._id.toString() && !msg.read
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { 
          _id: { $in: unreadMessages.map(m => m._id) },
          receiver: req.user._id,
          read: false
        },
        { 
          read: true,
          readAt: new Date()
        }
      );

      // Update unread count
      conversation.unreadCount.set(req.user._id.toString(), 0);
      await conversation.save();

      // Notify via socket
      const io = req.app.get('io');
      io.to(`conversation_${conversation._id}`).emit('messages_read', {
        messageIds: unreadMessages.map(m => m._id),
        readBy: req.user._id,
      });
    }

    // Convert Map to Object for JSON response
    const conversationObj = conversation.toObject();
    conversationObj.unreadCount = Object.fromEntries(conversation.unreadCount);
    conversationObj.isArchived = Object.fromEntries(conversation.isArchived);
    conversationObj.isMuted = Object.fromEntries(conversation.isMuted);

    res.json({
      success: true,
      conversation: conversationObj,
      messages: messages.reverse(), // Return in chronological order
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start conversation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get conversation messages
router.get('/conversations/:conversationId/messages', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 20 } = req.query;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const query = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sender', 'name email picture')
      .lean();

    res.json({
      success: true,
      messages: messages.reverse(),
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
    });
  }
});

// Get user conversations
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
    .populate('participants', 'name email picture')
    .populate('gig', 'title slug budget currency')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 })
    .lean();

    // Format response
    const formattedConversations = conversations.map(conversation => {
      const otherParticipant = conversation.participants.find(
        p => p._id.toString() !== req.user._id.toString()
      );
      
      const unreadCount = conversation.unreadCount?.get(req.user._id.toString()) || 0;
      const isArchived = conversation.isArchived?.get(req.user._id.toString()) || false;
      const isMuted = conversation.isMuted?.get(req.user._id.toString()) || false;

      return {
        _id: conversation._id,
        otherParticipant,
        gig: conversation.gig,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount,
        isArchived,
        isMuted,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };
    });

    res.json({
      success: true,
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
    });
  }
});

// Update conversation settings
router.patch('/conversations/:conversationId/settings', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { isArchived, isMuted } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    if (isArchived !== undefined) {
      conversation.isArchived.set(req.user._id.toString(), isArchived);
    }

    if (isMuted !== undefined) {
      conversation.isMuted.set(req.user._id.toString(), isMuted);
    }

    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation settings updated',
      conversation: {
        isArchived: conversation.isArchived.get(req.user._id.toString()),
        isMuted: conversation.isMuted.get(req.user._id.toString()),
      },
    });
  } catch (error) {
    console.error('Error updating conversation settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update conversation settings',
    });
  }
});

module.exports = router;