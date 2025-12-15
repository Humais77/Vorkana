import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

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

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          localStorage.removeItem('userToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userInfo');
          window.location.href = '/signin';
          return Promise.reject(error);
        }
        
        const response = await axios.post(`${API_URL}/api/auth/refresh-token`, {
          refreshToken
        });
        
        const { token, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem('userToken', token);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        return axiosInstance(originalRequest);
      } catch (refreshError) {
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

export const authAPI = {
  login: async (userData) => {
    const response = await axiosInstance.post('/api/auth/login', userData);
    if (response.data.token && response.data.refreshToken) {
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response.data;
  },
  
  register: async (userData) => {
    const response = await axiosInstance.post('/api/auth/register', userData);
    if (response.data.token && response.data.refreshToken) {
      localStorage.setItem('userToken', response.data.token);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return response.data;
  },
  
  logout: async () => {
    try {
      await axiosInstance.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('userToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userInfo');
    }
  },
  
  getProfile: async () => {
    const response = await axiosInstance.get('/api/auth/profile');
    return response.data;
  },
  
  updateProfile: async (userData) => {
    const response = await axiosInstance.put('/api/auth/profile', userData);
    return response.data;
  },
  
  changePassword: async (currentPassword, newPassword) => {
    const response = await axiosInstance.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },
  
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
  
  refreshToken: async (refreshToken) => {
    const response = await axiosInstance.post('/api/auth/refresh-token', { refreshToken });
    return response.data;
  },
  
  verifyEmail: async (token) => {
    const response = await axiosInstance.get(`/api/auth/verify-email/${token}`);
    return response.data;
  },
  
  resendVerification: async (email) => {
    const response = await axiosInstance.post('/api/auth/resend-verification', { email });
    return response.data;
  },
  
  googleAuth: () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    window.location.href = `${backendUrl}/api/auth/google`;
  }
};

export const userAPI = {
  switchRole: async (role) => {
    const response = await axiosInstance.post('/api/users/switch-role', { role });
    return response.data;
  },
  
  updateUser: async (userData) => {
    const response = await axiosInstance.put('/api/users/profile', userData);
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
    return response.data;
  }
};