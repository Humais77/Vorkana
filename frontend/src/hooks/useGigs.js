// useGigs.js - Production-ready hooks with CSRF protection
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { gigsAPI } from '../api/gigs';
import { useGigStore } from '../store/useGigStore';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { useCSRF } from './useAuth';

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
  bySubcategory: (subcategoryId, params) => [...gigKeys.all, 'subcategory', subcategoryId, params],
  images: (gigId) => [...gigKeys.detail(gigId), 'images'],
  thumbnail: (gigId) => [...gigKeys.detail(gigId), 'thumbnail'],
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

// Helper to handle CSRF errors
const handleCSRFError = (error, retryAction = null) => {
  if (error.code === 'CSRF_TOKEN_INVALID' || error.requiresCSRFRefresh) {
    toast.error('Security session expired. Refreshing...');
    
    // Try to refresh CSRF token
    gigsAPI.refreshCSRFToken().then(() => {
      toast.success('Security session refreshed. Please try again.');
      if (retryAction) retryAction();
    }).catch(() => {
      toast.error('Please refresh the page and try again.');
    });
    
    return true;
  }
  return false;
};

// Main gigs query hooks
export const useMyGigs = (filters = {}) => {
  const { user } = useAuthStore();
  const { validate: validateCSRF } = useCSRF();
  
  return useQuery({
    queryKey: ['myGigs', filters, user?._id],
    queryFn: async () => {
      if (!user?._id) {
        throw new Error('User not authenticated');
      }
      
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return gigsAPI.getAll({
        ...filters,
        createdBy: user._id,
        includeSubcategory: true,
      });
    },
    enabled: !!user?._id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 2;
    },
    onError: (error) => {
      if (!handleCSRFError(error)) {
        if (error.message !== 'User not authenticated') {
          if (error.code === 'SESSION_EXPIRED') {
            toast.error('Session expired. Please login again.');
          } else {
            toast.error('Failed to load your gigs');
          }
        }
      }
    }
  });
};

export const useGigs = (params = {}) => {
  return useQuery({
    queryKey: ['gigs', params],
    queryFn: () => gigsAPI.getAll({
      ...params,
      includeSubcategory: true,
    }),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    onError: (error) => {
      if (!handleCSRFError(error)) {
        if (error.code === 'SESSION_EXPIRED') {
          toast.error('Session expired. Please login again.');
        } else if (error.code !== 'SERVER_ERROR') {
          toast.error('Failed to load gigs');
        }
      }
    }
  });
};

export const useGigsBySubcategory = (subcategoryId, params = {}) => {
  return useQuery({
    queryKey: gigKeys.bySubcategory(subcategoryId, params),
    queryFn: () => gigsAPI.getBySubcategory(subcategoryId, params),
    enabled: !!subcategoryId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    onError: (error) => {
      if (!handleCSRFError(error)) {
        if (error.code === 'SESSION_EXPIRED') {
          toast.error('Session expired. Please login again.');
        } else {
          toast.error('Failed to load gigs for this subcategory');
        }
      }
    }
  });
};

export const useInfiniteGigs = (queryParams = {}) => {
  const { user } = useAuthStore();
  
  return useInfiniteQuery({
    queryKey: gigKeys.list({ ...queryParams, infinite: true }),
    queryFn: ({ pageParam = 1 }) => 
      gigsAPI.getAll({ 
        ...queryParams, 
        page: pageParam,
        includeSubcategory: true,
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
    enabled: !(queryParams.createdBy === 'me' && !user?._id),
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 2;
    },
  });
};

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
      includeSubcategory: true,
      includeClient: true
    }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useGig = (id) => {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: gigKeys.detail(id),
    queryFn: () => gigsAPI.getById(id),
    enabled: !!id && id !== 'undefined',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: () => {
      return queryClient.getQueryData(gigKeys.detail(id));
    },
    retry: (failureCount, error) => {
      if (error.code === 'GIG_NOT_FOUND') return false;
      return failureCount < 2;
    },
  });
};

