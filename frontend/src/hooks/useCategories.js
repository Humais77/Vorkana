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
    queryFn: async () => {
      try {
        const categories = await categoriesAPI.getAll({
          includeSubcategories: false, // Don't load subcategories here
        });
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
export const useCategoriesWithSubcategories = (options = {}) => {
  return useQuery({
    queryKey: ['categories', 'with-subcategories'],
    queryFn: async () => {
      try {
        const categories = await categoriesAPI.getAll({
          includeSubcategories: true,
          limit: 100,
        });
        return categories;
      } catch (error) {
        console.error('Error fetching categories with subcategories:', error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000,
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
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};
export const usePopularServicesByCategory = (params = {}) => {
  return useQuery({
    queryKey: ['popularServicesByCategory', params],
    queryFn: async () => {
      try {
        const result = await servicesAPI.getPopularServicesByCategory(params);
        return result;
      } catch (error) {
        console.error('Error fetching popular services by category:', error);
        throw error;
      }
    },
    enabled: !!params.category, // Only fetch when category is selected
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
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