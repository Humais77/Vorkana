// hooks/useCategories.js
import { useQuery } from '@tanstack/react-query';
import { categoriesAPI } from '../api/categories';
import { useCategoryStore } from '../store/useCategoryStore';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
// hooks/useCategories.js - Enhanced caching
export const useCategories = (options = {}) => {
  const setCategories = useCategoryStore((state) => state.setCategories);
  const categories = useCategoryStore((state) => state.categories);
  const lastFetched = useCategoryStore((state) => state.lastFetched);
  
  return useQuery({
    queryKey: ['categories'],
    queryFn: async ({ signal }) => {
      try {
        // Pass cancellation signal
        const parentCategories = await categoriesAPI.getAll({
          parentCategory: null,
          includeSubcategories: true
        }, signal);
        
        return parentCategories;
      } catch (error) {
        if (error.cancelled) {
          throw error; // Re-throw cancellation
        }
        console.error('Error fetching categories:', error);
        throw error;
      }
    },
    
    // Smart caching based on user activity
    staleTime: () => {
      const isUserActive = document.visibilityState === 'visible';
      return isUserActive ? 2 * 60 * 1000 : 10 * 60 * 1000;
    },
    
    gcTime: 30 * 60 * 1000, // 30 minutes
    
    // Optimistic updates
    structuralSharing: (oldData, newData) => {
      // Only update if data actually changed
      if (JSON.stringify(oldData) === JSON.stringify(newData)) {
        return oldData;
      }
      return newData;
    },
    
    // Background refresh
    refetchOnWindowFocus: () => {
      const timeSinceLastFetch = Date.now() - (lastFetched || 0);
      return timeSinceLastFetch > 5 * 60 * 1000; // Refresh if older than 5 minutes
    },
    
    refetchOnMount: false, // Use cache on mount
    refetchOnReconnect: true,
    
    // Initial data with timestamp check
    initialData: () => {
      if (categories.length > 0 && lastFetched) {
        const isStale = Date.now() - lastFetched > 10 * 60 * 1000;
        return isStale ? undefined : categories;
      }
      return undefined;
    },
    
    // Optimistic updates for mutations
    onSuccess: (data) => {
      if (data && Array.isArray(data)) {
        setCategories(data);
        
        // Prefetch related data
        if (data.length > 0) {
          data.forEach(category => {
            if (category.children && category.children.length > 0) {
              // Prefetch child category details
              queryClient.prefetchQuery({
                queryKey: ['category', category._id, 'children'],
                queryFn: () => Promise.resolve(category.children),
                staleTime: 5 * 60 * 1000
              });
            }
          });
        }
      }
    },
    
    // Error boundaries
    throwOnError: true,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (except 429)
      if (error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          return false;
        }
      }
      return failureCount < 2;
    },
    
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    
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
export const useDebouncedSearchCategories = (query, delay = 300) => {
  const [debouncedQuery] = useDebounce(query, delay);
  
  return useQuery({
    queryKey: ['categories', 'search', debouncedQuery],
    queryFn: () => categoriesAPI.search(debouncedQuery),
    enabled: !!debouncedQuery && debouncedQuery.length > 1,
    staleTime: 2 * 60 * 1000,
  });
};