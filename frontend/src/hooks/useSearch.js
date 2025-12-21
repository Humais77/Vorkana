import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchAPI } from '../api/search';
import { useDebounce } from '../hooks/useDebounce';
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [activeFilters, setActiveFilters] = useState({});
  
  const queryClient = useQueryClient();
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Quick search for navbar (instant results)
  const useQuickSearch = (enabled = true) => {
    return useQuery({
      queryKey: ['search', 'quick', debouncedQuery],
      queryFn: () => searchAPI.quickSearch(debouncedQuery),
      enabled: enabled && debouncedQuery.length >= 2,
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Quick search error:', error);
      }
    });
  };

  // Full search for search results page
  const useFullSearch = (options = {}) => {
    const {
      type = searchType,
      page = 1,
      limit = 20,
      enabled = true,
      ...queryOptions
    } = options;

    return useQuery({
      queryKey: ['search', 'full', debouncedQuery, type, page, limit, activeFilters],
      queryFn: () => searchAPI.unifiedSearch(debouncedQuery, {
        type,
        page,
        limit,
        filters: activeFilters
      }),
      enabled: enabled && debouncedQuery.length >= 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      keepPreviousData: true,
      ...queryOptions
    });
  };

  // Search suggestions
  const useSearchSuggestions = (query) => {
    const debouncedSuggestionsQuery = useDebounce(query, 200);
    
    return useQuery({
      queryKey: ['search', 'suggestions', debouncedSuggestionsQuery],
      queryFn: () => searchAPI.getSuggestions(debouncedSuggestionsQuery),
      enabled: debouncedSuggestionsQuery.length >= 2,
      staleTime: 1000 * 60 * 10, // 10 minutes
    });
  };

  // Search history
  const useSearchHistory = () => {
    return useQuery({
      queryKey: ['search', 'history'],
      queryFn: () => searchAPI.getSearchHistory(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: !!localStorage.getItem('userToken'),
    });
  };

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: (query) => searchAPI.saveSearchHistory(query),
    onSuccess: () => {
      queryClient.invalidateQueries(['search', 'history']);
    }
  });

  // Clear search history mutation
  const clearSearchHistoryMutation = useMutation({
    mutationFn: () => searchAPI.clearSearchHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries(['search', 'history']);
      toast.success('Search history cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear search history');
    }
  });

  // Perform search action
  const performSearch = useCallback((query, type = 'all', filters = {}) => {
    setSearchQuery(query);
    setSearchType(type);
    setActiveFilters(filters);
    
    if (localStorage.getItem('userToken')) {
      saveSearchMutation.mutate(query);
    }

    // Save to localStorage for recent searches (even for non-logged in users)
    const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const updatedSearches = [
      { query, type, timestamp: new Date().toISOString() },
      ...recentSearches.filter(item => item.query !== query)
    ].slice(0, 10); // Keep only 10 most recent
    
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
  }, [saveSearchMutation]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchType('all');
    setActiveFilters({});
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setActiveFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Remove filter
  const removeFilter = useCallback((filterKey) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterKey];
      return newFilters;
    });
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
  }, []);

  return {
    // State
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    activeFilters,
    
    // Queries
    useQuickSearch,
    useFullSearch,
    useSearchSuggestions,
    useSearchHistory,
    
    // Mutations
    saveSearchMutation,
    clearSearchHistoryMutation,
    
    // Actions
    performSearch,
    clearSearch,
    updateFilters,
    removeFilter,
    clearAllFilters,
    debouncedQuery
  };
};

// Hook for search results page
export const useSearchResults = (initialQuery = '', initialType = 'all') => {
  const {
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    activeFilters,
    updateFilters,
    removeFilter,
    clearAllFilters,
    useFullSearch,
    debouncedQuery
  } = useSearch();

  // Initialize with URL params
  useState(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
    }
    if (initialType) {
      setSearchType(initialType);
    }
  });

  const searchResults = useFullSearch({
    type: searchType,
    page: 1,
    limit: 20,
    enabled: !!initialQuery || !!searchQuery
  });

  return {
    // State
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    activeFilters,
    debouncedQuery,
    
    // Results
    searchResults,
    
    // Filter actions
    updateFilters,
    removeFilter,
    clearAllFilters,
    
    // Loading states
    isLoading: searchResults.isLoading,
    isError: searchResults.isError,
    error: searchResults.error,
    data: searchResults.data,
    
    // Pagination
    pagination: searchResults.data?.pagination,
    hasNextPage: searchResults.data?.pagination?.hasNext,
    hasPrevPage: searchResults.data?.pagination?.hasPrev
  };
};