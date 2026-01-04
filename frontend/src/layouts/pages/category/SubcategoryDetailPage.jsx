import React, { useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
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
  Loader
} from 'lucide-react';
import { SeoWrapper } from '../../../components/SeoWrapper';
import { useCategory } from '../../../hooks/useCategories';
import { useSubcategory } from '../../../hooks/useSubcategories';
import { useServicesBySubcategory } from '../../../hooks/useServices';

const SubcategoryDetailPage = () => {
  const { categoryId, subcategorySlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [deliveryTime, setDeliveryTime] = useState('any');

  // Fetch data with proper loading states
  const { 
    data: categoryData, 
    isLoading: categoryLoading 
  } = useCategory(categoryId, {
    enabled: !!categoryId,
  });


  const { 
    data: subcategoryData, 
    isLoading: subcategoryLoading,
    error: subcategoryError 
  } = useSubcategory(subcategorySlug, {
    enabled: !!subcategorySlug,
  });
  const { 
    data: servicesData,
    isLoading: servicesLoading
  } = useServicesBySubcategory(subcategoryData?._id, {
    enabled: !!subcategoryData?._id,
  });

  // Combined loading state
  const isLoading = categoryLoading || subcategoryLoading || servicesLoading;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4">
            <Loader className="h-8 w-8 mx-auto my-2 text-blue-500" />
          </div>
          <p className="text-gray-600">Loading subcategory details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (subcategoryError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Subcategory Not Found</h2>
          <p className="text-gray-600 mb-4">
            The subcategory "{subcategorySlug}" does not exist or could not be loaded.
          </p>
          <Link
            to={`/categories/${categoryId}`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Category
          </Link>
        </div>
      </div>
    );
  }

  // Check if data exists
  if (!categoryData || !subcategoryData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-4xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Not Found</h2>
          <p className="text-gray-600 mb-4">The requested subcategory could not be found.</p>
          <Link
            to="/categories"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Browse Categories
          </Link>
        </div>
      </div>
    );
  }

  // Now we can safely destructure
  const category = categoryData;
  const subcategory = subcategoryData;
  const services = servicesData || [];

  // Filter and sort services
  const filteredServices = services.filter(service => {
    // Search filter
    if (searchQuery && !service.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Price filter
    const price = service.price || service.startingPrice || 0;
    if (price < priceRange[0] || price > priceRange[1]) {
      return false;
    }
    
    // Delivery time filter
    if (deliveryTime !== 'any') {
      const serviceDelivery = service.deliveryTime || 0;
      if (deliveryTime === 'fast' && serviceDelivery > 3) return false;
      if (deliveryTime === 'medium' && (serviceDelivery < 4 || serviceDelivery > 7)) return false;
      if (deliveryTime === 'slow' && serviceDelivery < 8) return false;
    }
    
    return true;
  });

  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return (a.price || 0) - (b.price || 0);
      case 'price-high': return (b.price || 0) - (a.price || 0);
      case 'rating': return (b.rating || 0) - (a.rating || 0);
      case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
      default: return (b.orders || 0) - (a.orders || 0);
    }
  });

  // Breadcrumbs - only create after data is loaded
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Categories', href: '/categories' },
    { name: category.name, href: `/categories/${categoryId}` },
    { name: subcategory.name, href: '#' }
  ];

  // Stats
  const stats = [
    { label: 'Services', value: services.length, icon: <Award className="h-5 w-5" /> },
    { label: 'Providers', value: new Set(services.map(s => s.seller?._id)).size, icon: <Users className="h-5 w-5" /> },
    { label: 'Avg Rating', value: '4.8', icon: <Star className="h-5 w-5" /> },
    { label: 'Avg Delivery', value: '5 days', icon: <Clock className="h-5 w-5" /> }
  ];

  return (
    <SeoWrapper
      title={`${subcategory.name} Services - ${category.name} | Vorkanna`}
      description={subcategory.description || `Professional ${subcategory.name.toLowerCase()} services`}
      keywords={[subcategory.name, category.name, 'services']}
      canonical={`/categories/${categoryId}/${subcategorySlug}`}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumbs */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 py-3">
              <button
                onClick={() => navigate(`/categories/${categoryId}`)}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to {category.name}
              </button>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.name} className="flex items-center">
                  <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
                  <Link
                    to={crumb.href}
                    className={`text-sm ${index === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {crumb.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </nav>
        {/* Subcategory Hero */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">{subcategory.name}</h1>
              <p className="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
                {subcategory.description || `Professional ${subcategory.name.toLowerCase()} services for all your needs`}
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <div className="text-blue-200 mr-2">{stat.icon}</div>
                      <div className="text-3xl font-bold">{stat.value}</div>
                    </div>
                    <div className="text-sm opacity-80">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-4 lg:gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Services</h3>
                
                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="rating">Highest Rated</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Time */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Time
                  </label>
                  <select
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="any">Any Delivery Time</option>
                    <option value="fast">Fast (1-3 days)</option>
                    <option value="medium">Medium (4-7 days)</option>
                    <option value="slow">Slow (8+ days)</option>
                  </select>
                </div>

                {/* Reset Filters */}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSortBy('popular');
                    setPriceRange([0, 10000]);
                    setDeliveryTime('any');
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Services Grid */}
            <div className="lg:col-span-3 mt-6 lg:mt-0">
              {/* Results Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {sortedServices.length} {subcategory.name} Services
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Professional services tailored to your needs
                  </p>
                </div>
                <div className="mt-4 md:mt-0">
                  <Link
                    to={`/services/create?category=${categoryId}&subcategory=${subcategory._id}`}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Post a {subcategory.name} Service
                  </Link>
                </div>
              </div>

              {/* Services */}
              {sortedServices.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-xl font-medium text-gray-700 mb-2">
                    No services found
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    {searchQuery 
                      ? `No services match "${searchQuery}"`
                      : 'Be the first to post a service in this subcategory!'
                    }
                  </p>
                  <Link
                    to={`/services/create?category=${categoryId}&subcategory=${subcategory._id}`}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Post Your Service
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sortedServices.map((service) => (
                    <div
                      key={service._id}
                      onClick={() => navigate(`/services/${service._id}`)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                    >
                      {/* Service Image */}
                      <div className="h-48 overflow-hidden bg-gray-100">
                        {service.image ? (
                          <img
                            src={service.image}
                            alt={service.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                            <span className="text-blue-600 font-medium text-center px-4">
                              {service.title}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Service Details */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                            {service.title}
                          </h3>
                          <span className="text-lg font-bold text-blue-600">
                            ${service.price || service.startingPrice}
                          </span>
                        </div>

                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {service.description}
                        </p>

                        {/* Seller Info */}
                        <div className="flex items-center mb-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden mr-2">
                            {service.seller?.avatar ? (
                              <img
                                src={service.seller.avatar}
                                alt={service.seller.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold">
                                {service.seller?.name?.charAt(0) || 'S'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {service.seller?.name || 'Seller'}
                            </p>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 mr-1" fill="currentColor" />
                              <span className="text-xs text-gray-600">
                                {service.rating || '4.8'} ({service.reviews || '0'})
                              </span>
                            </div>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{service.deliveryTime || '3'} days</span>
                          </div>
                          {service.orders > 0 && (
                            <div className="flex items-center">
                              <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                              <span>{service.orders} orders</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {sortedServices.length > 0 && (
                <div className="mt-8 flex justify-center">
                  <nav className="flex items-center space-x-2">
                    <button className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                      Previous
                    </button>
                    <button className="px-3 py-2 rounded-lg bg-blue-600 text-white">
                      1
                    </button>
                    <button className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                      2
                    </button>
                    <button className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                      3
                    </button>
                    <span className="px-2">...</span>
                    <button className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Subcategories */}
        {category.children && category.children.length > 0 && (
          <div className="bg-white border-t border-gray-200 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Other {category.name} Subcategories
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {category.children
                  .filter(child => child._id !== subcategory._id)
                  .slice(0, 8)
                  .map((child) => (
                    <Link
                      key={child._id}
                      to={`/categories/${categoryId}/${child.slug}`}
                      className="bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-4 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 group-hover:text-blue-700">
                          {child.name}
                        </h3>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500" />
                      </div>
                      {child.servicesCount > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          {child.servicesCount} services
                        </p>
                      )}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </SeoWrapper>
  );
};

export default SubcategoryDetailPage;