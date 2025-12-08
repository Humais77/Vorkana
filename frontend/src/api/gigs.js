import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
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

export const gigsAPI = {
  getAll: async () => {
    const response = await axiosInstance.get('/api/gigs');
    return response.data.gigs || response.data;
  },
  
  getPopular: async () => {
    const response = await axiosInstance.get('/api/gigs/popular');
    return response.data.gigs || response.data;
  },
  
  getById: async (id) => {
    const response = await axiosInstance.get(`/api/gigs/${id}`);
    return response.data.gig || response.data;
  },
  
  create: async (gigData) => {
    const response = await axiosInstance.post('/api/gigs', gigData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.gig || response.data;
  },
};