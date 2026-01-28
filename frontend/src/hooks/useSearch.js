// useSearch.js - Fixed version with CSRF protection
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { searchAPI } from '../api/search';
import { useDebounce } from '../hooks/useDebounce';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams, useNavigate } from 'react-router-dom';

// Query keys
export const searchKeys = {
  all: ['search'],
  lists: () => [...searchKeys.all, 'list'],
  list: (params) => [...searchKeys.lists(), params],
  suggestions: (query) => [...searchKeys.all, 'suggestions', query],
  quick: (query) => [...searchKeys.all, 'quick', query],
  filters: (query, type) => [...searchKeys.all, 'filters', query, type],
  stats: () => [...searchKeys.all, 'stats'],
  history: () => [...searchKeys.all, 'history'],
  advanced: (data) => [...searchKeys.all, 'advanced', data]
};

// Helper to handle CSRF errors
const handleCSRFError = (error, retryAction = null) => {
  if (error.code === 'CSRF_TOKEN_INVALID' || error.requiresCSRFRefresh) {
    toast.error('Security session expired. Refreshing...');
    
    // Try to refresh CSRF token
    searchAPI.refreshCSRFToken().then(() => {
      toast.success('Security session refreshed. Please try again.');
      if (retryAction) retryAction();
    }).catch(() => {
      toast.error('Please refresh the page and try again.');
    });
    
    return true;
  }
  return false;
};

