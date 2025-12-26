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

  // Update URL when filters change (excluding debounced search)
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    const params = new URLSearchParams();
    
    // Always set page first
    if (page !== '1') params.set('page', page);
    
    // Set search term if present
    if (debouncedSearchTerm.trim()) params.set('q', debouncedSearchTerm.trim());
    
    // Set other filters
    if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
    if (priceRange[0] > 0) params.set('minPrice', priceRange[0]);
    if (priceRange[1] < 10000) params.set('maxPrice', priceRange[1]);
    if (sortBy !== 'createdAt') params.set('sort', sortBy);
    
    // Update URL
    setSearchParams(params, { replace: true });
  }, [selectedCategory, priceRange, sortBy, page, debouncedSearchTerm, setSearchParams, isInitialLoad]);

  // Handle search
  const handleSearch = useCallback((e) => {
    e?.preventDefault();
    const trimmedTerm = searchTerm.trim();
    
    if (trimmedTerm && trimmedTerm.length >= 2) {
      setDebouncedSearchTerm(trimmedTerm);
    } else if (!trimmedTerm) {
      // Clear search
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
    // Reset to page 1 when category changes
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
    
    // Reset to page 1 when price changes
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
      // Show search results
      return searchData?.data || searchData || [];
    } else {
      // Show all services
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

  // Extract categories from API response
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

  // Get service thumbnail - prioritizing database thumbnail
  const getServiceThumbnail = useCallback((service) => {
    // First priority: Service thumbnail from database
    if (service.thumbnail?.url) {
      return service.thumbnail.url;
    }
    
    // Second priority: First image from images array
    if (service.images && service.images.length > 0 && service.images[0]?.url) {
      return service.images[0].url;
    }
    
    // Third priority: Category-specific default images
    const categoryName = service.categoryDetails?.name?.toLowerCase() || '';
    if (categoryName.includes('design') || categoryName.includes('art')) {
      return 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else if (categoryName.includes('development') || categoryName.includes('programming')) {
      return 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else if (categoryName.includes('writing') || categoryName.includes('content')) {
      return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else if (categoryName.includes('marketing') || categoryName.includes('business')) {
      return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else if (categoryName.includes('video') || categoryName.includes('animation')) {
      return 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else if (categoryName.includes('music') || categoryName.includes('audio')) {
      return 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    } else {
      // Default generic service image
      return 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
    }
  }, []);

  // Get seller information from service
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
    
    // Fallback
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

  // Memoized SEO functions
  const seoTitle = useMemo(() => {
    const categoryName = getCurrentCategoryName();
    const baseTitle = "Browse Freelance Services | Vorkana Marketplace";
    
    if (debouncedSearchTerm && categoryName) {
      return `${debouncedSearchTerm} - ${categoryName} Services | Vorkana`;
    } else if (debouncedSearchTerm) {
      return `Search: ${debouncedSearchTerm} | Freelance Services | Vorkana`;
    } else if (categoryName) {
      return `${categoryName} Services - Professional Freelancers | Vorkana`;
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

  const seoKeywords = useMemo(() => {
    const categoryName = getCurrentCategoryName();
    const baseKeywords = ["freelance services", "hire freelancers", "online services", "freelance marketplace", "professional services"];
    
    if (categoryName) {
      return [...baseKeywords, `${categoryName.toLowerCase()} services`, `hire ${categoryName.toLowerCase()} freelancers`, categoryName.toLowerCase()];
    }
    
    if (debouncedSearchTerm) {
      return [...baseKeywords, debouncedSearchTerm.toLowerCase(), `${debouncedSearchTerm.toLowerCase()} services`];
    }
    
    return baseKeywords;
  }, [debouncedSearchTerm, getCurrentCategoryName]);

  // Generate breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const breadcrumbItems = [
      { name: "Home", url: "/" },
      { name: "Services", url: "/services" }
    ];

    const categoryName = getCurrentCategoryName();
    if (categoryName) {
      breadcrumbItems.push({
        name: categoryName,
        url: `/services?category=${selectedCategory}`
      });
    }

    if (debouncedSearchTerm) {
      breadcrumbItems.push({
        name: `Search: ${debouncedSearchTerm}`,
        url: `/services?q=${encodeURIComponent(debouncedSearchTerm)}`
      });
    }

    return breadcrumbItems;
  }, [debouncedSearchTerm, selectedCategory, getCurrentCategoryName]);

  // Generate structured data
  const structuredData = useMemo(() => {
    const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const currentUrl = typeof window !== 'undefined' ? window.location.href : websiteUrl;
    
    const structuredServices = services.slice(0, 10).map((service, index) => {
      const userInfo = getUserInfo(service);
      
      return {
        "@type": "Service",
        "position": index + 1,
        "url": `${websiteUrl}/services/${service.slug || service._id}`,
        "name": service.title,
        "description": service.shortDescription || service.description?.substring(0, 200) || 'Professional freelance service',
        "offeredBy": {
          "@type": "Person",
          "name": userInfo.username,
          "image": userInfo.avatar,
          "url": `${websiteUrl}/profile/${service.createdBy?._id || 'user'}`
        },
        "priceSpecification": {
          "@type": "PriceSpecification",
          "price": service.price || 0,
          "priceCurrency": service.currency || "USD"
        },
        "areaServed": {
          "@type": "Country",
          "name": "Worldwide"
        }
      };
    });

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": seoTitle,
      "description": seoDescription,
      "url": currentUrl,
      "numberOfItems": totalServices,
      "itemListElement": structuredServices,
      "mainEntity": {
        "@type": "WebPage",
        "@id": currentUrl,
        "name": seoTitle,
        "description": seoDescription,
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": websiteUrl
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Services",
              "item": `${websiteUrl}/services`
            }
          ]
        }
      }
    };
  }, [services, seoTitle, seoDescription, totalServices, getUserInfo]);

  // Pagination functions
  const handlePageChange = useCallback((newPage) => {
    setSearchParams(prev => {
      prev.set('page', newPage.toString());
      return prev;
    });
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  return (
    <SeoWrapper
      title={seoTitle}
      description={seoDescription}
      keywords={seoKeywords.join(", ")}
      canonical={`/services${window.location.search}`}
      ogTitle={seoTitle}
      ogDescription={seoDescription}
      ogImage="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
      ogType="website"
      twitterCard="summary_large_image"
      twitterSite="@vorkana"
      robots="index, follow"
      lang="en"
      breadcrumb={breadcrumbItems}
      structuredData={structuredData}
    >
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
                      placeholder="What service are you looking for? (min. 2 characters)"
                      className="w-full pl-12 pr-24 py-4 rounded-xl text-gray-900 text-lg focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search for services"
                      minLength={2}
                    />
                    <button 
                      type="submit"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[80px]"
                      disabled={isSearching}
                      aria-label="Search button"
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
                {!isLoadingCategories && categories.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-3 mt-6" role="navigation" aria-label="Quick categories">
                    {categories.slice(1, 7).map(category => (
                      <button
                        key={category._id}
                        onClick={() => handleCategoryChange(category._id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedCategory === category._id
                            ? "bg-white text-blue-600"
                            : "bg-white/20 hover:bg-white/30 text-white"
                        }`}
                        aria-label={`Browse ${category.name} services`}
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
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6" role="alert">
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
                  aria-expanded={showFilters}
                  aria-controls="filters-section"
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
                    aria-label="Sort services by"
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
                  {totalServices} {debouncedSearchTerm ? 'results' : 'services'} found
                </span>
                {(searchTerm || selectedCategory !== 'All' || priceRange[0] > 0 || priceRange[1] < 10000 || sortBy !== 'createdAt') && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div id="filters-section" className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        aria-label="Minimum price filter"
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
                        aria-label="Maximum price filter"
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
                  <div className="max-h-48 overflow-y-auto space-y-1" role="listbox">
                    {categories.map(category => (
                      <button
                        key={category._id}
                        onClick={() => handleCategoryChange(category._id)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedCategory === category._id
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        role="option"
                        aria-selected={selectedCategory === category._id}
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
                <p className="text-gray-600">
                  {debouncedSearchTerm ? 'Searching services...' : 'Loading services...'}
                </p>
              </div>
            </div>
          )}

          {/* Services Grid */}
          {!isLoading && services.length > 0 && (
            <>
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12"
                itemScope
                itemType="http://schema.org/ItemList"
              >
                {services.map(service => {
                  const userInfo = getUserInfo(service);
                  const thumbnailUrl = getServiceThumbnail(service);
                  
                  return (
                    <article
                      key={service._id}
                      className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-blue-300 group cursor-pointer"
                      onClick={() => handleViewDetails(service._id, service.slug)}
                      itemScope
                      itemType="http://schema.org/Service"
                      itemProp="itemListElement"
                    >
                      {/* Service Image */}
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={thumbnailUrl}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          itemProp="image"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                        
                        {/* Favorite Button */}
                        <button
                          onClick={(e) => handleLike(service._id, e)}
                          className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
                          aria-label={`Add ${service.title} to favorites`}
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
                        
                        {/* No Image Indicator */}
                        {!service.thumbnail?.url && !service.images?.[0]?.url && (
                          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                            <div className="text-center">
                              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <span className="text-gray-500 text-sm">No Image</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Service Content */}
                      <div className="p-5">
                        {/* Seller Info */}
                        <div className="flex items-center gap-3 mb-4" itemProp="provider" itemScope itemType="http://schema.org/Person">
                          <img
                            src={userInfo.avatar}
                            alt={userInfo.username}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                            itemProp="image"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900 text-sm" itemProp="name">
                                {userInfo.username}
                              </h4>
                              {userInfo.verified && (
                                <CheckCircle className="w-4 h-4 text-blue-500" aria-label="Verified seller" />
                              )}
                            </div>
                            <span className="text-xs text-gray-500 capitalize" itemProp="jobTitle">{userInfo.level}</span>
                          </div>
                        </div>

                        {/* Service Title & Description */}
                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1" itemProp="name">
                          {service.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]" itemProp="description">
                          {service.shortDescription || service.description || 'No description available'}
                        </p>

                        {/* Tags */}
                        {service.tags && service.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {service.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded"
                                itemProp="keywords"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Price & CTA */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div itemProp="offers" itemScope itemType="http://schema.org/Offer">
                            <span className="text-xl font-bold text-gray-900" itemProp="price">
                              {service.currency || '$'} {service.price?.toFixed(2) || '0.00'}
                            </span>
                            <meta itemProp="priceCurrency" content={service.currency || "USD"} />
                            <span className="text-gray-500 text-xs block">Starting from</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(service._id, service.slug);
                            }}
                            className="px-4 py-2 bg-gradient-to-r bg-blue-600  text-white font-medium rounded-lg hover:bg-blue-700 transition-all hover:shadow-lg text-sm"
                            aria-label={`View details for ${service.title}`}
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
                <nav className="flex justify-center items-center gap-4 mb-12" aria-label="Services pagination">
                  <button
                    onClick={() => handlePageChange(Math.max(1, parseInt(page) - 1))}
                    disabled={parseInt(page) === 1}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      parseInt(page) === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    aria-label="Go to previous page"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map(num => (
                      <button
                        key={num}
                        onClick={() => handlePageChange(num)}
                        className={`w-10 h-10 rounded-lg ${
                          parseInt(page) === num
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        aria-label={`Go to page ${num}`}
                        aria-current={parseInt(page) === num ? 'page' : undefined}
                      >
                        {num}
                      </button>
                    ))}
                    {parseInt(page) > 3 && <span className="text-gray-400">...</span>}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(parseInt(page) + 1)}
                    disabled={services.length < 12}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                      services.length < 12
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    aria-label="Go to next page"
                  >
                    Next
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </nav>
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
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              )}
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
                Offer Your Service
              </button>
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default ServiceListingPage;