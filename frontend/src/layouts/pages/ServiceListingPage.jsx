// src/pages/ServiceListingPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PopularServices from "../../components/services/PopularService";
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
  Image as ImageIcon
} from "lucide-react";
import { useServices, useSearchServices, useCategories } from "../../hooks/useServices";
import { useToggleLike } from "../../hooks/useServices";
import { toast } from "react-hot-toast";
import { SeoWrapper } from "../../components/SeoWrapper";
import heroBg from "../../assets/bg.png";

const ServiceListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get query parameters from URL
  const searchQuery = searchParams.get('q') || searchParams.get('query') || '';
  const categoryId = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || 'createdAt';
  const page = searchParams.get('page') || '1';
  
  // Local state
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState(categoryId || 'All');
  const [priceRange, setPriceRange] = useState([
    minPrice ? parseInt(minPrice) : 0, 
    maxPrice ? parseInt(maxPrice) : 10000
  ]);
  const [sortBy, setSortBy] = useState(sort);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchQuery);
  const [apiError, setApiError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Helper function to clean query parameters
  const cleanQueryParams = useCallback((params) => {
    const cleaned = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '' && params[key] !== null) {
        cleaned[key] = params[key];
      }
    });
    return cleaned;
  }, []);

  // API Hooks with cleaned parameters
  const { 
    data: searchData, 
    isLoading: isSearching, 
    error: searchError,
    refetch: refetchSearch 
  } = useSearchServices(
    debouncedSearchTerm && debouncedSearchTerm.trim().length >= 2 ? cleanQueryParams({
      q: debouncedSearchTerm.trim(),
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
      sort: sortBy !== 'createdAt' ? sortBy : undefined,
      limit: 20
    }) : null
  );

  const { 
    data: categoriesData = [], 
    isLoading: isLoadingCategories 
  } = useCategories();

  const { 
    data: allServicesData, 
    isLoading: isLoadingServices,
    error: servicesError
  } = useServices(
    cleanQueryParams({
      page: parseInt(page),
      limit: 12,
      sort: sortBy,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
    })
  );

  const { mutate: toggleLike } = useToggleLike();

  // Handle API errors
  useEffect(() => {
    if (searchError || servicesError) {
      setApiError(searchError || servicesError);
    } else {
      setApiError(null);
    }
  }, [searchError, servicesError]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      // Reset to page 1 when search changes
      if (searchTerm !== searchQuery) {
        setSearchParams(prev => {
          if (searchTerm.trim()) {
            prev.set('q', searchTerm.trim());
          } else {
            prev.delete('q');
          }
          prev.set('page', '1');
          return prev;
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, searchQuery, setSearchParams]);

  // Update URL when filters change
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    const params = new URLSearchParams();
    
    if (page !== '1') params.set('page', page);
    if (debouncedSearchTerm.trim()) params.set('q', debouncedSearchTerm.trim());
    if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
    if (priceRange[0] > 0) params.set('minPrice', priceRange[0]);
    if (priceRange[1] < 10000) params.set('maxPrice', priceRange[1]);
    if (sortBy !== 'createdAt') params.set('sort', sortBy);
    
    setSearchParams(params, { replace: true });
  }, [selectedCategory, priceRange, sortBy, page, debouncedSearchTerm, setSearchParams, isInitialLoad]);

  // Handle search
  const handleSearch = useCallback((e) => {
    e?.preventDefault();
    const trimmedTerm = searchTerm.trim();
    
    if (trimmedTerm && trimmedTerm.length >= 2) {
      setDebouncedSearchTerm(trimmedTerm);
    } else if (!trimmedTerm) {
      setDebouncedSearchTerm('');
      setSearchTerm('');
      setSearchParams(prev => {
        prev.delete('q');
        prev.set('page', '1');
        return prev;
      });
    }
  }, [searchTerm, setSearchParams]);

  // Handle category change
  const handleCategoryChange = useCallback((categoryId) => {
    setSelectedCategory(categoryId);
    setSearchParams(prev => {
      if (categoryId !== 'All') {
        prev.set('category', categoryId);
      } else {
        prev.delete('category');
      }
      prev.set('page', '1');
      return prev;
    });
  }, [setSearchParams]);

  // Handle price range change
  const handlePriceRangeChange = useCallback((index, value) => {
    const newRange = [...priceRange];
    newRange[index] = parseInt(value) || 0;
    setPriceRange(newRange);
    
    setSearchParams(prev => {
      if (newRange[0] > 0) {
        prev.set('minPrice', newRange[0]);
      } else {
        prev.delete('minPrice');
      }
      if (newRange[1] < 10000) {
        prev.set('maxPrice', newRange[1]);
      } else {
        prev.delete('maxPrice');
      }
      prev.set('page', '1');
      return prev;
    });
  }, [priceRange, setSearchParams]);

  // Handle sort change
  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
    setSearchParams(prev => {
      if (e.target.value !== 'createdAt') {
        prev.set('sort', e.target.value);
      } else {
        prev.delete('sort');
      }
      prev.set('page', '1');
      return prev;
    });
  }, [setSearchParams]);

  // Handle like
  const handleLike = useCallback(async (serviceId, e) => {
    e.stopPropagation();
    try {
      await toggleLike({ serviceId, action: 'toggle' });
      setFavorites(prev => 
        prev.includes(serviceId) 
          ? prev.filter(id => id !== serviceId)
          : [...prev, serviceId]
      );
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  }, [toggleLike]);

  // Handle view details
  const handleViewDetails = useCallback((serviceId, slug) => {
    navigate(`/services/${slug || serviceId}`);
  }, [navigate]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedCategory('All');
    setPriceRange([0, 10000]);
    setSortBy('createdAt');
    setSearchParams({ page: '1' });
    setApiError(null);
    setIsInitialLoad(true);
  }, [setSearchParams]);

  // Determine which data to show
  const services = useMemo(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.trim().length >= 2) {
      return searchData?.data || searchData || [];
    } else {
      return allServicesData?.data || allServicesData || [];
    }
  }, [debouncedSearchTerm, searchData, allServicesData]);

  const isLoading = useMemo(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.trim().length >= 2) {
      return isSearching;
    } else {
      return isLoadingServices;
    }
  }, [debouncedSearchTerm, isSearching, isLoadingServices]);

  const totalServices = useMemo(() => {
    if (debouncedSearchTerm && debouncedSearchTerm.trim().length >= 2) {
      return searchData?.pagination?.total || services.length || 0;
    } else {
      return allServicesData?.pagination?.total || services.length || 0;
    }
  }, [debouncedSearchTerm, searchData, allServicesData, services]);

  // Extract categories
  const categories = useMemo(() => [
    { _id: 'All', name: 'All Categories', icon: '📦' },
    ...(categoriesData?.map(cat => ({ 
      _id: cat._id, 
      name: cat.name,
      icon: cat.icon || '📁'
    })) || [])
  ], [categoriesData]);

  // Sort options
  const sortOptions = useMemo(() => [
    { value: 'createdAt', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'delivery', label: 'Fastest Delivery' }
  ], []);

  // Get service thumbnail
  const getServiceThumbnail = useCallback((service) => {
    if (service.thumbnail?.url) {
      return service.thumbnail.url;
    }
    
    if (service.images && service.images.length > 0 && service.images[0]?.url) {
      return service.images[0].url;
    }
    
    const categoryName = service.categoryDetails?.name?.toLowerCase() || '';
    if (categoryName.includes('design') || categoryName.includes('art')) {
      return 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else if (categoryName.includes('development') || categoryName.includes('programming')) {
      return 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else if (categoryName.includes('writing') || categoryName.includes('content')) {
      return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else {
      return 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    }
  }, []);

  // Get seller information
  const getUserInfo = useCallback((service) => {
    if (service.createdBy && typeof service.createdBy === 'object') {
      return {
        username: service.createdBy.name || 'Service Provider',
        avatar: service.createdBy.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80',
        verified: service.createdBy.emailVerified || false,
        level: service.createdBy.accountType || 'Basic'
      };
    }
    
    if (service.creatorDetails && typeof service.creatorDetails === 'object') {
      return {
        username: service.creatorDetails.name || 'Service Provider',
        avatar: service.creatorDetails.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80',
        verified: service.creatorDetails.emailVerified || false,
        level: service.creatorDetails.accountType || 'Basic'
      };
    }
    
    return {
      username: 'Service Provider',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80',
      verified: false,
      level: 'Basic'
    };
  }, []);

  // Get current category name for SEO
  const getCurrentCategoryName = useCallback(() => {
    if (selectedCategory === 'All' || !selectedCategory) return null;
    const category = categories.find(cat => cat._id === selectedCategory);
    return category?.name || null;
  }, [selectedCategory, categories]);

  // SEO
  const seoTitle = useMemo(() => {
    const categoryName = getCurrentCategoryName();
    const baseTitle = "Browse Freelance Services | Vorkanna Marketplace";
    
    if (debouncedSearchTerm && categoryName) {
      return `${debouncedSearchTerm} - ${categoryName} Services | Vorkanna`;
    } else if (debouncedSearchTerm) {
      return `Search: ${debouncedSearchTerm} | Freelance Services | Vorkanna`;
    } else if (categoryName) {
      return `${categoryName} Services - Professional Freelancers | Vorkanna`;
    }
    
    return baseTitle;
  }, [debouncedSearchTerm, getCurrentCategoryName]);

  const seoDescription = useMemo(() => {
    const categoryName = getCurrentCategoryName();
    const baseDesc = "Discover thousands of professional freelance services. Find experts in design, development, writing, marketing, and more. Get quality work delivered fast.";
    
    if (debouncedSearchTerm && categoryName) {
      return `Find the best ${categoryName.toLowerCase()} services for "${debouncedSearchTerm}". Browse ${totalServices} professional freelance services with reviews, ratings, and competitive pricing.`;
    } else if (debouncedSearchTerm) {
      return `Search results for "${debouncedSearchTerm}". Browse ${totalServices} professional freelance services across all categories. Find experts for your project needs.`;
    } else if (categoryName) {
      return `Browse ${totalServices} professional ${categoryName.toLowerCase()} services from verified freelancers. Get quality work with fast delivery and competitive pricing.`;
    }
    
    return baseDesc;
  }, [debouncedSearchTerm, getCurrentCategoryName, totalServices]);

  // Pagination
  const handlePageChange = useCallback((newPage) => {
    setSearchParams(prev => {
      prev.set('page', newPage.toString());
      return prev;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  return (
    <SeoWrapper
      title={seoTitle}
      description={seoDescription}
      keywords={["freelance services", "hire freelancers", "online services"]}
      canonical={`/services${window.location.search}`}
      ogTitle={seoTitle}
      ogDescription={seoDescription}
      ogImage="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
      ogType="website"
    >
      <div className="min-h-screen bg-white">
        {/* Hero Section with heroBg */}
        <div 
          className="relative text-white py-16 px-4"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Discover Amazing Services
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Find the perfect service for your needs from our talented professionals
              </p>
              
              {/* Search Bar - unchanged */}
              <div className="max-w-3xl mx-auto relative">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="What service are you looking for? (min. 2 characters)"
                      className="w-full pl-12 pr-24 py-3 rounded-lg text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-gray-800"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search for services"
                      minLength={2}
                    />
                    <button 
                      type="submit"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-5 py-2 rounded-md hover:bg-black transition-colors flex items-center justify-center min-w-[80px]"
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Search'
                      )}
                    </button>
                  </div>
                </form>
                
                {/* Quick Categories - unchanged */}
                {!isLoadingCategories && categories.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {categories.slice(1, 7).map(category => (
                      <button
                        key={category._id}
                        onClick={() => handleCategoryChange(category._id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedCategory === category._id
                            ? "bg-white text-gray-900"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                      >
                        {category.icon} {category.name}
                      </button>
                    ))}
                  </div>
                )}
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
                <span className="font-medium">Error loading services</span>
              </div>
              <p className="text-red-600 text-sm mt-1">
                {apiError.message || 'Please try again or refresh the page'}
              </p>
              <button
                onClick={() => {
                  setApiError(null);
                  if (debouncedSearchTerm && debouncedSearchTerm.trim().length >= 2) {
                    refetchSearch();
                  }
                }}
                className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          )}

          {/* Filters and Sorting Bar */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {showFilters && <X className="w-4 h-4" />}
                </button>
                
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-gray-600 text-sm">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={handleSortChange}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-800 bg-white text-sm"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-gray-600 text-sm">
                  {totalServices} {debouncedSearchTerm ? 'results' : 'services'} found
                </span>
                {(searchTerm || selectedCategory !== 'All' || priceRange[0] > 0 || priceRange[1] < 10000 || sortBy !== 'createdAt') && (
                  <button
                    onClick={resetFilters}
                    className="px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-sm"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={priceRange[0]}
                      onChange={(e) => handlePriceRangeChange(0, e.target.value)}
                      className="w-full h-1.5 bg-gray-200 rounded appearance-none cursor-pointer"
                    />
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={priceRange[1]}
                      onChange={(e) => handlePriceRangeChange(1, e.target.value)}
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
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-gray-900 mx-auto mb-3" />
                <p className="text-gray-600">
                  {debouncedSearchTerm ? 'Searching services...' : 'Loading services...'}
                </p>
              </div>
            </div>
          )}

          {/* Services Grid */}
          {!isLoading && services.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {services.map(service => {
                  const userInfo = getUserInfo(service);
                  const thumbnailUrl = getServiceThumbnail(service);
                  
                  return (
                    <article
                      key={service._id}
                      className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                      onClick={() => handleViewDetails(service._id, service.slug)}
                    >
                      {/* Service Image */}
                      <div className="relative h-40 overflow-hidden">
                        <img
                          src={thumbnailUrl}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        
                        {/* Favorite Button */}
                        <button
                          onClick={(e) => handleLike(service._id, e)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
                        >
                          <Heart
                            className={`w-4 h-4 transition-colors ${
                              favorites.includes(service._id)
                                ? "fill-red-500 text-red-500"
                                : "text-gray-600 hover:text-red-500"
                            }`}
                          />
                        </button>
                        
                        {/* Featured Badge */}
                        {service.isFeatured && (
                          <div className="absolute top-3 left-3 bg-gray-900 text-white px-2 py-1 rounded text-xs font-medium">
                            <Sparkles className="w-3 h-3 inline mr-1" />
                            FEATURED
                          </div>
                        )}
                      </div>

                      {/* Service Content */}
                      <div className="p-4">
                        {/* Seller Info */}
                        <div className="flex items-center gap-2 mb-3">
                          <img
                            src={userInfo.avatar}
                            alt={userInfo.username}
                            className="w-8 h-8 rounded-full object-cover border border-gray-300"
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <h4 className="font-medium text-gray-900 text-sm">
                                {userInfo.username}
                              </h4>
                              {userInfo.verified && (
                                <CheckCircle className="w-3 h-3 text-gray-600" />
                              )}
                            </div>
                            <span className="text-xs text-gray-500 capitalize">{userInfo.level}</span>
                          </div>
                        </div>

                        {/* Service Title & Description */}
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">
                          {service.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2 min-h-[40px]">
                          {service.shortDescription || service.description || 'No description available'}
                        </p>

                        {/* Price & CTA */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div>
                            <span className="text-lg font-bold text-gray-900">
                              {service.currency || '$'} {service.price?.toFixed(2) || '0.00'}
                            </span>
                            <span className="text-gray-500 text-xs block">Starting from</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(service._id, service.slug);
                            }}
                            className="px-3 py-1.5 bg-gray-900 text-white font-medium rounded-md hover:bg-black transition-colors text-sm"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalServices > 12 && (
                <nav className="flex justify-center items-center gap-3 mb-8">
                  <button
                    onClick={() => handlePageChange(Math.max(1, parseInt(page) - 1))}
                    disabled={parseInt(page) === 1}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm ${
                      parseInt(page) === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    <ChevronDown className="w-3 h-3 rotate-90" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map(num => (
                      <button
                        key={num}
                        onClick={() => handlePageChange(num)}
                        className={`w-8 h-8 rounded-md text-sm ${
                          parseInt(page) === num
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    {parseInt(page) > 3 && <span className="text-gray-400">...</span>}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(parseInt(page) + 1)}
                    disabled={services.length < 12}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm ${
                      services.length < 12
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    Next
                    <ChevronDown className="w-3 h-3 -rotate-90" />
                  </button>
                </nav>
              )}
            </>
          )}

          {/* No Results */}
          {!isLoading && services.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {debouncedSearchTerm ? 'No services found' : 'No services available'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {debouncedSearchTerm
                  ? `No services found for "${debouncedSearchTerm}". Try adjusting your search or filter criteria.`
                  : 'There are currently no services available. Check back soon!'}
              </p>
              {debouncedSearchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearchTerm('');
                    setSearchParams({ page: '1' });
                  }}
                  className="px-5 py-2.5 bg-gray-900 text-white rounded-md hover:bg-black transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
          {/* CTA Section */}
          <div className="bg-gray-900 rounded-lg p-6 text-center text-white mb-6">
            <h2 className="text-2xl font-bold mb-3">
              Ready to find your perfect service?
            </h2>
            <p className="text-gray-300 mb-4 max-w-2xl mx-auto">
              Join thousands of satisfied customers who found exactly what they needed
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2.5 bg-white text-gray-900 font-bold rounded-md hover:bg-gray-100 transition-colors"
              >
                Offer Your Servivce
              </button>
              <button 
                onClick={() => navigate('/gigs')}
                className="px-6 py-2.5 bg-transparent border border-white text-white font-bold rounded-md hover:bg-white/10 transition-colors"
              >
                 Browse Gigs Instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default ServiceListingPage;