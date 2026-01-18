import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const subscribeApi = async (email) => {
  const response = await axios.post(`${API_URL}/api/subscribe-email/subscribe`, { email });
  return response.data;
};

const unsubscribeApi = async (email, unsubscribeToken = null) => {
  const response = await axios.post(`${API_URL}/api/subscribe-email/unsubscribe`, { 
    email,
    ...(unsubscribeToken && { unsubscribeToken })
  });
  return response.data;
};

const toggleApi = async (email) => {
  const response = await axios.post(`${API_URL}/api/subscribe-email/toggle`, { email });
  return response.data;
};

const getStatusApi = async (email) => {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email address');
  }
  const response = await axios.get(`${API_URL}/api/subscribe-email/status/${encodeURIComponent(email)}`);
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
    onError: (error) => {
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
    onError: (error) => {
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
    onError: (error) => {
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    onError: (error) => {
      // Don't show toast for status check errors
      console.error('Subscription status error:', error.message);
    },
  });
};