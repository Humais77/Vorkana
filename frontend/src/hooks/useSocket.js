import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, token } = useAuthStore();
  const socketRef = useRef(null);

  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) return;

    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [token]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  // Auto connect on mount and when token changes
  useEffect(() => {
    if (token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [token, connect, disconnect]);

  const joinConversation = useCallback((conversationId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_conversation', conversationId);
    }
  }, []);

  const leaveConversation = useCallback((conversationId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_conversation', conversationId);
    }
  }, []);

  const sendMessage = useCallback((data) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketRef.current.emit('send_message', data, (response) => {
        if (response?.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Failed to send message'));
        }
      });
    });
  }, []);

  const startTyping = useCallback((conversationId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_start', { conversationId });
    }
  }, []);

  const stopTyping = useCallback((conversationId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing_stop', { conversationId });
    }
  }, []);

  const markAsRead = useCallback((conversationId, messageIds) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('mark_as_read', { conversationId, messageIds });
    }
  }, []);

  return {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    connect,
    disconnect,
  };
};