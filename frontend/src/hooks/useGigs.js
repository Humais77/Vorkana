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
import toast from 'react-hot-toast';

export const useGigs = (queryParams = {}) => {
  return useQuery({
    queryKey: ['gigs', 'list', queryParams],
    queryFn: () => gigsAPI.getAll(queryParams),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
      const pagination = lastPage.pagination || lastPage.data?.pagination;
      if (pagination?.hasNext) {
        return pagination.page + 1;
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
    queryFn: () => gigsAPI.getAll({
      page: 1,
      limit: 8,
      sort: 'budget',
      order: 'desc',
      status: 'open',
      urgency: 'high',
      includeCategory: true,
      includeClient: true
    }),
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
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.status === 404) return false;
      return failureCount < 3;
    },
    onSuccess: (data) => {
      if (data?.gig || data?.data) {
        setGigDetails(data.gig || data.data);
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
      await queryClient.cancelQueries({ queryKey: ['gigs'] });
      
      const previousGigs = queryClient.getQueryData(['gigs', 'list']);
      
      if (previousGigs) {
        queryClient.setQueryData(['gigs', 'list'], (old) => ({
          ...old,
          data: old.data ? [newGig, ...old.data] : [newGig]
        }));
      }
      
      return { previousGigs };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['gigs', 'popular'] });
      
      const gigId = data.data?._id || data.gig?._id;
      if (gigId) {
        setLastCreatedGigId(gigId);
      }
      
      toast.success(data.message || 'Gig created successfully!');
    },
    onError: (error, variables, context) => {
      console.error('Gig creation error:', error);
      
      if (context?.previousGigs) {
        queryClient.setQueryData(['gigs', 'list'], context.previousGigs);
      }
      
      const errorMessage = error.data?.message || error.message || 'Failed to create gig';
      toast.error(errorMessage);
      
      if (error.data?.errors) {
        console.error('Validation errors:', error.data.errors);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });
};

export const useUpdateGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => gigsAPI.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['gigs', 'detail', variables.id] 
      });
      queryClient.invalidateQueries({ queryKey: ['gigs', 'list'] });
      
      toast.success(data.message || 'Gig updated successfully!');
    },
    onError: (error) => {
      console.error('Gig update error:', error);
      
      if (error.code === 'VERSION_CONFLICT') {
        toast.error('This gig was modified by another user. Please refresh and try again.');
      } else {
        toast.error(error.data?.message || error.message || 'Failed to update gig');
      }
    },
  });
};

export const useDeleteGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, options = {} }) => gigsAPI.delete(id, options),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gigs', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['gigs', 'popular'] });
      
      if (variables.options?.permanent) {
        queryClient.invalidateQueries({ queryKey: ['gigs', 'detail', variables.id] });
      }
      
      toast.success(data.message || 'Gig deleted successfully!');
    },
    onError: (error) => {
      console.error('Gig deletion error:', error);
      
      if (error.code === 'GIG_IN_PROGRESS') {
        toast.error('Cannot delete gig that is in progress. Use force delete if necessary.');
      } else {
        toast.error(error.data?.message || error.message || 'Failed to delete gig');
      }
    },
  });
};

export const useRestoreGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => gigsAPI.restore(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gigs', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['gigs', 'detail', variables] });
      
      toast.success(data.message || 'Gig restored successfully!');
    },
    onError: (error) => {
      console.error('Gig restoration error:', error);
      toast.error(error.data?.message || error.message || 'Failed to restore gig');
    },
  });
};

export const useGigStats = () => {
  return useQuery({
    queryKey: ['gigs', 'stats'],
    queryFn: gigsAPI.getStats,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: false,
  });
};

export const useSearchGigs = (searchParams = {}) => {
  return useQuery({
    queryKey: ['gigs', 'search', searchParams],
    queryFn: () => gigsAPI.search(searchParams),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: Boolean(searchParams.query?.trim()),
  });
};

export const useSubmitProposal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ gigId, proposalData }) => gigsAPI.submitProposal(gigId, proposalData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['gigs', 'detail', variables.gigId] 
      });
      
      toast.success(data.message || 'Proposal submitted successfully!');
    },
    onError: (error) => {
      console.error('Proposal submission error:', error);
      
      if (error.code === 'DUPLICATE_PROPOSAL') {
        toast.error('You have already submitted a proposal for this gig.');
      } else if (error.code === 'PRIVATE_GIG') {
        toast.error('This gig is private and not accepting proposals.');
      } else {
        toast.error(error.data?.message || error.message || 'Failed to submit proposal');
      }
    },
  });
};

export const useExportGigs = () => {
  return useMutation({
    mutationFn: (params) => gigsAPI.exportGigs(params),
    onSuccess: (data) => {
      if (data.format === 'csv') {
        toast.success('CSV export started. Check your downloads.');
      } else {
        toast.success('Gigs exported successfully!');
      }
    },
    onError: (error) => {
      console.error('Export error:', error);
      
      if (error.code === 'EXPORT_LIMIT_EXCEEDED') {
        toast.error('Export limit exceeded. Please use filters to reduce the number of records.');
      } else {
        toast.error(error.data?.message || error.message || 'Failed to export gigs');
      }
    },
  });
};