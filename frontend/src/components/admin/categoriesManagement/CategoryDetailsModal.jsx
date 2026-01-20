// CategoryDetailsModal.jsx - UPDATED with consistent design
import { useState } from 'react';
import { 
  FiX, FiFolder, FiInfo, FiCalendar, FiBarChart2, FiEdit2, 
  FiTrash2, FiCopy, FiExternalLink, FiPackage, FiUsers, 
  FiHash, FiLink, FiCheckCircle, FiXCircle, FiStar, FiTrendingUp,
  FiGlobe, FiTag, FiCode, FiDatabase, FiCornerDownRight
} from 'react-icons/fi';
import { format } from 'date-fns';

const CategoryDetailsModal = ({ category, onClose, onEdit, onDelete, onDuplicate }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!category) return null;

  const formatDate = (date) => {
    if (!date) return 'Not available';
    try {
      return format(new Date(date), 'PPpp');
    } catch {
      return 'Invalid date';
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You can add toast notification here
  };

  const getStatusColor = (status) => {
    return status 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200';
  };

  const handleEdit = () => {
    if (onEdit) onEdit(category);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) onDelete(category);
    onClose();
  };

  const handleDuplicate = () => {
    if (onDuplicate) onDuplicate(category);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FiFolder className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Category Details</h3>
              <p className="text-sm text-gray-500">Admin View • ID: {category._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(category._id)}
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
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="h-20 w-20 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <FiFolder className="h-10 w-10 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{category.name || 'No name'}</h2>
                      <p className="text-gray-600">{category.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(category.isActive)}`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {category.featured && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold border border-purple-200">
                        <FiStar className="inline h-4 w-4 mr-1" />
                        Featured
                      </span>
                    )}
                    {category.popular && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold border border-orange-200">
                        <FiTrendingUp className="inline h-4 w-4 mr-1" />
                        Popular
                      </span>
                    )}
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold border border-gray-200">
                      Order: {category.order || 0}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.open(`/categories/${category.slug}`, '_blank')}
                    className="px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 flex items-center space-x-2"
                  >
                    <FiExternalLink className="h-4 w-4" />
                    <span>View Live</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Services</p>
                    <p className="text-xl font-bold text-gray-900">{formatNumber(category.servicesCount || 0)}</p>
                  </div>
                  <FiPackage className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-xs text-gray-500">Total services</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Gigs</p>
                    <p className="text-xl font-bold text-gray-900">{formatNumber(category.gigsCount || 0)}</p>
                  </div>
                  <FiUsers className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-xs text-gray-500">Total gigs</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Level</p>
                    <p className="text-xl font-bold text-gray-900">{category.level || 0}</p>
                  </div>
                  <FiHash className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500">Hierarchy level</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Version</p>
                    <p className="text-xl font-bold text-gray-900">v{category.version || 1}</p>
                  </div>
                  <FiCode className="h-6 w-6 text-teal-500" />
                </div>
                <p className="text-xs text-gray-500">Data version</p>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Category Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiInfo className="h-5 w-5 mr-2 text-gray-500" />
                    Category Information
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <FiHash className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Slug</p>
                          <p className="text-xs text-gray-500">URL identifier</p>
                        </div>
                      </div>
                      <code className="text-sm text-gray-700 font-mono">{category.slug || 'N/A'}</code>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <FiLink className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Parent Category</p>
                          <p className="text-xs text-gray-500">Hierarchy parent</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">
                        {category.parentCategory?.name || 'None (Root)'}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <FiGlobe className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Display Order</p>
                          <p className="text-xs text-gray-500">Sorting position</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-700">{category.order || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {category.description && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <FiInfo className="h-5 w-5 mr-2 text-gray-500" />
                      Description
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-line">{category.description}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Timestamps */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiCalendar className="h-5 w-5 mr-2 text-gray-500" />
                    Timestamps
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Created</span>
                      <span className="font-medium">{formatDate(category.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium">{formatDate(category.updatedAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Last Modified By</span>
                      <span className="font-medium">
                        {category.lastUpdatedBy?.name || 'System'}
                      </span>
                    </div>
                    {category.deletedAt && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Deleted At</span>
                        <span className="font-medium text-red-600">{formatDate(category.deletedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SEO Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiGlobe className="h-5 w-5 mr-2 text-gray-500" />
                    SEO Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Meta Title</p>
                      <p className="text-gray-700">{category.metaTitle || category.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Meta Description</p>
                      <p className="text-gray-700">{category.metaDescription || category.description || 'No meta description'}</p>
                    </div>
                    {category.metaKeywords?.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Keywords</p>
                        <div className="flex flex-wrap gap-2">
                          {category.metaKeywords.map((keyword, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs border border-gray-200"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Subcategories */}
            {category.subcategories?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FiCornerDownRight className="h-5 w-5 mr-2 text-gray-500" />
                  Subcategories ({category.subcategories.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.subcategories.map((subcategory, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center space-x-3 mb-2">
                        <FiFolder className="h-5 w-5 text-indigo-500" />
                        <h5 className="font-medium text-gray-900">{subcategory.name}</h5>
                      </div>
                      {subcategory.description && (
                        <p className="text-sm text-gray-600 truncate">{subcategory.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(subcategory.isActive)}`}>
                          {subcategory.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Order: {subcategory.order || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Database Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <FiDatabase className="h-5 w-5 text-gray-600 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Database Information</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Collection: categories • Document ID: {category._id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Category ID: {category._id} • Created: {format(new Date(category.createdAt), 'MMM d, yyyy')}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleDuplicate}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center space-x-2 transition-colors"
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

export default CategoryDetailsModal;