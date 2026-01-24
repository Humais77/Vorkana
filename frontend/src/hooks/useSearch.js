// useSearch.js - Production ready React hook
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { searchAPI } from '../api/search';
import { useDebounce } from '../hooks/useDebounce';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

export const useSearch = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // State initialization from URL
  const [searchQuery, setSearchQuery] = useState(() => {
    return searchParams.get('query') || '';
  });
  
  const [searchType, setSearchType] = useState(() => {
    return searchParams.get('type') || 'services';
  });
  
  const [activeFilters, setActiveFilters] = useState(() => {
    const filters = {};
    searchParams.forEach((value, key) => {
      if (!['query', 'type', 'page', 'source', 'search_in'].includes(key)) {
        filters[key] = value;
      }
    });
    return filters;
  });
  
  const debouncedQuery = useDebounce(searchQuery, 500);
  
  // Prevent infinite updates with refs
  const prevSearchQueryRef = useRef(searchQuery);
  const prevSearchTypeRef = useRef(searchType);
  const prevActiveFiltersRef = useRef(activeFilters);

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
      meta: {
        persist: false // Don't persist quick search results
      },
      onError: (error) => {
        console.error('Quick search query error:', error);
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

    const queryKey = useMemo(() => 
      ['search', 'full', debouncedQuery, type, page, limit, activeFilters],
      [debouncedQuery, type, page, limit, activeFilters]
    );

    return useQuery({
      queryKey,
      queryFn: () => searchAPI.unifiedSearch(debouncedQuery, {
        type,
        page,
        limit,
        filters: activeFilters,
        sort: activeFilters.sort || 'relevance',
        order: activeFilters.order || 'desc'
      }),
      enabled: enabled && debouncedQuery.length >= 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      keepPreviousData,
      retry: 2,
      refetchOnWindowFocus: false,
      meta: {
        persist: true // Persist full search results
      },
      ...queryOptions,
      onError: (error) => {
        console.error('Full search query error:', error);
        toast.error('Failed to load search results');
      },
      onSuccess: (data) => {
        // Update recent searches on successful search
        if (data.success && debouncedQuery) {
          searchAPI.saveRecentSearch(debouncedQuery);
        }
      }
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

    const queryKey = useMemo(() => 
      ['search', 'infinite', debouncedQuery, type, limit, activeFilters],
      [debouncedQuery, type, limit, activeFilters]
    );

    return useInfiniteQuery({
      queryKey,
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
        if (!pagination || !pagination.hasNext) return undefined;
        return pagination.page + 1;
      },
      getPreviousPageParam: (firstPage) => {
        const pagination = firstPage?.data?.pagination;
        if (!pagination || !pagination.hasPrev) return undefined;
        return pagination.page - 1;
      },
      enabled: enabled && debouncedQuery.length >= 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      ...queryOptions,
      onError: (error) => {
        console.error('Infinite search query error:', error);
        toast.error('Failed to load more results');
      }
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
      refetchOnWindowFocus: false
    });
  };

  const useFilterOptions = (query = searchQuery, type = searchType) => {
  const debouncedFilterQuery = useDebounce(query, 300);
  
  return useQuery({
    queryKey: ['search', 'filters', debouncedFilterQuery, type],
    queryFn: () => searchAPI.getFilterOptions(debouncedFilterQuery, type),
    enabled: true, // Always enabled, uses cache
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes,
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Filter options query error:', error);
    }
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
      refetchOnWindowFocus: false
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
      refetchOnWindowFocus: false,
      refetchOnMount: false // Don't refetch on mount if data exists
    });
  };

  // Save search mutation
  const saveSearchMutation = useMutation({
    mutationFn: ({ query, type = 'search' }) => 
      searchAPI.saveSearchHistory(query, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search', 'history'] });
    },
    onError: (error) => {
      console.error('Save search mutation error:', error);
      // Silent error - don't show toast
    }
  });

  // Clear search history mutation
  const clearSearchHistoryMutation = useMutation({
    mutationFn: () => searchAPI.clearSearchHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search', 'history'] });
      queryClient.setQueryData(['search', 'history'], { success: true, data: [] });
      toast.success('Search history cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear search history');
      console.error('Clear search history mutation error:', error);
    }
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: () => searchAPI.clearCache(),
    onSuccess: () => {
      queryClient.clear();
      toast.success('Cache cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear cache');
      console.error('Clear cache mutation error:', error);
    }
  });

  // Perform search action
  const performSearch = useCallback((query, type = 'services', filters = {}, options = {}) => {
    const searchTerm = query.trim();
    if (!searchTerm) return null;

    // Only update state if values have changed
    let hasChanges = false;
    
    if (searchTerm !== searchQuery) {
      setSearchQuery(searchTerm);
      hasChanges = true;
    }
    
    if (type !== searchType) {
      setSearchType(type);
      hasChanges = true;
    }
    
    // Compare filters to avoid unnecessary updates
    const filtersStr = JSON.stringify(filters);
    const prevFiltersStr = JSON.stringify(activeFilters);
    if (filtersStr !== prevFiltersStr) {
      setActiveFilters(filters);
      hasChanges = true;
    }

    // Save to search history if user is logged in
    if (localStorage.getItem('userToken') && !options.skipHistory) {
      saveSearchMutation.mutate({ query: searchTerm, type });
    }

    // Save to localStorage for recent searches
    searchAPI.saveRecentSearch(searchTerm, type);

    // Navigate to search results
    if (options.navigate !== false) {
      const url = searchAPI.formatSearchURL(searchTerm, type, filters);
      
      if (options.navigate && typeof options.navigate === 'function') {
        options.navigate(url);
      } else {
        // Default navigation
        window.location.href = url;
      }
      
      return url;
    }

    return null;
  }, [searchQuery, searchType, activeFilters, saveSearchMutation]);

  // Update URL with search params
  const updateSearchURL = useCallback((navigate, additionalParams = {}) => {
    const params = { ...activeFilters, ...additionalParams };
    const url = searchAPI.formatSearchURL(searchQuery, searchType, params);
    navigate(url);
  }, [searchQuery, searchType, activeFilters]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchType('services');
    setActiveFilters({});
    queryClient.removeQueries({ queryKey: ['search', 'quick'] });
    queryClient.removeQueries({ queryKey: ['search', 'full'] });
    queryClient.removeQueries({ queryKey: ['search', 'suggestions'] });
  }, [queryClient]);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setActiveFilters(prev => {
      const merged = { ...prev, ...newFilters };
      
      // Remove empty values
      Object.keys(merged).forEach(key => {
        if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
          delete merged[key];
        }
      });
      
      return merged;
    });
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
      !['sort', 'order', 'page'].includes(key)
    ).length;
  }, [activeFilters]);

  // Get recent searches
  const getRecentSearches = useCallback(() => {
    return searchAPI.getRecentSearches();
  }, []);

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
    useFilterOptions,
    useSearchHistory,
    useSearchStats,
    
    // Mutations
    saveSearchMutation,
    clearSearchHistoryMutation,
    clearCacheMutation,
    
    // Actions
    performSearch,
    updateSearchURL,
    clearSearch,
    updateFilters,
    removeFilter,
    clearAllFilters,
    
    // Utilities
    getFilterCount,
    getRecentSearches,
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
    useFilterOptions,
    debouncedQuery,
    getFilterCount
  } = useSearch();

  // Parse initial params
  const { query, type, page, filters } = useMemo(() => {
    return {
      query: initialParams.query || '',
      type: initialParams.type || 'services',
      page: initialParams.page || 1,
      filters: initialParams.filters || {}
    };
  }, [initialParams]);

  // Initialize state from props
  useEffect(() => {
    if (query && query !== searchQuery) {
      setSearchQuery(query);
    }
    if (type && type !== searchType) {
      setSearchType(type);
    }
    if (Object.keys(filters).length > 0) {
      updateFilters(filters);
    }
  }, [query, type, filters, searchQuery, searchType, setSearchQuery, setSearchType, updateFilters]);

  const searchResults = useFullSearch({
    type: searchType,
    page,
    limit: initialParams.limit || 48,
    enabled: !!searchQuery
  });

  const suggestions = useSearchSuggestions(searchQuery);
  const filterOptions = useFilterOptions(searchQuery, searchType);

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
      related: searchResults.data?.data?.related,
      meta: searchResults.data?.data?.meta,
      cached: searchResults.data?.cached
    },
    
    // Suggestions
    suggestions: suggestions.data?.data || [],
    
    // Filter options
    filterOptions: filterOptions.data?.data || {},
    
    // Filter actions
    updateFilters,
    removeFilter,
    clearAllFilters,
    
    // Loading states
    isLoading: searchResults.isLoading,
    isFetching: searchResults.isFetching,
    isError: searchResults.isError,
    error: searchResults.error,
    isSuccess: searchResults.isSuccess,
    
    // Pagination helpers
    hasNextPage: searchResults.data?.data?.pagination?.hasNext || false,
    hasPrevPage: searchResults.data?.data?.pagination?.hasPrev || false,
    currentPage: searchResults.data?.data?.pagination?.page || 1,
    totalPages: searchResults.data?.data?.pagination?.totalPages || 0,
    totalResults: searchResults.data?.data?.meta?.totalResults || 0,
    showingResults: searchResults.data?.data?.results?.length || 0
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
    debouncedQuery,
    getRecentSearches
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
    clearSearch,
    getRecentSearches
  };
};