// components/services/PopularServicesPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Filter, X, ChevronRight, Star, Clock, Globe, 
  Camera, Code, Palette, Smartphone, BarChart, Sparkles,
  TrendingUp, ThumbsUp, Users, Award, CheckCircle, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePopularCategories } from "../../hooks/useCategories";
import { usePopularServicesByCategory } from "../../hooks/useServices";
import LoadingSpinner from "../../layouts/LoadingSpinner";
import ErrorDisplay from "../../layouts/ErrorDisplay";

const PopularServicesPage = () => {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState("popular");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [deliveryTime, setDeliveryTime] = useState("any");
  const [searchQuery, setSearchQuery] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch popular categories (popular = true)
  const { 
    data: categoriesData, 
    isLoading: categoriesLoading, 
    error: categoriesError 
  } = usePopularCategories();

  // Fetch popular services for selected category
  const {
    data: servicesData,
    isLoading: servicesLoading,
    error: servicesError,
    refetch: refetchServices
  } = usePopularServicesByCategory({
    category: selectedCategory?._id,
    limit: 20
  });

  const popularCategories = categoriesData || [];
  const services = servicesData?.data || [];
  const isLoading = categoriesLoading || servicesLoading;
  const error = categoriesError || servicesError;

  // Initialize selected category from URL params - ONLY ONCE
  useEffect(() => {
    if (categorySlug && popularCategories.length > 0 && !isInitialized) {
      const category = popularCategories.find(cat => cat.slug === categorySlug);
      if (category) {
        setSelectedCategory(category);
      } else if (popularCategories.length > 0) {
        // If category from URL not found, use first category
        setSelectedCategory(popularCategories[0]);
      }
      setIsInitialized(true);
    } else if (popularCategories.length > 0 && !selectedCategory && !isInitialized) {
      // No category in URL, use first popular category
      setSelectedCategory(popularCategories[0]);
      setIsInitialized(true);
    }
  }, [categorySlug, popularCategories, isInitialized]);

  // Handle category selection
  const handleCategorySelect = useCallback((category) => {
    setSelectedCategory(category);
    // Update URL without causing a re-render loop
    if (category.slug !== categorySlug) {
      navigate(`/popular-services/${category.slug}`, { replace: true });
    }
  }, [categorySlug, navigate]);

  const handleServiceClick = (service) => {
    navigate(`/services/${service.slug || service._id}`);
  };

  const handleFilterReset = () => {
    setSortBy("popular");
    setPriceRange([0, 10000]);
    setDeliveryTime("any");
    setSearchQuery("");
  };

  const filteredServices = services.filter(service => {
    // Search filter
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        service.title?.toLowerCase().includes(query) ||
        service.description?.toLowerCase().includes(query) ||
        service.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Price filter
    const price = service.price || 0;
    if (price < priceRange[0] || price > priceRange[1]) return false;

    // Delivery time filter
    if (deliveryTime !== "any") {
      const deliveryDays = service.deliveryTime || 0;
      switch(deliveryTime) {
        case "express":
          if (deliveryDays > 3) return false;
          break;
        case "fast":
          if (deliveryDays > 7) return false;
          break;
        case "standard":
          if (deliveryDays > 14) return false;
          break;
        default:
          break;
      }
    }

    return true;
  }).sort((a, b) => {
    switch(sortBy) {
      case "price-low":
        return (a.price || 0) - (b.price || 0);
      case "price-high":
        return (b.price || 0) - (a.price || 0);
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
      case "delivery":
        return (a.deliveryTime || 0) - (b.deliveryTime || 0);
      case "popular":
      default:
        return (b.views || 0) - (a.views || 0);
    }
  });

  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'web': <Globe className="w-5 h-5" />,
      'video': <Camera className="w-5 h-5" />,
      'software': <Code className="w-5 h-5" />,
      'mobile': <Smartphone className="w-5 h-5" />,
      'design': <Palette className="w-5 h-5" />,
      'data': <BarChart className="w-5 h-5" />,
      'writing': <Globe className="w-5 h-5" />,
      'business': <BarChart className="w-5 h-5" />,
      'music': <Smartphone className="w-5 h-5" />,
      'lifestyle': <Palette className="w-5 h-5" />,
      'ai': <Sparkles className="w-5 h-5" />,
      'tech': <Code className="w-5 h-5" />
    };

    const lowerName = categoryName?.toLowerCase() || '';
    if (lowerName.includes('web')) return iconMap.web;
    if (lowerName.includes('video')) return iconMap.video;
    if (lowerName.includes('soft') || lowerName.includes('program')) return iconMap.software;
    if (lowerName.includes('mobile')) return iconMap.mobile;
    if (lowerName.includes('design')) return iconMap.design;
    if (lowerName.includes('data')) return iconMap.data;
    if (lowerName.includes('writing')) return iconMap.writing;
    if (lowerName.includes('business')) return iconMap.business;
    if (lowerName.includes('music')) return iconMap.music;
    if (lowerName.includes('lifestyle')) return iconMap.lifestyle;
    if (lowerName.includes('ai')) return iconMap.ai;
    if (lowerName.includes('tech')) return iconMap.tech;
    
    return <Globe className="w-5 h-5" />;
  };

  const getDeliveryTimeLabel = (days) => {
    if (days <= 3) return "Express";
    if (days <= 7) return "Fast";
    if (days <= 14) return "Standard";
    return "Extended";
  };

  const getDeliveryTimeColor = (days) => {
    if (days <= 3) return "text-green-600 bg-green-50";
    if (days <= 7) return "text-blue-600 bg-blue-50";
    if (days <= 14) return "text-yellow-600 bg-yellow-50";
    return "text-gray-600 bg-gray-50";
  };

  // Add error boundary fallback
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <ErrorDisplay 
            error={error}
            title="Failed to load popular services"
            retryText="Try Again"
            onRetry={() => {
              if (categoriesError) window.location.reload();
              if (servicesError) refetchServices();
            }}
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4">
          <LoadingSpinner size="large" message="Loading popular services..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Popular Services
              </h1>
              <p className="text-blue-100">
                Discover top-rated services in popular categories
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Categories & Filters */}
          <div className="lg:w-1/4">
            {/* Categories */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Popular Categories
              </h2>
              <div className="space-y-2">
                {popularCategories.map((category) => (
                  <button
                    key={category._id}
                    onClick={() => handleCategorySelect(category)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      selectedCategory?._id === category._id
                        ? "bg-blue-50 border border-blue-200 text-blue-700"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className={`p-2 rounded-md ${
                      selectedCategory?._id === category._id
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {getCategoryIcon(category.name)}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-gray-500">
                        {category.servicesCount || 0} services
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${
                      selectedCategory?._id === category._id
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Filters
                </h2>
                <button
                  onClick={handleFilterReset}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Reset
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search services..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort by
                </label>
                <div className="space-y-2">
                  {[
                    { id: "popular", label: "Most Popular", icon: <ThumbsUp className="w-4 h-4" /> },
                    { id: "rating", label: "Highest Rated", icon: <Star className="w-4 h-4" /> },
                    { id: "price-low", label: "Price: Low to High", icon: <span>$</span> },
                    { id: "price-high", label: "Price: High to Low", icon: <span>$$$</span> },
                    { id: "delivery", label: "Fastest Delivery", icon: <Clock className="w-4 h-4" /> }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSortBy(option.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        sortBy === option.id
                          ? "bg-blue-50 border border-blue-200 text-blue-700"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${
                        sortBy === option.id
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {option.icon}
                      </div>
                      <span className="flex-1 text-left">{option.label}</span>
                      {sortBy === option.id && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Delivery Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Time
                </label>
                <div className="space-y-2">
                  {[
                    { id: "any", label: "Any Time" },
                    { id: "express", label: "Express (1-3 days)" },
                    { id: "fast", label: "Fast (4-7 days)" },
                    { id: "standard", label: "Standard (8-14 days)" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setDeliveryTime(option.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        deliveryTime === option.id
                          ? "bg-blue-50 border border-blue-200 text-blue-700"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span>{option.label}</span>
                      {deliveryTime === option.id && (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Selected Category Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                    {selectedCategory && getCategoryIcon(selectedCategory.name)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedCategory?.name || "Select a Category"}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {selectedCategory?.description || "Choose a category to view popular services"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center px-4 py-2 bg-gray-100 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">
                      {filteredServices.length}
                    </div>
                    <div className="text-sm text-gray-600">Services</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Grid */}
            {selectedCategory ? (
              filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {filteredServices.map((service) => (
                      <motion.div
                        key={service._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div
                          onClick={() => handleServiceClick(service)}
                          className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer h-full border border-gray-200 hover:border-blue-300"
                        >
                          {/* Service Image */}
                          <div className="relative h-48 overflow-hidden rounded-t-xl">
                            <img
                              src={service.thumbnail?.url || service.imageUrl || `https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&q=80&auto=format`}
                              alt={service.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute top-3 right-3 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                              Popular
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                              <h3 className="text-white font-bold text-lg line-clamp-1">
                                {service.title}
                              </h3>
                            </div>
                          </div>

                          {/* Service Details */}
                          <div className="p-5">
                            {/* Rating & Reviews */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="font-bold text-gray-900">
                                  {service.rating?.toFixed(1) || "5.0"}
                                </span>
                                <span className="text-gray-500">
                                  ({service.reviewsCount || 0})
                                </span>
                              </div>
                              <div className={`px-2 py-1 rounded text-xs font-medium ${getDeliveryTimeColor(service.deliveryTime)}`}>
                                {getDeliveryTimeLabel(service.deliveryTime)}
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                              {service.shortDescription || service.description}
                            </p>

                            {/* Price */}
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-2xl font-bold text-gray-900">
                                  ${service.price}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Starting price
                                </div>
                              </div>
                              <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No services found
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery || priceRange[0] > 0 || priceRange[1] < 10000 || deliveryTime !== "any"
                      ? "Try adjusting your filters or search query"
                      : "No popular services found in this category yet"}
                  </p>
                  <button
                    onClick={handleFilterReset}
                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              )
            ) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Select a Category
                </h3>
                <p className="text-gray-500 mb-6">
                  Choose a category from the sidebar to view popular services
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopularServicesPage;