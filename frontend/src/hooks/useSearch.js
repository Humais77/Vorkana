// useSearch.js - Updated for new backend
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { searchAPI } from '../api/search';
import { useDebounce } from '../hooks/useDebounce';
import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

export const useSearch = () => {
  const [searchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');
  const [searchType, setSearchType] = useState(searchParams.get('type') || 'services');
  const [activeFilters, setActiveFilters] = useState(() => {
    const filters = {};
    searchParams.forEach((value, key) => {
      if (!['query', 'type', 'page'].includes(key)) {
        filters[key] = value;
      }
    });
    return filters;
  });
  
  const queryClient = useQueryClient();
  const debouncedQuery = useDebounce(searchQuery, 500);

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
      limit = 48,
      enabled = true,
      keepPreviousData = true,
      ...queryOptions
    } = options;

    return useQuery({
      queryKey: ['search', 'full', debouncedQuery, type, page, limit, activeFilters],
      queryFn: () => searchAPI.unifiedSearch(debouncedQuery, {
        type,
        page,
        limit,
        filters: activeFilters,
        sort: activeFilters.sort || 'relevance'
      }),
      enabled: enabled && debouncedQuery.length >= 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      keepPreviousData,
      retry: 2,
      ...queryOptions
    });
  };

  // Infinite scroll search
  const useInfiniteSearch = (options = {}) => {
    const {
      type = searchType,
      limit = 48,
      enabled = true,
      ...queryOptions
    } = options;

    return useInfiniteQuery({
      queryKey: ['search', 'infinite', debouncedQuery, type, limit, activeFilters],
      queryFn: ({ pageParam = 1 }) => 
        searchAPI.unifiedSearch(debouncedQuery, {
          type,
          page: pageParam,
          limit,
          filters: activeFilters,
          sort: activeFilters.sort || 'relevance'
        }),
      getNextPageParam: (lastPage) => {
        const pagination = lastPage?.data?.pagination;
        if (!pagination) return undefined;
        return pagination.hasNext ? pagination.page + 1 : undefined;
      },
      enabled: enabled && debouncedQuery.length >= 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      ...queryOptions
    });
  };

  // Search suggestions
  const useSearchSuggestions = (query) => {
    const debouncedSuggestionsQuery = useDebounce(query, 300);
    
    return useQuery({
      queryKey: ['search', 'suggestions', debouncedSuggestionsQuery],
      queryFn: () => searchAPI.getSuggestions(debouncedSuggestionsQuery),
      enabled: debouncedSuggestionsQuery.length >= 2,
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
    });
  };

  // Search history
  const useSearchHistory = () => {
    return useQuery({
      queryKey: ['search', 'history'],
      queryFn: () => searchAPI.getSearchHistory(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
    });
  };

  // Search statistics
  const useSearchStats = () => {
    return useQuery({
      queryKey: ['search', 'stats'],
      queryFn: () => searchAPI.getSearchStats(),
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
    });
  };

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: (data) => searchAPI.saveSearchHistory(data.query, data.type),
    onSuccess: () => {
      queryClient.invalidateQueries(['search', 'history']);
    },
    onError: (error) => {
      console.error('Save search error:', error);
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
      console.error('Clear search history error:', error);
    }
  });

  // Perform search action
 const performSearch = useCallback((query, type = 'services', filters = {}, options = {}) => {
  const searchTerm = query.trim();
  if (!searchTerm) return;

  setSearchQuery(searchTerm);
  setSearchType(type);
  setActiveFilters(filters);

  // Save to search history if user is logged in
  if (localStorage.getItem('userToken') && !options.skipHistory) {
    saveSearchMutation.mutate({ query: searchTerm, type });
  }

  // Save to localStorage for recent searches
  const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
  const updatedSearches = [
    { query: searchTerm, type, timestamp: new Date().toISOString() },
    ...recentSearches.filter(item => item.query.toLowerCase() !== searchTerm.toLowerCase())
  ].slice(0, 10);
  
  localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));

  // Navigate to search results
  let url; // ← Declare url variable here
  if (options.navigate !== false) {
    url = searchAPI.formatSearchURL(searchTerm, type, filters); // ← Assign value here
    if (options.navigate) {
      options.navigate(url);
    }
  }

  return url;
}, [saveSearchMutation]);

  // Update URL with search params
  const updateSearchURL = useCallback((navigate) => {
    const url = searchAPI.formatSearchURL(searchQuery, searchType, activeFilters);
    navigate(url);
  }, [searchQuery, searchType, activeFilters]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchType('services');
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

  // Get filter count
  const getFilterCount = useCallback(() => {
    return Object.keys(activeFilters).filter(key => 
      activeFilters[key] !== undefined && 
      activeFilters[key] !== null && 
      activeFilters[key] !== '' &&
      !['sort', 'order'].includes(key)
    ).length;
  }, [activeFilters]);

  return {
    // State
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    activeFilters,
    debouncedQuery,
    
    // Queries
    useQuickSearch,
    useFullSearch,
    useInfiniteSearch,
    useSearchSuggestions,
    useSearchHistory,
    useSearchStats,
    
    // Mutations
    saveSearchMutation,
    clearSearchHistoryMutation,
    
    // Actions
    performSearch,
    updateSearchURL,
    clearSearch,
    updateFilters,
    removeFilter,
    clearAllFilters,
    
    // Utilities
    getFilterCount,
    formatSearchURL: searchAPI.formatSearchURL,
    parseSearchURL: searchAPI.parseSearchURL
  };
};

// Hook for search results page
export const useSearchResults = (initialParams = {}) => {
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
    useSearchSuggestions,
    debouncedQuery,
    getFilterCount
  } = useSearch();

  // Initialize from URL params
  useEffect(() => {
    if (initialParams.query) {
      setSearchQuery(initialParams.query);
    }
    if (initialParams.type) {
      setSearchType(initialParams.type);
    }
    if (initialParams.filters) {
      updateFilters(initialParams.filters);
    }
  }, [initialParams, setSearchQuery, setSearchType, updateFilters]);

  const searchResults = useFullSearch({
    type: searchType,
    page: initialParams.page || 1,
    limit: initialParams.limit || 48,
    enabled: !!searchQuery || !!initialParams.query
  });

  const suggestions = useSearchSuggestions(searchQuery);

  return {
    // State
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    activeFilters,
    debouncedQuery,
    filterCount: getFilterCount(),
    
    // Results
    searchResults: {
      ...searchResults,
      data: searchResults.data?.data,
      results: searchResults.data?.data?.results || [],
      pagination: searchResults.data?.data?.pagination,
      relatedData: searchResults.data?.data?.relatedData,
      meta: searchResults.data?.data?.meta
    },
    
    // Suggestions
    suggestions: suggestions.data?.data || [],
    
    // Filter actions
    updateFilters,
    removeFilter,
    clearAllFilters,
    
    // Loading states
    isLoading: searchResults.isLoading,
    isFetching: searchResults.isFetching,
    isError: searchResults.isError,
    error: searchResults.error,
    
    // Pagination helpers
    hasNextPage: searchResults.data?.data?.pagination?.hasNext || false,
    hasPrevPage: searchResults.data?.data?.pagination?.hasPrev || false,
    totalPages: searchResults.data?.data?.pagination?.totalPages || 0,
    totalResults: searchResults.data?.data?.meta?.totalResults || 0
  };
};

// Hook for navbar search
export const useNavbarSearch = () => {
  const {
    searchQuery,
    setSearchQuery,
    useQuickSearch,
    performSearch,
    clearSearch,
    debouncedQuery
  } = useSearch();

  const quickSearch = useQuickSearch();

  const handleQuickSearch = useCallback((query) => {
    if (!query.trim()) return;
    performSearch(query, 'services', {}, { navigate: false });
  }, [performSearch]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    quickSearch: {
      ...quickSearch,
      results: quickSearch.data?.data || []
    },
    handleQuickSearch,
    clearSearch
  };
};