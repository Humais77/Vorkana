import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Globe, Camera, Code, Palette,
  Smartphone, BarChart, ChevronRight,
  Loader2, AlertCircle, Star
} from "lucide-react";
import { motion } from "framer-motion";
import { usePopularCategories } from "../../hooks/useCategories";
import { usePopularServicesByCategory } from "../../hooks/useServices";

const iconMap = {
  'web-development': <Globe className="w-8 h-8" />,
  'programming-tech': <Code className="w-8 h-8" />,
  'graphic-design': <Palette className="w-8 h-8" />,
  'digital-marketing': <BarChart className="w-8 h-8" />,
  'video-animation': <Camera className="w-8 h-8" />,
  'writing-translation': <Globe className="w-8 h-8" />,
  'ai-services': <Code className="w-8 h-8" />,
  'business': <BarChart className="w-8 h-8" />,
  'music-audio': <Smartphone className="w-8 h-8" />,
  'lifestyle': <Palette className="w-8 h-8" />,
  'data': <BarChart className="w-8 h-8" />,
  'default': <Globe className="w-8 h-8" />
};

const PopularServicesByCategory = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Fetch popular categories (where popular = true)
  const { 
    data: popularCategories, 
    isLoading: categoriesLoading, 
    error: categoriesError,
    refetch: refetchCategories
  } = usePopularCategories();
  
  // Fetch popular services for selected category
  const { 
    data: popularServicesData,
    isLoading: servicesLoading,
    error: servicesError,
    refetch: refetchServices
  } = usePopularServicesByCategory();

  const isLoading = categoriesLoading || servicesLoading;
  const error = categoriesError || servicesError;

  // When a category is selected, fetch its services
  useEffect(() => {
    if (selectedCategory) {
      refetchServices();
    }
  }, [selectedCategory, refetchServices]);

  // Set first category as selected by default
  useEffect(() => {
    if (popularCategories && popularCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(popularCategories[0]);
    }
  }, [popularCategories, selectedCategory]);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    // Scroll to services section
    setTimeout(() => {
      document.getElementById('category-services')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };
  
  const handleViewAllCategory = (category) => {
    // Navigate to category page with popular filter
    navigate(`/services/category/${category.slug}?popular=true`);
  };

  const handleServiceClick = (service) => {
    navigate(`/services/${service.slug || service._id}`);
  };

  const getCategoryIcon = (categorySlug) => {
    const slugKey = categorySlug?.toLowerCase().replace(/\s+/g, '-') || 'default';
    return iconMap[slugKey] || iconMap.default;
  };

  // Get services for selected category from the popular services data
  const getServicesForCategory = () => {
    if (!selectedCategory || !popularServicesData?.data) return [];
    
    return popularServicesData.data.filter(service => 
      service.categoryId === selectedCategory._id || 
      service.category?._id === selectedCategory._id
    );
  };

  const selectedCategoryServices = getServicesForCategory();

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          >
            Popular Services by Category
          </motion.h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            Browse top-rated services in our most popular categories
          </p>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error loading data</p>
                <p className="text-sm mt-1 text-red-600">{error.message}</p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => {
                      if (categoriesError) refetchCategories();
                      if (servicesError) refetchServices();
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Popular Categories Tabs */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Popular Categories
          </h3>
          
          {categoriesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
                  <div className="h-10 w-10 bg-gray-200 rounded-lg mb-3 mx-auto" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {popularCategories?.map((category) => (
                <motion.button
                  key={category._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  onClick={() => handleCategoryClick(category)}
                  className={`bg-white rounded-xl shadow-sm border-2 p-4 transition-all duration-300 ${
                    selectedCategory?._id === category._id
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-lg mb-3 ${
                      selectedCategory?._id === category._id
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-gray-50 text-gray-600'
                    }`}>
                      {getCategoryIcon(category.slug)}
                    </div>
                    
                    <h4 className="font-bold text-gray-900 text-sm mb-1">
                      {category.name}
                    </h4>
                    <p className="text-gray-500 text-xs">
                      {category.servicesCount || 0} services
                    </p>
                    
                    {selectedCategory?._id === category._id && (
                      <div className="mt-2 w-8 h-1 bg-blue-500 rounded-full" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
        
        {/* Selected Category Services */}
        {selectedCategory && (
          <div id="category-services" className="mt-16 pt-8 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    {getCategoryIcon(selectedCategory.slug)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">
                      Popular Services in {selectedCategory.name}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      Top-rated services in this category
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleViewAllCategory(selectedCategory)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                View All in {selectedCategory.name}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {servicesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-t-xl" />
                    <div className="p-4">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                      <div className="h-4 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedCategoryServices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {selectedCategoryServices.slice(0, 8).map((service) => (
                  <motion.div
                    key={service._id || service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    whileHover={{ y: -5 }}
                  >
                    <div
                      onClick={() => handleServiceClick(service)}
                      className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer h-full"
                    >
                      <div className="relative h-48 overflow-hidden rounded-t-xl">
                        <img
                          src={service.imageUrl || service.thumbnail?.url || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=512&h=384&fit=crop&q=80&auto=format'}
                          alt={service.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-gray-900 mb-2 line-clamp-1">
                          {service.title || service.name}
                        </h4>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                          {service.shortDescription || service.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-gray-900">
                            ${service.price || '0.00'}
                          </span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm text-gray-600">
                              {service.rating?.toFixed(1) || '5.0'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">
                  No popular services found
                </h4>
                <p className="text-gray-500 mb-6">
                  No services are marked as popular in this category yet.
                </p>
                <button
                  onClick={() => handleViewAllCategory(selectedCategory)}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse All {selectedCategory.name} Services
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* View All Services CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Can't find what you're looking for?
            </h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Browse all services across all categories or search for specific services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/services"
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse All Services
              </Link>
              <Link
                to="/services/categories"
                className="px-8 py-3 bg-white text-gray-700 font-bold rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                View All Categories
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularServicesByCategory;