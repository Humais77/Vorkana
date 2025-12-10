// api/users.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Request interceptor for auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken') || 
                  localStorage.getItem('token') || 
                  sessionStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      error.response = {
        data: {
          success: false,
          message: 'Network error. Please check your connection.',
          code: 'NETWORK_ERROR'
        },
        status: 0
      };
    }
    
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'An unexpected error occurred';
    
    const formattedError = {
      ...error,
      message: errorMessage,
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 500,
      data: error.response?.data || null
    };
    
    return Promise.reject(formattedError);
  }
);

export const usersAPI = {
  // Switch user role
  switchRole: async (newRole) => {
    try {
      const response = await axiosInstance.patch('/api/users/switch-role', {
        role: newRole
      });
      
      return {
        success: true,
        user: response.user,
        message: response.message || 'Role switched successfully',
        ...response
      };
    } catch (error) {
      console.error('Error switching role:', error);
      throw error;
    }
  },
  
  // Get user profile
  getProfile: async () => {
    try {
      const response = await axiosInstance.get('/api/users/profile');
      return {
        success: true,
        user: response.user,
        ...response
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },
};