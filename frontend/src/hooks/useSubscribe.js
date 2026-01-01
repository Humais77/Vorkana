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
  const response = await axios.get(`${API_URL}/api/subscribe-email/status/${email}`);
  return response.data;
};

export const useSubscribe = () => {
  return useMutation({
    mutationFn: subscribeApi,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to subscribe';
      toast.error(message);
    },
  });
};

export const useUnsubscribe = () => {
  return useMutation({
    mutationFn: unsubscribeApi,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to unsubscribe';
      toast.error(message);
    },
  });
};

export const useToggleSubscription = () => {
  return useMutation({
    mutationFn: toggleApi,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update subscription';
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
  });
};