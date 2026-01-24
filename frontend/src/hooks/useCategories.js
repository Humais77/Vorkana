// useCategories.js - Production-ready hooks with CSRF protection
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { categoriesAPI } from '../api/categories';
import { useCategoryStore } from '../store/useCategoryStore';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { useCSRF } from './useAuth';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

// Query keys
export const categoryKeys = {
  all: ['categories'],
  lists: () => [...categoryKeys.all, 'list'],
  list: (filters) => [...categoryKeys.lists(), filters],
  details: () => [...categoryKeys.all, 'detail'],
  detail: (id) => [...categoryKeys.details(), id],
  parents: () => [...categoryKeys.all, 'parents'],
  popular: () => [...categoryKeys.all, 'popular'],
  search: (query) => [...categoryKeys.all, 'search', query],
  stats: () => [...categoryKeys.all, 'stats'],
  bulk: () => [...categoryKeys.all, 'bulk'],
  export: (params) => [...categoryKeys.all, 'export', params],
};

// Helper to handle CSRF errors
const handleCSRFError = (error, retryAction = null) => {
  if (error.code === 'CSRF_TOKEN_INVALID' || error.requiresCSRFRefresh) {
    toast.error('Security session expired. Refreshing...');
    
    // Try to refresh CSRF token
    categoriesAPI.refreshCSRFToken().then(() => {
      toast.success('Security session refreshed. Please try again.');
      if (retryAction) retryAction();
    }).catch(() => {
      toast.error('Please refresh the page and try again.');
    });
    
    return true;
  }
  return false;
};

// Main categories query hooks
export const useCategories = (options = {}) => {
  const setCategories = useCategoryStore((state) => state.setCategories);
  const categories = useCategoryStore((state) => state.categories);
  const lastFetched = useCategoryStore((state) => state.lastFetched);
  
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const categories = await categoriesAPI.getAll({});
        return categories;
      } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    initialData: () => {
      if (categories.length > 0 && lastFetched) {
        const isStale = Date.now() - lastFetched > 5 * 60 * 1000;
        return isStale ? undefined : categories;
      }
      return undefined;
    },
    onSuccess: (data) => {
      if (data && Array.isArray(data)) {
        setCategories(data);
      }
    },
    ...options,
  });
};

/**
 * Hook to get a single category by ID
 */
export const useCategory = (id, options = {}) => {
  const { validate: validateCSRF } = useCSRF();
  
  return useQuery({
    queryKey: ['categories', id],
    queryFn: async () => {
      // For admin operations, validate CSRF
      if (options.requiresAdmin) {
        const hasValidCSRF = await validateCSRF();
        if (!hasValidCSRF) {
          throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
        }
      }
      
      return categoriesAPI.getById(id);
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 2;
    },
    ...options,
  });
};

/**
 * Hook to get parent categories specifically
 */
