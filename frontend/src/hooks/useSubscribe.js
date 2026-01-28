import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Use the same axios instance from gigs.js if available
// or create a shared instance
import { axiosInstance } from '../api/gigs';

// Use gigs axios instance if available, otherwise create a new one
const api = axiosInstance || axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true,
});

// CSRF token management (shared with gigs)
let csrfToken = localStorage.getItem('csrfToken') || null;
let csrfTokenExpiry = localStorage.getItem('csrfTokenExpiry') || 0;

const setCSRFToken = (token, expiresAt) => {
  csrfToken = token;
  csrfTokenExpiry = expiresAt || Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem('csrfToken', token);
  localStorage.setItem('csrfTokenExpiry', csrfTokenExpiry);
};

const refreshCSRFToken = async () => {
  try {
    const response = await api.get('/api/csrf/token');
    if (response.data.success) {
      setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      return csrfToken;
    }
    throw new Error('Failed to refresh CSRF token');
  } catch (error) {
    console.error('Failed to refresh CSRF token:', error.message);
    throw error;
  }
};

const subscribeApi = async (email) => {
  const data = { email };
  
  // Add CSRF token if available
  if (csrfToken && Date.now() < parseInt(csrfTokenExpiry)) {
    data.csrfToken = csrfToken;
  }
  
  const response = await api.post('/api/subscribe-email/subscribe', data);
  return response.data;
};

const unsubscribeApi = async (email, unsubscribeToken = null) => {
  const data = { email };
  
  if (unsubscribeToken) {
    data.unsubscribeToken = unsubscribeToken;
  }
  
  // Add CSRF token if available
  if (csrfToken && Date.now() < parseInt(csrfTokenExpiry)) {
    data.csrfToken = csrfToken;
  }
  
  const response = await api.post('/api/subscribe-email/unsubscribe', data);
  return response.data;
};

const toggleApi = async (email) => {
  const data = { email };
  
  // Add CSRF token if available
  if (csrfToken && Date.now() < parseInt(csrfTokenExpiry)) {
    data.csrfToken = csrfToken;
  }
  
  const response = await api.post('/api/subscribe-email/toggle', data);
  return response.data;
};

const getStatusApi = async (email) => {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }
  const response = await api.get(`/api/subscribe-email/status/${encodeURIComponent(email)}`);
  return response.data;
};

export const useSubscribe = () => {
  return useMutation({
    mutationFn: subscribeApi,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Successfully subscribed!');
      } else {
        toast.error(data.message || 'Subscription failed');
      }
    },
    onError: async (error) => {
      // Handle CSRF token errors
      if (error.response?.status === 403 && 
          error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        
        try {
          await refreshCSRFToken();
          // Retry the subscription
          toast.info('Please try subscribing again');
        } catch (refreshError) {
          console.error('CSRF refresh failed:', refreshError);
        }
      }
      
      const message = error.response?.data?.message || 'Failed to subscribe. Please try again.';
      toast.error(message);
    },
  });
};

export const useUnsubscribe = () => {
  return useMutation({
    mutationFn: unsubscribeApi,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message || 'Successfully unsubscribed!');
      } else {
        toast.error(data.message || 'Unsubscribe failed');
      }
    },
    onError: async (error) => {
      // Handle CSRF token errors
      if (error.response?.status === 403 && 
          error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        
        try {
          await refreshCSRFToken();
          // Retry the unsubscribe
          toast.info('Please try unsubscribing again');
        } catch (refreshError) {
          console.error('CSRF refresh failed:', refreshError);
        }
      }
      
      const message = error.response?.data?.message || 'Failed to unsubscribe. Please try again.';
      toast.error(message);
    },
  });
};

export const useToggleSubscription = () => {
  return useMutation({
    mutationFn: toggleApi,
    onSuccess: (data) => {
      if (data.success) {
        const message = data.data?.action === 'unsubscribed' 
          ? 'Successfully unsubscribed!' 
          : 'Successfully subscribed!';
        toast.success(data.message || message);
      } else {
        toast.error(data.message || 'Operation failed');
      }
    },
    onError: async (error) => {
      // Handle CSRF token errors
      if (error.response?.status === 403 && 
          error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        
        try {
          await refreshCSRFToken();
          // Retry the toggle
          toast.info('Please try again');
        } catch (refreshError) {
          console.error('CSRF refresh failed:', refreshError);
        }
      }
      
      const message = error.response?.data?.message || 'Failed to update subscription. Please try again.';
      toast.error(message);
    },
  });
};

export const useSubscriptionStatus = (email) => {
  return useQuery({
    queryKey: ['subscriptionStatus', email],
    queryFn: () => getStatusApi(email),
    enabled: !!email && email.includes('@'),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    onError: (error) => {
      console.error('Subscription status error:', error.message);
    },
  });
};

// Export CSRF functions for use in components
export const subscriptionAPI = {
  getCSRFToken: async () => {
    try {
      const response = await api.get('/api/csrf/token');
      if (response.data.success) {
        setCSRFToken(response.data.csrfToken, response.data.expiresAt);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to get CSRF token:', error);
      throw error;
    }
  },
  
  refreshCSRFToken,
  
  hasValidCSRFToken: () => {
    return csrfToken && Date.now() < parseInt(csrfTokenExpiry);
  }
};