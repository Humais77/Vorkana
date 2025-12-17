const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

let io;

// Socket.io events
const ORDER_EVENTS = {
  NEW_ORDER: 'new_order',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_UPDATED: 'order_updated',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  NEW_MESSAGE: 'new_message',
  DELIVERY_UPDATED: 'delivery_updated',
  ORDER_COMPLETED: 'order_completed',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_EXPIRED: 'order_expired'
};

// Initialize Socket.io
const initSocket = (server) => {
  io = socketio(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Authorization', 'Content-Type']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    cookie: false
  });
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
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  adminNamespace.on('connection', (socket) => {
    console.log(`Admin connected: ${socket.admin.email}`);
    
    // Broadcast updates to all admin clients
    const broadcastUpdate = (event, data) => {
      adminNamespace.emit(`admin:${event}`, data);
    };

    // Listen for user updates from controllers
    socket.on('user:updated', (user) => {
      broadcastUpdate('user_updated', user);
    });

    socket.on('category:updated', (category) => {
      broadcastUpdate('category_updated', category);
    });

    socket.on('disconnect', () => {
      console.log(`Admin disconnected: ${socket.admin.email}`);
    });
  });
  // Socket.io middleware for authentication
  io.use(async (socket, next) => {
    try {
      console.log('Socket connection attempt:', socket.handshake.auth);
      
      const token = socket.handshake.auth.token || 
                   socket.handshake.query.token;
      
      if (!token) {
        console.log('No token provided for socket connection');
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name email role picture isActive');
      
      if (!user || !user.isActive) {
        console.log('User not found or inactive:', decoded.id);
        return next(new Error('Authentication error: User not found or inactive'));
      }

      socket.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture
      };

      console.log('Socket authenticated for user:', socket.user.name);
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Socket connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user?.name} (${socket.user?.role}) - Socket ID: ${socket.id}`);

    // Join user-specific room
    socket.join(`user_${socket.user.id}`);
    
    // Join role-specific room
    if (socket.user.role === 'seller') {
      socket.join('sellers');
      console.log(`User ${socket.user.name} joined sellers room`);
    } else if (socket.user.role === 'user') {
      socket.join('buyers');
    }

    // Join order-specific room
    socket.on('join_order', async (orderId) => {
      try {
        // Validate order ID
        if (!orderId || typeof orderId !== 'string') {
          socket.emit('error', { message: 'Invalid order ID' });
          return;
        }
        
        socket.join(`order_${orderId}`);
        console.log(`User ${socket.user.name} joined order room: ${orderId}`);
        
        // Send confirmation
        socket.emit('joined_order', { orderId, success: true });
      } catch (error) {
        console.error('Error joining order room:', error);
        socket.emit('error', { message: 'Error joining order room' });
      }
    });

    // Leave order room
    socket.on('leave_order', (orderId) => {
      socket.leave(`order_${orderId}`);
      console.log(`User ${socket.user.name} left order room: ${orderId}`);
    });

    // New message
    socket.on('new_message', async (data) => {
      try {
        const { orderId, message, attachments } = data;
        
        // Validate data
        if (!orderId || !message) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        // Validate message length
        if (message.length > 5000) {
          socket.emit('error', { message: 'Message too long' });
          return;
        }
        
        // Emit to order room
        socket.to(`order_${orderId}`).emit(ORDER_EVENTS.NEW_MESSAGE, {
          orderId,
          message: {
            sender: {
              id: socket.user.id,
              name: socket.user.name,
              picture: socket.user.picture
            },
            message,
            attachments: attachments || [],
            createdAt: new Date()
          },
          timestamp: new Date()
        });
        
        // Also emit to sender for confirmation
        socket.emit('message_sent', { orderId, success: true });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Heartbeat/ping
    socket.on('ping', (data) => {
      socket.emit('pong', { timestamp: new Date(), ...data });
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.user?.name} - Reason: ${reason}`);
    });

    // Connection error
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.user?.name}:`, error);
    });

    // Send connection confirmation
    socket.emit('connected', {
      userId: socket.user.id,
      socketId: socket.id,
      timestamp: new Date()
    });
  });

  // Handle server errors
  io.engine.on("connection_error", (err) => {
    console.error('Socket.io connection error:', err);
  });

  return io;
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

    // Also emit to sellers room for notifications
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

    // Emit to specific users
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

module.exports = {
  initSocket,
  getIO: () => io,
  ORDER_EVENTS,
  emitNewOrder,
  emitOrderStatusChange,
  emitOrderUpdate
};