import io from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore.js';

let socket = null;

export const initializeSocket = () => {
  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
  
  if (!token) {
    console.log('No token found for socket connection');
    return null;
  }

  if (socket?.connected) {
    console.log('Socket already connected');
    return socket;
  }
  
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    
    socket = io(backendUrl, {
      auth: { 
        token: token 
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      withCredentials: true,
      autoConnect: true
    });
    
    // Connection events
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      
      // Emit connection confirmation
      socket.emit('ping', { type: 'connection_test' });
    });
    
    socket.on('connected', (data) => {
      console.log('Server confirmed connection:', data);
    });
    
    socket.on('pong', (data) => {
      console.log('Pong received:', data);
    });
    
    socket.on('joined_order', (data) => {
      console.log('Joined order room:', data);
    });
    
    socket.on('message_sent', (data) => {
      console.log('Message sent confirmation:', data);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected. Reason:', reason);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      
      // Handle specific errors
      if (error.message.includes('Authentication error')) {
        console.error('Authentication failed. Please login again.');
        // Clear invalid token
        localStorage.removeItem('userToken');
        localStorage.removeItem('token');
      }
    });
    
    // Listen for new order notifications (for sellers)
    socket.on('new_order', (data) => {
      console.log('New order received:', data);
      const { user } = useAuthStore.getState();
      
      if (user?.role === 'seller') {
        toast.success(`New order received: ${data.order.orderNumber}`, {
          duration: 10000,
          icon: '🎉',
        });
      }
    });
    
    // Listen for order status updates
    socket.on('order_status_changed', (data) => {
      console.log('Order status changed:', data);
      
      const { user } = useAuthStore.getState();
      const isRelevant = data.changedBy !== user?._id;
      
      if (isRelevant) {
        let message = '';
        let icon = '🔄';
        
        switch (data.newStatus) {
          case 'accepted':
            message = 'Order accepted by seller';
            icon = '✅';
            break;
          case 'in_progress':
            message = 'Seller started working';
            icon = '⚙️';
            break;
          case 'delivered':
            message = 'Order delivered!';
            icon = '📦';
            break;
          case 'completed':
            message = 'Order completed!';
            icon = '🎉';
            break;
          case 'revision':
            message = 'Revision requested';
            icon = '✏️';
            break;
          case 'cancelled':
            message = 'Order cancelled';
            icon = '❌';
            break;
        }
        
        if (message) {
          toast.success(message, {
            duration: 5000,
            icon: icon,
          });
        }
      }
    });
    
    // Listen for delivery updates
    socket.on('delivery_updated', (data) => {
      console.log('Delivery updated:', data);
      toast.success('New delivery received!', {
        duration: 5000,
        icon: '📦',
      });
    });
    
    // Listen for general notifications
    socket.on('order_notification', (data) => {
      console.log('Order notification:', data);
    });
    
    // Error handling
    socket.on('error', (data) => {
      console.error('Socket error:', data);
      toast.error(data.message || 'Socket error occurred');
    });
    
    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    return null;
  }
};

export const getSocket = () => {
  if (!socket || !socket.connected) {
    return initializeSocket();
  }
  return socket;
};

export const joinOrderRoom = (orderId) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit('join_order', orderId);
  } else {
    console.error('Socket not connected');
  }
};

export const leaveOrderRoom = (orderId) => {
  if (socket && socket.connected) {
    socket.emit('leave_order', orderId);
  }
};

export const sendOrderMessage = (orderId, message, attachments = []) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit('new_message', {
      orderId,
      message,
      attachments
    });
  } else {
    console.error('Socket not connected');
    throw new Error('Socket connection required');
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Helper to check socket connection status
export const isSocketConnected = () => {
  return socket?.connected || false;
};

// Reconnect manually if needed
export const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket.connect();
  } else {
    initializeSocket();
  }
};