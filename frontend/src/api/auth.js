import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Create axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Increased timeout for better UX
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
    
    // Add request ID for tracking
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axiosInstance.post('/api/auth/refresh-token', {
          refreshToken
        });
        
        const { token, refreshToken: newRefreshToken } = response.data;
        
        // Store new tokens
        localStorage.setItem('userToken', token);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Update original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Clear all auth data and redirect to login
        localStorage.removeItem('userToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');
        
        // Only redirect if we're not already on auth pages
        if (!window.location.pathname.includes('/signin') && 
            !window.location.pathname.includes('/signup')) {
          window.location.href = '/signin';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle specific error cases
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle rate limiting
      if (status === 429) {
        console.warn('Rate limited:', data.message);
      }
      
      // Handle account lock
      if (status === 423) {
        console.warn('Account locked:', data.message);
      }
    }
    
    return Promise.reject(error);
  }
);

// Validation utilities
export const validatePassword = (password) => {
  if (typeof password !== 'string') return { valid: false, message: 'Password must be a string' };
  
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!hasLowerCase) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!hasNumbers) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
  }
  
  return { valid: true, message: 'Password is strong' };
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone) => {
  if (!phone) return true;
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/im;
  return phoneRegex.test(phone);
};

export const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    // Basic sanitization - in production use a proper sanitization library
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim();
  }
  return input;
};

// Main auth API functions
export const authAPI = {
  // Authentication
  login: async (userData) => {
    const response = await axiosInstance.post('/api/auth/login', userData);
    if (response.data.token && response.data.refreshToken) {
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      if (response.data.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },
  
  register: async (userData) => {
    const response = await axiosInstance.post('/api/auth/register', userData);
    if (response.data.token && response.data.refreshToken) {
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      if (response.data.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },
  
  logout: async (deviceToken = null) => {
    try {
      await axiosInstance.post('/api/auth/logout', { deviceToken });
    } finally {
      localStorage.removeItem('userToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userInfo');
    }
  },
  
  refreshToken: async (refreshToken) => {
    const response = await axiosInstance.post('/api/auth/refresh-token', { refreshToken });
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
    try {
      // Get token from localStorage directly as fallback
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('Update profile request with token:', token.substring(0, 20) + '...');
      
      const response = await axiosInstance.put('/api/auth/profile', userData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Update profile response:', response.data);
      
      if (response.data.success && response.data.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Update profile API error:', error.response || error.message);
      throw error;
    }
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
    if (response.data.success && response.data.token) {
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response.data;
  },
  
  resendVerification: async (email) => {
    const response = await axiosInstance.post('/api/auth/resend-verification', { email });
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
    if (response.data.success && response.data.token) {
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      if (response.data.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      }
    }
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
    if (response.data.success && response.data.token) {
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      if (response.data.user) {
        localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },
  
  // Public profiles
  getPublicProfile: async (userId) => {
    const response = await axiosInstance.get(`/api/auth/profile/${userId}/public`);
    return response.data;
  },
  
  // OAuth
  googleAuth: () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  },
  
  // Utility functions
  isAuthenticated: () => {
    return !!localStorage.getItem('userToken');
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
    localStorage.removeItem('userToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
  },
  
  // Check if email is verified
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
  
  // Check if user is admin
  isAdmin: () => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (!userInfo) return false;
      const user = JSON.parse(userInfo);
      return user.role === 'admin';
    } catch (error) {
      return false;
    }
  }
};

// User management API functions
export const userAPI = {
  switchRole: async (role) => {
    const response = await axiosInstance.patch('/api/users/switch-role', { role });
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
  updateUser: async (userData) => {
    const response = await axiosInstance.put('/api/users/profile', userData);
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  
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
  
  // Get user by ID (admin only)
  getUserById: async (userId) => {
    const response = await axiosInstance.get(`/api/users/${userId}`);
    return response.data;
  },
  
  // Search users (admin only)
  searchUsers: async (filters = {}) => {
    const response = await axiosInstance.get('/api/users', { params: filters });
    return response.data;
  }
};

// Public API functions (no authentication required)
export const publicAPI = {
  getPublicUserProfile: async (userId) => {
    const response = await axiosInstance.get(`/api/auth/profile/${userId}/public`);
    return response.data;
  },
  
  healthCheck: async () => {
    const response = await axiosInstance.get('/health');
    return response.data;
  }
};