import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Create axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased timeout for better UX
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Add request ID for tracking
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for cookie-based auth
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Skip refresh for auth endpoints
      const isAuthEndpoint = originalRequest.url.includes('/api/auth/login') || 
                            originalRequest.url.includes('/api/auth/register');
      
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }
      
      try {
        // Try to refresh token via cookie
        await axiosInstance.post('/api/auth/refresh', {
          withCredentials: true
        });
        
        // Retry original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Clear client-side auth state
        if (typeof window !== 'undefined') {
          localStorage.removeItem('userInfo');
        }
        
        // Redirect to login
        if (!window.location.pathname.includes('/signin') && 
            !window.location.pathname.includes('/signup')) {
          window.location.href = '/signin';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle specific status codes
    if (error.response) {
      const { status, data } = error.response;
      
      // Rate limiting
      if (status === 429) {
        console.warn('Rate limited:', data.message);
      }
      
      // Account lock
      if (status === 423) {
        console.warn('Account locked:', data.message);
      }
      
      // CSRF token issues (for cookie-based auth)
      if (status === 403 && data.message?.includes('CSRF')) {
        // Handle CSRF token refresh if needed
        console.warn('CSRF token issue, reloading page');
        window.location.reload();
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
    
    if (response.data.user) {
      // Store only user info (no tokens)
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },
  
  register: async (userData) => {
    const response = await axiosInstance.post('/api/auth/register', userData);
    return response.data;
  },
  
  logout: async (deviceToken = null) => {
    try {
      await axiosInstance.post('/api/auth/logout', { deviceToken });
    } finally {
      // Clear only user info, cookies are cleared server-side
      localStorage.removeItem('userInfo');
    }
  },
  
  refreshToken: async () => {
    const response = await axiosInstance.post('/api/auth/refresh');
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
      console.log('Updating profile with data:', {
        fields: Object.keys(userData),
        hasPrivacySettings: 'privacySettings' in userData
      });
      
      // Clean the data
      const cleanData = {};
      Object.keys(userData).forEach(key => {
        const value = userData[key];
        
        if (value === undefined || value === null) return;
        
        if (typeof value === 'string' && value.trim() === '') {
          return; // Skip empty strings
        }
        
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleanData[key] = value;
          }
          return;
        }
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          const nestedClean = {};
          Object.keys(value).forEach(nestedKey => {
            const nestedValue = value[nestedKey];
            if (nestedValue !== undefined && nestedValue !== null) {
              nestedClean[nestedKey] = nestedValue;
            }
          });
          if (Object.keys(nestedClean).length > 0) {
            cleanData[key] = nestedClean;
          }
          return;
        }
        
        cleanData[key] = value;
      });
      
      console.log('Cleaned data for API:', cleanData);
      
      const response = await axiosInstance.put('/api/auth/profile', cleanData);
      
      console.log('Update response:', {
        success: response.data.success,
        message: response.data.message,
        hasUserData: !!response.data.user
      });
      
      return response.data;
    } catch (error) {
      console.error('Update profile error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message,
        errors: error.response?.data?.errors,
        data: error.response?.data
      });
      
      const errorMessage = error.response?.data?.message || 
                         error.response?.statusText || 
                         'Failed to update profile';
      
      throw new Error(errorMessage);
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
    return response.data;
  },
  
  // Check verification status
  checkVerificationStatus: async (email) => {
    const response = await axiosInstance.get(`/api/auth/check-verification?email=${email}`);
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
    
    // After password reset, store user info if provided
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
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
    
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
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
  
  // Check authentication status
  checkAuth: async () => {
    try {
      const response = await axiosInstance.get('/api/auth/check-auth');
      return response.data;
    } catch (error) {
      return { success: false, isAuthenticated: false };
    }
  },
  
  // Utility functions
  isAuthenticated: () => {
    // We'll check with the server instead of localStorage
    // This is just for client-side quick check
    return !!localStorage.getItem('userInfo');
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