// useSubcategories.js - Production-ready hooks with CSRF protection
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subcategoriesAPI } from '../api/subcategories';
import { useSubcategoryStore } from '../store/useSubcategoryStore';
import { useDebounce } from 'use-debounce';
import { useState, useCallback } from 'react';
import { useCSRF } from './useAuth';
import toast from 'react-hot-toast';

// Helper to handle CSRF errors
const handleCSRFError = (error, retryAction = null) => {
  if (error.code === 'CSRF_TOKEN_INVALID' || error.requiresCSRFRefresh) {
    toast.error('Security session expired. Refreshing...');
    
    // Try to refresh CSRF token
    subcategoriesAPI.refreshCSRFToken().then(() => {
      toast.success('Security session refreshed. Please try again.');
      if (retryAction) retryAction();
    }).catch(() => {
      toast.error('Please refresh the page and try again.');
    });
    
    return true;
  }
  return false;
};

export const useSubcategories = (params = {}, options = {}) => {
  const setSubcategories = useSubcategoryStore((state) => state.setSubcategories);
  const subcategories = useSubcategoryStore((state) => state.subcategories);
  const lastFetched = useSubcategoryStore((state) => state.lastFetched);
  
  return useQuery({
    queryKey: ['subcategories', params],
    queryFn: async () => {
      try {
        const data = await subcategoriesAPI.getAll(params);
        return data;
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 2;
    },
    initialData: () => {
      // Cache the check to avoid re-evaluating on every render
      if (subcategories.length > 0 && lastFetched) {
        const isStale = Date.now() - lastFetched > 5 * 60 * 1000;
        return isStale ? undefined : subcategories;
      }
      return undefined;
    },
    onSuccess: (data) => {
      if (data && Array.isArray(data)) {
        setSubcategories(data);
      }
    },
    ...options,
  });
};

/**
 * Hook to get subcategories by category ID
 */
export const useSubcategoriesByCategory = (categoryId, options = {}) => {
  const { validate: validateCSRF } = useCSRF();
  
  // Extract the actual ID from different possible formats
  const getValidCategoryId = useCallback(() => {
    if (!categoryId) return null;
    
    // If it's an object with _id property
    if (typeof categoryId === 'object' && categoryId !== null) {
      return categoryId._id || null;
    }
    
    // If it's already a string
    if (typeof categoryId === 'string') {
      return categoryId.trim();
    }
    
    // If it's a number or other type, convert to string
    return String(categoryId);
  }, [categoryId]);

  const validCategoryId = getValidCategoryId();
  
  return useQuery({
    queryKey: ['subcategories', 'category', validCategoryId],
    queryFn: async () => {
      try {
        // Validate CSRF token for authenticated requests
        const hasValidCSRF = await validateCSRF();
        if (!hasValidCSRF) {
          throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
        }
        
        // Use the extracted valid category ID
        if (!validCategoryId || validCategoryId.trim() === '') {
          return {
            success: false,
            subcategories: [],
            category: null,
            count: 0,
            error: 'No valid category ID provided'
          };
        }

        const result = await subcategoriesAPI.getByCategory(validCategoryId);
        
        // Ensure consistent response structure
        return {
          success: result.success || true,
          subcategories: Array.isArray(result.subcategories) ? result.subcategories : [],
          category: result.category || null,
          count: result.count || 0,
          error: result.error || null
        };
      } catch (error) {
        console.error('Error fetching subcategories by category:', error);
        
        if (!handleCSRFError(error)) {
          return {
            success: false,
            subcategories: [],
            category: null,
            count: 0,
            error: error.message
          };
        }
        
        return {
          success: false,
          subcategories: [],
          category: null,
          count: 0,
          error: 'Security validation failed'
        };
      }
    },
    enabled: !!validCategoryId && validCategoryId.trim() !== '',
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 2;
    },
    ...options,
  });
};

/**
 * Hook to get a single subcategory by ID
 */
