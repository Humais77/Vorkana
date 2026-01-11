// api/auth.js
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// Request ID generator
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create axios instance with optimized configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Critical for cookie-based auth
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const requestId = generateRequestId();
    config.headers['X-Request-ID'] = requestId;
    
    if (DEBUG) {
      console.group(`📤 Request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log('Headers:', config.headers);
      console.log('Data:', config.data);
      console.groupEnd();
    }
    
    return config;
  },
  (error) => {
    if (DEBUG) console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for production
axiosInstance.interceptors.response.use(
  (response) => {
    if (DEBUG) {
      console.group(`📥 Response: ${response.config.method?.toUpperCase()} ${response.config.url}`);
      console.log('Status:', response.status);
      console.log('Data:', response.data);
      console.groupEnd();
    }
    
    // Handle specific success cases
    if (response.config.url?.includes('/login') && response.data.success) {
      // Store minimal user info
      if (response.data.user) {
        const userInfo = {
          _id: response.data.user._id,
          name: response.data.user.name,
          email: response.data.user.email,
          role: response.data.user.role,
          picture: response.data.user.picture,
          emailVerified: response.data.user.emailVerified,
          isOnline: response.data.user.isOnline,
          lastSeenAt: response.data.user.lastSeenAt,
        };
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
      }
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (DEBUG) {
      console.group(`❌ Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
      console.log('Message:', error.message);
      console.groupEnd();
    }
    
    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject({
        success: false,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR'
      });
    }
    
    const { status, data } = error.response;
    
    // Handle specific status codes with user-friendly messages
    switch (status) {
      case 400:
        handle400Error(data, originalRequest);
        break;
      case 401:
        await handle401Error(originalRequest, error);
        break;
      case 403:
        handle403Error(data);
        break;
      case 404:
        handle404Error(originalRequest);
        break;
      case 409:
        handle409Error(data);
        break;
      case 423:
        handle423Error(data);
        break;
      case 429:
        handle429Error(data);
        break;
      case 500:
        handle500Error();
        break;
      default:
        handleGenericError(error);
    }
    
    return Promise.reject(error);
  }
);

// Error handlers
const handle400Error = (data, request) => {
  const isAuthEndpoint = request.url?.includes('/auth/');
  let message = 'Invalid request. Please check your input.';
  
  if (data.message) {
    message = isAuthEndpoint 
      ? formatAuthErrorMessage(data.message)
      : data.message;
  }
  
  if (data.errors && Array.isArray(data.errors)) {
    message = data.errors.join(', ');
  }
  
  toast.error(message);
};

const handle401Error = async (originalRequest, error) => {
  // Skip refresh for auth endpoints
  if (originalRequest.url?.includes('/auth/login') || 
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh')) {
    const message = formatAuthErrorMessage(error.response?.data?.message);
    toast.error(message || 'Invalid credentials');
    return;
  }
  
  // Try to refresh token
  if (!originalRequest._retry) {
    originalRequest._retry = true;
    
    try {
      await axiosInstance.post('/api/auth/refresh', {}, {
        withCredentials: true,
        headers: { 'X-Silent-Refresh': 'true' }
      });
      
      // Retry original request
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      // Clear auth data and redirect
      localStorage.removeItem('userInfo');
      
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/signin') && 
          !window.location.pathname.includes('/signup')) {
        toast.error('Session expired. Please login again.');
        setTimeout(() => {
          window.location.href = '/signin';
        }, 1000);
      }
    }
  }
};

const handle403Error = (data) => {
  const message = data.message || 'Access denied. You do not have permission.';
  
  if (message.includes('CSRF')) {
    toast.error('Security token expired. Please reload the page.');
    setTimeout(() => window.location.reload(), 2000);
  } else {
    toast.error(message);
  }
};

const handle404Error = (request) => {
  const message = request.url?.includes('/auth/') 
    ? 'This feature is not available'
    : 'Resource not found';
  toast.error(message);
};

const handle409Error = (data) => {
  const message = data.message || 'Conflict occurred.';
  
  if (message.includes('already exists') || message.includes('already registered')) {
    toast.error('An account with this email already exists.');
  } else {
    toast.error(message);
  }
};

