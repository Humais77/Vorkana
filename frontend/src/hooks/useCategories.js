// hooks/useCategories.js
import { useQuery } from '@tanstack/react-query';
import { categoriesAPI } from '../api/categories';
import { useCategoryStore } from '../store/useCategoryStore';

export const useCategories = (options = {}) => {
  const setCategories = useCategoryStore((state) => state.setCategories);
  const categories = useCategoryStore((state) => state.categories);
  const lastFetched = useCategoryStore((state) => state.lastFetched);
  
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        // Get parent categories with subcategories
        const parentCategories = await categoriesAPI.getAll({
          parentCategory: null,
          includeSubcategories: true
        });
        console.log('Parent categories fetched:', parentCategories);
        return parentCategories;
      } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Smart refetching
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    
    // Use cached data if available and not too old
    initialData: categories.length > 0 && lastFetched && Date.now() - lastFetched < 5 * 60 * 1000 
      ? categories 
      : undefined,
    
    // Update Zustand store on success
    onSuccess: (data) => {
      console.log('Categories fetched successfully:', data?.length || 0, 'items');
      if (data && Array.isArray(data)) {
        setCategories(data);
      }
    },
    
    // Handle errors gracefully
    onError: (error) => {
      console.error('Categories query error:', error.message);
    },
    
    // Merge with any custom options
    ...options,
  });
};

/**
 * Hook to get a single category by ID
 */
export const useCategory = (id, options = {}) => {
  return useQuery({
    queryKey: ['categories', id],
    queryFn: () => categoriesAPI.getById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes for single category
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
        console.log('Parent categories fetched (hook):', parentCategories?.length || 0);
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
  return useQuery({
    queryKey: ['categories', 'search', query],
    queryFn: () => categoriesAPI.search(query),
    enabled: !!query && query.length > 1,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    ...options,
  });
};

/**
 * Hook to get popular categories
 */
export const usePopularCategories = (options = {}) => {
  return useQuery({
    queryKey: ['categories', 'popular'],
    queryFn: () => categoriesAPI.getPopular(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to get categories with statistics
 */
export const useCategoriesWithStats = (options = {}) => {
  return useQuery({
    queryKey: ['categories', 'stats'],
    queryFn: () => categoriesAPI.withStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};