export const useSubcategory = (identifier, options = {}) => {
  const { validate: validateCSRF } = useCSRF();
  
  // Use getState to avoid subscription
  const getCachedSubcategory = useCallback(() => {
    const store = useSubcategoryStore.getState();
    
    // Try to find by ID first
    if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
      return store.getSubcategoryById(identifier);
    }
    
    // Then try to find by slug
    return store.subcategories.find(sub => 
      sub.slug === identifier || 
      sub._id === identifier
    );
  }, [identifier]);
  
  return useQuery({
    queryKey: ['subcategories', identifier],
    queryFn: async () => {
      try {
        // Validate CSRF token
        const hasValidCSRF = await validateCSRF();
        if (!hasValidCSRF) {
          throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
        }
        
        const data = await subcategoriesAPI.getByIdOrSlug(identifier);
        return data;
      } catch (error) {
        console.error('Error fetching subcategory:', error);
        
        if (!handleCSRFError(error)) {
          throw error;
        }
        
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation failed' };
      }
    },
    enabled: !!identifier && identifier.trim() !== '',
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      if (error.code === 'SUBCATEGORY_NOT_FOUND') return false;
      return failureCount < 2;
    },
    initialData: () => getCachedSubcategory() || undefined,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
};

/**
 * Hook to create a subcategory
 */
export const useCreateSubcategory = () => {
  const queryClient = useQueryClient();
  const addSubcategory = useSubcategoryStore((state) => state.addSubcategory);
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async (subcategoryData) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return await subcategoriesAPI.create(subcategoryData);
    },
    onMutate: () => {
      toast.loading('Creating subcategory...');
    },
    onSuccess: (response, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories', 'category', variables.category] });
      
      // Update local store
      if (response.data) {
        addSubcategory(response.data);
      }
      
      toast.success(response.message || 'Subcategory created successfully');
    },
    onError: (error) => {
      console.error('Create subcategory error:', error);
      
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      if (error.type === 'VALIDATION_ERROR') {
        toast.error('Validation failed. Please check the form.');
        error.errors.forEach(err => {
          toast.error(`${err.field}: ${err.message}`, { duration: 3000 });
        });
      } else {
        toast.error(error.message || 'Failed to create subcategory');
      }
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

/**
 * Hook to update a subcategory
 */
export const useUpdateSubcategory = () => {
  const queryClient = useQueryClient();
  const updateSubcategoryInStore = useSubcategoryStore((state) => state.updateSubcategory);
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return await subcategoriesAPI.update(id, data);
    },
    onMutate: () => {
      toast.loading('Updating subcategory...');
    },
    onSuccess: (response, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['subcategories', 'category'] });
      
      // Update store
      if (response.data) {
        updateSubcategoryInStore(variables.id, response.data);
      }
      
      toast.success(response.message || 'Subcategory updated successfully');
    },
    onError: (error) => {
      console.error('Update subcategory error:', error);
      
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      toast.error(error.message || 'Failed to update subcategory');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

/**
 * Hook to delete a subcategory
 */
export const useDeleteSubcategory = () => {
  const queryClient = useQueryClient();
  const removeSubcategory = useSubcategoryStore((state) => state.removeSubcategory);
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ id, force = false }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return await subcategoriesAPI.delete(id, force);
    },
    onMutate: () => {
      toast.loading('Deleting subcategory...');
    },
    onSuccess: (response, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories', 'category'] });
      
      // Remove from store
      removeSubcategory(variables.id);
      
      toast.success(response.message || 'Subcategory deleted successfully');
    },
    onError: (error) => {
      console.error('Delete subcategory error:', error);
      
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      toast.error(error.message || 'Failed to delete subcategory');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

/**
 * Hook to restore a subcategory
 */
export const useRestoreSubcategory = () => {
  const queryClient = useQueryClient();
  const addSubcategory = useSubcategoryStore((state) => state.addSubcategory);
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async (id) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return await subcategoriesAPI.restore(id);
    },
    onMutate: () => {
      toast.loading('Restoring subcategory...');
    },
    onSuccess: (response, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories', 'category'] });
      
      // Add to store
      if (response.data) {
        addSubcategory(response.data);
      }
      
      toast.success(response.message || 'Subcategory restored successfully');
    },
    onError: (error) => {
      console.error('Restore subcategory error:', error);
      
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      toast.error(error.message || 'Failed to restore subcategory');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

/**
 * Hook to search subcategories
 */
export const useSearchSubcategories = (query, options = {}) => {
  const [debouncedQuery] = useDebounce(query, 300);
  const { validate: validateCSRF } = useCSRF();
  
  return useQuery({
    queryKey: ['subcategories', 'search', debouncedQuery],
    queryFn: async () => {
      try {
        // Validate CSRF token
        const hasValidCSRF = await validateCSRF();
        if (!hasValidCSRF) {
          throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
        }
        
        const data = await subcategoriesAPI.search(debouncedQuery);
        return data;
      } catch (error) {
        console.error('Search subcategories error:', error);
        
        if (!handleCSRFError(error)) {
          throw error;
        }
        
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation failed' };
      }
    },
    enabled: !!debouncedQuery && debouncedQuery.length > 1,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error.code === 'CSRF_TOKEN_INVALID') return false;
      return failureCount < 2;
    },
    ...options,
  });
};

