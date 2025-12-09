// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { gigsAPI } from '../api/gigs';
// import { useGigStore } from '../store/useGigStore';

// export const useGigs = () => {
//   return useQuery({
//     queryKey: ['gigs'],
//     queryFn: gigsAPI.getAll,
//     staleTime: 2 * 60 * 1000, // 2 minutes
//   });
// };

// export const usePopularGigs = () => {
//   return useQuery({
//     queryKey: ['gigs', 'popular'],
//     queryFn: gigsAPI.getPopular,
//     staleTime: 2 * 60 * 1000,
//   });
// };

// export const useGig = (id) => {
//   const setGigDetails = useGigStore((state) => state.setGigDetails);
  
//   return useQuery({
//     queryKey: ['gigs', id],
//     queryFn: () => gigsAPI.getById(id),
//     enabled: !!id,
//     onSuccess: (data) => {
//       setGigDetails(data);
//     },
//   });
// };

// export const useCreateGig = () => {
//   const queryClient = useQueryClient();
//   const setLastCreatedGigId = useGigStore((state) => state.setLastCreatedGigId);
  
//   return useMutation({
//     mutationFn: gigsAPI.create,
//     onSuccess: (data) => {
//       // Invalidate and refetch gigs
//       queryClient.invalidateQueries({ queryKey: ['gigs'] });
//       queryClient.invalidateQueries({ queryKey: ['gigs', 'popular'] });
      
//       // Set last created gig ID
//       if (data._id) {
//         setLastCreatedGigId(data._id);
//       }
//     },
//     onError: (error) => {
//       console.error('Gig creation error:', error);
//     },
//   });
// };
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { gigsAPI } from '../api/gigs';
import { useGigStore } from '../store/useGigStore';

export const useGigs = (queryParams = {}) => {
  return useQuery({
    queryKey: ['gigs', queryParams],
    queryFn: () => gigsAPI.getAll(queryParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

export const useInfiniteGigs = (queryParams = {}) => {
  return useInfiniteQuery({
    queryKey: ['gigs', 'infinite', queryParams],
    queryFn: ({ pageParam = 1 }) => 
      gigsAPI.getAll({ ...queryParams, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination?.hasNext) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const usePopularGigs = () => {
  return useQuery({
    queryKey: ['gigs', 'popular'],
    queryFn: gigsAPI.getPopular,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useGig = (id) => {
  const setGigDetails = useGigStore((state) => state.setGigDetails);
  
  return useQuery({
    queryKey: ['gigs', 'detail', id],
    queryFn: () => gigsAPI.getById(id),
    enabled: !!id && id !== 'undefined',
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error.response?.status === 404) return false;
      return failureCount < 3;
    },
    onSuccess: (data) => {
      if (data?.gig) {
        setGigDetails(data.gig);
      }
    },
  });
};

export const useCreateGig = () => {
  const queryClient = useQueryClient();
  const setLastCreatedGigId = useGigStore((state) => state.setLastCreatedGigId);
  
  return useMutation({
    mutationFn: gigsAPI.create,
    onMutate: async (newGig) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['gigs'] });
      
      // Snapshot the previous value
      const previousGigs = queryClient.getQueryData(['gigs']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['gigs'], (old) => {
        if (!old) return { data: [newGig] };
        return {
          ...old,
          data: [newGig, ...old.data],
        };
      });
      
      return { previousGigs };
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['gigs', 'popular'] });
      
      // Set last created gig ID
      if (data?.gig?._id || data?._id) {
        const gigId = data.gig?._id || data._id;
        setLastCreatedGigId(gigId);
      }
      
      // Show success toast
      toast.success('Gig created successfully!');
    },
    onError: (error, variables, context) => {
      console.error('=== GIG CREATION ERROR DETAILS ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      
      // Rollback on error
      if (context?.previousGigs) {
        queryClient.setQueryData(['gigs'], context.previousGigs);
      }
      
      // Show error toast with more details
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to create gig';
      toast.error(errorMessage);
      
      // Log validation errors if any
      if (error.response?.data?.errors) {
        console.error('Validation errors:', error.response.data.errors);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });
};
export const useUpdateGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => gigsAPI.update(id, data),
    onSuccess: (data, variables) => {
      // Invalidate the specific gig and list
      queryClient.invalidateQueries({ 
        queryKey: ['gigs', 'detail', variables.id] 
      });
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      
      // Show success toast if available
      if (typeof window !== 'undefined' && window.toast?.success) {
        window.toast.success('Gig updated successfully!');
      }
    },
    onError: (error) => {
      if (typeof window !== 'undefined' && window.toast?.error) {
        window.toast.error(error.response?.data?.message || 'Failed to update gig');
      }
      console.error('Gig update error:', error);
    },
  });
};

export const useDeleteGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => gigsAPI.delete(id),
    onSuccess: (data, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['gigs', 'popular'] });
      
      // Show success toast if available
      if (typeof window !== 'undefined' && window.toast?.success) {
        window.toast.success('Gig deleted successfully!');
      }
    },
    onError: (error) => {
      if (typeof window !== 'undefined' && window.toast?.error) {
        window.toast.error(error.response?.data?.message || 'Failed to delete gig');
      }
      console.error('Gig deletion error:', error);
    },
  });
};

export const useGigStats = () => {
  return useQuery({
    queryKey: ['gigs', 'stats'],
    queryFn: gigsAPI.getStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useSearchGigs = (searchParams = {}) => {
  return useQuery({
    queryKey: ['gigs', 'search', searchParams],
    queryFn: () => gigsAPI.search(searchParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: Object.keys(searchParams).length > 0,
  });
};