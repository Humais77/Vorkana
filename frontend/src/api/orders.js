// api/orders.js
import axios from 'axios';
import { secureOrdersAPI } from './secureOrders'; 

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Request-Source': 'web-app'
  }
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Add your existing token logic
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add security headers
    config.headers['X-Request-ID'] = generateRequestId();
    
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    }
    if (!navigator.onLine) {
      throw new Error('No internet connection');
    }
    return Promise.reject(error);
  }
);

export const ordersAPI = {
  /**
   * Create new order
   */
  create: async (orderData) => {
    try {
      validateOrderData(orderData);
      const response = await axiosInstance.post('/api/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Create order error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create order');
    }
  },

  /**
   * Get all orders for current user
   */
  getAll: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`/api/orders${queryString ? '?' + queryString : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get orders error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch orders');
    }
  },

  /**
   * Get seller's pending orders
   */
  getSellerPending: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axiosInstance.get(`/api/orders/seller/pending${queryString ? '?' + queryString : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get seller pending error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch pending orders');
    }
  },

  /**
   * Get seller's active orders
   */
  getSellerActive: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axiosInstance.get(`/api/orders/seller/active${queryString ? '?' + queryString : ''}`);
      return response.data;
    } catch (error) {
      console.error('Get seller active error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch active orders');
    }
  },

  /**
   * Get order by ID
   */
  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/api/orders/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get order by ID error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch order');
    }
  },

  /**
   * Update order status
   */
  updateStatus: async (id, data) => {
    try {
      const response = await axiosInstance.patch(`/api/orders/${id}/status`, data);
      return response.data;
    } catch (error) {
      console.error('Update order status error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update order status');
    }
  },

  /**
   * Add deliverables
   */
  addDeliverables: async (id, data, files = null) => {
    try {
      let response;
      
      if (files && files.length > 0) {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description || '');
        formData.append('revisionNotes', data.revisionNotes || '');
        
        files.forEach(file => {
          formData.append('files', file);
        });
        
        response = await axiosInstance.post(`/api/orders/${id}/deliverables`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        response = await axiosInstance.post(`/api/orders/${id}/deliverables`, data);
      }
      
      return response.data;
    } catch (error) {
      console.error('Add deliverables error:', error);
      throw new Error(error.response?.data?.message || 'Failed to add deliverables');
    }
  },

  /**
   * Accept delivery
   */
  acceptDelivery: async (id) => {
    try {
      const response = await axiosInstance.post(`/api/orders/${id}/accept-delivery`);
      return response.data;
    } catch (error) {
      console.error('Accept delivery error:', error);
      throw new Error(error.response?.data?.message || 'Failed to accept delivery');
    }
  },

  /**
   * Request revision
   */
  requestRevision: async (id, data) => {
    try {
      const response = await axiosInstance.post(`/api/orders/${id}/request-revision`, data);
      return response.data;
    } catch (error) {
      console.error('Request revision error:', error);
      throw new Error(error.response?.data?.message || 'Failed to request revision');
    }
  },

  /**
   * Get order stats
   */
  getStats: async () => {
    try {
      const response = await axiosInstance.get('/api/orders/seller/stats');
      return response.data;
    } catch (error) {
      console.error('Get order stats error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch order stats');
    }
  },

  /**
   * Upload requirement files
   */
  uploadRequirementFiles: async (id, files) => {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await axiosInstance.post(`/api/orders/${id}/requirements/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Upload requirement files error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload files');
    }
  },
};