// Mutation hooks with CSRF protection
export const useCreateGig = () => {
  const queryClient = useQueryClient();
  const setLastCreatedGigId = useGigStore((state) => state.setLastCreatedGigId);
  const { validate: validateCSRF, refetch: refreshCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async (gigData) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      // Validate subcategory is required
      if (!gigData.subcategory && !(gigData instanceof FormData)) {
        throw {
          message: 'Subcategory is required',
          code: 'SUBCATEGORY_REQUIRED',
          status: 400
        };
      }
      
      // If FormData, check for subcategory
      if (gigData instanceof FormData) {
        const subcategory = gigData.get('subcategory');
        if (!subcategory) {
          throw {
            message: 'Subcategory is required',
            code: 'SUBCATEGORY_REQUIRED',
            status: 400
          };
        }
      }
      
      return gigsAPI.create(gigData);
    },
    onMutate: () => {
      toast.loading('Creating gig...');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['myGigs'] });
      
      const gigId = data.data?._id || data.gig?._id;
      if (gigId) {
        setLastCreatedGigId(gigId);
      }
      
      toast.success(data.message || 'Gig created successfully!');
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to create gig';
      
      if (error.code === 'SUBCATEGORY_REQUIRED') {
        errorMessage = 'Please select a subcategory';
      } else if (error.code === 'CATEGORY_NOT_FOUND') {
        errorMessage = 'Please select a valid category';
      } else if (error.code === 'SUBCATEGORY_NOT_FOUND') {
        errorMessage = 'Please select a valid subcategory';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to create a gig';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useUpdateGig = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return gigsAPI.update(id, data);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: gigKeys.detail(id) });
      
      const previousGig = queryClient.getQueryData(gigKeys.detail(id));
      
      return { previousGig };
    },
    onSuccess: (response, variables) => {
      const updatedGig = response.data || response;
      
      // Update cache
      queryClient.setQueryData(gigKeys.detail(variables.id), {
        success: true,
        data: updatedGig,
        gig: updatedGig,
        message: response.message
      });
      
      // Update lists
      queryClient.setQueriesData(
        { queryKey: gigKeys.lists() },
        (old) => {
          if (!old) return old;
          
          if (old.data && Array.isArray(old.data)) {
            return {
              ...old,
              data: old.data.map(gig => 
                gig._id === variables.id ? { ...gig, ...updatedGig } : gig
              )
            };
          }
          
          if (old.gigs && Array.isArray(old.gigs)) {
            return {
              ...old,
              gigs: old.gigs.map(gig => 
                gig._id === variables.id ? { ...gig, ...updatedGig } : gig
              )
            };
          }
          
          return old;
        }
      );
      
      // Invalidate queries
      queryClient.invalidateQueries({ 
        queryKey: gigKeys.detail(variables.id),
        refetchType: 'none'
      });
      
      queryClient.invalidateQueries({ 
        queryKey: gigKeys.lists(),
        refetchType: 'none'
      });
      
      queryClient.invalidateQueries({ 
        queryKey: gigKeys.myGigs(),
        refetchType: 'none'
      });
      
      toast.success(response.message || 'Gig updated successfully!');
    },
    onError: (err, variables, context) => {
      if (handleCSRFError(err, () => {})) {
        return;
      }
      
      // Rollback on error
      if (context?.previousGig) {
        queryClient.setQueryData(gigKeys.detail(variables.id), context.previousGig);
      }
      
      if (err.code === 'VERSION_CONFLICT') {
        queryClient.invalidateQueries({ 
          queryKey: gigKeys.detail(variables.id) 
        });
        toast.error('This gig was modified by another user. Please refresh and try again.');
      } else {
        toast.error(err.message || 'Failed to update gig');
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: gigKeys.detail(variables.id) 
      });
    }
  });
};

