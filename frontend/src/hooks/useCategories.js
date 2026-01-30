import { useQuery} from '@tanstack/react-query';
import { categoriesAPI } from '../api/categories';
import { useCategoryStore } from '../store/useCategoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCSRF } from './useAuth';
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