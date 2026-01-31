// components/services/PopularServicesPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { 
  Search, Filter, Star, Clock, DollarSign, Heart,
  TrendingUp, ChevronDown, X, CheckCircle, Eye, Tag
} from "lucide-react";
import { motion } from "framer-motion";
import { usePopularCategories } from "../../hooks/useCategories";
import { usePopularServicesByCategory } from "../../hooks/useServices";
import { toast } from "react-hot-toast";
import { DEFAULT_IMAGES, getGenericImage } from '../../utils/defaultImages';
const PopularServicesPage = () => {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get query parameters
  const searchQuery = searchParams.get('q') || '';
  const categoryId = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || 'popular';
  
  // Local state
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [priceRange, setPriceRange] = useState([
    minPrice ? parseInt(minPrice) : 0,
    maxPrice ? parseInt(maxPrice) : 10000
  ]);
  const [sortBy, setSortBy] = useState(sort);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data
  const { 
    data: categoriesData = [], 
    isLoading: categoriesLoading 
  } = usePopularCategories();

  const {
    data: servicesData,
    isLoading: servicesLoading,
    refetch: refetchServices
  } = usePopularServicesByCategory({
    category: selectedCategory?._id,
    limit: 20
  });

  // Memoize data
  const popularCategories = useMemo(() => {
    if (!categoriesData || !Array.isArray(categoriesData)) return [];
    return categoriesData.filter(cat => cat.isActive !== false);
  }, [categoriesData]);

  const services = useMemo(() => {
  if (!servicesData) {
    console.log('No services data');
    return [];
  }
  
  // Extract services array from response
  let servicesArray = [];
  
  if (servicesData.data && Array.isArray(servicesData.data)) {
    servicesArray = servicesData.data;
  } else if (Array.isArray(servicesData)) {
    servicesArray = servicesData;
  }
  

  return servicesArray;
}, [servicesData]);

  // Set initial category
  useEffect(() => {
    if (popularCategories.length > 0) {
      const category = popularCategories.find(cat => 
        categorySlug ? cat.slug === categorySlug : true
      ) || popularCategories[0];
      setSelectedCategory(category);
    }
  }, [popularCategories, categorySlug]);

  // Handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    navigate(`/popular-services/${category.slug}`, { replace: true });
    setSearchParams({}, { replace: true });
  };

  // Filter and sort services
 const filteredServices = useMemo(() => {
  
  let result = [...services];


  return result;
}, [services, selectedCategory]);

  // Handle like
  const handleLike = (serviceId, e) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
    toast.success(favorites.includes(serviceId) ? 'Removed from favorites' : 'Added to favorites');
  };

  // Handle service click
  const handleServiceClick = (service) => {
    navigate(`/services/${service.slug || service._id}`);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setPriceRange([0, 10000]);
    setSortBy('popular');
    setSearchParams({}, { replace: true });
  };

  // Get service image
  const getServiceImage = (service) => {
    return service.imageUrl || service.thumbnail?.url || 
     DEFAULT_IMAGES.GENERIC;
  };
  // Loading state
  if (categoriesLoading || servicesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading popular services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 mr-3" />
              <h1 className="text-3xl md:text-4xl font-bold">Popular Services</h1>
            </div>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Browse top-rated services from our best sellers
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search popular services..."
                  className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters Bar */}
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
              
              {/* Quick Categories */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {popularCategories.map((category) => (
                  <button
                    key={category._id}
                    onClick={() => handleCategorySelect(category)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                      selectedCategory?._id === category._id
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-gray-600 text-sm">
                {filteredServices.length} services found
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-800 text-sm"
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="views">Most Viewed</option>
              </select>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                      className="w-full"
                    />
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black transition-colors text-sm"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <motion.div
                key={service._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                onClick={() => handleServiceClick(service)}
              >
                {/* Service Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={getServiceImage(service)}
                    alt={service.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  
                  {/* Favorite Button */}
                  <button
                    onClick={(e) => handleLike(service._id, e)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        favorites.includes(service._id)
                          ? "fill-red-500 text-red-500"
                          : "text-gray-600 hover:text-red-500"
                      }`}
                    />
                  </button>
                  
                  {/* Popular Badge */}
                  <div className="absolute top-3 left-3 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                    POPULAR
                  </div>
                </div>

                {/* Service Content */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2 min-h-[40px]">
                    {service.shortDescription || service.description}
                  </p>

                  {/* Service Details */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{service.deliveryTime || 7} days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{service.views || 0}</span>
                    </div>
                  </div>

                  {/* Rating and Price */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-gray-900">
                        {service.rating?.toFixed(1) || '5.0'}
                      </span>
                      <span className="text-gray-500 text-xs">
                        ({service.reviewsCount || 0})
                      </span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      ${service.price || '0'}
                    </div>
                  </div>

                  {/* View Button */}
                  <button className="w-full px-3 py-2 bg-gray-900 text-white font-medium rounded-md hover:bg-black transition-colors text-sm">
                    View Details
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                No services found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? `No results for "${searchTerm}"`
                  : `No popular services in ${selectedCategory?.name || 'this category'}`}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black transition-colors text-sm"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Browse More */}
        <div className="mt-12 text-center">
          <div className="bg-gray-50 rounded-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Looking for more?
            </h3>
            <p className="text-gray-600 mb-6">
              Explore all services or browse gigs
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => navigate('/services')}
                className="px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-black transition-colors"
              >
                Browse All Services
              </button>
              <button 
                onClick={() => navigate('/gigs')}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
              >
                Browse Gigs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopularServicesPage;