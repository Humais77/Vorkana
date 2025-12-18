const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');

let io;

// Socket.io events - Updated to include messaging events
const ORDER_EVENTS = {
  // Order events
  NEW_ORDER: 'new_order',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_UPDATED: 'order_updated',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  DELIVERY_UPDATED: 'delivery_updated',
  ORDER_COMPLETED: 'order_completed',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_EXPIRED: 'order_expired',
  
  // Messaging events
  NEW_MESSAGE: 'new_message',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_ERROR: 'message_error',
  MESSAGES_READ: 'messages_read',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',
  NEW_CONVERSATION: 'new_conversation',
  CONVERSATION_UPDATED: 'conversation_updated',
  
  // General events
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  JOINED_ROOM: 'joined_room',
  LEFT_ROOM: 'left_room',
  ERROR: 'error'
};

// Initialize Socket.io
const initSocket = (server) => {
  io = socketio(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    cookie: false,
    maxHttpBufferSize: 1e8, // 100MB for file uploads
    connectTimeout: 45000
  });

  // Admin namespace
  const adminNamespace = io.of('/admin');
  
  adminNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      
      const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
      const admin = await User.findById(decoded.id);
      
      if (!admin || admin.role !== 'admin') {
        return next(new Error('Admin access required'));
      }
      
      socket.admin = admin;
      socket.user = admin; // For consistency
      socket.user.role = 'admin';
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  adminNamespace.on('connection', (socket) => {
    console.log(`Admin connected: ${socket.admin.email}`);
    
    // Join admin-specific rooms
    socket.join('admin_notifications');
    
    const broadcastUpdate = (event, data) => {
      adminNamespace.emit(`admin:${event}`, data);
    };

    socket.on('user:updated', (user) => {
      broadcastUpdate('user_updated', user);
    });

    socket.on('category:updated', (category) => {
      broadcastUpdate('category_updated', category);
    });

    socket.on('gig:updated', (gig) => {
      broadcastUpdate('gig_updated', gig);
    });

    socket.on('disconnect', () => {
      console.log(`Admin disconnected: ${socket.admin.email}`);
    });
  });

  // Main namespace middleware
  io.use(async (socket, next) => {
    try {
      console.log('Socket connection attempt:', {
        auth: socket.handshake.auth,
        headers: socket.handshake.headers
      });
      
      const token = socket.handshake.auth.token || 
                   socket.handshake.query.token ||
                   (socket.handshake.headers.authorization?.startsWith('Bearer ') ? 
                    socket.handshake.headers.authorization.split(' ')[1] : null);
      
      if (!token) {
        console.log('No token provided for socket connection');
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email role picture isActive lastSeen');
      
      if (!user) {
        console.log('User not found:', decoded.id);
        return next(new Error('Authentication error: User not found'));
      }

      if (!user.isActive) {
        console.log('User inactive:', user.email);
        return next(new Error('Authentication error: User account is inactive'));
      }

      // Update last seen
      user.lastSeen = new Date();
      await user.save();

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
        lastSeen: user.lastSeen
      };

      console.log(`✅ Socket authenticated for user: ${socket.user.name} (${socket.user.role})`);
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Main namespace connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.name} (${socket.user.role}) - Socket ID: ${socket.id}`);

    // Join user-specific rooms
    socket.join(`user_${socket.user.id}`);
    socket.join(`notifications_${socket.user.id}`);
    
    // Join role-specific rooms
    if (socket.user.role === 'seller') {
      socket.join('sellers');
      socket.join('sellers_notifications');
      console.log(`User ${socket.user.name} joined sellers rooms`);
    } else if (socket.user.role === 'user') {
      socket.join('buyers');
      socket.join('buyers_notifications');
    }

    // ==================== CONVERSATION & MESSAGING HANDLERS ====================

    // Join conversation
    socket.on('join_conversation', async (data) => {
      try {
        const { conversationId, gigId } = data;
        
        if (!conversationId) {
          socket.emit(ORDER_EVENTS.ERROR, { 
            message: 'Conversation ID is required',
            code: 'INVALID_CONVERSATION_ID'
          });
          return;
        }

        // Validate user has access to conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.user.id
        });

        if (!conversation) {
          socket.emit(ORDER_EVENTS.ERROR, { 
            message: 'Access denied to conversation',
            code: 'CONVERSATION_ACCESS_DENIED'
          });
          return;
        }

        socket.join(`conversation_${conversationId}`);
        
        // Mark messages as read
        const unreadMessages = await Message.find({
          conversationId,
          receiver: socket.user.id,
          read: false
        });

        if (unreadMessages.length > 0) {
          await Message.updateMany(
            { 
              _id: { $in: unreadMessages.map(m => m._id) },
              receiver: socket.user.id
            },
            { 
              read: true,
              readAt: new Date()
            }
          );

          // Update conversation unread count
          conversation.unreadCount.set(socket.user.id, 0);
          await conversation.save();

          // Emit read receipt
          socket.to(`conversation_${conversationId}`).emit(ORDER_EVENTS.MESSAGES_READ, {
            conversationId,
            messageIds: unreadMessages.map(m => m._id),
            readBy: socket.user.id,
            timestamp: new Date()
          });
        }

        socket.emit(ORDER_EVENTS.JOINED_ROOM, {
          room: `conversation_${conversationId}`,
          conversationId,
          success: true,
          timestamp: new Date()
        });

        console.log(`User ${socket.user.name} joined conversation: ${conversationId}`);
      } catch (error) {
        console.error('Error joining conversation:', error);
        socket.emit(ORDER_EVENTS.ERROR, { 
          message: 'Error joining conversation',
          error: error.message 
        });
      }
    });

    // Start new conversation
    socket.on('start_conversation', async (data) => {
      try {
        const { receiverId, gigId } = data;
        
        if (!receiverId) {
          socket.emit(ORDER_EVENTS.ERROR, { 
            message: 'Receiver ID is required',
            code: 'INVALID_RECEIVER_ID'
          });
          return;
        }

        if (receiverId === socket.user.id) {
          socket.emit(ORDER_EVENTS.ERROR, { 
            message: 'Cannot start conversation with yourself',
            code: 'SELF_CONVERSATION'
          });
          return;
        }

        // Find or create conversation
        const conversation = await Conversation.findOrCreate(
          socket.user.id,
          receiverId,
          gigId
        );

        // Join conversation room
        socket.join(`conversation_${conversation._id}`);
        
        // Notify receiver if online
        io.to(`user_${receiverId}`).emit(ORDER_EVENTS.NEW_CONVERSATION, {
          conversation,
          initiator: socket.user,
          timestamp: new Date()
        });

        socket.emit(ORDER_EVENTS.JOINED_ROOM, {
          room: `conversation_${conversation._id}`,
          conversationId: conversation._id,
          success: true,
          conversation,
          timestamp: new Date()
        });

        console.log(`New conversation started: ${conversation._id} between ${socket.user.name} and ${receiverId}`);
      } catch (error) {
        console.error('Error starting conversation:', error);
        socket.emit(ORDER_EVENTS.ERROR, { 
          message: 'Error starting conversation',
          error: error.message 
        });
      }
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, message, attachments = [], gigId } = data;
        
        // Validate data
        if (!conversationId || !message?.trim()) {
          socket.emit(ORDER_EVENTS.MESSAGE_ERROR, { 
            message: 'Conversation ID and message are required',
            code: 'INVALID_MESSAGE_DATA'
          });
          return;
        }

        if (message.length > 5000) {
          socket.emit(ORDER_EVENTS.MESSAGE_ERROR, { 
            message: 'Message too long (max 5000 characters)',
            code: 'MESSAGE_TOO_LONG'
          });
          return;
        }

        // Get conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.user.id
        }).populate('participants', 'name email picture');

        if (!conversation) {
          socket.emit(ORDER_EVENTS.MESSAGE_ERROR, { 
            message: 'Conversation not found or access denied',
            code: 'CONVERSATION_NOT_FOUND'
          });
          return;
        }

        // Get other participant
        const otherParticipant = conversation.participants.find(
          p => p._id.toString() !== socket.user.id
        );

        if (!otherParticipant) {
          socket.emit(ORDER_EVENTS.MESSAGE_ERROR, { 
            message: 'Invalid conversation participants',
            code: 'INVALID_PARTICIPANTS'
          });
          return;
        }

        // Create message in database
        const newMessage = await Message.create({
          conversationId,
          sender: socket.user.id,
          receiver: otherParticipant._id,
          content: message.trim(),
          attachments,
          gig: gigId,
          read: false
        });

        // Populate sender info
        await newMessage.populate('sender', 'name email picture');

        // Update conversation last message
        conversation.lastMessage = newMessage._id;
        conversation.lastMessageAt = new Date();
        
        // Increment unread count for receiver
        const currentUnread = conversation.unreadCount.get(otherParticipant._id.toString()) || 0;
        conversation.unreadCount.set(otherParticipant._id.toString(), currentUnread + 1);
        
        await conversation.save();

        // Prepare response
        const messageResponse = {
          _id: newMessage._id,
          conversationId,
          sender: {
            id: newMessage.sender._id,
            name: newMessage.sender.name,
            picture: newMessage.sender.picture
          },
          receiver: otherParticipant._id,
          content: newMessage.content,
          attachments: newMessage.attachments,
          read: newMessage.read,
          createdAt: newMessage.createdAt,
          updatedAt: newMessage.updatedAt
        };

        // Emit to conversation room
        io.to(`conversation_${conversationId}`).emit(ORDER_EVENTS.NEW_MESSAGE, {
          conversationId,
          message: messageResponse,
          timestamp: new Date(),
          unreadCount: conversation.unreadCount.get(otherParticipant._id.toString())
        });

        // Emit notification to receiver if not in conversation room
        const receiverSocketIds = await io.in(`user_${otherParticipant._id}`).fetchSockets();
        const isReceiverInRoom = receiverSocketIds.some(s => s.rooms.has(`conversation_${conversationId}`));
        
        if (!isReceiverInRoom) {
          io.to(`user_${otherParticipant._id}`).emit('new_message_notification', {
            conversationId,
            message: messageResponse,
            sender: socket.user,
            timestamp: new Date()
          });
        }

        // Confirm to sender
        socket.emit(ORDER_EVENTS.MESSAGE_SENT, {
          messageId: newMessage._id,
          conversationId,
          success: true,
          timestamp: new Date()
        });

        console.log(`Message sent in conversation ${conversationId} from ${socket.user.name} to ${otherParticipant.name}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit(ORDER_EVENTS.MESSAGE_ERROR, { 
          message: 'Failed to send message',
          error: error.message,
          code: 'MESSAGE_SEND_ERROR'
        });
      }
    });

    // Typing indicators
    socket.on('typing_start', async (data) => {
      try {
        const { conversationId } = data;
        
        if (!conversationId) return;

        socket.to(`conversation_${conversationId}`).emit(ORDER_EVENTS.USER_TYPING, {
          conversationId,
          userId: socket.user.id,
          userName: socket.user.name,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    });

    socket.on('typing_stop', async (data) => {
      try {
        const { conversationId } = data;
        
        if (!conversationId) return;

        socket.to(`conversation_${conversationId}`).emit(ORDER_EVENTS.USER_STOPPED_TYPING, {
          conversationId,
          userId: socket.user.id,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error stopping typing indicator:', error);
      }
    });

    // Mark messages as read
    socket.on('mark_messages_read', async (data) => {
      try {
        const { conversationId, messageIds } = data;
        
        if (!conversationId || !messageIds?.length) return;

        // Update messages as read
        await Message.updateMany(
          { 
            _id: { $in: messageIds },
            receiver: socket.user.id,
            read: false
          },
          { 
            read: true,
            readAt: new Date()
          }
        );

        // Update conversation unread count
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          conversation.unreadCount.set(socket.user.id, 0);
          await conversation.save();
        }

        // Notify other participants
        socket.to(`conversation_${conversationId}`).emit(ORDER_EVENTS.MESSAGES_READ, {
          conversationId,
          messageIds,
          readBy: socket.user.id,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // ==================== ORDER HANDLERS ====================

    // Join order room
    socket.on('join_order', async (orderId) => {
      try {
        if (!orderId || typeof orderId !== 'string') {
          socket.emit(ORDER_EVENTS.ERROR, { 
            message: 'Invalid order ID',
            code: 'INVALID_ORDER_ID'
          });
          return;
        }
        
        socket.join(`order_${orderId}`);
        
        socket.emit(ORDER_EVENTS.JOINED_ROOM, {
          room: `order_${orderId}`,
          orderId,
          success: true,
          timestamp: new Date()
        });

        console.log(`User ${socket.user.name} joined order room: ${orderId}`);
      } catch (error) {
        console.error('Error joining order room:', error);
        socket.emit(ORDER_EVENTS.ERROR, { 
          message: 'Error joining order room',
          error: error.message 
        });
      }
    });

    // Leave order room
    socket.on('leave_order', (orderId) => {
      socket.leave(`order_${orderId}`);
      socket.emit(ORDER_EVENTS.LEFT_ROOM, {
        room: `order_${orderId}`,
        orderId,
        timestamp: new Date()
      });
      console.log(`User ${socket.user.name} left order room: ${orderId}`);
    });

    // ==================== GENERAL HANDLERS ====================

    // Heartbeat/ping
    socket.on('ping', (data) => {
      socket.emit('pong', { 
        timestamp: new Date(), 
        userId: socket.user.id,
        ...data 
      });
    });

    // User online status
    socket.on('user_online', async () => {
      try {
        await User.findByIdAndUpdate(socket.user.id, {
          lastSeen: new Date(),
          isOnline: true
        });

        // Notify users who have conversations with this user
        const conversations = await Conversation.find({
          participants: socket.user.id
        });

        conversations.forEach(conversation => {
          const otherParticipant = conversation.participants.find(
            p => p.toString() !== socket.user.id
          );
          if (otherParticipant) {
            io.to(`user_${otherParticipant}`).emit('user_status_changed', {
              userId: socket.user.id,
              isOnline: true,
              lastSeen: new Date()
            });
          }
        });
      } catch (error) {
        console.error('Error updating user online status:', error);
      }
    });

    // Disconnect handler
    socket.on('disconnect', async (reason) => {
      console.log(`❌ User disconnected: ${socket.user?.name} - Reason: ${reason}`);
      
      try {
        // Update user as offline
        if (socket.user?.id) {
          await User.findByIdAndUpdate(socket.user.id, {
            lastSeen: new Date(),
            isOnline: false
          });

          // Notify users who have conversations with this user
          const conversations = await Conversation.find({
            participants: socket.user.id
          });

          conversations.forEach(conversation => {
            const otherParticipant = conversation.participants.find(
              p => p.toString() !== socket.user.id
            );
            if (otherParticipant) {
              io.to(`user_${otherParticipant}`).emit('user_status_changed', {
                userId: socket.user.id,
                isOnline: false,
                lastSeen: new Date()
              });
            }
          });
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Connection error
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.user?.name}:`, error);
    });

    // Send connection confirmation
    socket.emit(ORDER_EVENTS.CONNECTED, {
      userId: socket.user.id,
      socketId: socket.id,
      user: socket.user,
      timestamp: new Date(),
      message: 'Successfully connected to real-time server'
    });
  });

  // Handle server errors
  io.engine.on("connection_error", (err) => {
    console.error('Socket.io connection error:', {
      message: err.message,
      code: err.code,
      context: err.context
    });
  });

  return io;
};

// ==================== HELPER FUNCTIONS ====================

// Emit new message (for use in controllers)
const emitNewMessage = async (message) => {
  try {
    if (!io) {
      console.error('Socket.io not initialized');
      return;
    }

    io.to(`conversation_${message.conversationId}`).emit(ORDER_EVENTS.NEW_MESSAGE, {
      conversationId: message.conversationId,
      message,
      timestamp: new Date()
    });

    console.log(`📨 New message emitted to conversation ${message.conversationId}`);
  } catch (error) {
    console.error('Error emitting new message:', error);
  }
};

// Emit conversation update
const emitConversationUpdate = async (conversationId, updateData) => {
  try {
    if (!io) {
      console.error('Socket.io not initialized');
      return;
    }

    io.to(`conversation_${conversationId}`).emit(ORDER_EVENTS.CONVERSATION_UPDATED, {
      conversationId,
      update: updateData,
      timestamp: new Date()
    });

    console.log(`🔄 Conversation ${conversationId} updated`);
  } catch (error) {
    console.error('Error emitting conversation update:', error);
  }
};

// Emit new order to seller
const emitNewOrder = async (order) => {
  try {
    if (!io) {
      console.error('Socket.io not initialized');
      return;
    }

    io.to(`user_${order.seller}`).emit(ORDER_EVENTS.NEW_ORDER, {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        service: order.service,
        buyer: order.buyer,
        totalAmount: order.totalAmount,
        currency: order.currency,
        deliveryTime: order.deliveryTime,
        createdAt: order.createdAt
      },
      timestamp: new Date(),
      message: 'New order received!'
    });

    io.to('sellers').emit('order_notification', {
      type: 'new_order',
      orderId: order._id,
      sellerId: order.seller,
      timestamp: new Date()
    });

    console.log(`📨 New order notification sent to seller ${order.seller}`);
  } catch (error) {
    console.error('Error emitting new order:', error);
  }
};

// Emit order status change
const emitOrderStatusChange = async (orderId, oldStatus, newStatus, changedBy) => {
  try {
    if (!io) {
      console.error('Socket.io not initialized');
      return;
    }

    io.to(`order_${orderId}`).emit(ORDER_EVENTS.ORDER_STATUS_CHANGED, {
      orderId,
      oldStatus,
      newStatus,
      changedBy,
      timestamp: new Date(),
      message: `Order status changed from ${oldStatus} to ${newStatus}`
    });

    if (newStatus === 'accepted') {
      io.to(`user_${changedBy}`).emit(ORDER_EVENTS.ORDER_ACCEPTED, {
        orderId,
        timestamp: new Date(),
        message: 'Order has been accepted!'
      });
    } else if (newStatus === 'delivered') {
      io.to(`order_${orderId}`).emit(ORDER_EVENTS.DELIVERY_UPDATED, {
        orderId,
        timestamp: new Date(),
        message: 'Seller has delivered the work!'
      });
    } else if (newStatus === 'completed') {
      io.to(`order_${orderId}`).emit(ORDER_EVENTS.ORDER_COMPLETED, {
        orderId,
        timestamp: new Date(),
        message: 'Order completed successfully!'
      });
    }

    console.log(`🔄 Order ${orderId} status changed from ${oldStatus} to ${newStatus}`);
  } catch (error) {
    console.error('Error emitting order status change:', error);
  }
};

// Emit order update
const emitOrderUpdate = async (orderId, updates) => {
  try {
    if (!io) {
      console.error('Socket.io not initialized');
      return;
    }

    io.to(`order_${orderId}`).emit(ORDER_EVENTS.ORDER_UPDATED, {
      orderId,
      updates,
      timestamp: new Date(),
      message: 'Order has been updated'
    });
  } catch (error) {
    console.error('Error emitting order update:', error);
  }
};

// Get online users
const getOnlineUsers = () => {
  if (!io) return [];
  
  const sockets = io.sockets.sockets;
  const onlineUsers = new Set();
  
  sockets.forEach(socket => {
    if (socket.user) {
      onlineUsers.add(socket.user.id);
    }
  });
  
  return Array.from(onlineUsers);
};

// Check if user is online
const isUserOnline = (userId) => {
  if (!io) return false;
  
  const room = io.sockets.adapter.rooms.get(`user_${userId}`);
  return room && room.size > 0;
};

module.exports = {
  initSocket,
  getIO: () => io,
  ORDER_EVENTS,
  
  // Order functions
  emitNewOrder,
  emitOrderStatusChange,
  emitOrderUpdate,
  
  // Messaging functions
  emitNewMessage,
  emitConversationUpdate,
  
  // User status functions
  getOnlineUsers,
  isUserOnline
};