// api/index.js or utils/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Create axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Your existing error handling logic
    return Promise.reject(error);
  }
);

// Main API object
export const api = {
  get: async (url, config = {}) => {
    return axiosInstance.get(url, config);
  },
  
  post: async (url, data = {}, config = {}) => {
    return axiosInstance.post(url, data, config);
  },
  
  put: async (url, data = {}, config = {}) => {
    return axiosInstance.put(url, data, config);
  },
  
  delete: async (url, config = {}) => {
    return axiosInstance.delete(url, config);
  },
  
  patch: async (url, data = {}, config = {}) => {
    return axiosInstance.patch(url, data, config);
  },
  
  // File upload helper
  upload: async (url, formData, onUploadProgress = null) => {
    return axiosInstance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },
};

// Or export the axios instance directly if you prefer
export default axiosInstance;