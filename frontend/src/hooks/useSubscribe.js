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