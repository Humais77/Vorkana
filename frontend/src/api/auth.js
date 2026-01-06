import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CRITICAL: This sends cookies with requests
});
axiosInstance.interceptors.request.use(
  (config) => {
    // Get CSRF token from cookie (non-httpOnly cookie)
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    // No longer need Authorization header for cookies
    // Remove any existing Authorization header to prevent conflicts
    delete config.headers.Authorization;
    
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper to get CSRF token from cookie
function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

// Response interceptor with improved error handling
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
        // Attempt to refresh token
        await axiosInstance.post('/api/auth/refresh-token');
        // Retry original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear local storage and redirect
        clearAuthData();
        
        // Only redirect if not already on auth pages
        if (window.location.pathname !== '/signin' && 
            window.location.pathname !== '/signup') {
          window.location.href = '/signin?session=expired';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle 403 - CSRF token issues
    if (error.response?.status === 403 && error.response.data?.message?.includes('CSRF')) {
      // Get new CSRF token
      try {
        const response = await axiosInstance.get('/api/auth/csrf-token');
        if (response.data.csrfToken) {
          // Retry with new CSRF token
          originalRequest.headers['X-CSRF-Token'] = response.data.csrfToken;
          return axiosInstance(originalRequest);
        }
      } catch (csrfError) {
        console.error('Failed to get new CSRF token:', csrfError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Utility to clear all auth data
function clearAuthData() {
  // Clear localStorage
  localStorage.removeItem('userInfo');
  localStorage.removeItem('userToken');
  localStorage.removeItem('refreshToken');
  
  // Clear sessionStorage
  sessionStorage.clear();
}

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
    
    // Store user info only, tokens are in cookies
    if (response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      
      // Store CSRF token for immediate use
      if (response.data.csrfToken) {
        localStorage.setItem('csrfToken', response.data.csrfToken);
      }
    }
    
    return response.data;
  },
  
  register: async (userData) => {
    const response = await axiosInstance.post('/api/auth/register', userData);
    
    // Store CSRF token from registration
    if (response.data.csrfToken) {
      localStorage.setItem('csrfToken', response.data.csrfToken);
    }
    
    return response.data;
  },
  
  logout: async (deviceToken = null) => {
    try {
      await axiosInstance.post('/api/auth/logout', { deviceToken });
    } finally {
      clearAuthData();
    }
  },
  
  refreshToken: async () => {
    // No need to pass refresh token - it's in cookies
    const response = await axiosInstance.post('/api/auth/refresh-token');
    
    if (response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    
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
    const response = await axiosInstance.put('/api/auth/profile', userData);
    
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
    
    // Update user info if returned
    if (response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },
  
  // Email verification
  verifyEmail: async (token) => {
    const response = await axiosInstance.get(`/api/auth/verify-email/${token}`);
    
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      
      // Store CSRF token
      if (response.data.csrfToken) {
        localStorage.setItem('csrfToken', response.data.csrfToken);
      }
    }
    
    return response.data;
  },
  
  // Check verification status
  checkVerificationStatus: async (email) => {
    const response = await axiosInstance.get(`/api/auth/check-verification?email=${encodeURIComponent(email)}`);
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
    
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      
      // Store CSRF token
      if (response.data.csrfToken) {
        localStorage.setItem('csrfToken', response.data.csrfToken);
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
    
    if (response.data.success && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
      
      // Store CSRF token
      if (response.data.csrfToken) {
        localStorage.setItem('csrfToken', response.data.csrfToken);
      }
    }
    
    return response.data;
  },
  
  // Session management
  getSessionStatus: async () => {
    const response = await axiosInstance.get('/api/auth/session');
    
    if (response.data.success && response.data.authenticated && response.data.user) {
      localStorage.setItem('userInfo', JSON.stringify(response.data.user));
    }
    
    return response.data;
  },
  
  // CSRF token
  getCsrfToken: async () => {
    const response = await axiosInstance.get('/api/auth/csrf-token');
    return response.data;
  },
  
  // Check auth status
  checkAuth: async () => {
    try {
      const response = await axiosInstance.get('/api/auth/session');
      return response.data;
    } catch (error) {
      return { success: false, authenticated: false };
    }
  },
  
  // Utility functions
  isAuthenticated: () => {
    // Check if we have user info and if cookies might be present
    const userInfo = localStorage.getItem('userInfo');
    return !!userInfo;
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
    clearAuthData();
  },
  
  // Get CSRF token from storage
  getStoredCsrfToken: () => {
    return localStorage.getItem('csrfToken');
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