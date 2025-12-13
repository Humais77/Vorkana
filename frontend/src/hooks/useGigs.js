import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { gigsAPI } from '../api/gigs';
import { useGigStore } from '../store/useGigStore';
import { useAuthStore } from '../store/useAuthStore'; // Import auth store
import toast from 'react-hot-toast';

// Query keys
export const gigKeys = {
  all: ['gigs'],
  lists: () => [...gigKeys.all, 'list'],
  list: (filters) => [...gigKeys.lists(), filters],
  details: () => [...gigKeys.all, 'detail'],
  detail: (id) => [...gigKeys.details(), id],
  myGigs: () => [...gigKeys.all, 'my-gigs'],
  stats: () => [...gigKeys.all, 'stats'],
  popular: () => [...gigKeys.all, 'popular'],
  search: (params) => [...gigKeys.all, 'search', params],
};

// Helper function to extract gigs from response
export const extractGigsFromResponse = (response) => {
  if (!response) return [];
  
  if (Array.isArray(response)) {
    return response;
  }
  
  if (response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  if (response.gigs && Array.isArray(response.gigs)) {
    return response.gigs;
  }
  
  if (response.success && response.data && Array.isArray(response.data)) {
    return response.data;
  }
  
  return [];
};

// Get current user's gigs - FIXED
export const useMyGigs = (filters = {}) => {
  const { user } = useAuthStore(); // Get user from auth store
  
  return useQuery({
    queryKey: gigKeys.list({ ...filters, myGigs: true }),
    queryFn: async () => {
      try {
        if (!user?._id) {
          throw new Error('User not authenticated');
        }
        
        // Call API to get user's gigs with actual user ID
        const response = await gigsAPI.getAll({
          ...filters,
          createdBy: user._id, // Use actual user ID instead of 'me'
          includeCategory: true,
          includeClient: true,
          populate: true,
        });
        
        return {
          success: true,
          gigs: extractGigsFromResponse(response),
          count: extractGigsFromResponse(response).length,
          ...response
        };
      } catch (error) {
        console.error('Error fetching my gigs:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !!user?._id, // Only enable query if user exists
  });
};

export const useGigs = (params = {}) => {
  // Extract only the parameters we need
  const {
    search,
    projectCategory,
    status = 'open',
    page = 1,
    limit = 12,
    sort = 'createdAt',
    order = 'desc',
    ...restParams
  } = params;

  return useQuery({
    queryKey: ['gigs', { 
      search, 
      projectCategory, 
      status, 
      page, 
      limit,
      sort,
      order 
    }],
    queryFn: async () => {
      // Build query parameters, excluding empty values
      const queryParams = {
        page,
        limit,
        sort,
        order,
        status,
        populate: true,
        includeCategory: true,
        includeClient: true,
        includeSeller: true,
        lean: true,
      };

      // Only add if they have non-empty values
      if (search && search.trim() !== '') {
        queryParams.search = search.trim();
      }
      
      if (projectCategory && projectCategory.trim() !== '') {
        queryParams.projectCategory = projectCategory.trim();
      }
      
      // Add any other valid parameters
      Object.keys(restParams).forEach(key => {
        const value = restParams[key];
        if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = value;
        }
      });

      console.log('Calling API with params:', queryParams);
      return gigsAPI.getAll(queryParams);
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });
};

// Get gigs with infinite scroll
export const useInfiniteGigs = (queryParams = {}) => {
  const { user } = useAuthStore();
  
  return useInfiniteQuery({
    queryKey: gigKeys.list({ ...queryParams, infinite: true }),
    queryFn: ({ pageParam = 1 }) => 
      gigsAPI.getAll({ 
        ...queryParams, 
        page: pageParam,
        // If query includes createdBy='me', replace with actual user ID
        createdBy: queryParams.createdBy === 'me' ? user?._id : queryParams.createdBy
      }),
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
    enabled: !(queryParams.createdBy === 'me' && !user?._id), // Only enable if user exists when requesting 'my' gigs
  });
};

// Get popular gigs
export const usePopularGigs = () => {
  return useQuery({
    queryKey: gigKeys.popular(),
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

// Get single gig
export const useGig = (id) => {
  const setGigDetails = useGigStore((state) => state.setGigDetails);
  
  return useQuery({
    queryKey: gigKeys.detail(id),
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

// Create gig
export const useCreateGig = () => {
  const queryClient = useQueryClient();
  const setLastCreatedGigId = useGigStore((state) => state.setLastCreatedGigId);
  
  return useMutation({
    mutationFn: gigsAPI.create,
    onMutate: async (newGig) => {
      await queryClient.cancelQueries({ queryKey: gigKeys.all });
      
      const previousGigs = queryClient.getQueryData(gigKeys.lists());
      
      if (previousGigs) {
        queryClient.setQueryData(gigKeys.lists(), (old) => ({
          ...old,
          data: old.data ? [newGig, ...old.data] : [newGig]
        }));
      }
      
      return { previousGigs };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.all });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      const gigId = data.data?._id || data.gig?._id;
      if (gigId) {
        setLastCreatedGigId(gigId);
      }
      
      // Log success details
      console.log('Gig created successfully:', {
        id: gigId,
        title: data.data?.title,
        category: data.data?.projectCategory,
        subcategory: data.data?.subcategory
      });
      
      toast.success(data.message || 'Gig created successfully!');
    },
    onError: (error, variables, context) => {
      console.error('Gig creation error:', error);
      
      // Log detailed error for debugging
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errors: error.errors
      });
      
      if (context?.previousGigs) {
        queryClient.setQueryData(gigKeys.lists(), context.previousGigs);
      }
      
      const errorMessage = error.data?.message || error.message || 'Failed to create gig';
      
      // Special handling for subcategory errors
      if (error.message?.includes('subcategory') || error.code === 'SUBCATEGORY_NOT_FOUND') {
        toast.error('Please select a valid subcategory or leave it empty');
      } else {
        toast.error(errorMessage);
      }
      
      if (error.data?.errors) {
        console.error('Validation errors:', error.data.errors);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: gigKeys.all });
    },
  });
};

// Update gig
export const useUpdateGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => gigsAPI.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: gigKeys.detail(variables.id) 
      });
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
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

// Delete single gig
export const useDeleteGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, options = {} }) => gigsAPI.delete(id, options),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gigKeys.popular() });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      if (variables.options?.permanent) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.id) });
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

