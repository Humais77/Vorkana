// hooks/useSubcategories.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subcategoriesAPI } from '../api/subcategories';
import { useSubcategoryStore } from '../store/useSubcategoryStore';
import { useDebounce } from 'use-debounce';
import { useState, useCallback } from 'react';

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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    initialData: () => {
      // Return cached data if fresh
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
  const setSubcategoriesByCategory = useSubcategoryStore((state) => state.setSubcategoriesByCategory);
  const getSubcategoriesByCategory = useSubcategoryStore((state) => state.getSubcategoriesByCategory(categoryId));
  
  return useQuery({
    queryKey: ['subcategories', 'category', categoryId],
    queryFn: async () => {
      try {
        const result = await subcategoriesAPI.getByCategory(categoryId);
        return result;
      } catch (error) {
        console.error('Error fetching subcategories by category:', error);
        throw error;
      }
    },
    enabled: !!categoryId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    initialData: () => {
      if (getSubcategoriesByCategory?.subcategories) {
        return getSubcategoriesByCategory;
      }
      return undefined;
    },
    onSuccess: (data) => {
      if (data && categoryId) {
        setSubcategoriesByCategory(categoryId, data.subcategories);
      }
    },
    ...options,
  });
};

/**
 * Hook to get a single subcategory by ID
 */
export const useSubcategory = (id, options = {}) => {
  const getSubcategory = useSubcategoryStore((state) => state.getSubcategoryById(id));
  
  return useQuery({
    queryKey: ['subcategories', id],
    queryFn: async () => {
      try {
        const data = await subcategoriesAPI.getById(id);
        return data;
      } catch (error) {
        console.error('Error fetching subcategory:', error);
        throw error;
      }
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    initialData: () => getSubcategory || undefined,
    ...options,
  });
};

/**
 * Hook to create a subcategory
 */
export const useCreateSubcategory = () => {
  const queryClient = useQueryClient();
  const addSubcategory = useSubcategoryStore((state) => state.addSubcategory);
  
  return useMutation({
    mutationFn: async (subcategoryData) => {
      return await subcategoriesAPI.create(subcategoryData);
    },
    onSuccess: (response, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories', 'category', variables.category] });
      
      // Update local store
      if (response.data) {
        addSubcategory(response.data);
      }
    },
    onError: (error) => {
      console.error('Create subcategory error:', error);
    },
  });
};

/**
 * Hook to update a subcategory
 */
export const useUpdateSubcategory = () => {
  const queryClient = useQueryClient();
  const updateSubcategoryInStore = useSubcategoryStore((state) => state.updateSubcategory);
  
  return useMutation({
    mutationFn: async ({ id, data }) => {
      return await subcategoriesAPI.update(id, data);
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
    },
    onError: (error) => {
      console.error('Update subcategory error:', error);
    },
  });
};

/**
 * Hook to delete a subcategory
 */
export const useDeleteSubcategory = () => {
  const queryClient = useQueryClient();
  const removeSubcategory = useSubcategoryStore((state) => state.removeSubcategory);
  
  return useMutation({
    mutationFn: async ({ id, force = false }) => {
      return await subcategoriesAPI.delete(id, force);
    },
    onSuccess: (response, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['subcategories'] });
      queryClient.invalidateQueries({ queryKey: ['subcategories', 'category'] });
      
      // Remove from store
      removeSubcategory(variables.id);
    },
    onError: (error) => {
      console.error('Delete subcategory error:', error);
    },
  });
};

/**
 * Hook to search subcategories
 */
export const useSearchSubcategories = (query, options = {}) => {
  const [debouncedQuery] = useDebounce(query, 300);
  
  return useQuery({
    queryKey: ['subcategories', 'search', debouncedQuery],
    queryFn: async () => {
      try {
        const data = await subcategoriesAPI.search(debouncedQuery);
        return data;
      } catch (error) {
        console.error('Search subcategories error:', error);
        throw error;
      }
    },
    enabled: !!debouncedQuery && debouncedQuery.length > 1,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Custom hook for subcategory selection
 */
export const useSubcategorySelection = (initialCategoryId = null) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null);
  
  // Get subcategories for selected category
  const { data: subcategoriesData } = useSubcategoriesByCategory(selectedCategoryId, {
    enabled: !!selectedCategoryId,
  });
  
  const subcategories = subcategoriesData?.subcategories || [];
  
  // Get selected subcategory details
  const { data: selectedSubcategory } = useSubcategory(selectedSubcategoryId, {
    enabled: !!selectedSubcategoryId,
  });
  
  const handleCategoryChange = useCallback((categoryId) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(null); // Reset subcategory when category changes
  }, []);
  
  const handleSubcategoryChange = useCallback((subcategoryId) => {
    setSelectedSubcategoryId(subcategoryId);
  }, []);
  
  return {
    selectedCategoryId,
    selectedSubcategoryId,
    selectedSubcategory,
    subcategories,
    handleCategoryChange,
    handleSubcategoryChange,
    setSelectedCategoryId,
    setSelectedSubcategoryId,
  };
};