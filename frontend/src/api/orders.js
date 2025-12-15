import axios from 'axios';

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
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
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
  create: async (orderData) => {
    try {
      validateOrderData(orderData);
      const response = await axiosInstance.post('/api/orders', orderData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create order');
    }
  },

  getAll: async (filters = {}) => {
    try {
      const queryString = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(`/api/orders${queryString ? '?' + queryString : ''}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch orders');
    }
  },

  getById: async (id) => {
    try {
      const response = await axiosInstance.get(`/api/orders/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order');
    }
  },

  updateStatus: async (id, data) => {
    try {
      const response = await axiosInstance.patch(`/api/orders/${id}/status`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update order status');
    }
  },

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
      throw new Error(error.response?.data?.message || 'Failed to add deliverables');
    }
  },

  acceptDelivery: async (id) => {
    try {
      const response = await axiosInstance.post(`/api/orders/${id}/accept-delivery`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to accept delivery');
    }
  },

  requestRevision: async (id, data) => {
    try {
      const response = await axiosInstance.post(`/api/orders/${id}/request-revision`, data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to request revision');
    }
  },

  getStats: async () => {
    try {
      const response = await axiosInstance.get('/api/orders/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch order stats');
    }
  },

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
      throw new Error(error.response?.data?.message || 'Failed to upload files');
    }
  },
};

function validateOrderData(orderData) {
  if (!orderData.service) {
    throw new Error('Service is required');
  }
  if (!orderData.quantity || orderData.quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }
}

function generateRequestId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}