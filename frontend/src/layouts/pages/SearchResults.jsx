// SearchResultsPage.jsx - Production ready with GigListingPage design
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Star,
  Clock,
  DollarSign,
  CheckCircle,
  TrendingUp,
  ChevronDown,
  X,
  Sparkles,
  Heart,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Zap,
  Users,
  ArrowLeft,
  User,
  Tag,
  Eye,
  ThumbsUp,
  Grid,
  List
} from 'lucide-react';
import { useSearchResults } from '../../hooks/useSearch';
import { toast } from 'react-hot-toast';
import { SeoWrapper } from '../../components/SeoWrapper';
import { DEFAULT_IMAGES } from '../../utils/defaultImages';

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Parse URL parameters
  const query = searchParams.get('query') || '';
  const type = searchParams.get('type') || 'services';
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('min_price') || searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('max_price') || searchParams.get('maxPrice') || '';
  const minRating = searchParams.get('min_rating') || searchParams.get('minRating') || '';
  const deliveryTime = searchParams.get('delivery_time') || searchParams.get('deliveryTime') || '';
  const urgency = searchParams.get('urgency') || '';
  const sort = searchParams.get('sort') || 'relevance';
  const page = searchParams.get('page') || '1';
  
  // Local state
  const [searchTerm, setSearchTerm] = useState(query);
  const [selectedType, setSelectedType] = useState(type);
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [budgetRange, setBudgetRange] = useState([
    minPrice ? parseInt(minPrice) : 0,
    maxPrice ? parseInt(maxPrice) : 10000
  ]);
  const [selectedRating, setSelectedRating] = useState(minRating || '');
  const [selectedDeliveryTime, setSelectedDeliveryTime] = useState(deliveryTime);
  const [selectedUrgency, setSelectedUrgency] = useState(urgency);
  const [sortBy, setSortBy] = useState(sort);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [apiError, setApiError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Use search hook
  const {
    searchResults,
    isLoading,
    isFetching,
    isError,
    error,
    updateFilters,
    removeFilter,
    clearAllFilters,
    filterCount,
    totalResults,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    suggestions,
    filterOptions
  } = useSearchResults({
    query,
    type,
    page,
    filters: {
      category,
      min_price: minPrice,
      max_price: maxPrice,
      min_rating: minRating,
      delivery_time: deliveryTime,
      urgency,
      sort
    }
  });

  // Handle errors
  useEffect(() => {
    if (isError) {
      setApiError(error);
      toast.error(error?.message || 'Failed to load search results');
    } else {
      setApiError(null);
    }
  }, [isError, error]);

  // Update URL when filters change
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    const params = new URLSearchParams();
    
    if (query) params.set('query', query);
    if (selectedType !== 'services') params.set('type', selectedType);
    if (page !== '1') params.set('page', page);
    if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
    if (budgetRange[0] > 0) params.set('min_price', budgetRange[0]);
    if (budgetRange[1] < 10000) params.set('max_price', budgetRange[1]);
    if (selectedRating) params.set('min_rating', selectedRating);
    if (selectedDeliveryTime) params.set('delivery_time', selectedDeliveryTime);
    if (selectedUrgency) params.set('urgency', selectedUrgency);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    
    setSearchParams(params, { replace: true });
  }, [
    selectedType, selectedCategory, budgetRange, selectedRating,
    selectedDeliveryTime, selectedUrgency, sortBy, page, query,
    setSearchParams, isInitialLoad
  ]);

  // Handle search
  const handleSearch = useCallback((e) => {
    e?.preventDefault();
    const trimmedTerm = searchTerm.trim();
    
    if (trimmedTerm) {
      navigate(`/search?query=${encodeURIComponent(trimmedTerm)}&type=${selectedType}`);
    } else {
      navigate('/search');
    }
  }, [searchTerm, selectedType, navigate]);

  // Handle type change
  const handleTypeChange = useCallback((type) => {
    setSelectedType(type);
    updateFilters({ type, page: 1 });
  }, [updateFilters]);

  // Handle category change
  const handleCategoryChange = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
    updateFilters({ 
      category: categoryId !== 'all' ? categoryId : '',
      page: 1 
    });
  }, [updateFilters]);

  // Handle budget range change
  const handleBudgetRangeChange = useCallback((index, value) => {
    const newRange = [...budgetRange];
    newRange[index] = parseInt(value) || 0;
    setBudgetRange(newRange);
    
    updateFilters({
      min_price: newRange[0] > 0 ? newRange[0] : '',
      max_price: newRange[1] < 10000 ? newRange[1] : '',
      page: 1
    });
  }, [budgetRange, updateFilters]);

  // Handle rating change
  const handleRatingChange = useCallback((rating) => {
    setSelectedRating(rating);
    updateFilters({ min_rating: rating, page: 1 });
  }, [updateFilters]);

  // Handle delivery time change
  const handleDeliveryTimeChange = useCallback((time) => {
    setSelectedDeliveryTime(time);
    updateFilters({ delivery_time: time, page: 1 });
  }, [updateFilters]);

  // Handle urgency change
  const handleUrgencyChange = useCallback((urgencyValue) => {
    setSelectedUrgency(urgencyValue);
    updateFilters({ urgency: urgencyValue, page: 1 });
  }, [updateFilters]);

  // Handle sort change
  const handleSortChange = useCallback((value) => {
    setSortBy(value);
    updateFilters({ sort: value, page: 1 });
  }, [updateFilters]);

  // Handle like (favorite)
  const handleLike = useCallback(async (itemId, e) => {
    e.stopPropagation();
    try {
      setFavorites(prev => 
        prev.includes(itemId) 
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      );
      toast.success(favorites.includes(itemId) ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  }, [favorites]);

  // Handle view details
  const handleViewDetails = useCallback((item) => {
    if (item.type === 'service' || selectedType === 'services') {
      navigate(`/services/${item.slug || item._id}`);
    } else {
      navigate(`/gig/${item.slug || item._id}`);
    }
  }, [selectedType, navigate]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedType('services');
    setSelectedCategory('all');
    setSelectedRating('');
    setSelectedDeliveryTime('');
    setSelectedUrgency('');
    setBudgetRange([0, 10000]);
    setSortBy('relevance');
    clearAllFilters();
    navigate('/search');
  }, [clearAllFilters, navigate]);

  // Extract results
  const results = useMemo(() => {
    return searchResults?.results || [];
  }, [searchResults]);

  // Categories
  const categories = useMemo(() => {
    const defaultCats = [
      { _id: 'all', name: 'All Categories', icon: '📦' },
      { _id: 'design', name: 'Design', icon: '🎨' },
      { _id: 'development', name: 'Development', icon: '💻' },
      { _id: 'writing', name: 'Writing', icon: '✍️' },
      { _id: 'marketing', name: 'Marketing', icon: '📈' },
      { _id: 'video', name: 'Video & Animation', icon: '🎥' }
    ];
    
    if (searchResults?.related?.categories) {
      return [
        { _id: 'all', name: 'All Categories', icon: '📦' },
        ...searchResults.related.categories.map(cat => ({
          _id: cat._id,
          name: cat.name,
          icon: cat.icon || '📁'
        }))
      ];
    }
    
    return defaultCats;
  }, [searchResults]);

  // Sort options from API or default
  const sortOptions = useMemo(() => {
    if (filterOptions.sort && filterOptions.sort.length > 0) {
      return filterOptions.sort;
    }
    
    return [
      { value: 'relevance', label: 'Most Relevant', icon: Sparkles },
      { value: 'newest', label: 'Newest First', icon: Calendar },
      { value: 'rating', label: 'Highest Rated', icon: Star },
      { value: 'price_low', label: 'Price: Low to High', icon: DollarSign },
      { value: 'price_high', label: 'Price: High to Low', icon: DollarSign },
      { value: 'trending', label: 'Trending Now', icon: TrendingUp }
    ];
  }, [filterOptions]);

  // Rating options
  const ratingOptions = useMemo(() => {
    if (filterOptions.rating && filterOptions.rating.length > 0) {
      return filterOptions.rating;
    }
    
    return [
      { value: '', label: 'Any Rating' },
      { value: '4.5', label: '4.5+ Stars' },
      { value: '4.0', label: '4.0+ Stars' },
      { value: '3.5', label: '3.5+ Stars' },
      { value: '3.0', label: '3.0+ Stars' }
    ];
  }, [filterOptions]);

  // Delivery time options
  const deliveryOptions = useMemo(() => {
    if (filterOptions.deliveryTime && filterOptions.deliveryTime.length > 0) {
      return filterOptions.deliveryTime;
    }
    
    return [
      { value: '', label: 'Any Delivery Time' },
      { value: '1', label: '24 Hours' },
      { value: '3', label: '3 Days' },
      { value: '7', label: '7 Days' },
      { value: '14', label: '14 Days' },
      { value: '30', label: '30 Days' }
    ];
  }, [filterOptions]);

  // Budget options
  const budgetOptions = useMemo(() => {
    if (filterOptions.budget && filterOptions.budget.length > 0) {
      return filterOptions.budget;
    }
    
    return [
      { value: '', label: 'Any Budget', range: [0, 10000], count: 0 },
      { value: '0-50', label: 'Under $50', range: [0, 50], count: 0 },
      { value: '50-100', label: '$50 - $100', range: [50, 100], count: 0 },
      { value: '100-200', label: '$100 - $200', range: [100, 200], count: 0 },
      { value: '200-500', label: '$200 - $500', range: [200, 500], count: 0 },
      { value: '500-1000', label: '$500 - $1,000', range: [500, 1000], count: 0 },
      { value: '1000-10000', label: '$1,000+', range: [1000, 10000], count: 0 }
    ];
  }, [filterOptions]);

  // Urgency options
  const urgencyOptions = useMemo(() => [
    { value: '', label: 'All Urgency' },
    { value: 'high', label: 'High Urgency' },
    { value: 'medium', label: 'Medium Urgency' },
    { value: 'low', label: 'Low Urgency' }
  ], []);

  // Get item thumbnail
  const getItemThumbnail = useCallback((item) => {
    if (item.thumbnail) return item.thumbnail;
    if (item.images && item.images.length > 0 && item.images[0]) {
      return typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url;
    }
    return DEFAULT_IMAGES.GENERIC;
  }, []);

  // Get seller info
  const getSellerInfo = useCallback((item) => {
    if (item.seller) return item.seller;
    return null;
  }, []);

  // Get user initials
  const getUserInitials = useCallback((userInfo) => {
    if (!userInfo) return '?';
    
    if (userInfo.name) {
      const names = userInfo.name.trim().split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    
    if (userInfo.username) {
      return userInfo.username.charAt(0).toUpperCase();
    }
    
    return '?';
  }, []);

  // Format price
  const formatPrice = useCallback((item) => {
    if (item.priceFormatted) return item.priceFormatted;
    if (selectedType === 'services') {
      return item.price ? `$${item.price.toFixed(2)}` : 'Starting at $5';
    } else {
      return item.budget ? `$${item.budget}` : 'Negotiable';
    }
  }, [selectedType]);

  // Get delivery time text
  const getDeliveryText = useCallback((item) => {
    if (selectedType === 'services') {
      return item.deliveryTime ? `${item.deliveryTime} ${item.deliveryTimeUnit || 'days'}` : 'Custom';
    } else {
      return item.timeline ? `${item.timeline} ${item.timelineUnit || 'days'}` : 'Custom';
    }
  }, [selectedType]);

  // Pagination functions
  const handlePageChange = useCallback((newPage) => {
    updateFilters({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [updateFilters]);

  // Generate SEO data
  const seoTitle = useMemo(() => {
    if (query) {
      return `${totalResults} Results for "${query}" | Search ${selectedType === 'gigs' ? 'Gigs' : 'Services'} | Vorkanna`;
    }
    return `Search ${selectedType === 'gigs' ? 'Gigs' : 'Services'} | Vorkanna Marketplace`;
  }, [query, totalResults, selectedType]);

  const seoDescription = useMemo(() => {
    if (query) {
      return `Find the best ${selectedType} for "${query}". Browse ${totalResults} results with filters for budget, rating, delivery time, and more.`;
    }
    return `Search thousands of ${selectedType} on Vorkanna. Find exactly what you need with our advanced filters and sorting options.`;
  }, [query, totalResults, selectedType]);

  // Generate structured data
  const structuredData = useMemo(() => {
    if (!results || results.length === 0) return null;
    
    const websiteUrl = window.location.origin;
    
    const structuredItems = results.slice(0, 10).map((item, index) => ({
      "@type": selectedType === 'services' ? "Service" : "Offer",
      "position": index + 1,
      "url": `${websiteUrl}/${selectedType === 'services' ? 'services' : 'gig'}/${item.slug || item._id}`,
      "name": item.title,
      "description": item.descriptionShort || item.description?.substring(0, 200) || 'Professional service',
      "provider": {
        "@type": "Person",
        "name": item.seller?.name || "Provider"
      },
      "offers": {
        "@type": "Offer",
        "price": item.price || item.budget || 0,
        "priceCurrency": item.currency || "USD"
      }
    }));
    
    return {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      "name": seoTitle,
      "description": seoDescription,
      "url": `${websiteUrl}/search?query=${encodeURIComponent(query)}`,
      "query": query,
      "numberOfItems": totalResults,
      "itemListElement": structuredItems
    };
  }, [results, selectedType, seoTitle, seoDescription, query, totalResults]);

  return (
    <SeoWrapper
      title={seoTitle}
      description={seoDescription}
      canonical={`/search?query=${encodeURIComponent(query)}`}
      structuredData={structuredData}
      robots={totalResults === 0 ? "noindex, follow" : "index, follow"}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {query ? `Search Results for "${query}"` : 'Search Marketplace'}
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                {selectedType === 'services' 
                  ? 'Find professional services for your needs'
                  : 'Discover freelance gigs and projects'
                }
              </p>
              
              {/* Search Bar */}
              <div className="max-w-3xl mx-auto relative">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder={`Search for ${selectedType}...`}
                      className="w-full pl-12 pr-24 py-3 rounded-lg text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-gray-800"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search"
                    />
                    <button 
                      type="submit"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-5 py-2 rounded-md hover:bg-black transition-colors flex items-center justify-center min-w-[80px]"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Search'
                      )}
                    </button>
                  </div>
                </form>
                
                {/* Quick Type Toggle */}
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={() => handleTypeChange('services')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedType === 'services'
                        ? "bg-white text-gray-900"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    Services
                  </button>
                  <button
                    onClick={() => handleTypeChange('gigs')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedType === 'gigs'
                        ? "bg-white text-gray-900"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    Gigs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Error Display */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center text-red-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">Error loading results</span>
              </div>
              <p className="text-red-600 text-sm mt-1">
                {apiError.message || 'Please try again or refresh the page'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* Filters and Sorting Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {filterCount > 0 && (
                    <span className="bg-gray-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {filterCount}
                    </span>
                  )}
                </button>
                
                {/* View Mode Toggle */}
                <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-gray-600 text-sm">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-800 bg-white text-sm"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <span className="text-gray-600 text-sm">
                  {totalResults || 0} results found
                </span>
                {filterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-sm"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Sort */}
            <div className="md:hidden mt-4">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-800 bg-white text-sm"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget Range: ${budgetRange[0]} - ${budgetRange[1]}
                  </label>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={budgetRange[0]}
                      onChange={(e) => handleBudgetRangeChange(0, e.target.value)}
                      className="w-full h-1.5 bg-gray-200 rounded appearance-none cursor-pointer"
                    />
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={budgetRange[1]}
                      onChange={(e) => handleBudgetRangeChange(1, e.target.value)}
                      className="w-full h-1.5 bg-gray-200 rounded appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$0</span>
                    <span>$10,000</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {categories.map(category => (
                      <button
                        key={category._id}
                        onClick={() => handleCategoryChange(category._id)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          selectedCategory === category._id
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <span className="mr-2">{category.icon}</span>
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedType === 'services' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Rating
                      </label>
                      <div className="space-y-1">
                        {ratingOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => handleRatingChange(option.value)}
                            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                              selectedRating === option.value
                                ? "bg-gray-900 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Time
                      </label>
                      <div className="space-y-1">
                        {deliveryOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => handleDeliveryTimeChange(option.value)}
                            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                              selectedDeliveryTime === option.value
                                ? "bg-gray-900 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedType === 'gigs' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Urgency
                    </label>
                    <div className="space-y-1">
                      {urgencyOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => handleUrgencyChange(option.value)}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                            selectedUrgency === option.value
                              ? "bg-gray-900 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-gray-900 mx-auto mb-3" />
                <p className="text-gray-600">
                  {searchTerm ? 'Searching...' : 'Loading results...'}
                </p>
              </div>
            </div>
          )}

          {/* Results Grid/List */}
          {!isLoading && results.length > 0 && (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                  {results.map((item) => {
                    const sellerInfo = getSellerInfo(item);
                    const thumbnailUrl = getItemThumbnail(item);
                    const deliveryText = getDeliveryText(item);
                    const priceText = formatPrice(item);
                    
                    return (
                      <article
                        key={item._id}
                        className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                        onClick={() => handleViewDetails(item)}
                      >
                        {/* Item Image */}
                        <div className="relative h-40 overflow-hidden bg-gray-100">
                          <img
                            src={thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = DEFAULT_IMAGES.GENERIC;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          
                          {/* Favorite Button */}
                          <button
                            onClick={(e) => handleLike(item._id, e)}
                            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
                          >
                            <Heart
                              className={`w-4 h-4 transition-colors ${
                                favorites.includes(item._id)
                                  ? "fill-red-500 text-red-500"
                                  : "text-gray-600 hover:text-red-500"
                              }`}
                            />
                          </button>
                          
                          {/* Badges */}
                          {item.urgency === 'high' && (
                            <div className="absolute top-3 left-3 bg-gray-900 text-white px-2 py-1 rounded text-xs font-bold">
                              <Zap className="w-3 h-3 inline mr-1" />
                              URGENT
                            </div>
                          )}
                          {item.isFeatured && (
                            <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
                              <Star className="w-3 h-3 inline mr-1" />
                              FEATURED
                            </div>
                          )}
                        </div>

                        {/* Item Content */}
                        <div className="p-4">
                          {/* Seller Info */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="relative">
                              {sellerInfo?.picture ? (
                                <img
                                  src={sellerInfo.picture}
                                  alt={sellerInfo.name || sellerInfo.username || 'Seller'}
                                  className="w-8 h-8 rounded-full object-cover border border-gray-300"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-600">
                                    {getUserInitials(sellerInfo)}
                                  </span>
                                </div>
                              )}
                              {sellerInfo?.emailVerified && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border border-white">
                                  <CheckCircle className="w-3 h-3 text-white" fill="white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              {sellerInfo ? (
                                <>
                                  <div className="flex items-center gap-1">
                                    <h4 className="font-medium text-gray-900 text-sm truncate">
                                      {sellerInfo.name || sellerInfo.username || 'Seller'}
                                    </h4>
                                    {sellerInfo.emailVerified && (
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                    )}
                                  </div>
                                  {sellerInfo.rating && (
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                      <span className="text-xs text-gray-600">
                                        {sellerInfo.rating.toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-xs text-gray-500 italic">
                                  Seller information not available
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Item Title & Description */}
                          <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2 min-h-[40px]">
                            {item.description || item.descriptionShort || 'No description provided.'}
                          </p>

                          {/* Item Details */}
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{deliveryText}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span className="font-bold text-gray-900">{priceText}</span>
                            </div>
                          </div>

                          {/* CTA Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(item);
                            }}
                            className="w-full px-3 py-1.5 bg-gray-900 text-white font-medium rounded-md hover:bg-black transition-colors text-sm"
                          >
                            {selectedType === 'services' ? 'View Service' : 'View Gig'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                /* List View */
                <div className="space-y-4 mb-8">
                  {results.map((item) => {
                    const sellerInfo = getSellerInfo(item);
                    const thumbnailUrl = getItemThumbnail(item);
                    const deliveryText = getDeliveryText(item);
                    const priceText = formatPrice(item);
                    
                    return (
                      <article
                        key={item._id}
                        className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                        onClick={() => handleViewDetails(item)}
                      >
                        <div className="flex flex-col md:flex-row">
                          {/* Item Image */}
                          <div className="relative w-full md:w-48 h-48 md:h-auto overflow-hidden bg-gray-100">
                            <img
                              src={thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = DEFAULT_IMAGES.GENERIC;
                              }}
                            />
                          </div>

                          {/* Item Content */}
                          <div className="flex-1 p-4">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {sellerInfo?.picture ? (
                                    <img
                                      src={sellerInfo.picture}
                                      alt={sellerInfo.name}
                                      className="w-8 h-8 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                      <span className="text-xs font-medium">
                                        {getUserInitials(sellerInfo)}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="font-medium text-sm">
                                      {sellerInfo?.name || 'Seller'}
                                    </h4>
                                    {sellerInfo?.rating && (
                                      <div className="flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-500" />
                                        <span className="text-xs">{sellerInfo.rating.toFixed(1)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                                <p className="text-gray-600 mb-3 line-clamp-2">
                                  {item.description || item.descriptionShort}
                                </p>

                                <div className="flex flex-wrap gap-2 mb-3">
                                  {item.tags?.slice(0, 3).map((tag, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                <div className="text-right">
                                  <div className="text-2xl font-bold">{priceText}</div>
                                  <div className="text-sm text-gray-500">{deliveryText}</div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(item);
                                  }}
                                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-4 mb-8">
                  <nav className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={!hasPrevPage}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm ${
                        !hasPrevPage
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-black'
                      }`}
                    >
                      <ChevronDown className="w-3 h-3 rotate-90" />
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 rounded-md text-sm ${
                              currentPage === pageNum
                                ? 'bg-gray-900 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      {totalPages > 5 && <span className="text-gray-400">...</span>}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!hasNextPage}
                      className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm ${
                        !hasNextPage
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-black'
                      }`}
                    >
                      Next
                      <ChevronDown className="w-3 h-3 -rotate-90" />
                    </button>
                  </nav>
                  
                  <div className="text-center text-sm text-gray-600">
                    Page {currentPage} of {totalPages} • Showing {results.length} of {totalResults} results
                  </div>
                </div>
              )}
            </>
          )}

          {/* No Results */}
          {!isLoading && results.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {query ? 'No results found' : 'Start searching'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {query
                  ? `No ${selectedType} found for "${query}". Try adjusting your search or filter criteria.`
                  : `Search for ${selectedType} using the search bar above.`}
              </p>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center mb-6">
                  {suggestions.slice(0, 6).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => navigate(`/search?query=${encodeURIComponent(suggestion.title || suggestion.text)}&type=${selectedType}`)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      {suggestion.title || suggestion.text}
                    </button>
                  ))}
                </div>
              )}
              {query && (
                <button
                  onClick={resetFilters}
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-md hover:bg-black transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* Related Categories */}
          {searchResults?.related?.categories && searchResults.related.categories.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">Related Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {searchResults.related.categories.map(category => (
                  <button
                    key={category._id}
                    onClick={() => navigate(`/search?query=${category.name}&type=${selectedType}&category=${category._id}`)}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 mb-2 flex items-center justify-center text-2xl">
                      {category.icon || '📁'}
                    </div>
                    <span className="text-sm font-medium text-center">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              {selectedType === 'services' 
                ? 'Ready to find the perfect service?'
                : 'Looking for talented freelancers?'}
            </h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto text-lg">
              {selectedType === 'services'
                ? 'Join thousands of clients who found exactly what they needed'
                : 'Connect with top professionals for your projects'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition-colors"
              >
                {selectedType === 'services' ? 'Post a Project' : 'Browse Services'}
              </button>
              <button 
                onClick={() => navigate(selectedType === 'services' ? '/gigs' : '/services')}
                className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
              >
                {selectedType === 'services' ? 'Browse Gigs Instead' : 'Browse Services Instead'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default SearchResultsPage;