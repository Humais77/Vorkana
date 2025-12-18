const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model.js');

let io;

const initSocket = (server) => {
  io = socketio(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔗 User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user_${socket.userId}`);

    // Join conversation rooms
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Leave conversation
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, message, gigId, receiverId } = data;
        
        // Save message to database (we'll create the model next)
        const newMessage = await Message.create({
          conversationId,
          sender: socket.userId,
          receiver: receiverId,
          content: message,
          gig: gigId,
          read: false,
        });

        // Populate sender info
        await newMessage.populate('sender', 'name email picture');

        // Emit to conversation room
        io.to(`conversation_${conversationId}`).emit('receive_message', {
          success: true,
          message: newMessage,
        });

        // Notify receiver if they're not in the conversation
        io.to(`user_${receiverId}`).emit('new_message_notification', {
          conversationId,
          sender: socket.user,
          message: newMessage.content.substring(0, 100),
          gigId,
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', {
          success: false,
          error: 'Failed to send message',
        });
      }
    });

    // Typing indicator
    socket.on('typing_start', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        name: socket.user.name,
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
        userId: socket.userId,
      });
    });

    // Read receipt
    socket.on('mark_as_read', async ({ conversationId, messageIds }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { read: true, readAt: new Date() }
        );

        // Notify other participants
        socket.to(`conversation_${conversationId}`).emit('messages_read', {
          messageIds,
          readBy: socket.userId,
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initSocket, getIO };