// src/pages/AllServicesPage.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Filter, ChevronLeft, ChevronRight, Star, Clock } from 'lucide-react';
import { useServices } from '../hooks/useServices';
import CategoryFilter from '../components/CategoryFilter';

const AllServicesPage = () => {
  const navigate = useNavigate();
  
  // State for pagination and filters
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Build filter object for the API
  const buildFilters = () => {
    const filters = {
      status: 'active',
      isActive: true,
      
    };

    if (categoryFilter) filters.category = categoryFilter;
    if (priceFilter === 'budget') {
      filters.minPrice = 1;
      filters.maxPrice = 99;
    } else if (priceFilter === 'premium') {
      filters.minPrice = 100;
      filters.maxPrice = 499;
    } else if (priceFilter === 'luxury') {
      filters.minPrice = 500;
    }
    if (ratingFilter) filters.minRating = parseFloat(ratingFilter);
    if (deliveryFilter === 'fast') {
      filters.minDeliveryTime = 1;
      filters.maxDeliveryTime = 2;
    } else if (deliveryFilter === 'standard') {
      filters.minDeliveryTime = 3;
      filters.maxDeliveryTime = 6;
    } else if (deliveryFilter === 'custom') {
      filters.minDeliveryTime = 7;
      filters.maxDeliveryTime = 30;
    }

    return filters;
  };

  // Use the useServices hook with dynamic parameters
  const { data: responseData, isLoading, isError, error, refetch } = useServices({
    ...buildFilters(),
    page: page,
    limit: limit,
    sort: sortBy,
    order: sortOrder,
    includeCategory: true,
    includeCreator: true,
    includeSeller: true,
    populate: true,
  });

  console.log('Full API Response Data:', responseData);
  console.log('Services Data:', responseData?.data);
  console.log('Number of services:', responseData?.data?.length);

  // Extract data from response - handle backend response format
  let services = [];
  let pagination = {};
  let totalPages = 1;
  let totalServices = 0;

  if (responseData) {
    // Handle backend response format: { success: true, data: [...], pagination: {...} }
    if (responseData.success && Array.isArray(responseData.data)) {
      services = responseData.data;
      pagination = responseData.pagination || {};
      totalPages = pagination.totalPages || 1;
      totalServices = pagination.total || services.length;
      console.log('Extracted services:', services.length);
      console.log('Pagination:', pagination);
    }
  }

  // Handle service click
  const handleServiceClick = useCallback((serviceId, serviceSlug) => {
    navigate(`/services/${serviceSlug || serviceId}`);
  }, [navigate]);

  // Handle filter changes
  const handleCategoryChange = useCallback((categoryId) => {
    setCategoryFilter(categoryId || '');
    setPage(1);
  }, []);

  const handlePriceChange = useCallback((priceRange) => {
    setPriceFilter(priceRange || '');
    setPage(1);
  }, []);

  const handleRatingChange = useCallback((rating) => {
    setRatingFilter(rating || '');
    setPage(1);
  }, []);

  const handleDeliveryChange = useCallback((delivery) => {
    setDeliveryFilter(delivery || '');
    setPage(1);
  }, []);

  const handleSortChange = useCallback((sortField, order = 'desc') => {
    setSortBy(sortField);
    setSortOrder(order);
    setPage(1);
  }, []);

  // Handle pagination
  const goToPage = useCallback((pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
    }
  }, [totalPages]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setCategoryFilter('');
    setPriceFilter('');
    setRatingFilter('');
    setDeliveryFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  }, []);

  // Auto-refresh when filters change
  useEffect(() => {
    refetch();
  }, [page, limit, sortBy, sortOrder, categoryFilter, priceFilter, ratingFilter, deliveryFilter, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading all services...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">😞</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Error loading services
          </h3>
          <p className="text-gray-600 mb-6">
            {error?.message || 'Something went wrong. Please try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                All Professional Services
              </h1>
              <p className="text-gray-600 mt-2">
                Browse all active professional services from all categories
              </p>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Category Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <CategoryFilter
                  selectedCategory={categoryFilter}
                  onCategoryChange={handleCategoryChange}
                  showAllOption={true}
                />
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Range
                </label>
                <select
                  value={priceFilter}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="">All Prices</option>
                  <option value="budget">Budget ($1 - $99)</option>
                  <option value="premium">Premium ($100 - $499)</option>
                  <option value="luxury">Luxury ($500+)</option>
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Rating
                </label>
                <select
                  value={ratingFilter}
                  onChange={(e) => handleRatingChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="">All Ratings</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.0">4.0+ Stars</option>
                  <option value="3.5">3.5+ Stars</option>
                </select>
              </div>

              {/* Delivery Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Time
                </label>
                <select
                  value={deliveryFilter}
                  onChange={(e) => handleDeliveryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="">All Delivery Times</option>
                  <option value="fast">Fast (1-2 days)</option>
                  <option value="standard">Standard (3-6 days)</option>
                  <option value="custom">Extended (7-30 days)</option>
                </select>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={`${sortBy}:${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split(':');
                    handleSortChange(field, order);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="createdAt:desc">Newest First</option>
                  <option value="createdAt:asc">Oldest First</option>
                  <option value="price:desc">Highest Price</option>
                  <option value="price:asc">Lowest Price</option>
                  <option value="rating:desc">Highest Rated</option>
                  <option value="deliveryTime:asc">Fastest Delivery</option>
                </select>
              </div>

              {/* Results Per Page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per Page
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={36}>36</option>
                  <option value={48}>48</option>
                </select>
              </div>

              {/* Reset Filters */}
              {(categoryFilter || priceFilter || ratingFilter || deliveryFilter || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
                <div className="self-end">
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{services.length}</span> of{' '}
            <span className="font-semibold">{totalServices}</span> active services
            {categoryFilter && ' in selected category'}
            {priceFilter && ` in ${priceFilter} range`}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Page {page} of {totalPages}</span>
          </div>
        </div>

        {/* Services Listings */}
        {services.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <ServiceCard 
                  key={service._id} 
                  service={service} 
                  onClick={() => handleServiceClick(service._id, service.slug)} 
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <nav className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Page Numbers */}
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
                        onClick={() => goToPage(pageNum)}
                        className={`w-10 h-10 rounded-lg border ${
                          page === pageNum
                            ? 'bg-green-600 text-white border-green-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        } transition-colors`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No services found
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {categoryFilter || priceFilter || ratingFilter || deliveryFilter
                ? 'Try adjusting your filters'
                : 'There are currently no active services. Check back later!'}
            </p>
            {(categoryFilter || priceFilter || ratingFilter || deliveryFilter) && (
              <button
                onClick={resetFilters}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ServiceCard Component (FIXED to use real thumbnails)
const ServiceCard = ({ service, onClick }) => {
  console.log('Service Card Data:', service);
  console.log('Service Thumbnail:', service?.thumbnail);
  console.log('Service Images:', service?.images);

  // Get REAL service image - prioritize thumbnail, then first image
  const getServiceImage = () => {
    // First try: Use thumbnail URL if it exists
    if (service?.thumbnail?.url) {
      console.log('Using thumbnail URL:', service.thumbnail.url);
      return service.thumbnail.url;
    }
    
    // Second try: Use first image from images array
    if (service?.images && Array.isArray(service.images) && service.images.length > 0) {
      // Find the first image with a URL
      const firstImage = service.images.find(img => img?.url);
      if (firstImage?.url) {
        console.log('Using first image URL:', firstImage.url);
        return firstImage.url;
      }
    }
    
    // Third try: Check for Cloudinary public_id to construct URL
    if (service?.thumbnail?.public_id) {
      const cloudinaryUrl = `https://res.cloudinary.com/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'demo'}/image/upload/${service.thumbnail.public_id}`;
      console.log('Constructed Cloudinary URL:', cloudinaryUrl);
      return cloudinaryUrl;
    }
    
    // Fallback: Use category-based image
    console.log('Using fallback image');
    const categoryImages = {
      'web-development': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'graphic-design': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'digital-marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'writing-translation': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'video-animation': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'music-audio': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      'default': 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
    };
    
    const categorySlug = service?.category?.slug || 'default';
    return categoryImages[categorySlug] || categoryImages['default'];
  };

  const serviceImage = getServiceImage();
  const servicePrice = service?.price ? `$${service.price} ${service.currency || 'USD'}` : 'Custom';
  const deliveryTime = `${service?.deliveryTime || 3} ${service?.deliveryTimeUnit || 'days'}`;
  const categoryName = service?.category?.name || 'Uncategorized';
  const serviceTitle = service?.title || 'Untitled Service';
  const serviceDescription = service?.shortDescription || service?.description || 'No description provided.';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
    >
      {/* Service Image - REAL THUMBNAIL */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={serviceImage}
          alt={serviceTitle}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            console.log('Image failed to load, using fallback');
            e.target.src = 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80';
          }}
          onLoad={() => console.log('Image loaded successfully:', serviceImage)}
        />
        
        {/* Price Badge */}
        <div className="absolute bottom-3 right-3">
          <span className="px-3 py-2 bg-white/90 backdrop-blur-sm text-gray-900 font-bold rounded-lg shadow-sm">
            {servicePrice}
          </span>
        </div>
        
        {/* Rating Badge (if high rating) */}
        {service?.rating && service.rating >= 4.0 && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded flex items-center gap-1">
              <Star className="w-3 h-3 fill-white" />
              {service.rating.toFixed(1)}
            </span>
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded">
            {categoryName}
          </span>
        </div>
      </div>

      {/* Service Content */}
      <div className="p-5">
        {/* Service Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors line-clamp-2">
          {serviceTitle}
        </h3>

        {/* Service Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {serviceDescription}
        </p>

        {/* Service Info */}
        <div className="space-y-3 mb-4">
          {/* Rating */}
          {service?.rating && (
            <div className="flex items-center gap-1 text-sm text-gray-700">
              <span className="font-medium">Rating:</span>
              <span className="text-yellow-500 font-bold">{service.rating.toFixed(1)}</span>
              <span className="text-gray-500">({service.reviewsCount || 0} reviews)</span>
            </div>
          )}

          {/* Delivery Time */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Delivery:</span> {deliveryTime}
          </div>

          {/* Revisions */}
          {service?.revisions && service.revisions > 0 && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">Revisions:</span> {service.revisions} included
            </div>
          )}
        </div>

        {/* Service Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {service?.createdBy?.picture ? (
              <img 
                src={service.createdBy.picture} 
                alt={service.createdBy.name}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://ui-avatars.com/api/?name=' + (service.createdBy?.name || 'Provider') + '&background=random';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center font-medium">
                {service?.createdBy?.name?.charAt(0) || 'P'}
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-900">
                {service?.createdBy?.name || 'Provider'}
              </div>
              <div className="text-xs text-gray-500">
                {service?.ordersCount || 0} orders
              </div>
            </div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllServicesPage;