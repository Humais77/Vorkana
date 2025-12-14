import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Request interceptor for auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token, logout user
          localStorage.removeItem('userToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userInfo');
          window.location.href = '/signin';
          return Promise.reject(error);
        }
        
        // Try to refresh token
        const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
          refreshToken
        });
        
        const { token, refreshToken: newRefreshToken } = response.data;
        
        // Store new tokens
        localStorage.setItem('userToken', token);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Update authorization header
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Retry original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('userToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');
        window.location.href = '/signin';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  // Login with new password requirements
  login: async (userData) => {
    const response = await axiosInstance.post('/api/auth/login', userData);
    if (response.data.token && response.data.refreshToken) {
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response.data;
  },
  
  // Register with new password requirements
  register: async (userData) => {
    const response = await axiosInstance.post('/api/auth/register', userData);
    if (response.data.token && response.data.refreshToken) {
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response.data;
  },
  
  // Logout with token blacklisting
  logout: async () => {
    try {
      await axiosInstance.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('userToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userInfo');
    }
  },
  
  // Get user profile
  getProfile: async () => {
    const response = await axiosInstance.get('/api/auth/profile');
    return response.data;
  },
  
  // Update profile
  updateProfile: async (userData) => {
    const response = await axiosInstance.put('/api/auth/profile', userData);
    return response.data;
  },
  
  // Change password with new requirements
  changePassword: async (currentPassword, newPassword) => {
    const response = await axiosInstance.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },
  
  // Forgot password
  forgotPassword: async (email) => {
    const response = await axiosInstance.post('/api/auth/forgot-password', { email });
    return response.data;
  },
  
  // Reset password
  resetPassword: async (token, newPassword) => {
    const response = await axiosInstance.post('/api/auth/reset-password', {
      token,
      newPassword
    });
    return response.data;
  },
  
  // Refresh token
  refreshToken: async (refreshToken) => {
    const response = await axiosInstance.post('/api/auth/refresh-token', { refreshToken });
    return response.data;
  },
  
  // Verify email
  verifyEmail: async (token) => {
    const response = await axiosInstance.get(`/api/auth/verify-email/${token}`);
    return response.data;
  },
  
  // Resend verification email
  resendVerification: async (email) => {
    const response = await axiosInstance.post('/api/auth/resend-verification', { email });
    return response.data;
  },
  
  // Google OAuth
  googleAuth: () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  }
};

// User API calls
export const userAPI = {
  // Switch user role
  switchRole: async (role) => {
    const response = await axiosInstance.post('/api/users/switch-role', { role });
    return response.data;
  },
  
  // Update user
  updateUser: async (userData) => {
    const response = await axiosInstance.put('/api/users/profile', userData);
    return response.data;
  },
  
  // Upload profile picture
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('picture', file);
    
    const response = await axiosInstance.post('/api/users/upload-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};