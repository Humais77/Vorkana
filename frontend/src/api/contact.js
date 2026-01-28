import axios from 'axios';
import { validatePhoneNumber } from '../utils/phoneValidation';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// CSRF token management
let csrfToken = localStorage.getItem('csrfToken') || null;
let csrfTokenExpiry = localStorage.getItem('csrfTokenExpiry') || 0;

// Use shared axios instance if available, otherwise create new
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for CSRF
axiosInstance.interceptors.request.use(
  (config) => {
    // Add CSRF token for non-GET requests
    if (config.method !== 'get' && config.method !== 'GET') {
      // Check if token is expired
      if (csrfToken && Date.now() < parseInt(csrfTokenExpiry)) {
        config.headers['X-CSRF-Token'] = csrfToken;
        
        // Also add to body for POST requests
        if (config.data && typeof config.data === 'object' && !config.data.csrfToken) {
          config.data.csrfToken = csrfToken;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Update CSRF token from response
    if (response.data?.csrfToken) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
    }
    return response;
  },
  async (error) => {
    // Handle CSRF errors
    if (error.response?.status === 403 && 
        error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
      
      console.log('CSRF token invalid for contact form, refreshing...');
      
      try {
        // Try to refresh CSRF token
        await refreshCSRFToken();
        
        // Retry original request
        if (error.config) {
          error.config.headers['X-CSRF-Token'] = csrfToken;
          if (error.config.data && typeof error.config.data === 'object') {
            error.config.data.csrfToken = csrfToken;
          }
          return axiosInstance(error.config);
        }
      } catch (refreshError) {
        console.error('CSRF refresh failed:', refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// CSRF token management functions
const setCSRFToken = (token, expiresAt) => {
  csrfToken = token;
  csrfTokenExpiry = expiresAt || Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem('csrfToken', token);
  localStorage.setItem('csrfTokenExpiry', csrfTokenExpiry);
};

const refreshCSRFToken = async () => {
  try {
    console.log('Refreshing CSRF token for contact API...');
    const response = await axiosInstance.get('/api/csrf/token');
    if (response.data.success) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      console.log('CSRF token refreshed successfully');
      return csrfToken;
    }
    throw new Error('Failed to refresh CSRF token');
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error.message);
    throw error;
  }
};

export const contactAPI = {
  // Submit contact form
  submitContact: async (formData) => {
    try {
      // Pre-validate phone on frontend
      if (formData.phone && formData.phone.trim() !== '') {
        const phoneValidation = validatePhoneNumber(formData.phone);
        if (!phoneValidation.valid) {
          throw { 
            success: false, 
            message: phoneValidation.message 
          };
        }
        
        // Format phone before sending
        formData.phone = formData.phone.trim();
      }
      
      // Ensure we have CSRF token before submitting
      if (!csrfToken || Date.now() > parseInt(csrfTokenExpiry)) {
        await refreshCSRFToken();
      }
      
      // Add CSRF token to form data
      const dataWithCSRF = {
        ...formData,
        csrfToken
      };
      
      const response = await axiosInstance.post('/api/contact', dataWithCSRF);
      return response.data;
    } catch (error) {
      if (error.response) {
        // Handle CSRF-specific error
        if (error.response.status === 403 && error.response.data?.code === 'CSRF_TOKEN_INVALID') {
          throw {
            success: false,
            message: 'Security validation failed. Please refresh the page and try again.',
            code: 'CSRF_TOKEN_INVALID',
            requiresCSRFRefresh: true
          };
        }
        
        throw error.response.data || { 
          success: false, 
          message: 'Failed to submit contact form' 
        };
      } else if (error.request) {
        throw { 
          success: false, 
          message: 'Network error. Please check your connection.' 
        };
      } else {
        // This is our frontend validation error
        throw error;
      }
    }
  },
  
  // Validate phone number via API (optional)
  validatePhone: async (phone) => {
    try {
      const response = await axiosInstance.get(`/api/contact/validate-phone?phone=${encodeURIComponent(phone)}`);
      return response.data;
    } catch (error) {
      return { valid: false, message: 'Validation service unavailable' };
    }
  },
  
  // CSRF token management
  getCSRFToken: async () => {
    try {
      const response = await axiosInstance.get('/api/csrf/token');
      if (response.data.success) {
        setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw error;
    }
  },
  
  refreshCSRFToken,
  
  hasValidCSRFToken: () => {
    return csrfToken && Date.now() < parseInt(csrfTokenExpiry);
  }
};