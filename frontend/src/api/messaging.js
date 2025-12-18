import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken') || 
                  localStorage.getItem('token') || 
                  sessionStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const messagingAPI = {
  // Start or get conversation
  startConversation: async (receiverId, gigId = null) => {
    try {
      const response = await axiosInstance.post('/api/messaging/conversations/start', {
        receiverId,
        gigId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get conversation messages
  getMessages: async (conversationId, params = {}) => {
    try {
      const response = await axiosInstance.get(`/api/messaging/conversations/${conversationId}/messages`, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get user conversations
  getConversations: async () => {
    try {
      const response = await axiosInstance.get('/api/messaging/conversations');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update conversation settings
  updateConversationSettings: async (conversationId, settings) => {
    try {
      const response = await axiosInstance.patch(
        `/api/messaging/conversations/${conversationId}/settings`,
        settings
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Upload file for message
  uploadAttachment: async (file) => {
    try {
      const formData = new FormData();
      formData.append('attachment', file);

      const response = await axiosInstance.post('/api/messaging/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};