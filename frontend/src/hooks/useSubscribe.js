import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const subscribeApi = async (data) => {
  const response = await axios.post(`${API_URL}/api/subscribe-email/subscribe`, data);
  return response.data;
};

const getSubscriberStatusApi = async (email) => {
  const response = await axios.get(`${API_URL}/api/subscribe-email/status/${email}`);
  return response.data;
};

export const useSubscribe = () => {
  return useMutation({
    mutationFn: subscribeApi,
    onError: (error) => {
      console.error('Subscription error:', error);
    },
  });
};

export const useSubscriberStatus = (email) => {
  return useQuery({
    queryKey: ['subscription', email],
    queryFn: () => getSubscriberStatusApi(email),
    enabled: !!email && email.includes('@'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
const getUserSubscriptionsApi = async () => {
  const response = await axios.get(`${API_URL}/api/subscribe-email/user-subscriptions`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('userToken')}`
    }
  });
  return response.data;
};

const linkEmailApi = async (email) => {
  const response = await axios.post(`${API_URL}/api/subscribe-email/link-email`, 
    { email },
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
      }
    }
  );
  return response.data;
};

const checkEmailOwnershipApi = async (email) => {
  const response = await axios.get(`${API_URL}/api/subscribe-email/check-email/${email}`);
  return response.data;
};

// Add to your export
export const useUserSubscriptions = () => {
  return useQuery({
    queryKey: ['userSubscriptions'],
    queryFn: getUserSubscriptionsApi,
    enabled: !!localStorage.getItem('userToken'),
    retry: 2
  });
};

export const useLinkEmail = () => {
  return useMutation({
    mutationFn: linkEmailApi,
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to link email');
    }
  });
};

export const useCheckEmailOwnership = (email) => {
  return useQuery({
    queryKey: ['emailOwnership', email],
    queryFn: () => checkEmailOwnershipApi(email),
    enabled: !!email && email.includes('@'),
    staleTime: 5 * 60 * 1000,
  });
};