// ServiceDetails.jsx - Updated with proper error handling
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

const ServiceDetailsModal = ({ 
  service, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete,
  onDuplicate,
  categoriesMap = {},
  usersMap = {},
  formatPrice,
  onError, // Add these props for error handling
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
      await onDuplicate(service);
    } catch (error) {
      if (onError) onError(error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    if (onSuccess) onSuccess('ID copied to clipboard');
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-3">
            {service.thumbnail?.url ? (
              <img 
                src={service.thumbnail.url} 
                alt={service.title}
                className="h-12 w-12 rounded-lg object-cover border border-gray-200"
              />
            ) : (
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiPackage className="h-6 w-6 text-indigo-600" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Service Details</h3>
              <p className="text-sm text-gray-500">ID: {service._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(service._id)}
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{service.title}</h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(service.status)}`}>
                      {service.status ? service.status.charAt(0).toUpperCase() + service.status.slice(1) : 'Draft'}
                    </span>
                    {service.isFeatured && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold border border-purple-200">
                        <FiStar className="inline h-3 w-3 mr-1" />
                        Featured
                      </span>
                    )}
                    {service.isPopular && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold border border-orange-200">
                        <FiTrendingUp className="inline h-3 w-3 mr-1" />
                        Popular
                      </span>
                    )}
                    {service.isRecommended && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold border border-blue-200">
                        <FiCheck className="inline h-3 w-3 mr-1" />
                        Recommended
                      </span>
                    )}
                    {service.isActive && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold border border-green-200">
                        <FiCheckCircle className="inline h-3 w-3 mr-1" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-gray-600">
                    <p className="text-lg">{formatPrice(service.price, service.currency)}</p>
                    <p className="text-sm">
                      Delivery: {service.deliveryTime} {service.deliveryTimeUnit || 'days'} • 
                      Revisions: {service.revisions}
                    </p>
                  </div>
                </div>
                {service.thumbnail?.url && (
                  <div className="flex-shrink-0">
                    <img 
                      src={service.thumbnail.url} 
                      alt={service.title}
                      className="h-32 w-32 rounded-lg object-cover border border-gray-200 shadow-sm"
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
                    <p className="text-xl font-bold text-gray-900">{formatPrice(service.price, service.currency)}</p>
                  </div>
                  <FiDollarSign className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-xs text-gray-500">Base price</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Orders</p>
                    <p className="text-xl font-bold text-gray-900">{service.ordersCount || 0}</p>
                  </div>
                  <FiShoppingCart className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500">Total orders</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Rating</p>
                    <p className="text-xl font-bold text-gray-900">{service.rating?.toFixed(1) || '0.0'}</p>
                  </div>
                  <FiStar className="h-6 w-6 text-yellow-500" />
                </div>
                <p className="text-xs text-gray-500">Average rating</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Views</p>
                    <p className="text-xl font-bold text-gray-900">{service.views || 0}</p>
                  </div>
                  <FiEye className="h-6 w-6 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500">Total views</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Likes</p>
                    <p className="text-xl font-bold text-gray-900">{service.likes || 0}</p>
                  </div>
                  <FiHeart className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-xs text-gray-500">Total likes</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Reviews</p>
                    <p className="text-xl font-bold text-gray-900">{service.reviewsCount || 0}</p>
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
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-line">
                        {service.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Category & Subcategory - FIXED */}
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
                {/* Service Creator - FIXED */}
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
                      />
                    ) : (
                      <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <FiUsers className="h-6 w-6 text-indigo-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{createdBy.name || 'Unknown User'}</p>
                      <p className="text-sm text-gray-500">{createdBy.email || ''}</p>
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
                        {service.deliveryTime} {service.deliveryTimeUnit || 'days'}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">Revisions</p>
                      <p className="text-lg font-bold text-gray-900">
                        {service.revisions || 0}
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
                      <span className="font-medium">{formatDate(service.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium">{formatDate(service.updatedAt)}</span>
                    </div>
                    {service.publishedAt && (
                      <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                        <span className="text-gray-600">Published</span>
                        <span className="font-medium">{formatDate(service.publishedAt)}</span>
                      </div>
                    )}
                    {service.deletedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Deleted</span>
                        <span className="font-medium text-red-600">{formatDate(service.deletedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {service.tags && service.tags.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiTag className="h-5 w-5 mr-2 text-gray-500" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {service.tags.map((tag, index) => (
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
            {service.features && service.features.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiZap className="h-5 w-5 mr-2 text-gray-500" />
                  Features
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {service.features.map((feature, index) => (
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
            {service.requirements && service.requirements.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiSettings className="h-5 w-5 mr-2 text-gray-500" />
                  Requirements
                </h4>
                <div className="space-y-3">
                  {service.requirements.map((requirement, index) => (
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
            {service.faqs && service.faqs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiMessageSquare className="h-5 w-5 mr-2 text-gray-500" />
                  Frequently Asked Questions
                </h4>
                <div className="space-y-4">
                  {service.faqs.map((faq, index) => (
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
            {service.searchKeywords && service.searchKeywords.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiCode className="h-5 w-5 mr-2 text-gray-500" />
                  Search Keywords
                </h4>
                <div className="flex flex-wrap gap-2">
                  {service.searchKeywords.map((keyword, index) => (
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
            {service.images && service.images.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiDownload className="h-5 w-5 mr-2 text-gray-500" />
                  Service Images
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {service.images.slice(0, 6).map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img.url || img}
                        alt={`Service image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
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
                  {service.images.length > 6 && (
                    <div className="flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                      <span className="text-gray-600">+{service.images.length - 6} more</span>
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
                  <p className="font-medium">{service.metaTitle || service.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Meta Description</p>
                  <p className="text-gray-700">{service.metaDescription || service.shortDescription}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Service ID: {service._id} • Slug: {service.slug} • Version: {service.version || 1}
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