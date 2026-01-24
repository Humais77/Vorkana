// ServiceDetailsModal.jsx - Fixed with proper error handling and default formatPrice
import React from 'react';
import { 
  FiX, FiPackage, FiInfo, FiCalendar, FiBarChart2, FiEye,
  FiEdit2, FiTrash2, FiCopy, FiExternalLink, FiUsers,
  FiDollarSign, FiClock, FiStar, FiHeart, FiTag, FiCheck,
  FiAlertTriangle, FiTrendingUp, FiShoppingCart, FiMessageSquare,
  FiLayers, FiFileText, FiDownload, FiCode, FiSettings,
  FiCheckCircle, FiXCircle, FiZap, FiAward, FiGrid, FiList
} from 'react-icons/fi';
import { format } from 'date-fns';

// Default formatPrice function
const defaultFormatPrice = (price, currency = 'USD') => {
  if (price === undefined || price === null) return '$0.00';
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numPrice);
};

const ServiceDetailsModal = ({ 
  service, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete,
  onDuplicate,
  categoriesMap = {},
  usersMap = {},
  formatPrice = defaultFormatPrice, // Use default if not provided
  onError,
  onSuccess
}) => {
  if (!isOpen || !service) return null;

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border border-green-200',
      draft: 'bg-gray-100 text-gray-800 border border-gray-200',
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      paused: 'bg-orange-100 text-orange-800 border border-orange-200',
      suspended: 'bg-red-100 text-red-800 border border-red-200',
      denied: 'bg-red-100 text-red-800 border border-red-200'
    };
    return colors[status] || colors.draft;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  const handleEdit = () => {
    onEdit(service);
  };

  const handleDelete = () => {
    onDelete(service);
  };

  const handleDuplicate = async () => {
    try {
      if (onDuplicate) {
        await onDuplicate(service);
      } else {
        console.warn('onDuplicate function not provided');
        if (onSuccess) onSuccess('Duplicate functionality not available');
      }
    } catch (error) {
      console.error('Duplicate error:', error);
      if (onError) onError(error);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      if (onSuccess) onSuccess('ID copied to clipboard');
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // Get category and subcategory with fallbacks
  const category = categoriesMap[service.category] || 
                   service.category || 
                   { name: 'Unknown Category', slug: '', icon: '' };
  
  const subcategory = categoriesMap[service.subcategory] || 
                      service.subcategory || 
                      { name: 'No Subcategory', slug: '', icon: '' };
  
  const createdBy = usersMap[service.createdBy] || 
                    service.createdBy || 
                    { name: 'Unknown User', email: '', picture: null };

  // Ensure safe access to service properties
  const safeService = {
    _id: service._id || '',
    title: service.title || 'Untitled Service',
    description: service.description || 'No description provided.',
    status: service.status || 'draft',
    price: service.price || 0,
    currency: service.currency || 'USD',
    deliveryTime: service.deliveryTime || 0,
    deliveryTimeUnit: service.deliveryTimeUnit || 'days',
    revisions: service.revisions || 0,
    ordersCount: service.ordersCount || 0,
    rating: service.rating || 0,
    views: service.views || 0,
    likes: service.likes || 0,
    reviewsCount: service.reviewsCount || 0,
    thumbnail: service.thumbnail || {},
    images: service.images || [],
    tags: service.tags || [],
    features: service.features || [],
    requirements: service.requirements || [],
    faqs: service.faqs || [],
    searchKeywords: service.searchKeywords || [],
    metaTitle: service.metaTitle || service.title || '',
    metaDescription: service.metaDescription || service.shortDescription || '',
    slug: service.slug || '',
    version: service.version || 1,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    publishedAt: service.publishedAt,
    deletedAt: service.deletedAt,
    isFeatured: Boolean(service.isFeatured),
    isPopular: Boolean(service.isPopular),
    isRecommended: Boolean(service.isRecommended),
    isActive: Boolean(service.isActive)
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-3">
            {safeService.thumbnail?.url ? (
              <img 
                src={safeService.thumbnail.url} 
                alt={safeService.title}
                className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `
                    <div class="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  `;
                }}
              />
            ) : (
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiPackage className="h-6 w-6 text-indigo-600" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Service Details</h3>
              <p className="text-sm text-gray-500">ID: {safeService._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(safeService._id)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1"
              title="Copy ID"
            >
              <FiCopy className="h-4 w-4" />
              <span>Copy ID</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-1"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{safeService.title}</h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(safeService.status)}`}>
                      {safeService.status ? safeService.status.charAt(0).toUpperCase() + safeService.status.slice(1) : 'Draft'}
                    </span>
                    {safeService.isFeatured && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold border border-purple-200">
                        <FiStar className="inline h-3 w-3 mr-1" />
                        Featured
                      </span>
                    )}
                    {safeService.isPopular && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold border border-orange-200">
                        <FiTrendingUp className="inline h-3 w-3 mr-1" />
                        Popular
                      </span>
                    )}
                    {safeService.isRecommended && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold border border-blue-200">
                        <FiCheck className="inline h-3 w-3 mr-1" />
                        Recommended
                      </span>
                    )}
                    {safeService.isActive && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold border border-green-200">
                        <FiCheckCircle className="inline h-3 w-3 mr-1" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-gray-600">
                    <p className="text-lg">{formatPrice(safeService.price, safeService.currency)}</p>
                    <p className="text-sm">
                      Delivery: {safeService.deliveryTime} {safeService.deliveryTimeUnit} • 
                      Revisions: {safeService.revisions}
                    </p>
                  </div>
                </div>
                {safeService.thumbnail?.url && (
                  <div className="flex-shrink-0">
                    <img 
                      src={safeService.thumbnail.url} 
                      alt={safeService.title}
                      className="h-32 w-32 rounded-lg object-cover border border-gray-200 shadow-sm"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `
                          <div class="h-32 w-32 bg-indigo-100 rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                            <svg class="h-12 w-12 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        `;
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="text-xl font-bold text-gray-900">{formatPrice(safeService.price, safeService.currency)}</p>
                  </div>
                  <FiDollarSign className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-xs text-gray-500">Base price</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Orders</p>
                    <p className="text-xl font-bold text-gray-900">{safeService.ordersCount}</p>
                  </div>
                  <FiShoppingCart className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500">Total orders</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Rating</p>
                    <p className="text-xl font-bold text-gray-900">{safeService.rating.toFixed(1)}</p>
                  </div>
                  <FiStar className="h-6 w-6 text-yellow-500" />
                </div>
                <p className="text-xs text-gray-500">Average rating</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Views</p>
                    <p className="text-xl font-bold text-gray-900">{safeService.views}</p>
                  </div>
                  <FiEye className="h-6 w-6 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500">Total views</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Likes</p>
                    <p className="text-xl font-bold text-gray-900">{safeService.likes}</p>
                  </div>
                  <FiHeart className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-xs text-gray-500">Total likes</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Reviews</p>
                    <p className="text-xl font-bold text-gray-900">{safeService.reviewsCount}</p>
                  </div>
                  <FiMessageSquare className="h-6 w-6 text-teal-500" />
                </div>
                <p className="text-xs text-gray-500">Total reviews</p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiFileText className="h-5 w-5 mr-2 text-gray-500" />
                    Description
                  </h4>
                  <div className="prose max-w-none">
                    <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                      <p className="text-gray-700 whitespace-pre-line">
                        {safeService.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Category & Subcategory */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiGrid className="h-5 w-5 mr-2 text-gray-500" />
                    Category Information
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">Category</p>
                        <p className="font-medium text-lg mt-1">
                          {typeof category === 'object' ? category.name : 'Unknown Category'}
                        </p>
                        {typeof category === 'object' && category.description && (
                          <p className="text-xs text-gray-500 mt-2">{category.description}</p>
                        )}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600">Subcategory</p>
                        <p className="font-medium text-lg mt-1">
                          {typeof subcategory === 'object' ? subcategory.name : 'No Subcategory'}
                        </p>
                        {typeof subcategory === 'object' && subcategory.description && (
                          <p className="text-xs text-gray-500 mt-2">{subcategory.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {typeof category === 'object' && category.slug && (
                      <button
                        onClick={() => window.open(`/categories/${category.slug}`, '_blank')}
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center space-x-2 w-full justify-center border border-indigo-200"
                      >
                        <FiExternalLink className="h-4 w-4" />
                        <span>View Category</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Service Creator */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiUsers className="h-5 w-5 mr-2 text-gray-500" />
                    Service Creator
                  </h4>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {createdBy.picture ? (
                      <img
                        src={createdBy.picture}
                        alt={createdBy.name}
                        className="h-12 w-12 rounded-full border border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `
                            <div class="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                              <svg class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <FiUsers className="h-6 w-6 text-indigo-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{createdBy.name}</p>
                      <p className="text-sm text-gray-500">{createdBy.email}</p>
                      {createdBy.role && (
                        <p className="text-xs text-gray-400 mt-1">Role: {createdBy.role}</p>
                      )}
                    </div>
                    {createdBy._id && (
                      <button
                        onClick={() => window.open(`/admin/users/${createdBy._id}`, '_blank')}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1"
                        title="View user"
                      >
                        <FiExternalLink className="h-4 w-4" />
                        <span>View</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiClock className="h-5 w-5 mr-2 text-gray-500" />
                    Delivery Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">Delivery Time</p>
                      <p className="text-lg font-bold text-gray-900">
                        {safeService.deliveryTime} {safeService.deliveryTimeUnit}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">Revisions</p>
                      <p className="text-lg font-bold text-gray-900">
                        {safeService.revisions}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiCalendar className="h-5 w-5 mr-2 text-gray-500" />
                    Timestamps
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <span className="text-gray-600">Created</span>
                      <span className="font-medium">{formatDate(safeService.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium">{formatDate(safeService.updatedAt)}</span>
                    </div>
                    {safeService.publishedAt && (
                      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                        <span className="text-gray-600">Published</span>
                        <span className="font-medium">{formatDate(safeService.publishedAt)}</span>
                      </div>
                    )}
                    {safeService.deletedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Deleted</span>
                        <span className="font-medium text-red-600">{formatDate(safeService.deletedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {safeService.tags.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiTag className="h-5 w-5 mr-2 text-gray-500" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {safeService.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-2 rounded-lg text-sm bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Features Section */}
            {safeService.features.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiZap className="h-5 w-5 mr-2 text-gray-500" />
                  Features
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {safeService.features.map((feature, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center mb-2">
                        {feature.included !== false ? (
                          <FiCheck className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <FiXCircle className="h-4 w-4 text-red-500 mr-2" />
                        )}
                        <h5 className="font-medium text-gray-900">{feature.title || `Feature ${index + 1}`}</h5>
                      </div>
                      {feature.description && (
                        <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {safeService.requirements.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiSettings className="h-5 w-5 mr-2 text-gray-500" />
                  Requirements
                </h4>
                <div className="space-y-3">
                  {safeService.requirements.map((requirement, index) => (
                    <div key={index} className="flex items-start space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <FiCheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-700">{requirement}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQs */}
            {safeService.faqs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiMessageSquare className="h-5 w-5 mr-2 text-gray-500" />
                  Frequently Asked Questions
                </h4>
                <div className="space-y-4">
                  {safeService.faqs.map((faq, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                        <FiAward className="h-4 w-4 mr-2 text-indigo-500" />
                        {faq.question || `Question ${index + 1}`}
                      </h5>
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Keywords */}
            {safeService.searchKeywords.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiCode className="h-5 w-5 mr-2 text-gray-500" />
                  Search Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {safeService.searchKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Images/Gallery */}
            {safeService.images.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiDownload className="h-5 w-5 mr-2 text-gray-500" />
                  Service Images
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {safeService.images.slice(0, 6).map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img.url || img}
                        alt={`Service image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `
                            <div class="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                              <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          `;
                        }}
                      />
                      <a
                        href={img.url || img}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <FiExternalLink className="h-6 w-6 text-white" />
                      </a>
                    </div>
                  ))}
                  {safeService.images.length > 6 && (
                    <div className="flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                      <span className="text-gray-600">+{safeService.images.length - 6} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Meta Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <FiList className="h-5 w-5 mr-2 text-gray-500" />
                Meta Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Meta Title</p>
                  <p className="font-medium">{safeService.metaTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Meta Description</p>
                  <p className="text-gray-700 line-clamp-2">{safeService.metaDescription}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500 truncate">
            Service ID: {safeService._id} • Slug: {safeService.slug} • Version: {safeService.version}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDuplicate}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium flex items-center space-x-2 transition-colors"
            >
              <FiCopy className="h-4 w-4" />
              <span>Duplicate</span>
            </button>
            
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2 transition-colors"
            >
              <FiEdit2 className="h-4 w-4" />
              <span>Edit</span>
            </button>
            
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center space-x-2 transition-colors"
            >
              <FiTrash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsModal;