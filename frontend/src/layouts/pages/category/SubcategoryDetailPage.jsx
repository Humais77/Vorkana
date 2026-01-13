import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  ChevronRight, 
  ArrowLeft, 
  Filter, 
  Search, 
  Star,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  Award,
  Loader,
  DollarSign,
  Zap,
  Heart,
  X,
  ChevronDown,
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
  Mail,
  User as UserIcon
} from 'lucide-react';
import { SeoWrapper } from '../../../components/SeoWrapper';
import { useCategory } from '../../../hooks/useCategories';
import { useSubcategory } from '../../../hooks/useSubcategories';
import { useServicesBySubcategory } from '../../../hooks/useServices';
import { authAPI } from '../../../api/auth';
import { toast } from 'react-hot-toast';

const SubcategoryDetailPage = () => {
  const { categoryId, subcategorySlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get query parameters from URL
  const searchQuery = searchParams.get('q') || searchParams.get('search') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const delivery = searchParams.get('delivery') || '';
  const sort = searchParams.get('sort') || 'popular';
  const page = searchParams.get('page') || '1';
  
  // State
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [priceRange, setPriceRange] = useState([
    minPrice ? parseInt(minPrice) : 0, 
    maxPrice ? parseInt(maxPrice) : 10000
  ]);
  const [deliveryTime, setDeliveryTime] = useState(delivery);
  const [sortBy, setSortBy] = useState(sort);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchQuery);
  const [apiError, setApiError] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [actualSubcategoryId, setActualSubcategoryId] = useState(null);
  const [userProfiles, setUserProfiles] = useState({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // First fetch the subcategory by slug
  const { 
    data: subcategoryData, 
    isLoading: subcategoryLoading,
    error: subcategoryError 
  } = useSubcategory(subcategorySlug, {
    enabled: !!subcategorySlug,
  });

  // Once we have the subcategory data, get its ID
  useEffect(() => {
    if (subcategoryData?._id) {
      setActualSubcategoryId(subcategoryData._id);
    }
  }, [subcategoryData]);

  // Then fetch the category
  const { 
    data: categoryData, 
    isLoading: categoryLoading,
    error: categoryError 
  } = useCategory(categoryId, {
    enabled: !!categoryId && !!subcategoryData,
  });

  // Finally fetch services by the specific subcategory ID
  const { 
    data: servicesData,
    isLoading: servicesLoading,
    error: servicesError,
    refetch: refetchServices
  } = useServicesBySubcategory(actualSubcategoryId, {
    enabled: !!actualSubcategoryId && !!subcategoryData,
  });

  // Combined loading state
  const isLoading = categoryLoading || subcategoryLoading || servicesLoading || loadingProfiles;

  // Fetch user profiles for each service
  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (!servicesData?.data?.length && !servicesData?.length) return;
      
      const services = servicesData?.data || servicesData || [];
      if (services.length === 0) return;
      
      setLoadingProfiles(true);
      
      try {
        const profiles = {};
        const currentUser = authAPI.getCurrentUser();
        
        // If current user exists, add to profiles
        if (currentUser?._id) {
          profiles[currentUser._id] = {
            name: currentUser.name || '',
            email: currentUser.email || '',
            picture: currentUser.picture || '',
            emailVerified: currentUser.emailVerified || false,
            username: currentUser.username || ''
          };
        }
        
        // Process each service to get user data
        for (const service of services) {
          const sellerId = service.seller?._id;
          
          if (sellerId && !profiles[sellerId]) {
            try {
              // Get real user data from auth API
              const response = await authAPI.getPublicProfile(sellerId);
              
              if (response.success && response.user) {
                const user = response.user;
                
                // Only add if we have real user data
                if (user._id) {
                  profiles[sellerId] = {
                    name: user.name || '',
                    email: user.email || '',
                    picture: user.picture || '',
                    emailVerified: user.emailVerified || false,
                    username: user.username || ''
                  };
                }
              }
            } catch (error) {
             throw warn(`Could not fetch user profile for ${sellerId}:`, error.message);
              // Don't add to profiles if we can't fetch
            }
          }
        }
        
        setUserProfiles(profiles);
      } catch (error) {
       throw error('Error fetching user profiles:', error);
      } finally {
        setLoadingProfiles(false);
      }
    };
    
    if (!servicesLoading && (servicesData?.data || servicesData)) {
      fetchUserProfiles();
    }
  }, [servicesData, servicesLoading]);

  // Handle API errors
  useEffect(() => {
    const error = categoryError || subcategoryError || servicesError;
    if (error) {
      setApiError(error);
      toast.error(error.message || 'Failed to load data');
    } else {
      setApiError(null);
    }
  }, [categoryError, subcategoryError, servicesError]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
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
    if (priceRange[0] > 0) params.set('minPrice', priceRange[0]);
    if (priceRange[1] < 10000) params.set('maxPrice', priceRange[1]);
    if (deliveryTime && deliveryTime !== 'any') params.set('delivery', deliveryTime);
    if (sortBy !== 'popular') params.set('sort', sortBy);
    
    setSearchParams(params, { replace: true });
  }, [priceRange, deliveryTime, sortBy, page, debouncedSearchTerm, setSearchParams, isInitialLoad]);

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

  // Handle delivery time change
  const handleDeliveryTimeChange = useCallback((deliveryValue) => {
    setDeliveryTime(deliveryValue);
    setSearchParams(prev => {
      if (deliveryValue && deliveryValue !== 'any') {
        prev.set('delivery', deliveryValue);
      } else {
        prev.delete('delivery');
      }
      prev.set('page', '1');
      return prev;
    });
  }, [setSearchParams]);

  // Handle sort change
  const handleSortChange = useCallback((sortValue) => {
    setSortBy(sortValue);
    setSearchParams(prev => {
      if (sortValue !== 'popular') {
        prev.set('sort', sortValue);
      } else {
        prev.delete('sort');
      }
      prev.set('page', '1');
      return prev;
    });
  }, [setSearchParams]);

  // Handle like (favorite)
  const handleLike = useCallback(async (serviceId, e) => {
    e.stopPropagation();
    try {
      setFavorites(prev => 
        prev.includes(serviceId) 
          ? prev.filter(id => id !== serviceId)
          : [...prev, serviceId]
      );
      toast.success(favorites.includes(serviceId) ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  }, [favorites]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setPriceRange([0, 10000]);
    setDeliveryTime('any');
    setSortBy('popular');
    setSearchParams({ page: '1' });
    setApiError(null);
    setIsInitialLoad(true);
  }, [setSearchParams]);

  // Extract services from response - FILTER BY SUBCATEGORY
  const services = useMemo(() => {
    const rawServices = servicesData?.data || servicesData || [];
    
    // Additional client-side filtering to ensure we only show services from this subcategory
    const filtered = rawServices.filter(service => {
      // Check if service belongs to the current subcategory
      if (actualSubcategoryId && service.subcategory) {
        const serviceSubcategoryId = typeof service.subcategory === 'string' 
          ? service.subcategory 
          : service.subcategory._id;
        
        return serviceSubcategoryId === actualSubcategoryId;
      }
      
      return true;
    });
    
    return filtered;
  }, [servicesData, actualSubcategoryId]);

  const totalServices = useMemo(() => {
    return servicesData?.pagination?.total || services.length || 0;
  }, [servicesData, services]);

  // Filter and sort services based on current filters
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      // Search filter
      if (debouncedSearchTerm && !service.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
        return false;
      }
      
      // Price filter
      const price = service.price || service.startingPrice || 0;
      if (price < priceRange[0] || price > priceRange[1]) {
        return false;
      }
      
      // Delivery time filter
      if (deliveryTime && deliveryTime !== 'any') {
        const serviceDelivery = service.deliveryTime || 0;
        if (deliveryTime === 'fast' && serviceDelivery > 3) return false;
        if (deliveryTime === 'medium' && (serviceDelivery < 4 || serviceDelivery > 7)) return false;
        if (deliveryTime === 'slow' && serviceDelivery < 8) return false;
      }
      
      return true;
    });
  }, [services, debouncedSearchTerm, priceRange, deliveryTime]);

  // Sort services
  const sortedServices = useMemo(() => {
    return [...filteredServices].sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return (a.price || 0) - (b.price || 0);
        case 'price-high': return (b.price || 0) - (a.price || 0);
        case 'rating': return (b.rating || 0) - (a.rating || 0);
        case 'newest': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default: return (b.orders || 0) - (a.orders || 0);
      }
    });
  }, [filteredServices, sortBy]);

  // Get service thumbnail
  const getServiceThumbnail = useCallback((service) => {
    if (service.image) {
      return service.image;
    }
    
    if (service.images && service.images.length > 0 && service.images[0]?.url) {
      return service.images[0].url;
    }
    
    return null;
  }, []);

  // Get REAL user name from database
  const getRealUserName = useCallback((service) => {
    const sellerId = service.seller?._id;
    
    if (sellerId && userProfiles[sellerId]) {
      const user = userProfiles[sellerId];
      
      // Only return real name if it exists in database
      if (user.name && user.name.trim() !== '') {
        return user.name.trim();
      }
      
      // If no name but has email, show email
      if (user.email && user.email.trim() !== '') {
        return user.email.trim();
      }
      
      // If no name or email, return null
      return null;
    }
    
    // No user data available
    return null;
  }, [userProfiles]);

  // Get REAL user picture from database
  const getRealUserPicture = useCallback((service) => {
    const sellerId = service.seller?._id;
    
    if (sellerId && userProfiles[sellerId]) {
      return userProfiles[sellerId].picture || null;
    }
    
    return null;
  }, [userProfiles]);

  // Get REAL user email from database
  const getRealUserEmail = useCallback((service) => {
    const sellerId = service.seller?._id;
    
    if (sellerId && userProfiles[sellerId]) {
      const email = userProfiles[sellerId].email || '';
      return email.trim() !== '' ? email : null;
    }
    
    return null;
  }, [userProfiles]);

  // Check if user email is verified
  const isUserEmailVerified = useCallback((service) => {
    const sellerId = service.seller?._id;
    
    if (sellerId && userProfiles[sellerId]) {
      return userProfiles[sellerId].emailVerified || false;
    }
    
    return false;
  }, [userProfiles]);

  // Get user initials for avatar fallback
  const getUserInitials = useCallback((name, email) => {
    // Try to get initials from real name
    if (name && typeof name === 'string' && name.trim() !== '') {
      const names = name.trim().split(' ');
      if (names.length >= 2) {
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    
    // Try to get initial from email
    if (email && typeof email === 'string' && email.trim() !== '') {
      return email.charAt(0).toUpperCase();
    }
    
    // Return default if nothing available
    return '?';
  }, []);

  // Check if user data is available
  const isUserDataAvailable = useCallback((service) => {
    const sellerId = service.seller?._id;
    return sellerId && userProfiles[sellerId];
  }, [userProfiles]);

  // Sort options
  const sortOptions = useMemo(() => [
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'newest', label: 'Newest First' }
  ], []);

  // Delivery time options
  const deliveryOptions = useMemo(() => [
    { value: 'any', label: 'Any Delivery Time' },
    { value: 'fast', label: 'Fast (1-3 days)' },
    { value: 'medium', label: 'Medium (4-7 days)' },
    { value: 'slow', label: 'Slow (8+ days)' }
  ], []);

  // Calculate stats
  const stats = useMemo(() => {
    if (!services.length) return [];
    
    const uniqueSellers = new Set(services.map(s => s.seller?._id).filter(Boolean)).size;
    const avgRating = services.reduce((acc, s) => acc + (s.rating || 0), 0) / services.length || 0;
    const avgDelivery = services.reduce((acc, s) => acc + (s.deliveryTime || 0), 0) / services.length || 0;
    
    return [
      { label: 'Services', value: services.length, icon: <Award className="h-5 w-5" /> },
      { label: 'Providers', value: uniqueSellers, icon: <Users className="h-5 w-5" /> },
      { label: 'Avg Rating', value: avgRating.toFixed(1), icon: <Star className="h-5 w-5" /> },
      { label: 'Avg Delivery', value: `${Math.round(avgDelivery)} days`, icon: <Clock className="h-5 w-5" /> }
    ];
  }, [services]);

  // Pagination functions
  const handlePageChange = useCallback((newPage) => {
    setSearchParams(prev => {
      prev.set('page', newPage.toString());
      return prev;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto mb-4">
            <Loader className="h-8 w-8 mx-auto my-2 text-gray-900" />
          </div>
          <p className="text-gray-600">Loading {subcategorySlug} services...</p>
        </div>
      </div>
    );
  }

  // Error state - handle subcategory not found
  if (subcategoryError || !subcategoryData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Subcategory Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The "{subcategorySlug}" subcategory does not exist or could not be loaded.
          </p>
          <Link
            to={categoryId ? `/categories/${categoryId}` : '/categories'}
            className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {categoryId ? 'Back to Category' : 'Browse Categories'}
          </Link>
        </div>
      </div>
    );
  }

  // Now we can safely destructure
  const category = categoryData || {};
  const subcategory = subcategoryData;

  return (
    <SeoWrapper
      title={`${subcategory.name} Services - ${category.name || 'Category'} | Vorkanna`}
      description={subcategory.description || `Find the best ${subcategory.name.toLowerCase()} services from verified professionals`}
      keywords={[subcategory.name, category.name || 'services', 'freelance']}
      canonical={`/categories/${categoryId}/${subcategorySlug}`}
      ogTitle={`${subcategory.name} Services - ${category.name || 'Category'} | Vorkanna`}
      ogDescription={subcategory.description || `Find the best ${subcategory.name.toLowerCase()} services from verified professionals`}
      ogImage={category.image || "https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"}
      ogType="website"
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center">
              {/* Breadcrumb */}
              <div className="flex items-center justify-center mb-6">
                <Link
                  to="/"
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  Home
                </Link>
                <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
                <Link
                  to="/categories"
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  Categories
                </Link>
                <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
                {category.name && (
                  <>
                    <Link
                      to={`/categories/${categoryId}`}
                      className="text-gray-300 hover:text-white transition-colors text-sm"
                    >
                      {category.name}
                    </Link>
                    <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
                  </>
                )}
                <span className="text-white font-medium text-sm">
                  {subcategory.name}
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {subcategory.name} Services
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                {subcategory.description || `Find professional ${subcategory.name.toLowerCase()} services from verified experts`}
              </p>
              
              {/* Stats */}
              {stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        <div className="text-gray-300 mr-2">{stat.icon}</div>
                        <div className="text-3xl font-bold">{stat.value}</div>
                      </div>
                      <div className="text-sm text-gray-300">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Search Bar */}
              <div className="max-w-3xl mx-auto relative">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder={`Search ${subcategory.name.toLowerCase()} services...`}
                      className="w-full pl-12 pr-24 py-3 rounded-lg text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-gray-800"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search for services"
                      minLength={2}
                    />
                    <button 
                      type="submit"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-5 py-2 rounded-md hover:bg-black transition-colors flex items-center justify-center min-w-[80px]"
                      disabled={servicesLoading || loadingProfiles}
                    >
                      {servicesLoading || loadingProfiles ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        'Search'
                      )}
                    </button>
                  </div>
                </form>
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
                  refetchServices();
                }}
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
                  {showFilters && <X className="w-4 h-4" />}
                </button>
                
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
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-gray-600 text-sm">
                  {sortedServices.length} {debouncedSearchTerm ? 'results' : 'services'} found
                </span>
                {(searchTerm || priceRange[0] > 0 || priceRange[1] < 10000 || deliveryTime !== 'any' || sortBy !== 'popular') && (
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
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    Delivery Time
                  </label>
                  <div className="space-y-1">
                    {deliveryOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleDeliveryTimeChange(option.value)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          deliveryTime === option.value
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
                    Sort Options
                  </label>
                  <div className="space-y-1">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleSortChange(option.value)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          sortBy === option.value
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {(servicesLoading || loadingProfiles) && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <Loader className="w-10 h-10 animate-spin text-gray-900 mx-auto mb-3" />
                <p className="text-gray-600">
                  {loadingProfiles ? 'Loading user information...' : 'Loading services...'}
                </p>
              </div>
            </div>
          )}

          {/* Services Grid */}
          {!servicesLoading && !loadingProfiles && sortedServices.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {sortedServices.map((service) => {
                  const thumbnailUrl = getServiceThumbnail(service);
                  const realName = getRealUserName(service);
                  const realPicture = getRealUserPicture(service);
                  const realEmail = getRealUserEmail(service);
                  const isVerified = isUserEmailVerified(service);
                  const hasUserData = isUserDataAvailable(service);
                  const userInitials = getUserInitials(realName, realEmail);
                  
                  return (
                    <article
                      key={service._id}
                      className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/services/${service._id}`)}
                    >
                      {/* Service Image */}
                      <div className="relative h-40 overflow-hidden bg-gray-100">
                        {thumbnailUrl ? (
                          <>
                            <img
                              src={thumbnailUrl}
                              alt={service.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                            <ImageIcon className="w-12 h-12 mb-2" />
                            <span className="text-sm">No service image</span>
                          </div>
                        )}
                        
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
                        
                        {/* Premium Badge */}
                        {service.isPremium && (
                          <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-2 py-1 rounded text-xs font-bold">
                            <Sparkles className="w-3 h-3 inline mr-1" />
                            PREMIUM
                          </div>
                        )}
                      </div>

                      {/* Service Content */}
                      <div className="p-4">
                        {/* User Info Section - ONLY REAL DATA FROM DATABASE */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              {/* REAL Profile Picture from Database */}
                              {realPicture ? (
                                <img
                                  src={realPicture}
                                  alt={realName || 'User'}
                                  className="w-8 h-8 rounded-full object-cover border border-gray-300"
                                  loading="lazy"
                                 
                                />
                              ) : null}
                              
                              {/* Initials Fallback */}
                              <div className={`w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center ${realPicture ? 'initials-fallback hidden' : ''}`}>
                                <span className="text-xs font-medium text-gray-600">
                                  {userInitials}
                                </span>
                              </div>
                              
                              {/* Verified Badge */}
                              {isVerified && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border border-white">
                                  <CheckCircle className="w-3 h-3 text-white" fill="white" />
                                </div>
                              )}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              {/* REAL Name from Database */}
                              {realName ? (
                                <div className="flex items-center gap-1">
                                  <h4 className="font-medium text-gray-900 text-sm truncate">
                                    {realName}
                                  </h4>
                                  {isVerified && (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  )}
                                </div>
                              ) : hasUserData ? (
                                <div className="text-xs text-gray-500 italic">
                                  Name not provided
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 italic">
                                  User information unavailable
                                </div>
                              )}
                              
                              {/* REAL Email from Database */}
                              {realEmail ? (
                                <div className="flex items-center text-xs text-gray-500 truncate mt-1">
                                  <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                                  <span className="truncate" title={realEmail}>
                                    {realEmail}
                                  </span>
                                </div>
                              ) : hasUserData ? (
                                <div className="text-xs text-gray-400 italic">
                                  Email not available
                                </div>
                              ) : null}
                              
                             
                            </div>
                          </div>
                        </div>

                        {/* Service Title & Description */}
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">
                          {service.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2 min-h-[40px]">
                          {service.description || 'No description provided.'}
                        </p>

                        {/* Service Details */}
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{service.deliveryTime || 'Custom'} days</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span className="font-bold text-gray-900">
                              ${service.price || service.startingPrice || 'Custom'}
                            </span>
                          </div>
                        </div>

                        {/* Stats - Only show if available */}
                        {(service.orders > 0 || service.features?.length > 0) && (
                          <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                            {service.orders > 0 && (
                              <div className="flex items-center">
                                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                                <span>{service.orders} orders</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              {service.features?.includes('Revisions') && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                  Revisions
                                </span>
                              )}
                              {service.features?.includes('Support') && (
                                <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                                  Support
                                </span>
                              )}
                            </div>
                          </div>
                        )}
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
                    disabled={sortedServices.length < 12}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm ${
                      sortedServices.length < 12
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
          {!servicesLoading && !loadingProfiles && sortedServices.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {debouncedSearchTerm ? 'No services found' : 'No services available yet'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {debouncedSearchTerm
                  ? `No ${subcategory.name.toLowerCase()} services found for "${debouncedSearchTerm}". Try adjusting your search or filter criteria.`
                  : `There are currently no ${subcategory.name.toLowerCase()} services available. Be the first to offer one!`}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {debouncedSearchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setDebouncedSearchTerm('');
                      setSearchParams({ page: '1' });
                    }}
                    className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
                <Link
                  to={`/services/create?category=${categoryId}&subcategory=${subcategory._id}`}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-black transition-colors shadow-sm"
                >
                  Post a {subcategory.name} Service
                </Link>
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg p-6 text-center text-white mb-6">
            <h2 className="text-2xl font-bold mb-3">
              Ready to offer your {subcategory.name.toLowerCase()} services?
            </h2>
            <p className="text-gray-300 mb-4 max-w-2xl mx-auto">
              Join our community of professionals and start earning today
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={`/services/create?category=${categoryId}&subcategory=${subcategory._id}`}
                className="px-6 py-2.5 bg-white text-gray-900 font-bold rounded-md hover:bg-gray-100 transition-colors"
              >
                Post Your Service
              </Link>
              <Link
                to="/gigs"
                className="px-6 py-2.5 bg-transparent border border-white text-white font-bold rounded-md hover:bg-white/10 transition-colors"
              >
                Browse Gigs Instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default SubcategoryDetailPage;