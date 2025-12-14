import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Create axios instance with security headers
const secureAxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
    'X-Request-Source': 'web-app',
    'X-Content-Type-Options': 'nosniff'
  }
});

// Request interceptor for security
secureAxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = generateRequestId();
    
    // Sanitize URL parameters
    if (config.params) {
      config.params = sanitizeParams(config.params);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for security
secureAxiosInstance.interceptors.response.use(
  (response) => {
    // Validate response structure
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid response format');
    }
    
    // Check for security headers
    const securityHeaders = response.headers;
    if (!securityHeaders['x-content-type-options'] || 
        !securityHeaders['x-frame-options']) {
      console.warn('Missing security headers in response');
    }
    
    return response;
  },
  (error) => {
    // Enhanced error handling
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle specific error codes
      switch (data?.code) {
        case 'ORDER_CREATION_LIMIT':
          throw new Error('Too many orders created. Please wait before creating more.');
        case 'ORDER_ACCESS_DENIED':
          throw new Error('You do not have permission to access this order.');
        case 'INVALID_STATUS_TRANSITION':
          throw new Error('This status change is not allowed.');
        case 'FILE_SIZE_EXCEEDED':
          throw new Error('File size exceeds limit.');
        case 'MALICIOUS_FILENAME':
          throw new Error('Invalid filename detected.');
        default:
          throw new Error(data?.message || 'An error occurred');
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    } else if (!navigator.onLine) {
      throw new Error('No internet connection');
    } else {
      throw new Error('Network error. Please try again.');
    }
  }
);

// Helper functions
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function sanitizeParams(params) {
  const sanitized = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      sanitized[key] = value.replace(/[<>'"/\\]/g, '');
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Secure order API methods
export const secureOrdersAPI = {
  /**
   * Create new order with enhanced validation
   */
  create: async (orderData) => {
    try {
      // Validate order data structure
      validateOrderData(orderData);
      
      const response = await secureAxiosInstance.post('/api/orders', orderData);
      
      // Verify response contains required fields
      if (!response.data.order || !response.data.order._id) {
        throw new Error('Invalid order response');
      }
      
      return response.data;
    } catch (error) {
      console.error('Secure order creation error:', error);
      throw error;
    }
  },

  /**
   * Get order by ID with ownership validation
   */
  getById: async (id) => {
    try {
      // Validate ID format
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid order ID');
      }
      
      const response = await secureAxiosInstance.get(`/api/orders/${id}`);
      
      // Validate order response
      const order = response.data.order;
      if (!order || !order._id) {
        throw new Error('Invalid order data received');
      }
      
      return response.data;
    } catch (error) {
      console.error('Secure get order error:', error);
      throw error;
    }
  },

  /**
   * Update order status with transition validation
   */
  updateStatus: async (id, data) => {
    try {
      const validStatuses = ['accepted', 'in_progress', 'delivered', 'completed', 'cancelled', 'revision'];
      if (!data.status || !validStatuses.includes(data.status)) {
        throw new Error('Invalid status value');
      }
      
      const response = await secureAxiosInstance.patch(`/api/orders/${id}/status`, data);
      return response.data;
    } catch (error) {
      console.error('Secure update status error:', error);
      throw error;
    }
  },

  /**
   * Add deliverables with file validation
   */
  addDeliverables: async (id, data, files = []) => {
    try {
      // Validate file count
      if (files.length > 10) {
        throw new Error('Maximum 10 files allowed');
      }
      
      // Validate file sizes
      const maxSize = 10 * 1024 * 1024; // 10MB
      for (const file of files) {
        if (file.size > maxSize) {
          throw new Error(`File ${file.name} exceeds 10MB limit`);
        }
        
        // Validate file type
        const allowedTypes = ['image/', 'application/pdf', 'application/msword', 
          'application/vnd.openxmlformats', 'text/plain', 'application/zip', 
          'application/x-rar'];
        
        const isValidType = allowedTypes.some(type => file.type.startsWith(type));
        if (!isValidType) {
          throw new Error(`File type ${file.type} is not allowed`);
        }
      }
      
      let response;
      if (files.length > 0) {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description || '');
        formData.append('revisionNotes', data.revisionNotes || '');
        
        files.forEach(file => {
          formData.append('files', file);
        });
        
        response = await secureAxiosInstance.post(`/api/orders/${id}/deliverables`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        response = await secureAxiosInstance.post(`/api/orders/${id}/deliverables`, data);
      }
      
      return response.data;
    } catch (error) {
      console.error('Secure add deliverables error:', error);
      throw error;
    }
  },

  /**
   * Cancel order with validation
   */
  cancel: async (id, reason = '') => {
    try {
      const response = await secureAxiosInstance.post(`/api/orders/${id}/cancel`, { reason });
      return response.data;
    } catch (error) {
      console.error('Secure cancel order error:', error);
      throw error;
    }
  }
};

// Validation functions
function validateOrderData(orderData) {
  const requiredFields = ['service', 'quantity'];
  
  for (const field of requiredFields) {
    if (!orderData[field]) {
      throw new Error(`${field} is required`);
    }
  }
  
  // Validate quantity
  if (orderData.quantity < 1 || orderData.quantity > 99) {
    throw new Error('Quantity must be between 1 and 99');
  }
  
  // Validate requirements if present
  if (orderData.requirements && Array.isArray(orderData.requirements)) {
    if (orderData.requirements.length > 20) {
      throw new Error('Maximum 20 requirements allowed');
    }
    
    for (const req of orderData.requirements) {
      if (req.required && (!req.answer || req.answer.trim() === '')) {
        throw new Error(`Required field "${req.question}" must be filled`);
      }
    }
  }
}