// SearchResults.jsx - Production ready with performance optimizations
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Filter, Star, Clock, ChevronDown, DollarSign, 
  Truck, Award, Search, X, SlidersHorizontal, Check,
  Loader2, AlertCircle, Sparkles
} from 'lucide-react';
import { SeoWrapper } from '../../components/SeoWrapper';
import { useSearchResults } from '../../hooks/useSearch';
import { DEFAULT_IMAGES } from '../../utils/defaultImages';
import SearchComponent from '../../components/Search/SearchComponent';
import { motion, AnimatePresence } from 'framer-motion';

// Memoized components for better performance
const SearchResultCard = memo(({ item, navigate }) => {
  const getDeliveryText = (days) => {
    if (!days) return 'N/A';
    if (days === 1) return '1 Day';
    if (days <= 3) return `${days} Days`;
    if (days <= 7) return `${days} Days`;
    return `${days} Days`;
  };

  const getPriceText = (price) => {
    if (!price) return 'Starting at $5';
    if (price < 10) return `$${price}`;
    return `$${price.toFixed(0)}`;
  };

  return (
    <button
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group text-left w-full"
      onClick={() => navigate(`/services/${item.slug || item._id}`)}
      aria-label={`View ${item.title}`}
    >
      {/* Thumbnail */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={item.thumbnail || (item.images?.[0]?.url) || DEFAULT_IMAGES.GENERIC}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.src = DEFAULT_IMAGES.GENERIC;
          }}
        />
        {item.isFeatured && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 text-xs font-medium bg-yellow-500 text-white rounded">
              Featured
            </span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <img
              src={item.seller?.picture || `https://ui-avatars.com/api/?name=${item.seller?.name || 'Seller'}&background=10b981&color=fff`}
              alt={item.seller?.name}
              className="w-8 h-8 rounded-full"
              loading="lazy"
            />
            <div>
              <h3 className="font-medium text-gray-900 text-sm">
                {item.user?.name || 'Seller'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {item.rating && (
              <>
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">{item.rating.toFixed(1)}</span>
              </>
            )}
          </div>
        </div>
        
        <h2 className="text-gray-900 font-medium mb-2 line-clamp-2 group-hover:text-green-600">
          {item.title}
        </h2>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {getDeliveryText(item.deliveryTime)}
            </span>
          </div>
          <div className="font-bold text-gray-900">
            {getPriceText(item.price)}
          </div>
        </div>
      </div>
    </button>
  );
});

SearchResultCard.displayName = 'SearchResultCard';

const FilterOption = memo(({ option, active, onClick }) => (
  <button
    onClick={() => onClick(option.value)}
    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
      active ? 'bg-green-50 text-green-700 border border-green-200' : 'hover:bg-gray-50'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="text-sm">{option.label}</span>
      {active && <Check className="w-4 h-4" />}
    </div>
    {option.count !== undefined && option.count > 0 && (
      <div className="text-xs text-gray-500 mt-1">
        {option.count.toLocaleString()} results
      </div>
    )}
  </button>
));

FilterOption.displayName = 'FilterOption';

const PaginationButton = memo(({ children, disabled, active, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 border rounded-lg transition-colors ${
      disabled
        ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400'
        : active
        ? 'border-green-600 bg-green-50 text-green-600 hover:bg-green-100 cursor-pointer'
        : 'border-gray-300 hover:bg-gray-50 cursor-pointer'
    }`}
    aria-disabled={disabled}
  >
    {children}
  </button>
));

PaginationButton.displayName = 'PaginationButton';

const LoadingSkeleton = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
        <div className="h-48 bg-gray-200"></div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="flex justify-between pt-3">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse URL parameters
  const query = searchParams.get('query') || '';
  const type = searchParams.get('type') || 'services';
  const page = parseInt(searchParams.get('page') || '1');
  
  // Extract filters from URL
  const extractedFilters = useMemo(() => {
    const filters = {};
    searchParams.forEach((value, key) => {
      if (!['query', 'type', 'page', 'source', 'search_in'].includes(key)) {
        filters[key] = value;
      }
    });
    return filters;
  }, [searchParams]);
  
  // Initialize search hook
  const {
    searchQuery,
    setSearchQuery,
    searchType,
    activeFilters,
    updateFilters,
    removeFilter,
    clearAllFilters,
    searchResults,
    suggestions,
    filterOptions,
    filterCount,
    isLoading,
    isFetching,
    isError,
    error,
    hasNextPage,
    hasPrevPage,
    currentPage,
    totalPages,
    totalResults,
    showingResults,
    
  } = useSearchResults({
    query,
    type,
    page,
    filters: extractedFilters
  });
  
  // Local state
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState(activeFilters.sort || 'relevance');
  
  // Update URL when filters change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      
      if (searchQuery) params.set('query', searchQuery);
      if (searchType) params.set('type', searchType);
      if (currentPage > 1) params.set('page', currentPage.toString());
      
      Object.keys(activeFilters).forEach(key => {
        if (activeFilters[key] && key !== 'page') {
          params.set(key, activeFilters[key]);
        }
      });
      
      const newUrl = `${location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [searchQuery, searchType, activeFilters, currentPage, location.pathname]);
  
  // Update sort when filters change
  useEffect(() => {
    if (activeFilters.sort && activeFilters.sort !== sortBy) {
      setSortBy(activeFilters.sort);
    }
  }, [activeFilters.sort]);
  
  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    updateFilters({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [totalPages, updateFilters]);
  
  // Handle sort change
  const handleSortChange = useCallback((value) => {
    setSortBy(value);
    updateFilters({ sort: value, page: 1 });
  }, [updateFilters]);
  
  // Handle filter change
  const handleFilterChange = useCallback((key, value) => {
    if (value === '' || value === null || value === undefined) {
      removeFilter(key);
    } else {
      updateFilters({ [key]: value, page: 1 });
    }
  }, [removeFilter, updateFilters]);
  
  // Apply filter from sidebar
  const applyFilter = useCallback((filterType, value) => {
    handleFilterChange(filterType, value);
    if (showMobileFilters) {
      setShowMobileFilters(false);
    }
  }, [handleFilterChange, showMobileFilters]);
  
  // Format number for display
  const formatNumber = useCallback((num) => {
    if (!num) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M+';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k+';
    }
    return num.toString();
  }, []);
  
  const sortOptions = filterOptions.sort || [
  { value: 'relevance', label: 'Most Relevant', icon: Sparkles },
  { value: 'newest', label: 'Newest Arrivals', icon: Clock },
  { value: 'rating', label: 'Highest Rated', icon: Star },
  { value: 'price_low', label: 'Price: Low to High', icon: DollarSign },
  { value: 'price_high', label: 'Price: High to Low', icon: DollarSign },
  { value: 'delivery_fastest', label: 'Fastest Delivery', icon: Truck }
];
  
  // Default filter options (used as fallback)
  const defaultBudgetOptions = useMemo(() => [
    { value: '', label: 'Any Budget' },
    { value: '0-50', label: 'Under $50' },
    { value: '50-100', label: '$50 - $100' },
    { value: '100-200', label: '$100 - $200' },
    { value: '200-500', label: '$200 - $500' },
    { value: '500-10000', label: '$500+' }
  ], []);
  
  const defaultDeliveryOptions = useMemo(() => [
    { value: '', label: 'Any Delivery Time' },
    { value: '1', label: '24 Hours' },
    { value: '3', label: '3 Days' },
    { value: '7', label: '7 Days' },
    { value: '14', label: '14 Days' },
    { value: '30', label: '30 Days' }
  ], []);
  
  // Use API filter options or defaults
  const budgetOptions = filterOptions.budget || [
  { value: '', label: 'Any Budget', count: 0 },
  { value: '0-50', label: 'Under $50', count: 0 },
  { value: '50-100', label: '$50 - $100', count: 0 },
  { value: '100-200', label: '$100 - $200', count: 0 },
  { value: '200-500', label: '$200 - $500', count: 0 },
  { value: '500-1000', label: '$500 - $1,000', count: 0 },
  { value: '1000-10000', label: '$1,000+', count: 0 }
];
const ratingOptions = filterOptions.rating || [
  { value: '', label: 'Any Rating', count: 0 },
  { value: '4.5', label: '4.5+ Stars', count: 0 },
  { value: '4.0', label: '4.0+ Stars', count: 0 },
  { value: '3.5', label: '3.5+ Stars', count: 0 },
  { value: '3.0', label: '3.0+ Stars', count: 0 }
];

  const deliveryOptions = filterOptions.deliveryTime || [
  { value: '', label: 'Any Delivery Time', count: 0 },
  { value: '1', label: '24 Hours', count: 0 },
  { value: '3', label: '1-3 Days', count: 0 },
  { value: '7', label: '3-7 Days', count: 0 },
  { value: '14', label: '1-2 Weeks', count: 0 },
  { value: '30', label: '1 Month', count: 0 }
];
  
  // Generate pagination numbers
  const paginationNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    
    const numbers = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) numbers.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) numbers.push(i);
    }
    
    return numbers;
  }, [currentPage, totalPages]);
  
  // Error handling
  if (isError) {
    return (
      <SeoWrapper
        title="Search Error | Vorkanna"
        description="There was an error loading search results."
        canonical="/search"
      >
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Unable to load search results
              </h1>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {error?.message || 'There was an error processing your search. Please try again.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
                >
                  Go back home
                </button>
              </div>
            </div>
          </div>
        </div>
      </SeoWrapper>
    );
  }
  
  // Generate SEO data
  const seoData = useMemo(() => {
    const title = query 
      ? `${totalResults} Results for "${query}" - Find Services | Vorkanna`
      : "Search Services | Vorkanna Marketplace";
    
    const description = query
      ? `Find ${formatNumber(totalResults)}+ professional services for "${query}" on Vorkanna. Browse top-rated freelancers, competitive prices, and fast delivery times.`
      : `Browse professional freelance services on Vorkanna marketplace. Find top-rated freelancers, competitive prices, and fast delivery times.`;
    
    return { title, description };
  }, [query, totalResults, formatNumber]);
  
  // Generate structured data
  const structuredData = useMemo(() => {
    if (!searchResults?.results || searchResults.results.length === 0) return null;
    
    const websiteUrl = window.location.origin;
    const currentUrl = `${websiteUrl}${location.pathname}${location.search}`;
    
    const structuredServices = searchResults.results.slice(0, 10).map((item, index) => ({
      "@type": "Service",
      "position": index + 1,
      "url": `${websiteUrl}/services/${item.slug || item._id}`,
      "name": item.title,
      "description": item.shortDescription || item.description?.substring(0, 200) || 'Professional service',
      "provider": {
        "@type": "Person",
        "name": item.seller?.name || "Service Provider"
      },
      "offers": {
        "@type": "Offer",
        "price": item.price || 0,
        "priceCurrency": item.currency || "USD"
      }
    }));
    
    return {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      "name": seoData.title,
      "description": seoData.description,
      "url": currentUrl,
      "query": query,
      "numberOfItems": totalResults,
      "itemListElement": structuredServices
    };
  }, [searchResults, location, seoData, query, totalResults]);
  
  return (
    <SeoWrapper
      title={seoData.title}
      description={seoData.description}
      canonical={`/search?query=${encodeURIComponent(query)}`}
      structuredData={structuredData}
      robots={totalResults === 0 ? "noindex, follow" : "index, follow"}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Filters Overlay */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
              onClick={() => setShowMobileFilters(false)}
            >
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.2 }}
                className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Filters</h3>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {filterCount > 0 && (
                    <button
                      onClick={() => {
                        clearAllFilters();
                        setShowMobileFilters(false);
                      }}
                      className="text-sm text-green-600 hover:text-green-700 cursor-pointer"
                    >
                      Clear all filters ({filterCount})
                    </button>
                  )}
                </div>
                
                {/* Sort Options */}
                <div className="p-4 border-b">
                  <h4 className="font-medium mb-3">Sort by</h4>
                  <div className="space-y-2">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          handleSortChange(option.value);
                          setShowMobileFilters(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left ${sortBy === option.value ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50'} cursor-pointer`}
                      >
                        <div className="flex items-center gap-2">
                          <option.icon className="w-4 h-4" />
                          <span>{option.label}</span>
                        </div>
                        {sortBy === option.value && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Filter Options */}
                <div className="p-4 border-b">
                  <h4 className="font-medium mb-3">Budget</h4>
                  <div className="space-y-2">
                    {budgetOptions.map(option => (
                      <FilterOption
                        key={option.value}
                        option={option}
                        active={activeFilters.budget === option.value}
                        onClick={(value) => applyFilter('budget', value)}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="p-4">
                  <h4 className="font-medium mb-3">Delivery Time</h4>
                  <div className="space-y-2">
                    {deliveryOptions.map(option => (
                      <FilterOption
                        key={option.value}
                        option={option}
                        active={activeFilters.delivery_time === option.value}
                        onClick={(value) => applyFilter('delivery_time', value)}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-4">
              <SearchComponent 
                key={`search-${query}-${Date.now()}`}
                initialQuery={query}
                variant="full"
                className="w-full"
                onSearch={(searchTerm) => {
                  navigate(`/search?query=${encodeURIComponent(searchTerm)}`);
                }}
              />
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {query ? `Results for "${query}"` : 'Search Services'}
                </h1>
                {!isLoading && !isFetching && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>
                      {totalResults > 0 
                        ? `${formatNumber(totalResults)}+ services found`
                        : 'No services found'
                      }
                    </span>
                    {searchResults.cached && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                        Cached
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Mobile Filter Button */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {filterCount > 0 && (
                  <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {filterCount}
                  </span>
                )}
              </button>
              
              {/* Desktop Sort */}
              <div className="hidden lg:block">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer hover:border-gray-400 transition-colors"
                  aria-label="Sort results by"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Active Filters */}
            {filterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-sm text-gray-600">Active filters:</span>
                {Object.entries(activeFilters).map(([key, value]) => {
                  if (!value || ['page', 'sort', 'order'].includes(key)) return null;
                  
                  let label = value;
                  if (key === 'budget') {
                    const option = budgetOptions.find(o => o.value === value);
                    label = option?.label || value;
                  } else if (key === 'delivery_time') {
                    const option = deliveryOptions.find(o => o.value === value);
                    label = option?.label || value;
                  }
                  
                  return (
                    <div
                      key={key}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-full"
                    >
                      <span className="font-medium">{key}:</span> {label}
                      <button
                        onClick={() => removeFilter(key)}
                        className="hover:text-green-900 cursor-pointer ml-1"
                        aria-label={`Remove ${key} filter`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-600 hover:text-gray-900 underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
          
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Sidebar Filters - Desktop */}
            <div className="hidden lg:block space-y-6">
              {/* Sort */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium mb-3">Sort by</h3>
                <div className="space-y-2">
                  {sortOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left ${sortBy === option.value ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50'} cursor-pointer`}
                    >
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        <span>{option.label}</span>
                      </div>
                      {sortBy === option.value && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Budget */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium mb-3">Budget</h3>
                <div className="space-y-2">
                  {budgetOptions.map(option => (
                    <FilterOption
                      key={option.value}
                      option={option}
                      active={activeFilters.budget === option.value}
                      onClick={(value) => handleFilterChange('budget', value)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Delivery Time */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium mb-3">Delivery Time</h3>
                <div className="space-y-2">
                  {deliveryOptions.map(option => (
                    <FilterOption
                      key={option.value}
                      option={option}
                      active={activeFilters.delivery_time === option.value}
                      onClick={(value) => handleFilterChange('delivery_time', value)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Related Searches */}
              {suggestions.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-medium mb-3">Related Searches</h3>
                  <div className="space-y-2">
                    {suggestions.slice(0, 6).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => navigate(`/search?query=${encodeURIComponent(suggestion.title || suggestion.text)}`)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        {suggestion.title || suggestion.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Results */}
            <div className="lg:col-span-3">
              {isLoading ? (
                <LoadingSkeleton />
              ) : searchResults?.results?.length > 0 ? (
                <>
                  {/* Results Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.results.map((item) => (
                      <SearchResultCard
                        key={item._id}
                        item={item}
                        navigate={navigate}
                      />
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-8">
                      <nav className="flex items-center gap-2" aria-label="Pagination">
                        <PaginationButton
                          disabled={!hasPrevPage}
                          onClick={() => handlePageChange(currentPage - 1)}
                        >
                          Previous
                        </PaginationButton>
                        
                        {paginationNumbers.map(pageNum => (
                          <PaginationButton
                            key={pageNum}
                            active={pageNum === currentPage}
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </PaginationButton>
                        ))}
                        
                        <PaginationButton
                          disabled={!hasNextPage}
                          onClick={() => handlePageChange(currentPage + 1)}
                        >
                          Next
                        </PaginationButton>
                      </nav>
                      
                      <div className="text-center text-sm text-gray-600 mt-4">
                        Page {currentPage} of {totalPages} • {showingResults} of {formatNumber(totalResults)} results
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // No Results
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {query ? `No results found for "${query}"` : 'Start searching'}
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {query 
                      ? 'Try different keywords, check your spelling, or browse our categories.'
                      : 'Find services, gigs, or categories by typing in the search box above.'
                    }
                  </p>
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-3 justify-center">
                      {suggestions.slice(0, 6).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => navigate(`/search?query=${encodeURIComponent(suggestion.title || suggestion.text)}`)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                        >
                          {suggestion.title || suggestion.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Loading overlay for background fetches */}
              {isFetching && !isLoading && (
                <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 z-40">
                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                  <span className="text-sm text-gray-700">Updating results...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default SearchResults;