export const useDeleteGig = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ id, options = {} }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return gigsAPI.delete(id, options);
    },
    onMutate: () => {
      toast.loading('Deleting gig...');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gigKeys.popular() });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      if (variables.options?.permanent) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.id) });
        queryClient.removeQueries({ queryKey: gigKeys.detail(variables.id) });
      }
      
      toast.success(data.message || 'Gig deleted successfully!');
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to delete gig';
      
      if (error.code === 'GIG_IN_PROGRESS') {
        errorMessage = 'Cannot delete gig that is in progress. Use force delete if necessary.';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to delete this gig';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useDeleteMultipleGigs = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async (ids) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      console.log('Deleting gigs with IDs:', ids);
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw new Error('No gig IDs provided for deletion');
      }
      
      const results = [];
      const errors = [];
      
      for (const id of ids) {
        try {
          console.log(`Deleting gig ${id}...`);
          
          const result = await gigsAPI.delete(id);
          console.log(`Gig ${id} deleted successfully:`, result);
          
          results.push({ id, success: true, result });
        } catch (error) {
          console.error(`Failed to delete gig ${id}:`, error);
          
          if (error.message?.includes('validation failed') || error.code === 'DELETE_VALIDATION_ERROR') {
            try {
              console.log(`Trying force delete for gig ${id}...`);
              const forceResult = await gigsAPI.delete(id, { force: true });
              results.push({ id, success: true, result: forceResult, forceDeleted: true });
            } catch (forceError) {
              errors.push({ id, error: forceError.message });
            }
          } else if (error.response?.status === 404) {
            console.log(`Gig ${id} not found, skipping...`);
            continue;
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
    onMutate: () => {
      toast.loading('Deleting gigs...');
    },
    onSuccess: (data, ids) => {
      console.log('Gig deletion successful, invalidating queries...');
      
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
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      console.error('Gig deletion mutation error:', error);
      toast.error(error.message || 'Failed to delete gigs');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useUpdateGigStatus = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ id, status }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return gigsAPI.update(id, { status });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      toast.success(`Gig marked as ${variables.status}`);
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to update gig status';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to update gig status';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
  });
};

export const useUpdateMultipleGigsStatus = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ ids, status }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      const validStatuses = ['active', 'paused', 'closed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }
      
      if (status === 'active') {
        const gigs = await Promise.all(
          ids.map(id => gigsAPI.getById(id).catch(() => null))
        );
        
        const alreadyActive = gigs.filter(g => g?.status === 'active');
        if (alreadyActive.length > 0) {
          toast.error(`${alreadyActive.length} gig(s) are already active`);
          ids = ids.filter((id, index) => gigs[index]?.status !== 'active');
          if (ids.length === 0) {
            throw new Error('No gigs need status update');
          }
        }
      }
      
      const results = await Promise.all(
        ids.map(id => gigsAPI.update(id, { status }))
      );
      return results;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      
      toast.success(`Updated ${variables.ids.length} gig(s) to ${variables.status}`);
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      if (!error.message.includes('already active')) {
        toast.error(error.message || 'Failed to update gigs');
      }
    },
  });
};

export const useRestoreGig = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async (id) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return gigsAPI.restore(id);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gigKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables) });
      queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
      
      toast.success(data.message || 'Gig restored successfully!');
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to restore gig';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to restore gig';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
  });
};

export const useGigStats = () => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: gigKeys.stats(),
    queryFn: async () => {
      try {
        const response = await gigsAPI.getStats();
        return response;
      } catch (error) {
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
    retryDelay: 1000,
    onError: (error) => {
      if (!handleCSRFError(error)) {
        if (error.code === 'SESSION_EXPIRED') {
          toast.error('Session expired. Please login again.');
        }
      }
    }
  });
};

export const useSearchGigs = (searchParams = {}) => {
  return useQuery({
    queryKey: gigKeys.search(searchParams),
    queryFn: () => gigsAPI.search(searchParams),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: Boolean(searchParams.query?.trim()),
    onError: (error) => {
      if (!handleCSRFError(error)) {
        if (error.code === 'SESSION_EXPIRED') {
          toast.error('Session expired. Please login again.');
        }
      }
    }
  });
};

export const useExportGigs = () => {
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async (params) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return gigsAPI.exportGigs(params);
    },
    onMutate: () => {
      toast.loading('Exporting gigs...');
    },
    onSuccess: (data) => {
      if (data.format === 'csv') {
        toast.success('CSV export started. Check your downloads.');
      } else {
        toast.success('Gigs exported successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to export gigs';
      
      if (error.code === 'EXPORT_LIMIT_EXCEEDED') {
        errorMessage = 'Export limit exceeded. Please use filters to reduce the number of records.';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to export gigs';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

// Image management hooks
export const useUploadGigImages = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ gigId, files }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return gigsAPI.uploadImages(gigId, files);
    },
    onMutate: () => {
      toast.loading('Uploading images...');
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.gigId) });
        queryClient.invalidateQueries({ queryKey: gigKeys.images(variables.gigId) });
        toast.success(data.message || 'Images uploaded successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to upload images';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to upload images';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useRemoveGigImage = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ gigId, publicId }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return gigsAPI.removeImage(gigId, publicId);
    },
    onMutate: () => {
      toast.loading('Removing image...');
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.gigId) });
        queryClient.invalidateQueries({ queryKey: gigKeys.images(variables.gigId) });
        toast.success(data.message || 'Image removed successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to remove image';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to remove images';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useSetGigThumbnail = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ gigId, publicId }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return gigsAPI.setThumbnail(gigId, publicId);
    },
    onMutate: () => {
      toast.loading('Setting thumbnail...');
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.gigId) });
        queryClient.invalidateQueries({ queryKey: gigKeys.thumbnail(variables.gigId) });
        toast.success(data.message || 'Thumbnail updated successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to set thumbnail';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to update thumbnail';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useUploadGigThumbnail = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ gigId, file }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return gigsAPI.uploadThumbnail(gigId, file);
    },
    onMutate: () => {
      toast.loading('Uploading thumbnail...');
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(variables.gigId) });
        queryClient.invalidateQueries({ queryKey: gigKeys.thumbnail(variables.gigId) });
        toast.success(data.message || 'Thumbnail uploaded successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to upload thumbnail';
      
      if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to upload thumbnail';
      } else if (error.code === 'SESSION_EXPIRED') {
        errorMessage = 'Session expired. Please login again.';
      }
      
      toast.error(errorMessage);
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

export const useToggleGigSelection = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gigId, selected }) => {
      return { gigId, selected };
    },
    onMutate: async ({ gigId, selected }) => {
      await queryClient.cancelQueries({ queryKey: gigKeys.myGigs() });
      
      const previousGigs = queryClient.getQueryData(gigKeys.myGigs());
      
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

export const useInfiniteGigsBySubcategory = (subcategoryId, params = {}) => {
  return useInfiniteQuery({
    queryKey: gigKeys.bySubcategory(subcategoryId, params),
    queryFn: ({ pageParam = 1 }) => 
      gigsAPI.getBySubcategory(subcategoryId, { ...params, page: pageParam }),
    enabled: !!subcategoryId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (pagination?.hasNext) {
        return pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 2;
    },
  });
};

// CSRF protection wrapper for gig operations
export const useGigCSRFProtection = () => {
  const { token, isLoading, isError, error, refetch, refresh, validate, hasToken } = useCSRF();
  
  const ensureCSRF = async (operation) => {
    const hasValidCSRF = await validate();
    if (!hasValidCSRF) {
      throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
    }
    return operation();
  };
  
  return {
    token,
    isLoading,
    isError,
    error,
    refetch,
    refresh,
    validate,
    hasToken,
    ensureCSRF
  };
};