// SubcategoryDetailsModal.jsx - Created with consistent design
import { useState } from 'react';
import { 
  FiX, FiFolder, FiInfo, FiCalendar, FiBarChart2, FiEdit2, 
  FiTrash2, FiCopy, FiExternalLink, FiPackage, FiUsers, 
  FiHash, FiLink, FiCheckCircle, FiXCircle, FiGlobe, 
  FiTag, FiCode, FiDatabase, FiCornerRightUp, FiLayers
} from 'react-icons/fi';
import { format } from 'date-fns';

const SubcategoryDetailsModal = ({ subcategory, onClose, onEdit, onDelete, onDuplicate, categoriesMap = {} }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!subcategory) return null;

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
  };

  const getStatusColor = (status) => {
    return status 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200';
  };

  const handleEdit = () => {
    if (onEdit) onEdit(subcategory);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) onDelete(subcategory);
    onClose();
  };

  const handleDuplicate = () => {
    if (onDuplicate) onDuplicate(subcategory);
    onClose();
  };

  // Get parent category
  const parentCategory = categoriesMap[subcategory.category] || subcategory.category;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiFolder className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Subcategory Details</h3>
              <p className="text-sm text-gray-500">Admin View • ID: {subcategory._id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(subcategory._id)}
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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="h-20 w-20 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FiFolder className="h-10 w-10 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{subcategory.name || 'No name'}</h2>
                      <p className="text-gray-600">{subcategory.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(subcategory.isActive)}`}>
                      {subcategory.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {parentCategory && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold border border-purple-200">
                        <FiCornerRightUp className="inline h-4 w-4 mr-1" />
                        {typeof parentCategory === 'object' ? parentCategory.name : 'Parent Category'}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold border border-gray-200">
                      Order: {subcategory.order || 0}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.open(`/categories/${parentCategory?.slug}/${subcategory.slug}`, '_blank')}
                    className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 flex items-center space-x-2"
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
                    <p className="text-xl font-bold text-gray-900">{formatNumber(subcategory.servicesCount || 0)}</p>
                  </div>
                  <FiPackage className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-xs text-gray-500">Total services</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Gigs</p>
                    <p className="text-xl font-bold text-gray-900">{formatNumber(subcategory.gigsCount || 0)}</p>
                  </div>
                  <FiUsers className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-xs text-gray-500">Total gigs</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Slug</p>
                    <p className="text-xl font-bold text-gray-900 truncate">{subcategory.slug || 'N/A'}</p>
                  </div>
                  <FiHash className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-xs text-gray-500">URL identifier</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-600">Version</p>
                    <p className="text-xl font-bold text-gray-900">v{subcategory.version || 1}</p>
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
                {/* Subcategory Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FiInfo className="h-5 w-5 mr-2 text-gray-500" />
                    Subcategory Information
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
                      <code className="text-sm text-gray-700 font-mono">{subcategory.slug || 'N/A'}</code>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <FiLink className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Parent Category</p>
                          <p className="text-xs text-gray-500">Belongs to</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">
                        {typeof parentCategory === 'object' ? parentCategory.name : 'Unknown Category'}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <FiLayers className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Display Order</p>
                          <p className="text-xs text-gray-500">Sorting position</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-700">{subcategory.order || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {subcategory.description && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <FiInfo className="h-5 w-5 mr-2 text-gray-500" />
                      Description
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-line">{subcategory.description}</p>
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
                      <span className="font-medium">{formatDate(subcategory.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium">{formatDate(subcategory.updatedAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Last Modified By</span>
                      <span className="font-medium">
                        {subcategory.lastUpdatedBy?.name || 'System'}
                      </span>
                    </div>
                    {subcategory.deletedAt && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Deleted At</span>
                        <span className="font-medium text-red-600">{formatDate(subcategory.deletedAt)}</span>
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
                      <p className="text-gray-700">{subcategory.metaTitle || subcategory.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Meta Description</p>
                      <p className="text-gray-700">{subcategory.metaDescription || subcategory.description || 'No meta description'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <FiDatabase className="h-5 w-5 text-gray-600 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-gray-800">Database Information</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    Collection: subcategories • Document ID: {subcategory._id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Subcategory ID: {subcategory._id} • Created: {format(new Date(subcategory.createdAt), 'MMM d, yyyy')}
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

export default SubcategoryDetailsModal;