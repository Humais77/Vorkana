import React, { useState, useEffect } from "react";
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
  Loader2
} from "lucide-react";
import { useServices, useSearchServices, useCategories } from "../../hooks/useServices";
import { useToggleLike } from "../../hooks/useServices";
import { toast } from "react-hot-toast";

const ServiceListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get query parameters from URL
  const searchQuery = searchParams.get('q') || '';
  const categoryId = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || 'relevance';
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

  // Helper function to clean query parameters
  const cleanQueryParams = (params) => {
    const cleaned = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '' && params[key] !== null) {
        cleaned[key] = params[key];
      }
    });
    return cleaned;
  };

  // API Hooks with cleaned parameters
  const { 
    data: searchData, 
    isLoading: isSearching, 
    error: searchError,
    refetch: refetchSearch 
  } = useSearchServices(
    debouncedSearchTerm ? cleanQueryParams({
      query: debouncedSearchTerm.trim(),
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
      sort: sortBy !== 'relevance' ? sortBy : undefined,
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
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
      maxPrice: priceRange[1] < 10000 ? priceRange[1] : undefined,
      sort: sortBy !== 'relevance' ? sortBy : undefined,
      page: parseInt(page),
      limit: 12
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
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (debouncedSearchTerm.trim()) params.set('q', debouncedSearchTerm.trim());
    if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
    if (priceRange[0] > 0) params.set('minPrice', priceRange[0]);
    if (priceRange[1] < 10000) params.set('maxPrice', priceRange[1]);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    if (page !== '1') params.set('page', page);
    
    setSearchParams(params, { replace: true });
  }, [debouncedSearchTerm, selectedCategory, priceRange, sortBy, page, setSearchParams]);

  // Handle search
  const handleSearch = (e) => {
    e?.preventDefault();
    if (searchTerm.trim()) {
      setDebouncedSearchTerm(searchTerm.trim());
    }
  };

  // Handle category change
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  // Handle price range change
  const handlePriceRangeChange = (index, value) => {
    const newRange = [...priceRange];
    newRange[index] = parseInt(value) || 0;
    setPriceRange(newRange);
  };

  // Handle sort change
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  // Handle like
  const handleLike = async (serviceId, e) => {
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
  };

  // Handle view details
  const handleViewDetails = (serviceId, slug) => {
    navigate(`/services/${slug || serviceId}`);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedCategory('All');
    setPriceRange([0, 10000]);
    setSortBy('relevance');
    setSearchParams({});
    setApiError(null);
  };

  // Determine which data to show
  const services = debouncedSearchTerm ? 
    (searchData?.data || searchData || []) : 
    (allServicesData?.data || allServicesData || []);
  
  const isLoading = debouncedSearchTerm ? isSearching : isLoadingServices;
  const totalServices = debouncedSearchTerm ? 
    (searchData?.pagination?.total || services.length) : 
    (allServicesData?.pagination?.total || services.length);

  // Extract categories from API response
  const categories = [
    { _id: 'All', name: 'All Categories', icon: '📦' },
    ...(categoriesData?.map(cat => ({ 
      _id: cat._id, 
      name: cat.name,
      icon: cat.icon || '📁'
    })) || [])
  ];

  // Sort options
  const sortOptions = [
    { value: 'relevance', label: 'Most Relevant' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'delivery', label: 'Fastest Delivery' },
    { value: 'orders', label: 'Most Orders' },
    { value: 'newest', label: 'Newest First' }
  ];

  // Get seller information from service
  const getSellerInfo = (service) => {
    if (service.seller && typeof service.seller === 'object') {
      return service.seller;
    }
    return {
      username: 'Unknown Seller',
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg'
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 px-4">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Discover Amazing Services
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Find the perfect service for your needs from our talented professionals
            </p>
            
            {/* Search Bar */}
            <div className="max-w-3xl mx-auto relative">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
                  <input
                    type="text"
                    placeholder="What service are you looking for?"
                    className="w-full pl-12 pr-24 py-4 rounded-xl text-gray-900 text-lg focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[80px]"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Search'
                    )}
                  </button>
                </div>
              </form>
              
              {/* Quick Categories */}
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {!isLoadingCategories && categories.slice(1, 7).map(category => (
                  <button
                    key={category._id}
                    onClick={() => handleCategoryChange(category._id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedCategory === category._id
                        ? "bg-white text-blue-600"
                        : "bg-white/20 hover:bg-white/30 text-white"
                    }`}
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Display */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
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
                if (debouncedSearchTerm) {
                  refetchSearch();
                }
              }}
              className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters and Sorting Bar */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Filter className="w-5 h-5" />
                Filters
                {showFilters && <X className="w-4 h-4" />}
              </button>
              
              <div className="hidden md:flex items-center gap-4">
                <span className="text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
              <span className="text-gray-600">
                {totalServices} services found
              </span>
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={priceRange[0]}
                      onChange={(e) => handlePriceRangeChange(0, e.target.value)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={priceRange[1]}
                      onChange={(e) => handlePriceRangeChange(1, e.target.value)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>$0</span>
                  <span>$10,000</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {categories.map(category => (
                    <button
                      key={category._id}
                      onClick={() => handleCategoryChange(category._id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedCategory === category._id
                          ? "bg-blue-600 text-white"
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
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading services...</p>
            </div>
          </div>
        )}

        {/* Services Grid */}
        {!isLoading && services.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {services.map(service => {
                const sellerInfo = getSellerInfo(service);
                return (
                  <div
                    key={service._id}
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-300 group cursor-pointer"
                    onClick={() => handleViewDetails(service._id, service.slug)}
                  >
                    {/* Service Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={service.thumbnail || service.images?.[0] || 'https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg'}
                        alt={service.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = 'https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                      
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => handleLike(service._id, e)}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors ${
                            favorites.includes(service._id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-600 hover:text-red-500"
                          }`}
                        />
                      </button>
                      
                      {/* Featured Badge */}
                      {service.isFeatured && (
                        <div className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          <Sparkles className="w-3 h-3 inline mr-1" />
                          FEATURED
                        </div>
                      )}
                    </div>

                    {/* Service Content */}
                    <div className="p-5">
                      {/* Seller Info */}
                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={sellerInfo.avatar}
                          alt={sellerInfo.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {sellerInfo.username}
                            </h4>
                            {sellerInfo.verified && (
                              <CheckCircle className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          {sellerInfo.level && (
                            <span className="text-xs text-gray-500">{sellerInfo.level}</span>
                          )}
                        </div>
                      </div>

                      {/* Service Title & Description */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {service.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                        {service.shortDescription || service.description || 'No description available'}
                      </p>

                      {/* Tags */}
                      {service.tags && service.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {service.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-gray-900">{service.rating?.toFixed(1) || '0.0'}</span>
                          <span className="text-gray-500 text-sm">
                            ({service.reviewsCount || 0})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">
                            {service.deliveryTime} {service.deliveryTimeUnit || 'days'}
                          </span>
                        </div>
                      </div>

                      {/* Price & CTA */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                          <span className="text-xl font-bold text-gray-900">
                            {service.currency || '$'} {service.price?.toFixed(2) || '0.00'}
                          </span>
                          <span className="text-gray-500 text-xs block">Starting from</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(service._id, service.slug);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all hover:shadow-lg text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalServices > 12 && (
              <div className="flex justify-center items-center gap-4 mb-12">
                <button
                  onClick={() => setSearchParams(prev => {
                    const newPage = Math.max(1, parseInt(page) - 1);
                    prev.set('page', newPage.toString());
                    return prev;
                  })}
                  disabled={parseInt(page) === 1}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    parseInt(page) === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                  Previous
                </button>
                
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map(num => (
                    <button
                      key={num}
                      onClick={() => setSearchParams(prev => {
                        prev.set('page', num.toString());
                        return prev;
                      })}
                      className={`w-10 h-10 rounded-lg ${
                        parseInt(page) === num
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  {parseInt(page) > 3 && <span className="text-gray-400">...</span>}
                </div>
                
                <button
                  onClick={() => setSearchParams(prev => {
                    const newPage = parseInt(page) + 1;
                    prev.set('page', newPage.toString());
                    return prev;
                  })}
                  disabled={services.length < 12}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    services.length < 12
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Next
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              </div>
            )}
          </>
        )}

        {/* No Results */}
        {!isLoading && services.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {searchTerm ? 'No services found' : 'No services available'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm
                ? `No services found for "${searchTerm}". Try adjusting your search or filter criteria.`
                : 'There are currently no services available. Check back soon!'}
            </p>
            <button
              onClick={resetFilters}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {searchTerm ? 'Clear Search' : 'Browse All Services'}
            </button>
          </div>
        )}

        {/* Popular Services Section */}
        <PopularServices />

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white mb-8">
          <h2 className="text-3xl font-bold mb-4">
            Ready to find your perfect service?
          </h2>
          <p className="text-blue-100 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands of satisfied customers who found exactly what they needed
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/services')}
              className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Browse All Services
            </button>
            <button 
              onClick={() => navigate('/services/create')}
              className="px-8 py-3 bg-transparent border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
            >
              Start Selling
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceListingPage;