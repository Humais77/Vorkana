// components/admin/modals/SubcategoryDetailsModal.jsx
import React from 'react';
import { 
  FiX, 
  FiFolder, 
  FiInfo, 
  FiCalendar, 
  FiBarChart2, 
  FiEye,
  FiEyeOff,
  FiArchive,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiExternalLink,
  FiUsers,
  FiPackage,
  FiLayers,
  FiHash
} from 'react-icons/fi';
import { format } from 'date-fns';

const SubcategoryDetailsModal = ({ 
  subcategory, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete,
  onDuplicate,
  categoriesMap = {}
}) => {
  if (!isOpen || !subcategory) return null;

  const getStatusColor = (status) => {
    return status 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200';
  };

  const getStatusIcon = (status) => {
    return status ? FiEye : FiEyeOff;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPP pp');
    } catch {
      return 'Invalid date';
    }
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const handleEdit = () => {
    onEdit(subcategory);
    onClose();
  };

  const handleDelete = () => {
    onDelete(subcategory);
    onClose();
  };

  const handleDuplicate = () => {
    onDuplicate(subcategory);
    onClose();
  };

  const StatusIcon = getStatusIcon(subcategory.isActive);
  const parentCategory = categoriesMap[subcategory.category] || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <div className="text-2xl">
                  {subcategory.icon || '📁'}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{subcategory.name}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(subcategory.isActive)}`}>
                    <StatusIcon className="inline h-3 w-3 mr-1" />
                    {subcategory.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {subcategory.deletedAt && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                      <FiArchive className="inline h-3 w-3 mr-1" />
                      Archived
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Services</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(subcategory.servicesCount)}</p>
                  </div>
                  <FiPackage className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500">Total services in this subcategory</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Gigs</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(subcategory.gigsCount)}</p>
                  </div>
                  <FiUsers className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-xs text-gray-500">Active gigs in this subcategory</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Display Order</p>
                    <p className="text-2xl font-bold text-gray-900">{subcategory.order || 0}</p>
                  </div>
                  <FiHash className="h-8 w-8 text-purple-500" />
                </div>
                <p className="text-xs text-gray-500">Sorting position</p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Version</p>
                    <p className="text-2xl font-bold text-gray-900">v{subcategory.version || 1}</p>
                  </div>
                  <FiLayers className="h-8 w-8 text-orange-500" />
                </div>
                <p className="text-xs text-gray-500">Data version</p>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Details */}
            <div>
              {/* Description */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Description
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-line">
                    {subcategory.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              {/* Parent Category */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  Parent Category
                </h4>
                <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-4">
                  <FiFolder className="h-5 w-5 text-gray-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {parentCategory.name || 'Unknown Category'}
                    </p>
                    {parentCategory.slug && (
                      <p className="text-sm text-gray-500 mt-1">
                        Slug: {parentCategory.slug}
                      </p>
                    )}
                  </div>
                  {parentCategory.slug && (
                    <button
                      onClick={() => window.open(`/categories/${parentCategory.slug}`, '_blank')}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="View parent category"
                    >
                      <FiExternalLink className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* SEO Information */}
              {(subcategory.metaTitle || subcategory.metaDescription) && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    SEO Information
                  </h4>
                  <div className="space-y-3">
                    {subcategory.metaTitle && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Meta Title</p>
                        <p className="text-sm text-gray-800 bg-gray-50 rounded p-3">{subcategory.metaTitle}</p>
                      </div>
                    )}
                    {subcategory.metaDescription && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Meta Description</p>
                        <p className="text-sm text-gray-800 bg-gray-50 rounded p-3">{subcategory.metaDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Metadata */}
            <div>
              {/* URL Information */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                  URL Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Slug</p>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono bg-gray-100 text-gray-800 px-3 py-2 rounded flex-1">
                        /categories/{parentCategory.slug}/{subcategory.slug}
                      </code>
                      <button
                        onClick={() => window.open(`/categories/${parentCategory.slug}/${subcategory.slug}`, '_blank')}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="View on site"
                      >
                        <FiExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
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
                    <span className="text-sm text-gray-900">{formatDate(subcategory.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <FiCalendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Last Updated</span>
                    </div>
                    <span className="text-sm text-gray-900">{formatDate(subcategory.updatedAt)}</span>
                  </div>
                  
                  {subcategory.deletedAt && (
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <FiArchive className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Deleted At</span>
                      </div>
                      <span className="text-sm text-gray-900">{formatDate(subcategory.deletedAt)}</span>
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
                    <span className="text-sm text-gray-600">Subcategory ID</span>
                    <code className="text-sm font-mono text-gray-800">{subcategory._id}</code>
                  </div>
                  
                  <div className="flex justify-between">
  <span className="text-sm text-gray-600">Parent Category ID</span>
  <code className="text-sm font-mono text-gray-800">
    {subcategory.category 
      ? (typeof subcategory.category === 'object' 
          ? subcategory.category._id 
          : subcategory.category)
      : 'N/A'}
  </code>
</div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Icon</span>
                    <span className="text-sm text-gray-900">
                      {subcategory.icon || '📁 (Default)'}
                    </span>
                  </div>
                  
                  {subcategory.createdBy && (
  <div className="flex justify-between">
    <span className="text-sm text-gray-600">Created By</span>
    <span className="text-sm text-gray-900">
      {typeof subcategory.createdBy === 'object'
        ? (subcategory.createdBy.name || subcategory.createdBy.email || 'Unknown User')
        : `User ID: ${subcategory.createdBy}`}
    </span>
  </div>
)}
                  
                 {subcategory.lastUpdatedBy && (
  <div className="flex justify-between">
    <span className="text-sm text-gray-600">Last Updated By</span>
    <span className="text-sm text-gray-900">
      {typeof subcategory.lastUpdatedBy === 'object'
        ? (subcategory.lastUpdatedBy.name || subcategory.lastUpdatedBy.email || 'Unknown User')
        : `User ID: ${subcategory.lastUpdatedBy}`}
    </span>
  </div>
)}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <span className="flex items-center">
                  <FiInfo className="h-4 w-4 mr-1" />
                  Subcategory ID: {subcategory._id}
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

export default SubcategoryDetailsModal;