/**
 * Hook for bulk operations
 */
export const useBulkSubcategoryOperations = () => {
  const queryClient = useQueryClient();
  const { validate: validateCSRF } = useCSRF();
  
  return useMutation({
    mutationFn: async ({ operation, ids, data = {} }) => {
      // Validate CSRF token
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return await subcategoriesAPI.bulk(operation, ids, data);
    },
    onMutate: () => {
      toast.loading('Processing bulk operation...');
    },
    onSuccess: (response) => {
      // Invalidate all subcategory queries
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories', 'category'] });
      
      toast.success(response.message || 'Bulk operation completed successfully');
    },
    onError: (error) => {
      console.error('Bulk operation error:', error);
      
      if (handleCSRFError(error, () => {})) {
        return;
      }
      
      toast.error(error.message || 'Bulk operation failed');
    },
    onSettled: () => {
      toast.dismiss();
    },
  });
};

/**
 * SIMPLIFIED version for subcategory selection
 */
export const useSubcategorySelection = (initialCategoryId = null) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  const { validate: validateCSRF } = useCSRF();
  
  // Get subcategories for selected category
  const { 
    data: subcategoriesData, 
    isLoading: subcategoriesLoading,
    error: subcategoriesError 
  } = useSubcategoriesByCategory(selectedCategoryId, {
    enabled: !!selectedCategoryId,
  });
  
  const subcategories = subcategoriesData?.subcategories || [];
  
  const handleCategoryChange = useCallback(async (categoryId) => {
    // Validate CSRF before changing category
    try {
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      setSelectedCategoryId(categoryId);
      setSelectedSubcategoryId(null);
    } catch (error) {
      if (error.code === 'CSRF_TOKEN_INVALID') {
        handleCSRFError(error, () => handleCategoryChange(categoryId));
      } else {
        console.error('Category change error:', error);
      }
    }
  }, [validateCSRF]);
  
  const handleSubcategoryChange = useCallback(async (subcategoryId) => {
    // Validate CSRF before changing subcategory
    try {
      const hasValidCSRF = await validateCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      setSelectedSubcategoryId(subcategoryId);
    } catch (error) {
      if (error.code === 'CSRF_TOKEN_INVALID') {
        handleCSRFError(error, () => handleSubcategoryChange(subcategoryId));
      } else {
        console.error('Subcategory change error:', error);
      }
    }
  }, [validateCSRF]);
  
  return {
    selectedCategoryId,
    selectedSubcategoryId,
    subcategories,
    subcategoriesLoading,
    subcategoriesError,
    handleCategoryChange,
    handleSubcategoryChange,
    setSelectedCategoryId,
    setSelectedSubcategoryId,
  };
};

/**
 * CSRF protection wrapper for subcategory operations
 */
export const useSubcategoryCSRFProtection = () => {
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