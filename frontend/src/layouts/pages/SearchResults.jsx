// SearchResults.jsx - Optimized cursor handling
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Filter, Star, Clock, Globe, Shield, TrendingUp, Sparkles,
  ChevronDown, DollarSign, Truck, Award, BadgeCheck, Search,
  X, SlidersHorizontal, Check
} from 'lucide-react';
import SearchComponent from '../../components/Search/SearchComponent';
import { SeoWrapper } from '../../components/SeoWrapper';
import { useSearchResults } from '../../hooks/useSearch';
import toast from 'react-hot-toast';

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const query = searchParams.get('query') || '';
  const type = searchParams.get('type') || 'services';
  const page = parseInt(searchParams.get('page') || '1');
  
  // Extract filters from URL
  const extractedFilters = React.useMemo(() => {
  const filters = {};
  searchParams.forEach((value, key) => {
    if (!['query', 'type', 'page', 'source', 'search_in'].includes(key)) {
      filters[key] = value;
    }
  });
  return filters;
}, [searchParams]);

  
  // Initialize hook with URL params
  const {
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    activeFilters,
    updateFilters,
    removeFilter,
    clearAllFilters,
    searchResults,
    suggestions,
    filterCount,
    isLoading,
    isError,
    error,
    hasNextPage,
    hasPrevPage,
    totalPages,
    totalResults
  } = useSearchResults({
    query,
    type,
     filters: extractedFilters
  });
  

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState(activeFilters.sort || 'relevance');
  
  // Update URL when filters change
  useEffect(() => {
  const timeout = setTimeout(() => {
    const params = new URLSearchParams();

    if (searchQuery) params.set('query', searchQuery);
    if (searchType) params.set('type', searchType);
    if (page > 1) params.set('page', page.toString());

    Object.keys(activeFilters).forEach(key => {
      if (activeFilters[key] && key !== 'page') {
        params.set(key, activeFilters[key]);
      }
    });

    const newUrl = `${location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }, 300); // ✅ debounce

  return () => clearTimeout(timeout);
}, [searchQuery, searchType, activeFilters, page, location.pathname]);

  
  // Handle page change
  const handlePageChange = (newPage) => {
    updateFilters({ page: newPage });
  };
  
  // Handle sort change
  const handleSortChange = (value) => {
    setSortBy(value);
    updateFilters({ sort: value });
  };
  
  // Handle filter change
  const handleFilterChange = (key, value) => {
    if (value === '' || value === null || value === undefined) {
      removeFilter(key);
    } else {
      updateFilters({ [key]: value });
    }
  };
  const onBudgetClick = useCallback(
  (value) => handleFilterChange('budget', value),
  [handleFilterChange]
);
  // Apply filter from sidebar
  const applyFilter = useCallback((filterType, value) => {
    handleFilterChange(filterType, value);
    
    // Close mobile filters on apply
    if (showMobileFilters) {
      setShowMobileFilters(false);
    }
  }, [showMobileFilters]);
  
  // Format number
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M+';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k+';
    }
    return num.toString();
  };
  
  // Get delivery text
  const getDeliveryText = (days) => {
    if (!days) return 'N/A';
    if (days === 1) return '1 Day';
    if (days <= 3) return `${days} Days`;
    if (days <= 7) return `${days} Days`;
    return `${days} Days`;
  };
  
  // Get price text
  const getPriceText = (price) => {
    if (!price) return 'Starting at $5';
    if (price < 10) return `$${price}`;
    return `$${price.toFixed(0)}`;
  };
  
  // Filter options
  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'newest', label: 'Newest Arrivals' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price_low', label: 'Price: Low to High' },
    { value: 'price_high', label: 'Price: High to Low' },
    { value: 'delivery_fastest', label: 'Fastest Delivery' }
  ];
  
  const budgetOptions = [
    { value: '', label: 'Any Budget' },
    { value: '0-50', label: 'Under $50' },
    { value: '50-100', label: '$50 - $100' },
    { value: '100-200', label: '$100 - $200' },
    { value: '200-500', label: '$200 - $500' },
    { value: '500-10000', label: '$500+' }
  ];
  
  const deliveryOptions = [
    { value: '', label: 'Any Delivery Time' },
    { value: '1', label: '24 Hours' },
    { value: '3', label: '3 Days' },
    { value: '7', label: '7 Days' },
    { value: '14', label: '14 Days' },
    { value: '30', label: '30 Days' }
  ];
  
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
              <div className="text-5xl mb-4">😕</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Unable to load search results
              </h1>
              <p className="text-gray-600 mb-6">
                {error?.message || 'There was an error processing your search.'}
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              >
                Go back home
              </button>
            </div>
          </div>
        </div>
      </SeoWrapper>
    );
  }

  // Generate SEO data
  const getSeoTitle = () => {
    if (!query) return "Search Services | Vorkanna Marketplace";
    return `${totalResults} Results for "${query}" - Find Services | Vorkanna`;
  };

  const getSeoDescription = () => {
    if (totalResults === 0) {
      return `Search results for "${query}". Browse professional freelance services on Vorkanna marketplace.`;
    }
    return `Find ${formatNumber(totalResults)}+ professional services for "${query}" on Vorkanna. Browse top-rated freelancers, competitive prices, and fast delivery times.`;
  };

  const getSeoKeywords = () => {
    const baseKeywords = ["search services", "find freelancers", "hire professionals", "freelance marketplace"];
    return [...baseKeywords, query.toLowerCase(), `${query.toLowerCase()} services`].join(", ");
  };

  // Generate structured data
  const generateSearchStructuredData = () => {
    if (!searchResults?.data?.results || searchResults.data.results.length === 0) return null;

    const websiteUrl = window.location.origin;
    const currentUrl = `${websiteUrl}/search?query=${encodeURIComponent(query)}`;

    const structuredServices = searchResults.data.results.slice(0, 10).map((item, index) => ({
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
      "name": getSeoTitle(),
      "description": getSeoDescription(),
      "url": currentUrl,
      "query": query,
      "numberOfItems": totalResults,
      "itemListElement": structuredServices
    };
  };

  return (
    <SeoWrapper
      title={getSeoTitle()}
      description={getSeoDescription()}
      keywords={getSeoKeywords()}
      canonical={`/search?query=${encodeURIComponent(query)}`}
      ogTitle={getSeoTitle()}
      ogDescription={getSeoDescription()}
      structuredData={generateSearchStructuredData()}
      robots={totalResults === 0 ? "noindex, follow" : "index, follow"}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Filters Overlay */}
        {showMobileFilters && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden">
            <div className="absolute inset-0" onClick={() => setShowMobileFilters(false)}></div>
            <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto">
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
                    onClick={clearAllFilters}
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
                      <span>{option.label}</span>
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
                    <button
                      key={option.value}
                      onClick={() => applyFilter('budget', option.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg ${activeFilters.budget === option.value ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50'} cursor-pointer`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="p-4">
                <h4 className="font-medium mb-3">Delivery Time</h4>
                <div className="space-y-2">
                  {deliveryOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => applyFilter('delivery_time', option.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg ${activeFilters.delivery_time === option.value ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50'} cursor-pointer`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-4">
              <SearchComponent 
              key={query} 
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
                  Results for "{query}"
                </h1>
                {!isLoading && (
                  <p className="text-gray-600">
                    {totalResults > 0 ? `${formatNumber(totalResults)}+ services found` : 'No services found'}
                  </p>
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
                {Object.keys(activeFilters).map(key => {
                  if (!activeFilters[key] || ['page', 'sort'].includes(key)) return null;
                  
                  let label = activeFilters[key];
                  if (key === 'budget') {
                    const option = budgetOptions.find(o => o.value === activeFilters[key]);
                    label = option?.label || activeFilters[key];
                  } else if (key === 'delivery_time') {
                    const option = deliveryOptions.find(o => o.value === activeFilters[key]);
                    label = option?.label || activeFilters[key];
                  }
                  
                  return (
                    <div
                      key={key}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-full"
                    >
                      {label}
                      <button
                        onClick={() => removeFilter(key)}
                        className="hover:text-green-900 cursor-pointer"
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
                      <span>{option.label}</span>
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
                    <button
                      key={option.value}
                      onClick={() => onBudgetClick(option.value)}

                      className={`w-full text-left px-3 py-2 rounded-lg ${activeFilters.budget === option.value ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50'} cursor-pointer`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Delivery Time */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium mb-3">Delivery Time</h3>
                <div className="space-y-2">
                  {deliveryOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('delivery_time', option.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg ${activeFilters.delivery_time === option.value ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50'} cursor-pointer`}
                    >
                      {option.label}
                    </button>
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
                // Loading Skeleton
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
              ) : searchResults?.data?.results?.length > 0 ? (
                <>
                  {/* Results Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.data.results.map((item) => (
                      <button
                        key={item._id}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group text-left w-full"
                        onClick={() => navigate(`/services/${item.slug || item._id}`)}
                        aria-label={`View ${item.title}`}
                      >
                        {/* Thumbnail */}
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={item.thumbnail || (item.images?.[0]?.url) || 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80'}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80';
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
                              />
                              <div>
                                <h3 className="font-medium text-gray-900 text-sm">
                                  {item.user?.name || 'Seller'}
                                </h3>
                                
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              
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
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-8">
                      <nav className="flex items-center gap-2">
                        <button
                          disabled={!hasPrevPage || page <= 1}
                          onClick={() => handlePageChange(page - 1)}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          Previous
                        </button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-4 py-2 border rounded-lg transition-colors ${
                                page === pageNum
                                  ? 'border-green-600 bg-green-50 text-green-600'
                                  : 'border-gray-300 hover:bg-gray-50 cursor-pointer'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          disabled={!hasNextPage}
                          onClick={() => handlePageChange(page + 1)}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  )}
                </>
              ) : (
                // No Results
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No results found for "{query}"
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Try different keywords, check your spelling, or browse our categories.
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
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default SearchResults;