export const useSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Initialize state from URL parameters once
  const initialSearchQuery = useMemo(() => searchParams.get('query') || '', [searchParams]);
  const initialSearchType = useMemo(() => searchParams.get('type') || 'services', [searchParams]);
  const initialActiveFilters = useMemo(() => {
    const filters = {};
    searchParams.forEach((value, key) => {
      if (!['query', 'type', 'page', 'source', 'search_in'].includes(key)) {
        filters[key] = value;
      }
    });
    return filters;
  }, [searchParams]);
  
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchType, setSearchType] = useState(initialSearchType);
  const [activeFilters, setActiveFilters] = useState(initialActiveFilters);
  
  const debouncedQuery = useDebounce(searchQuery, 500);
  
  // CSRF token management
  const ensureValidCSRF = async () => {
    if (!searchAPI.hasValidCSRFToken()) {
      await searchAPI.refreshCSRFToken();
    }
    return searchAPI.hasValidCSRFToken();
  };
  
  // Quick search for navbar
  const useQuickSearch = (enabled = true) => {
    return useQuery({
      queryKey: searchKeys.quick(debouncedQuery),
      queryFn: () => searchAPI.quickSearch(debouncedQuery),
      enabled: enabled && debouncedQuery.length >= 2,
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      meta: { persist: false },
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
      limit = 24,
      enabled = true,
      keepPreviousData = true,
      ...queryOptions
    } = options;

    const queryKey = useMemo(() => 
      searchKeys.list({ query: debouncedQuery, type, page, limit, filters: activeFilters }),
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
      enabled: enabled && (debouncedQuery.length >= 2 || Object.keys(activeFilters).length > 0),
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      keepPreviousData,
      retry: 2,
      refetchOnWindowFocus: false,
      meta: { persist: true },
      ...queryOptions,
      onError: (error) => {
        console.error('Full search query error:', error);
        if (!handleCSRFError(error) && !error.message?.includes('QUERY_REQUIRED')) {
          toast.error('Failed to load search results');
        }
      },
      onSuccess: async (data) => {
        if (data.success && debouncedQuery) {
          try {
            // Try to save search history if user is authenticated
            const token = localStorage.getItem('userToken');
            if (token) {
              // Ensure CSRF token is valid before saving history
              const hasValidCSRF = await ensureValidCSRF();
              if (hasValidCSRF) {
                await searchAPI.saveSearchHistory(debouncedQuery, type, activeFilters);
              }
            }
          } catch (error) {
            console.error('Failed to save search history:', error);
          }
          
          searchAPI.saveRecentSearch(debouncedQuery);
        }
      }
    });
  };

  // Infinite scroll search
  const useInfiniteSearch = (options = {}) => {
    const {
      type = searchType,
      limit = 24,
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
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      ...queryOptions,
      onError: (error) => {
        console.error('Infinite search query error:', error);
        if (!handleCSRFError(error)) {
          toast.error('Failed to load more results');
        }
      }
    });
  };

  // Search suggestions
  const useSearchSuggestions = (query) => {
    const debouncedSuggestionsQuery = useDebounce(query, 300);
    
    return useQuery({
      queryKey: searchKeys.suggestions(debouncedSuggestionsQuery),
      queryFn: () => searchAPI.getSuggestions(debouncedSuggestionsQuery),
      enabled: debouncedSuggestionsQuery.length >= 2,
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Search suggestions error:', error);
      }
    });
  };

  // Filter options
  const useFilterOptions = (query = searchQuery, type = searchType) => {
    const debouncedFilterQuery = useDebounce(query, 300);
    
    return useQuery({
      queryKey: searchKeys.filters(debouncedFilterQuery, type),
      queryFn: () => searchAPI.getFilterOptions(debouncedFilterQuery, type),
      enabled: true,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Filter options query error:', error);
      }
    });
  };

  // Search history
  const useSearchHistory = () => {
    return useQuery({
      queryKey: searchKeys.history(),
      queryFn: () => searchAPI.getSearchHistory(),
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Search history query error:', error);
        if (!handleCSRFError(error)) {
          toast.error('Failed to load search history');
        }
      }
    });
  };

  // Search statistics
  const useSearchStats = () => {
    return useQuery({
      queryKey: searchKeys.stats(),
      queryFn: () => searchAPI.getSearchStats(),
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      onError: (error) => {
        console.error('Search stats query error:', error);
      }
    });
  };

  // Advanced search mutation
  const useAdvancedSearch = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
      mutationFn: async (searchData) => {
        // Ensure CSRF token is valid
        const hasValidCSRF = await ensureValidCSRF();
        if (!hasValidCSRF) {
          throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
        }
        
        return searchAPI.advancedSearch(searchData);
      },
      onSuccess: (data) => {
        if (data.success) {
          queryClient.invalidateQueries({ queryKey: searchKeys.lists() });
        }
      },
      onError: (error) => {
        handleCSRFError(error);
      }
    });
  };

  // Save search mutation with CSRF protection
  const saveSearchMutation = useMutation({
    mutationFn: async ({ query, type = 'search', filters = {} }) => {
      // Ensure CSRF token is valid
      const hasValidCSRF = await ensureValidCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return searchAPI.saveSearchHistory(query, type, filters);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.history() });
    },
    onError: (error) => {
      console.error('Save search mutation error:', error);
      if (!handleCSRFError(error)) {
        toast.error('Failed to save search history');
      }
    }
  });

  // Clear search history mutation with CSRF protection
  const clearSearchHistoryMutation = useMutation({
    mutationFn: async () => {
      // Ensure CSRF token is valid
      const hasValidCSRF = await ensureValidCSRF();
      if (!hasValidCSRF) {
        throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
      }
      
      return searchAPI.clearSearchHistory();
    },
    onMutate: () => {
      toast.loading('Clearing search history...');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.history() });
      queryClient.setQueryData(searchKeys.history(), { success: true, data: [] });
      toast.success('Search history cleared');
    },
    onError: (error) => {
      if (!handleCSRFError(error)) {
        toast.error('Failed to clear search history');
      }
      console.error('Clear search history mutation error:', error);
    },
    onSettled: () => {
      toast.dismiss();
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
  const performSearch = useCallback(async (query, type = 'services', filters = {}, options = {}) => {
    const searchTerm = query?.trim() || '';
    
    if (!searchTerm && Object.keys(filters).length === 0) {
      if (options.showError !== false) {
        toast.error('Please enter a search term');
      }
      return null;
    }

    let hasChanges = false;
    
    if (searchTerm !== searchQuery) {
      setSearchQuery(searchTerm);
      hasChanges = true;
    }
    
    if (type !== searchType) {
      setSearchType(type);
      hasChanges = true;
    }
    
    const filtersStr = JSON.stringify(filters);
    const prevFiltersStr = JSON.stringify(activeFilters);
    if (filtersStr !== prevFiltersStr) {
      setActiveFilters(filters);
      hasChanges = true;
    }

    try {
      if (localStorage.getItem('userToken') && !options.skipHistory && searchTerm) {
        // Save search history with CSRF protection
        await saveSearchMutation.mutateAsync({ query: searchTerm, type, filters });
      }
    } catch (error) {
      console.error('Failed to save search history:', error);
    }

    if (searchTerm) {
      searchAPI.saveRecentSearch(searchTerm, type);
    }

    if (options.navigate !== false) {
      const url = searchAPI.formatSearchURL(searchTerm || '', type, filters);
      
      if (options.navigate && typeof options.navigate === 'function') {
        options.navigate(url);
      } else {
        navigate(url);
      }
      
      return url;
    }

    return null;
  }, [searchQuery, searchType, activeFilters, saveSearchMutation, navigate]);

  // Update filters - FIXED: Remove setSearchParams dependency
  const updateFilters = useCallback((newFilters) => {
    setActiveFilters(prev => {
      const merged = { ...prev, ...newFilters };
      
      Object.keys(merged).forEach(key => {
        if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
          delete merged[key];
        }
      });
      
      return merged;
    });
    
    // Update URL directly without causing infinite loop
    const newParams = new URLSearchParams(searchParams);
    
    Object.keys(newFilters).forEach(key => {
      const value = newFilters[key];
      if (value === undefined || value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value.toString());
      }
    });
    
    newParams.set('page', '1');
    
    // Only update if there are actual changes
    const currentParams = searchParams.toString();
    const updatedParams = newParams.toString();
    
    if (currentParams !== updatedParams) {
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Remove filter
  const removeFilter = useCallback((filterKey) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterKey];
      return newFilters;
    });
    
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(filterKey);
    newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set('query', searchQuery);
    if (searchType !== 'services') newParams.set('type', searchType);
    newParams.set('page', '1');
    
    setSearchParams(newParams, { replace: true });
  }, [searchQuery, searchType, setSearchParams]);

  // Get filter count
  const getFilterCount = useCallback(() => {
    return Object.keys(activeFilters).filter(key => 
      activeFilters[key] !== undefined && 
      activeFilters[key] !== null && 
      activeFilters[key] !== '' &&
      !['sort', 'order', 'page'].includes(key)
    ).length;
  }, [activeFilters]);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveFilters({});
    queryClient.removeQueries({ queryKey: searchKeys.all });
    localStorage.removeItem('recentSearches');
  }, [queryClient]);

  // Get recent searches
  const getRecentSearches = useCallback(() => {
    return searchAPI.getRecentSearches();
  }, []);

  // CSRF protection utilities
  const refreshCSRFToken = useCallback(async () => {
    try {
      await searchAPI.refreshCSRFToken();
      return true;
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
      return false;
    }
  }, []);

  const validateCSRF = useCallback(async () => {
    return await ensureValidCSRF();
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
    useAdvancedSearch,
    
    // Mutations
    saveSearchMutation,
    clearSearchHistoryMutation,
    clearCacheMutation,
    
    // Actions
    performSearch,
    clearSearch,
    updateFilters,
    removeFilter,
    clearAllFilters,
    
    // Utilities
    getFilterCount,
    getRecentSearches,
    formatSearchURL: searchAPI.formatSearchURL,
    parseSearchURL: searchAPI.parseSearchURL,
    
    // CSRF Protection
    refreshCSRFToken,
    validateCSRF,
    hasValidCSRFToken: searchAPI.hasValidCSRFToken
  };
};

