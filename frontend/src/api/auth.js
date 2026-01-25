// api/auth.js - Fix the missing functions and remove duplicates
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'; // Changed from 3000
const DEBUG = import.meta.env.VITE_DEBUG === 'true';
let csrfToken = localStorage.getItem('csrfToken') || null;
let csrfTokenExpiry = localStorage.getItem('csrfTokenExpiry') || 0;

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

axiosInstance.interceptors.request.use(
  async (config) => {
    const requestId = generateRequestId();
    config.headers['X-Request-ID'] = requestId;
    
    // SPECIAL HANDLING FOR LOGOUT: Don't try to refresh CSRF token
    const isLogoutRequest = config.url === '/api/auth/logout' && config.method === 'post';
    
    if (isLogoutRequest) {
      console.log('Logout request detected, using current CSRF token if available');
      // Just use whatever CSRF token we have, don't try to refresh
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
        if (config.data && typeof config.data === 'object') {
          config.data.csrfToken = csrfToken;
        }
      }
      return config;
    }
    
    // Add CSRF token for other non-GET requests
    if (config.method !== 'get' && config.method !== 'GET') {
      // Check if token is expired
      if (!csrfToken || Date.now() > parseInt(csrfTokenExpiry)) {
        try {
          await refreshCSRFToken();
        } catch (error) {
          console.warn('Failed to refresh CSRF token:', error.message);
        }
      }
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
        // Also add to body for form submissions
        if (config.data && typeof config.data === 'object' && !config.data.csrfToken) {
          config.data.csrfToken = csrfToken;
        }
      }
    }
    
    if (DEBUG) {
      console.log(`📤 Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Update response interceptor for logout
axiosInstance.interceptors.response.use(
  (response) => {
    // Update CSRF token from response
    if (response.data?.csrfToken) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
    }
    
    if (DEBUG) {
      console.log(`📥 Response: ${response.status} ${response.config.url}`);
    }
    
    return response;
  },
  async (error) => {
    const isLogoutRequest = error.config?.url === '/api/auth/logout' && error.config?.method === 'post';
    
    // SPECIAL HANDLING FOR LOGOUT 403: Clear everything and proceed
    if (isLogoutRequest && error.response?.status === 403) {
      console.log('Logout got 403, clearing auth data anyway');
      clearAuthData();
      // Return success response anyway to prevent lockout
      return Promise.resolve({
        data: {
          success: true,
          message: 'Logged out (security session cleared)',
          csrfCleared: true
        }
      });
    }
    
    // Handle CSRF errors for non-logout requests
    if (!isLogoutRequest && error.response?.status === 403 && 
        error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
      
      console.log('CSRF token invalid, refreshing...');
      
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
        // Clear auth and redirect to login
        clearAuthData();
        window.location.href = '/signin?csrf_error=true';
      }
    }
    
    return Promise.reject(error);
  }
);

// CSRF token functions
const setCSRFToken = (token, expiresAt) => {
  csrfToken = token;
  csrfTokenExpiry = expiresAt || Date.now() + 24 * 60 * 60 * 1000;
  
  localStorage.setItem('csrfToken', token);
  localStorage.setItem('csrfTokenExpiry', csrfTokenExpiry);
};

const refreshCSRFToken = async () => {
  try {
    console.log('Refreshing CSRF token...');
    const response = await axiosInstance.get('/api/csrf-token'); // Changed endpoint
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

const clearCSRFToken = () => {
  csrfToken = null;
  csrfTokenExpiry = 0;
  localStorage.removeItem('csrfToken');
  localStorage.removeItem('csrfTokenExpiry');
};

const clearAuthData = () => {
  localStorage.removeItem('userInfo');
  clearCSRFToken();
};

// Validation utilities (keep as is)
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
  login: async (userData) => {
  try {
    console.log('Starting login process...');
    
    // FIRST: Get CSRF token if not available
    if (!csrfToken || Date.now() > parseInt(csrfTokenExpiry)) {
      console.log('Getting CSRF token before login...');
      try {
        await refreshCSRFToken();
        console.log('CSRF token obtained for login');
      } catch (csrfError) {
        console.warn('Failed to get CSRF token before login:', csrfError.message);
      }
    }
    
    // Add CSRF token to login request if we have it
    const loginData = { ...userData };
    if (csrfToken) {
      loginData.csrfToken = csrfToken;
    }
    
    console.log('Sending login request with CSRF token:', !!csrfToken);
    const response = await axiosInstance.post('/api/auth/login', loginData);
    
    // Store CSRF token from response
    if (response.data.csrfToken) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      console.log('New CSRF token stored from login response');
    }
    
    // ENSURE USER DATA HAS ALL REQUIRED FIELDS
    if (response.data.success && response.data.user) {
      const user = response.data.user;
      
      // Add missing required fields with defaults
      const completeUser = {
        _id: user._id,
        name: user.name || 'User',
        email: user.email,
        role: user.role || 'user',
        picture: user.picture || null,
        emailVerified: Boolean(user.emailVerified),
        isOnline: Boolean(user.isOnline),
        lastSeenAt: user.lastSeenAt || new Date().toISOString(),
        accountType: user.accountType || 'basic',
        phoneNumber: user.phoneNumber || null,
        country: user.country || null,
        city: user.city || null,
        bio: user.bio || null,
        createdAt: user.createdAt || null,
        updatedAt: user.updatedAt || null
      };
      
      response.data.user = completeUser;
    }
    
    return response.data;
  } catch (error) {
    console.error('Login API error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, message: 'Login failed' };
  }
},
  
  register: async (userData) => {
    try {
      // Get CSRF token first
      if (!csrfToken) {
        await refreshCSRFToken();
      }
      
      const response = await axiosInstance.post('/api/auth/register', userData);
      if (response.data.csrfToken) {
        setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Registration failed' };
    }
  },
  logout: async () => {
  try {
    const response = await axiosInstance.post('/api/auth/logout');
    
    // Clear ALL local storage
    localStorage.removeItem('userInfo');
    localStorage.removeItem('csrfToken');
    localStorage.removeItem('csrfTokenExpiry');
    localStorage.removeItem('vorkanna_user_v1');
    localStorage.removeItem('vorkanna_auth_state_v1');
    localStorage.removeItem('vorkanna_csrf_v1');
    localStorage.removeItem('vorkanna_session_v1');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear all cookies on client side
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/admin;`;
      }
    });
    
    return response.data;
  } catch (error) {
    // Even if API fails, clear local storage
    localStorage.clear();
    sessionStorage.clear();
    
    return {
      success: true,
      message: 'Logged out (local session cleared)'
    };
  }
},
  
  // Session management - FIXED: Add checkSessionStatus
  refreshSession: async () => {
    try {
      const response = await axiosInstance.post('/api/auth/refresh');
      if (response.data.csrfToken) {
        setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Session refresh failed' };
    }
  },
  
  // ADD THIS FUNCTION: checkSessionStatus
  checkSessionStatus: async () => {
    try {
      const response = await axiosInstance.get('/api/auth/session/status');
      return response.data;
    } catch (error) {
      // If server returns an error, assume session is not valid
      return { 
        success: false, 
        authenticated: false,
        message: 'Session check failed',
        error: error.response?.data?.message || error.message
      };
    }
  },
  
  getProfile: async () => {
    try {
      const response = await axiosInstance.get('/api/auth/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to fetch profile' };
    }
  },
  
  updateProfile: async (userData) => {
    const cleanData = Object.fromEntries(
      Object.entries(userData).filter(([_, v]) => 
        v !== undefined && v !== null && v !== ''
      )
    );
    
    try {
      const response = await axiosInstance.put('/api/auth/profile', cleanData);
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
  
  // Password recovery - REMOVED DUPLICATES
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
      if (response.data.csrfToken) {
        setCSRFToken(response.data.csrfToken);
      }
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
      if (response.data.csrfToken) {
        setCSRFToken(response.data.csrfToken);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: 'Failed to reactivate account' };
    }
  },
  
  // CSRF token management - FIXED ENDPOINT
  getCSRFToken: async () => {
    try {
      console.log('Getting CSRF token...');
      const response = await axiosInstance.get('/api/csrf-token'); // Changed endpoint
      if (response.data.success) {
        setCSRFToken(response.data.csrfToken, response.data.expiresAt);
        console.log('CSRF token received');
      }
      return response.data;
    } catch (error) {
      console.error('Failed to get CSRF token:', error.response?.data || error.message);
      throw error.response?.data || { success: false, message: 'Failed to get CSRF token' };
    }
  },
  
  refreshCSRFToken: async () => {
    try {
      const response = await axiosInstance.post('/api/auth/csrf-token/refresh');
      if (response.data.success) {
        setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
      throw error.response?.data || { success: false, message: 'Failed to refresh CSRF token' };
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
  
 checkAuth: async () => {
  try {
    const response = await axiosInstance.get('/api/auth/check-auth');
    
    // ENSURE USER DATA HAS ALL REQUIRED FIELDS
    if (response.data.success && response.data.isAuthenticated && response.data.user) {
      const user = response.data.user;
      
      const completeUser = {
        _id: user._id,
        name: user.name || 'User',
        email: user.email,
        role: user.role || 'user',
        picture: user.picture || null,
        emailVerified: Boolean(user.emailVerified),
        isOnline: Boolean(user.isOnline),
        lastSeenAt: user.lastSeenAt || new Date().toISOString(),
        accountType: user.accountType || 'basic',
        phoneNumber: user.phoneNumber || null,
        country: user.country || null,
        city: user.city || null,
        bio: user.bio || null
      };
      
      response.data.user = completeUser;
    }
    
    return response.data;
  } catch (error) {
    return { 
      success: false, 
      isAuthenticated: false,
      message: 'Not authenticated'
    };
  }
},
  
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
  
  clearAuthData: clearAuthData,
  
  getCSRFTokenValue: () => csrfToken,
  
  hasValidCSRFToken: () => {
    return csrfToken && Date.now() < parseInt(csrfTokenExpiry);
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

// User management API (keep as is)
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