const handle423Error = (data) => {
  let message = 'Your account has been temporarily locked.';
  
  if (data.message) {
    if (data.message.includes('locked')) {
      const match = data.message.match(/(\d+)/);
      const minutes = match ? match[1] : 'a few';
      message = `Account locked. Try again in ${minutes} minutes.`;
    }
  }
  
  toast.error(message);
};

const handle429Error = (data) => {
  const retryAfter = data.retryAfter || 60;
  const minutes = Math.ceil(retryAfter / 60);
  toast.error(`Too many attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
};

const handle500Error = () => {
  toast.error('Server error. Please try again later.');
};

const handleGenericError = (error) => {
  const message = error.response?.data?.message || 'Something went wrong.';
  toast.error(message);
};

// Format auth error messages for users
const formatAuthErrorMessage = (message) => {
  if (!message) return 'Invalid credentials';
  
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('invalid') || lowerMessage.includes('incorrect')) {
    return 'Invalid email or password';
  }
  
  if (lowerMessage.includes('not verified')) {
    return 'Please verify your email first';
  }
  
  if (lowerMessage.includes('suspended') || lowerMessage.includes('banned')) {
    return 'Account suspended. Please contact support.';
  }
  
  if (lowerMessage.includes('inactive')) {
    return 'Account is not active';
  }
  
  return message.charAt(0).toUpperCase() + message.slice(1);
};

// Validation utilities (enhanced)
export const validatePassword = (password) => {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password must be a string' };
  }
  
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  
  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain an uppercase letter' };
  }
  
  if (!hasLowerCase) {
    return { valid: false, message: 'Password must contain a lowercase letter' };
  }
  
  if (!hasNumbers) {
    return { valid: false, message: 'Password must contain a number' };
  }
  
  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain a special character (@$!%*?&)' };
  }
  
  return { valid: true, message: 'Password is strong' };
};

export const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validatePhoneNumber = (phone) => {
  if (!phone) return true;
  const phoneRegex = /^[\+]?[1-9]{1,4}[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone.trim());
};

export const validateName = (name) => {
  if (!name || name.trim().length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters' };
  }
  if (name.trim().length > 50) {
    return { valid: false, message: 'Name cannot exceed 50 characters' };
  }
  return { valid: true, message: 'Name is valid' };
};

// Main auth API functions
export const authAPI = {
  // Authentication
  login: async (userData) => {
    const response = await axiosInstance.post('/api/auth/login', userData);
    return response.data;
  },
  
  register: async (userData) => {
    const response = await axiosInstance.post('/api/auth/register', userData);
    return response.data;
  },
  
  logout: async () => {
    try {
      await axiosInstance.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('userInfo');
    }
  },
  
  // Session management
  refreshSession: async () => {
    const response = await axiosInstance.post('/api/auth/refresh');
    return response.data;
  },
  
  checkSessionStatus: async () => {
    const response = await axiosInstance.get('/api/auth/session/status');
    return response.data;
  },
  
  // Profile management
  getProfile: async () => {
    const response = await axiosInstance.get('/api/auth/profile');
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  updateProfile: async (userData) => {
    // Clean empty fields
    const cleanData = Object.fromEntries(
      Object.entries(userData).filter(([_, v]) => 
        v !== undefined && v !== null && v !== ''
      )
    );
    
    const response = await axiosInstance.put('/api/auth/profile', cleanData);
    
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },
  
  changePassword: async (currentPassword, newPassword) => {
    const response = await axiosInstance.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },
  
  // Email verification
  verifyEmail: async (token) => {
    const response = await axiosInstance.get(`/api/auth/verify-email/${token}`);
    return response.data;
  },
  
  resendVerification: async (email) => {
    const response = await axiosInstance.post('/api/auth/resend-verification', { email });
    return response.data;
  },
  
  checkVerificationStatus: async (email) => {
    const response = await axiosInstance.get(`/api/auth/check-verification?email=${email}`);
    return response.data;
  },
  
  // Password recovery
  forgotPassword: async (email) => {
    const response = await axiosInstance.post('/api/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (token, newPassword) => {
    const response = await axiosInstance.post('/api/auth/reset-password', {
      token,
      newPassword
    });
    return response.data;
  },
  
  // Account management
  deactivateAccount: async (password, reason = '') => {
    const response = await axiosInstance.post('/api/auth/deactivate', {
      password,
      reason
    });
    return response.data;
  },
  
  reactivateAccount: async (email, password) => {
    const response = await axiosInstance.post('/api/auth/reactivate', {
      email,
      password
    });
    
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },
  
  // Sessions management
  getActiveSessions: async () => {
    const response = await axiosInstance.get('/api/auth/sessions');
    return response.data;
  },
  
  terminateSession: async (sessionId) => {
    const response = await axiosInstance.delete(`/api/auth/sessions/${sessionId}`);
    return response.data;
  },
  
  terminateAllOtherSessions: async () => {
    const response = await axiosInstance.delete('/api/auth/sessions/others');
    return response.data;
  },
  
  // Public profiles
  getPublicProfile: async (userId) => {
    const response = await axiosInstance.get(`/api/auth/profile/${userId}/public`);
    return response.data;
  },
  
  // OAuth
  googleAuth: () => {
    const backendUrl = API_URL;
    window.location.href = `${backendUrl}/api/auth/google`;
  },
  
  // Check authentication
  checkAuth: async () => {
    try {
      const response = await axiosInstance.get('/api/auth/check-auth');
      return response.data;
    } catch (error) {
      return { 
        success: false, 
        isAuthenticated: false,
        message: 'Not authenticated'
      };
    }
  },
  
  // Utility functions
  isAuthenticated: () => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      return !!userInfo;
    } catch (error) {
      return false;
    }
  },
  
  getCurrentUser: () => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      return null;
    }
  },
  
  clearAuthData: () => {
    localStorage.removeItem('userInfo');
  },
  
  isEmailVerified: () => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (!userInfo) return false;
      const user = JSON.parse(userInfo);
      return user.emailVerified === true;
    } catch (error) {
      return false;
    }
  },
  
  isAdmin: () => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (!userInfo) return false;
      const user = JSON.parse(userInfo);
      return user.role === 'admin';
    } catch (error) {
      return false;
    }
  },
  
  // Security functions
  checkPasswordStrength: (password) => {
    const validation = validatePassword(password);
    if (!validation.valid) return { strength: 'weak', message: validation.message };
    
    // Calculate additional strength metrics
    const lengthScore = Math.min(password.length / 20, 1);
    const complexityScore = (/[A-Z]/.test(password) ? 0.25 : 0) +
                          (/[a-z]/.test(password) ? 0.25 : 0) +
                          (/\d/.test(password) ? 0.25 : 0) +
                          (/[@$!%*?&]/.test(password) ? 0.25 : 0);
    
    const totalScore = (lengthScore * 0.4) + (complexityScore * 0.6);
    
    if (totalScore > 0.7) return { strength: 'strong', message: 'Strong password' };
    if (totalScore > 0.4) return { strength: 'medium', message: 'Medium strength password' };
    return { strength: 'weak', message: 'Weak password' };
  },
  
  // Session helpers
  getSessionInfo: () => {
    const user = authAPI.getCurrentUser();
    return {
      userId: user?._id,
      email: user?.email,
      lastActivity: Date.now(),
      userAgent: navigator.userAgent
    };
  }
};

// User management API (for admin/advanced features)
export const userAPI = {
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('picture', file);
    
    const response = await axiosInstance.post('/api/users/upload-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },
  
  updateUserSettings: async (settings) => {
    const response = await axiosInstance.put('/api/users/settings', settings);
    
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },
  
  // Admin endpoints
  getAllUsers: async (params = {}) => {
    const response = await axiosInstance.get('/api/admin/users', { params });
    return response.data;
  },
  
  getUserById: async (userId) => {
    const response = await axiosInstance.get(`/api/admin/users/${userId}`);
    return response.data;
  },
  
  updateUserStatus: async (userId, status) => {
    const response = await axiosInstance.patch(`/api/admin/users/${userId}/status`, { status });
    return response.data;
  }
};

// Public API functions
export const publicAPI = {
  healthCheck: async () => {
    const response = await axiosInstance.get('/health');
    return response.data;
  },
  
  getStats: async () => {
    const response = await axiosInstance.get('/api/public/stats');
    return response.data;
  },
  
  searchServices: async (query = '', filters = {}) => {
    const response = await axiosInstance.get('/api/public/services/search', {
      params: { q: query, ...filters }
    });
    return response.data;
  }
};