// Hook for search results page - FIXED: Remove infinite loop
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

  // Memoize initial params
  const { query, type, page, filters } = useMemo(() => ({
    query: initialParams.query || '',
    type: initialParams.type || 'services',
    page: initialParams.page || 1,
    filters: initialParams.filters || {}
  }), [initialParams]);

  // Initialize state from props - FIXED: Only run once on mount
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (!isInitialized) {
      if (query && query !== searchQuery) {
        setSearchQuery(query);
      }
      if (type && type !== searchType) {
        setSearchType(type);
      }
      if (Object.keys(filters).length > 0) {
        // Update filters without triggering re-render loop
        const newFilters = { ...filters };
        Object.keys(newFilters).forEach(key => {
          if (newFilters[key] === undefined || newFilters[key] === null || newFilters[key] === '') {
            delete newFilters[key];
          }
        });
        
        if (Object.keys(newFilters).length > 0) {
          // Use setTimeout to avoid state update during render
          setTimeout(() => {
            updateFilters(newFilters);
          }, 0);
        }
      }
      setIsInitialized(true);
    }
  }, [query, type, filters, searchQuery, searchType, isInitialized, updateFilters]);

  const searchResults = useFullSearch({
    type: searchType,
    page,
    limit: initialParams.limit || 24,
    enabled: !!searchQuery || Object.keys(activeFilters).length > 0
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

// CSRF protection hook for search operations
export const useSearchCSRFProtection = () => {
  const { 
    hasValidCSRFToken, 
    refreshCSRFToken, 
    validateCSRF 
  } = useSearch();
  
  const ensureCSRF = useCallback(async (operation) => {
    const hasValidCSRF = await validateCSRF();
    if (!hasValidCSRF) {
      throw { code: 'CSRF_TOKEN_INVALID', message: 'Security validation required' };
    }
    return operation();
  }, [validateCSRF]);
  
  return {
    hasValidCSRFToken,
    refreshCSRFToken,
    validateCSRF,
    ensureCSRF
  };
};