export const useParentCategories = (options = {}) => {
  const setCategories = useCategoryStore((state) => state.setCategories);
  
  return useQuery({
    queryKey: ['categories', 'parents'],
    queryFn: async () => {
      try {
        const parentCategories = await categoriesAPI.getParentCategories();
        return parentCategories;
      } catch (error) {
        console.error('Error in useParentCategories:', error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000,
    onSuccess: (data) => {
      if (data && Array.isArray(data)) {
        setCategories(data);
      }
    },
    ...options,
  });
};

/**
 * Hook to search categories
 */
export const useSearchCategories = (query, options = {}) => {
  const { validate: validateCSRF } = useCSRF();
  
  return useQuery({
    queryKey: ['categories', 'search', query],
    queryFn: async () => {
      // For admin operations, validate CSRF
      if (options.requiresAdmin) {
        const hasValidCSRF = await validateCSRF();
        if (!hasValidCSRF) {
          throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
        }
      }
      
      return categoriesAPI.search(query);
    },
    enabled: !!query && query.length > 1,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 2;
    },
    ...options,
  });
};

/**
 * Hook to get popular categories
 */
export const usePopularCategories = (options = {}) => {
  return useQuery({
    queryKey: ['categories', 'popular'],
    queryFn: async () => {
      try {
        const categories = await categoriesAPI.getAll({
          popular: true,
          isActive: true,
          limit: 20,
          includeServicesCount: true
        });
        return categories || [];
      } catch (error) {
        console.error('Error fetching popular categories:', error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

/**
 * Hook to get categories with statistics
 */
export const useCategoriesWithStats = (options = {}) => {
  const { validate: validateCSRF } = useCSRF();
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ['categories', 'stats'],
    queryFn: async () => {
      // Only admins can access stats
      if (!user || user.role !== 'admin') {
        throw { code: 'FORBIDDEN', message: 'Admin access required' };
      }
      
      // Validate CSRF for admin operations
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return categoriesAPI.withStats();
    },
    enabled: user?.role === 'admin',
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID' || error.code === 'FORBIDDEN') return false;
      return failureCount < 2;
    },
    ...options,
  });
};

/**
 * Hook for debounced category search
 */
export const useDebouncedSearchCategories = (query, delay = 300) => {
  const [debouncedQuery] = useDebounce(query, delay);
  
  return useQuery({
    queryKey: ['categories', 'search', debouncedQuery],
    queryFn: () => categoriesAPI.search(debouncedQuery),
    enabled: !!debouncedQuery && debouncedQuery.length > 1,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
};

// Mutation hooks with CSRF protection
export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: async (categoryData) => {
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        throw { code: 'FORBIDDEN', message: 'Admin access required' };
      }
      
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return categoriesAPI.create(categoryData);
    },
    onMutate: () => {
      toast.loading('Creating category...');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'parents'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'popular'] });
      
      toast.success(data.message || 'Category created successfully!');
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to create category';
      
      if (error.code === 'FORBIDDEN') {
        errorMessage = 'Admin access required to create categories';
      } else if (error.code === 'VALIDATION_ERROR') {
        errorMessage = 'Validation failed. Please check the form.';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to create categories';
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

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        throw { code: 'FORBIDDEN', message: 'Admin access required' };
      }
      
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return categoriesAPI.update(id, data);
    },
    onMutate: () => {
      toast.loading('Updating category...');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'parents'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'popular'] });
      
      toast.success(data.message || 'Category updated successfully!');
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to update category';
      
      if (error.code === 'FORBIDDEN') {
        errorMessage = 'Admin access required to update categories';
      } else if (error.code === 'CATEGORY_NOT_FOUND') {
        errorMessage = 'Category not found';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to update categories';
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

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: async (id) => {
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        throw { code: 'FORBIDDEN', message: 'Admin access required' };
      }
      
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return categoriesAPI.delete(id);
    },
    onMutate: () => {
      toast.loading('Deleting category...');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'parents'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'popular'] });
      
      toast.success(data.message || 'Category deleted successfully!');
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to delete category';
      
      if (error.code === 'FORBIDDEN') {
        errorMessage = 'Admin access required to delete categories';
      } else if (error.code === 'CATEGORY_NOT_FOUND') {
        errorMessage = 'Category not found';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to delete categories';
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

export const useRestoreCategory = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: async (id) => {
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        throw { code: 'FORBIDDEN', message: 'Admin access required' };
      }
      
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return categoriesAPI.restore(id);
    },
    onMutate: () => {
      toast.loading('Restoring category...');
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', variables] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'parents'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'popular'] });
      
      toast.success(data.message || 'Category restored successfully!');
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to restore category';
      
      if (error.code === 'FORBIDDEN') {
        errorMessage = 'Admin access required to restore categories';
      } else if (error.code === 'CATEGORY_NOT_FOUND') {
        errorMessage = 'Category not found';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to restore categories';
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

export const useBulkUpdateCategories = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: async (operations) => {
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        throw { code: 'FORBIDDEN', message: 'Admin access required' };
      }
      
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return categoriesAPI.bulkUpdate(operations);
    },
    onMutate: () => {
      toast.loading('Updating categories...');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'parents'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'popular'] });
      
      toast.success(data.message || 'Categories updated successfully!');
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to update categories';
      
      if (error.code === 'FORBIDDEN') {
        errorMessage = 'Admin access required for bulk operations';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to update categories';
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

export const useExportCategories = () => {
  const { validate: validateCSRF } = useCSRF();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: async (params) => {
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        throw { code: 'FORBIDDEN', message: 'Admin access required' };
      }
      
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return categoriesAPI.exportCategories(params);
    },
    onMutate: () => {
      toast.loading('Exporting categories...');
    },
    onSuccess: (data) => {
      if (data.format === 'csv') {
        toast.success('CSV export started. Check your downloads.');
      } else {
        toast.success('Categories exported successfully!');
      }
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to export categories';
      
      if (error.code === 'FORBIDDEN') {
        errorMessage = 'Admin access required to export categories';
      } else if (error.code === 'EXPORT_LIMIT_EXCEEDED') {
        errorMessage = 'Export limit exceeded. Please use filters to reduce the number of records.';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to export categories';
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

export const useRepairCategoryCounts = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: async () => {
      // Check if user is admin
      if (!user || user.role !== 'admin') {
        throw { code: 'FORBIDDEN', message: 'Admin access required' };
      }
      
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return categoriesAPI.repairCategoryCounts();
    },
    onMutate: () => {
      toast.loading('Repairing category counts...');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'stats'] });
      
      toast.success(data.message || 'Category counts repaired successfully!');
    },
    onError: (error) => {
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      let errorMessage = error.message || 'Failed to repair category counts';
      
      if (error.code === 'FORBIDDEN') {
        errorMessage = 'Admin access required to repair category counts';
      } else if (error.code === 'AUTH_REQUIRED') {
        errorMessage = 'Please sign in to repair category counts';
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

// CSRF protection wrapper for category operations
export const useCategoryCSRFProtection = () => {
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