// In useGigs.js, update useDeleteMultipleGigs:
export const useDeleteMultipleGigs = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids) => {
      const results = [];
      const errors = [];
      
      for (const id of ids) {
        try {
          // First try normal delete
          const result = await gigsAPI.delete(id);
          results.push({ id, success: true, result });
        } catch (error) {
          console.error(`Failed to delete gig ${id}:`, error);
          
          // If it's a validation error, try force delete
          if (error.message?.includes('validation failed') || error.code === 'DELETE_VALIDATION_ERROR') {
            try {
              const forceResult = await gigsAPI.delete(id, { force: true });
              results.push({ id, success: true, result: forceResult, forceDeleted: true });
            } catch (forceError) {
              errors.push({ id, error: forceError.message });
            }
          } else {
            errors.push({ id, error: error.message });
          }
        }
      }
      
      if (errors.length > 0) {
        throw new Error(`Failed to delete ${errors.length} gig(s). ${errors.map(e => `Gig ${e.id}: ${e.error}`).join(', ')}`);
      }
      
      return results;
    },
    onSuccess: (data, ids) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      queryClient.invalidateQueries({ queryKey: gigKeys.popular() });
      
      ids.forEach(id => {
        queryClient.removeQueries({ queryKey: gigKeys.detail(id) });
      });
      
      const forceDeletedCount = data.filter(d => d.forceDeleted).length;
      if (forceDeletedCount > 0) {
        toast.success(`${ids.length} gig(s) deleted (${forceDeletedCount} required force deletion)`);
      } else {
        toast.success(`${ids.length} gig(s) deleted successfully!`);
      }
    },
    onError: (error) => {
      console.error('Multiple gigs deletion error:', error);
      toast.error(error.message || 'Failed to delete gigs');
    },
  });
};

