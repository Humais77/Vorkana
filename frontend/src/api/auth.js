// api/auth.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const DEBUG = import.meta.env.VITE_DEBUG === 'true';

// Create axios instance with optimized configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Request ID generator
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Request interceptor for logging and adding request ID
axiosInstance.interceptors.request.use(
  (config) => {
    const requestId = generateRequestId();
    config.headers['X-Request-ID'] = requestId;
    
    if (DEBUG) {
      console.group(`📤 Request: ${config.method?.toUpperCase() || 'GET'} ${config.url}`);
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

// Response interceptor for handling errors
axiosInstance.interceptors.response.use(
  (response) => {
    if (DEBUG) {
      console.group(`📥 Response: ${response.config.method?.toUpperCase() || 'GET'} ${response.config.url}`);
      console.log('Status:', response.status);
      console.log('Data:', response.data);
      console.groupEnd();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle specific status codes
    if (error.response) {
      const { status, data } = error.response;
      
      if (DEBUG) {
        console.group(`❌ Error: ${originalRequest.method?.toUpperCase() || 'GET'} ${originalRequest.url}`);
        console.log('Status:', status);
        console.log('Data:', data);
        console.groupEnd();
      }
      
      // Check if it's a login/register endpoint - don't redirect for auth errors
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                            originalRequest.url?.includes('/auth/register');
      
      if (status === 401 && !isAuthEndpoint && !originalRequest._retry) {
        // Try to refresh token for expired sessions
        originalRequest._retry = true;
        
        try {
          await axiosInstance.post('/api/auth/refresh', {}, {
            withCredentials: true,
            headers: { 'X-Silent-Refresh': 'true' }
          });
          
          // Retry original request after refresh
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          // Clear auth data on refresh failure
          localStorage.removeItem('userInfo');
          
          // Only redirect if not already on auth pages
          if (!window.location.pathname.includes('/signin') && 
              !window.location.pathname.includes('/signup')) {
            setTimeout(() => {
              window.location.href = '/signin?session=expired';
            }, 1000);
          }
        }
      }
    } else if (error.request) {
      // Network error
      if (DEBUG) console.error('🌐 Network Error:', error.message);
    } else {
      // Request configuration error
      if (DEBUG) console.error('⚙️ Request Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Validation utilities
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
  const phoneRegex = /^[\+]?[1-9]{1,4}[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
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
    try {
      const response = await axiosInstance.post('/api/auth/login', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Login failed' };
    }
  },
  
  register: async (userData) => {
    try {
      const response = await axiosInstance.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Registration failed' };
    }
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
    try {
      const response = await axiosInstance.post('/api/auth/refresh');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Session refresh failed' };
    }
  },
  
  checkSessionStatus: async () => {
    try {
      const response = await axiosInstance.get('/api/auth/session/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Session check failed' };
    }
  },
  
  // Profile management
  getProfile: async () => {
    try {
      const response = await axiosInstance.get('/api/auth/profile');
      if (response.data.success && response.data.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch profile' };
    }
  },
  
  updateProfile: async (userData) => {
    // Clean empty fields
    const cleanData = Object.fromEntries(
      Object.entries(userData).filter(([_, v]) => 
        v !== undefined && v !== null && v !== ''
      )
    );
    
    try {
      const response = await axiosInstance.put('/api/auth/profile', cleanData);
      
      if (response.data.success && response.data.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update profile' };
    }
  },
  
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await axiosInstance.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to change password' };
    }
  },
  
  // Email verification
  verifyEmail: async (token) => {
    try {
      const response = await axiosInstance.get(`/api/auth/verify-email/${token}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Email verification failed' };
    }
  },
  
  resendVerification: async (email) => {
    try {
      const response = await axiosInstance.post('/api/auth/resend-verification', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to resend verification' };
    }
  },
  
  checkVerificationStatus: async (email) => {
    try {
      const response = await axiosInstance.get(`/api/auth/check-verification?email=${encodeURIComponent(email)}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to check verification status' };
    }
  },
  
  // Password recovery
  forgotPassword: async (email) => {
    try {
      const response = await axiosInstance.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to send reset email' };
    }
  },
  
  resetPassword: async (token, newPassword) => {
    try {
      const response = await axiosInstance.post('/api/auth/reset-password', {
        token,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to reset password' };
    }
  },
  
  // Account management
  deactivateAccount: async (password, reason = '') => {
    try {
      const response = await axiosInstance.post('/api/auth/deactivate', {
        password,
        reason
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to deactivate account' };
    }
  },
  
  reactivateAccount: async (email, password) => {
    try {
      const response = await axiosInstance.post('/api/auth/reactivate', {
        email,
        password
      });
      
      if (response.data.success && response.data.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to reactivate account' };
    }
  },
  
  // Sessions management
  getActiveSessions: async () => {
    try {
      const response = await axiosInstance.get('/api/auth/sessions');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch sessions' };
    }
  },
  
  terminateSession: async (sessionId) => {
    try {
      const response = await axiosInstance.delete(`/api/auth/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to terminate session' };
    }
  },
  
  terminateAllOtherSessions: async () => {
    try {
      const response = await axiosInstance.delete('/api/auth/sessions/others');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to terminate sessions' };
    }
  },
  
  // Public profiles
  getPublicProfile: async (userId) => {
    try {
      const response = await axiosInstance.get(`/api/auth/profile/${userId}/public`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch profile' };
    }
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

// User management API
export const userAPI = {
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('picture', file);
    
    try {
      const response = await axiosInstance.post('/api/users/upload-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success && response.data.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to upload picture' };
    }
  },
  
  updateUserSettings: async (settings) => {
    try {
      const response = await axiosInstance.put('/api/users/settings', settings);
      
      if (response.data.success && response.data.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update settings' };
    }
  },
  
  // Admin endpoints
  getAllUsers: async (params = {}) => {
    try {
      const response = await axiosInstance.get('/api/admin/users', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch users' };
    }
  },
  
  getUserById: async (userId) => {
    try {
      const response = await axiosInstance.get(`/api/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch user' };
    }
  },
  
  updateUserStatus: async (userId, status) => {
    try {
      const response = await axiosInstance.patch(`/api/admin/users/${userId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to update user status' };
    }
  }
};

// Public API functions
export const publicAPI = {
  healthCheck: async () => {
    try {
      const response = await axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Health check failed' };
    }
  },
  
  getStats: async () => {
    try {
      const response = await axiosInstance.get('/api/public/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch stats' };
    }
  },
  
  searchServices: async (query = '', filters = {}) => {
    try {
      const response = await axiosInstance.get('/api/public/services/search', {
        params: { q: query, ...filters }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Search failed' };
    }
  }
};