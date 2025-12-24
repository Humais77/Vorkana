// Create a separate file for QueryClient configuration, e.g., queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      cacheTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0,
    },
  },
});

// Add cache invalidation for user data
export const invalidateUserQueries = () => {
  queryClient.invalidateQueries(['userProfile']);
  queryClient.invalidateQueries(['myServices']);
  queryClient.invalidateQueries(['myGigs']);
};