// Update gig status
export const useUpdateGigStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }) => {
      return gigsAPI.update(id, { status });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      toast.success(`Gig marked as ${variables.status}`);
    },
    onError: (error) => {
      console.error('Gig status update error:', error);
      toast.error(error.message || 'Failed to update gig status');
    },
  });
};

// Update multiple gigs status
export const useUpdateMultipleGigsStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, status }) => {
      // Update each gig individually
      const results = await Promise.all(
        ids.map(id => gigsAPI.update(id, { status }))
      );
      return results;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      // Invalidate each gig detail
      variables.ids.forEach(id => {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(id) });
      });
      
      toast.success(`${variables.ids.length} gig(s) marked as ${variables.status}`);
    },
    onError: (error) => {
      console.error('Multiple gigs status update error:', error);
      toast.error(error.message || 'Failed to update gigs status');
    },
  });
};

// Restore gig
export const useRestoreGig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => gigsAPI.restore(id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables) });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      toast.success(data.message || 'Gig restored successfully!');
    },
    onError: (error) => {
      console.error('Gig restoration error:', error);
      toast.error(error.data?.message || error.message || 'Failed to restore gig');
    },
  });
};

// In useGigs.js - update useGigStats function
// Update the useGigStats function in useGigs.js
export const useGigStats = () => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: gigKeys.stats(),
    queryFn: async () => {
      try {
        const response = await gigsAPI.getStats();
        return response;
      } catch (error) {
        console.warn('Stats endpoint not available, returning empty stats:', error.message);
        
        // Return empty stats structure
        return {
          success: false,
          data: {
            overview: [{
              totalGigs: 0,
              activeGigs: 0,
              totalOrders: 0,
              totalBudget: 0,
              avgBudget: 0,
              averageRating: 4.8
            }]
          },
          isFallback: true
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!user?._id,
    retry: 1,
    retryDelay: 1000
  });
};

// Search gigs
export const useSearchGigs = (searchParams = {}) => {
  return useQuery({
    queryKey: gigKeys.search(searchParams),
    queryFn: () => gigsAPI.search(searchParams),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: Boolean(searchParams.query?.trim()),
  });
};

// Submit proposal
export const useSubmitProposal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ gigId, proposalData }) => gigsAPI.submitProposal(gigId, proposalData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: gigKeys.detail(variables.gigId) 
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

// Export gigs
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

// Get similar gigs
export const useSimilarGigs = (gigId) => {
  return useQuery({
    queryKey: ['gigs', 'similar', gigId],
    queryFn: () => gigsAPI.getSimilar(gigId),
    enabled: !!gigId,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for optimistic updates when toggling gig selection
export const useToggleGigSelection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gigId, selected }) => {
      return { gigId, selected };
    },
    onMutate: async ({ gigId, selected }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: gigKeys.myGigs() });
      
      // Snapshot previous value
      const previousGigs = queryClient.getQueryData(gigKeys.myGigs());
      
      // Optimistically update to the new value
      queryClient.setQueryData(gigKeys.myGigs(), (old) => {
        if (!old) return old;
        
        const updatedGigs = extractGigsFromResponse(old).map(gig => 
          gig._id === gigId 
            ? { ...gig, _selected: selected }
            : gig
        );
        
        return {
          ...old,
          gigs: updatedGigs,
          data: updatedGigs
        };
      });
      
      return { previousGigs };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousGigs) {
        queryClient.setQueryData(gigKeys.myGigs(), context.previousGigs);
      }
      toast.error('Failed to update selection');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
    },
  });
};