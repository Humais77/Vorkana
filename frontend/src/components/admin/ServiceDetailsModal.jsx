// components/admin/modals/ServiceDetailsModal.jsx
import React from 'react';
import { 
  FiX, 
  FiPackage, 
  FiInfo, 
  FiCalendar, 
  FiBarChart2, 
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiExternalLink,
  FiUsers,
  FiDollarSign,
  FiClock,
  FiStar,
  FiHeart,
  FiTag,
  FiCheck,
  FiAlertTriangle,
  FiTrendingUp,
  FiShoppingCart,
  FiMessageSquare,
  FiLayers
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
  formatPrice
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

  const getStatusIcon = (status) => {
    const icons = {
      active: FiCheck,
      draft: FiEdit2,
      pending: FiClock,
      paused: FiAlertTriangle,
      suspended: FiAlertTriangle,
      denied: FiAlertTriangle
    };
    return icons[status] || FiEdit2;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPP pp');
    } catch {
      return 'Invalid date';
    }
  };

  const handleEdit = () => {
    onEdit(service);
    onClose();
  };

  const handleDelete = () => {
    onDelete(service);
    onClose();
  };

  const handleDuplicate = () => {
    onDuplicate(service);
    onClose();
  };

  const StatusIcon = getStatusIcon(service.status);
  const category = categoriesMap[service.category] || {};
  const subcategory = category.subcategories?.find(sub => sub._id === service.subcategory);
  const createdBy = usersMap[service.createdBy] || service.createdBy || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                {service.thumbnail ? (
                  <img 
                    src={service.thumbnail} 
                    alt={service.title}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <FiPackage className="h-6 w-6 text-indigo-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{service.title}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                    <StatusIcon className="inline h-3 w-3 mr-1" />
                    {service.status ? service.status.charAt(0).toUpperCase() + service.status.slice(1) : 'Draft'}
                  </span>
                  {service.isFeatured && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                      <FiStar className="inline h-3 w-3 mr-1" />
                      Featured
                    </span>
                  )}
                  {service.isPopular && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                      <FiTrendingUp className="inline h-3 w-3 mr-1" />
                      Popular
                    </span>
                  )}
                  {service.isRecommended && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      <FiCheck className="inline h-3 w-3 mr-1" />
                      Recommended
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Quick Stats */}
          <div className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="text-xl font-bold text-gray-900">{formatPrice(service.price, service.currency)}</p>
                  </div>
                  <FiDollarSign className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-gray-500">Base price</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Orders</p>
                    <p className="text-xl font-bold text-gray-900">{service.ordersCount || 0}</p>
                  </div>
                  <FiShoppingCart className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500">Total orders</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Rating</p>
                    <p className="text-xl font-bold text-gray-900">{service.rating?.toFixed(1) || '0.0'}</p>
                  </div>
                  <FiStar className="h-8 w-8 text-yellow-500" />
                </div>
                <p className="text-xs text-gray-500">Average rating</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Views</p>
                    <p className="text-xl font-bold text-gray-900">{service.views || 0}</p>
                  </div>
                  <FiEye className="h-8 w-8 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500">Total views</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Likes</p>
                    <p className="text-xl font-bold text-gray-900">{service.likes || 0}</p>
                  </div>
                  <FiHeart className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-xs text-gray-500">Total likes</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Reviews</p>
                    <p className="text-xl font-bold text-gray-900">{service.reviewsCount || 0}</p>
                  </div>
                  <FiMessageSquare className="h-8 w-8 text-teal-500" />
                </div>
                <p className="text-xs text-gray-500">Total reviews</p>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Details */}
            <div>
              {/* Short Description */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Short Description
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700">
                    {service.shortDescription || 'No short description provided.'}
                  </p>
                </div>
              </div>

              {/* Description */}
              {service.description && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Full Description
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div 
                      className="text-gray-700 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: service.description }}
                    />
                  </div>
                </div>
              )}

              {/* Category & Subcategory */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Category Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-4">
                    <FiLayers className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {category.name || 'Unknown Category'}
                      </p>
                      {category.slug && (
                        <p className="text-sm text-gray-500 mt-1">
                          Slug: {category.slug}
                        </p>
                      )}
                    </div>
                    {category.slug && (
                      <button
                        onClick={() => window.open(`/categories/${category.slug}`, '_blank')}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="View category"
                      >
                        <FiExternalLink className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {subcategory && (
                    <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-4">
                      <FiLayers className="h-5 w-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {subcategory.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Subcategory
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {service.tags && service.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {service.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                      >
                        <FiTag className="h-3 w-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Metadata */}
            <div>
              {/* Delivery Information */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Delivery Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <FiClock className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Delivery Time</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {service.deliveryTime} {service.deliveryTimeUnit || 'days'}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <FiEdit2 className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Revisions</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {service.revisions || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Creator */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Service Creator
                </h4>
                <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-4">
                  {createdBy.picture ? (
                    <img
                      src={createdBy.picture}
                      alt={createdBy.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <FiUsers className="h-5 w-5 text-indigo-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {createdBy.name || 'Unknown User'}
                    </p>
                    {createdBy.email && (
                      <p className="text-sm text-gray-500 mt-1">
                        {createdBy.email}
                      </p>
                    )}
                  </div>
                  {createdBy._id && (
                    <button
                      onClick={() => window.open(`/admin/users/${createdBy._id}`, '_blank')}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="View user"
                    >
                      <FiExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Timestamps
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <FiCalendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Created</span>
                    </div>
                    <span className="text-sm text-gray-900">{formatDate(service.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <FiCalendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Last Updated</span>
                    </div>
                    <span className="text-sm text-gray-900">{formatDate(service.updatedAt)}</span>
                  </div>
                  
                  {service.publishedAt && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <FiCalendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Published</span>
                      </div>
                      <span className="text-sm text-gray-900">{formatDate(service.publishedAt)}</span>
                    </div>
                  )}
                  
                  {service.deletedAt && (
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center space-x-3">
                        <FiCalendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Deleted</span>
                      </div>
                      <span className="text-sm text-gray-900">{formatDate(service.deletedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Technical Details
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Service ID</span>
                    <code className="text-sm font-mono text-gray-800">{service._id}</code>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Category ID</span>
                    <code className="text-sm font-mono text-gray-800">
                      {service.category ? (typeof service.category === 'object' ? service.category._id : service.category) : 'N/A'}
                    </code>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Subcategory ID</span>
                    <code className="text-sm font-mono text-gray-800">
                      {service.subcategory ? (typeof service.subcategory === 'object' ? service.subcategory._id : service.subcategory) : 'N/A'}
                    </code>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Currency</span>
                    <span className="text-sm text-gray-900">
                      {service.currency || 'USD'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Version</span>
                    <span className="text-sm text-gray-900">
                      {service.version || 1}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          {service.features && service.features.length > 0 && (
            <div className="mt-8">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Features
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {service.features.map((feature, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <FiCheck className="h-4 w-4 text-green-500 mr-2" />
                      <h5 className="font-medium text-gray-900">{feature.title}</h5>
                    </div>
                    {feature.description && (
                      <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <span className="flex items-center">
                  <FiInfo className="h-4 w-4 mr-1" />
                  Service ID: {service._id}
                </span>
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
      </div>
    </div>
  );
};

export default ServiceDetailsModal;