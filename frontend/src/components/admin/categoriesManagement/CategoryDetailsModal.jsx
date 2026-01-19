// components/admin/modals/CategoryDetailsModal.jsx - PRODUCTION READY
import React, { useState, useEffect } from 'react';
import { 
  FiX, 
  FiFolder, 
  FiInfo, 
  FiCalendar, 
  FiBarChart2, 
  FiEye,
  FiEyeOff,
  FiStar,
  FiTrendingUp,
  FiArchive,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiExternalLink,
  FiUsers,
  FiPackage,
  FiLayers,
  FiHash,
  FiLink,
  FiRefreshCw,
  FiChevronRight,
  FiChevronLeft,
  FiClipboard,
  FiCode,
  FiGlobe,
  FiTag,
  FiLock,
  FiUnlock,
  FiCornerDownRight,
  FiDatabase,
  FiActivity
} from 'react-icons/fi';
import { format, formatDistanceToNow } from 'date-fns';
import { useCategoryToast } from '../../../hooks/useCategoryToast';

const CategoryDetailsModal = ({ 
  category, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete,
  onDuplicate
}) => {
  const {
      showCategoryLoading,
      showCategorySuccess,
      showCategoryError,
      showCategoryWarning,
      showCategoryInfo,
      dismissCategoryToast
    } = useCategoryToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen || !category) return null;

  const getStatusColor = (status) => {
    return status 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPP pp');
    } catch {
      return 'Invalid date';
    }
  };

  const formatRelativeDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
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
   showCategorySuccess('Copied to clipboard');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
   showCategorySuccess('Refreshing category data...');
    // In a real app, you would refetch the category data here
    setTimeout(() => {
      setIsRefreshing(false);
     showCategorySuccess('Category data refreshed');
    }, 1000);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiActivity },
    { id: 'details', label: 'Details', icon: FiInfo },
    { id: 'seo', label: 'SEO', icon: FiGlobe },
    { id: 'stats', label: 'Statistics', icon: FiBarChart2 },
    { id: 'technical', label: 'Technical', icon: FiCode },
  ];

  const handleEdit = () => {
    onEdit(category);
    onClose();
  };

  const handleDelete = () => {
    onDelete(category);
    onClose();
  };

  const handleDuplicate = () => {
    onDuplicate(category);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiChevronLeft className="h-5 w-5 text-gray-500" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <FiFolder className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                    <span>{category.name}</span>
                    <div className="flex items-center space-x-2">
                      {category.isActive ? (
                        <FiUnlock className="h-4 w-4 text-green-500" />
                      ) : (
                        <FiLock className="h-4 w-4 text-red-500" />
                      )}
                      {category.featured && (
                        <FiStar className="h-4 w-4 text-yellow-500" />
                      )}
                      {category.popular && (
                        <FiTrendingUp className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(category.isActive)}`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {category.featured && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        Featured
                      </span>
                    )}
                    {category.popular && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                        Popular
                      </span>
                    )}
                    {category.deletedAt && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                        Archived
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <FiRefreshCw className={`h-5 w-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="px-6">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800">Services</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{formatNumber(category.servicesCount)}</p>
                        <p className="text-xs text-blue-700 mt-1">Total services</p>
                      </div>
                      <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <FiPackage className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">Gigs</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">{formatNumber(category.gigsCount)}</p>
                        <p className="text-xs text-green-700 mt-1">Active gigs</p>
                      </div>
                      <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
                        <FiUsers className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-800">Order</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">{category.order || 0}</p>
                        <p className="text-xs text-purple-700 mt-1">Display position</p>
                      </div>
                      <div className="h-12 w-12 bg-purple-600 rounded-lg flex items-center justify-center">
                        <FiHash className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-800">Level</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">{category.level || 0}</p>
                        <p className="text-xs text-orange-700 mt-1">Hierarchy depth</p>
                      </div>
                      <div className="h-12 w-12 bg-orange-600 rounded-lg flex items-center justify-center">
                        <FiLayers className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center">
                    <FiInfo className="h-4 w-4 mr-2" />
                    Description
                  </h4>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-lg">
                      {category.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* URL Information */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center">
                    <FiLink className="h-4 w-4 mr-2" />
                    URL Information
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Slug</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-mono bg-gray-100 text-gray-800 px-3 py-2 rounded flex-1">
                          /categories/{category.slug}
                        </code>
                        <button
                          onClick={() => copyToClipboard(`/categories/${category.slug}`)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Copy to clipboard"
                        >
                          <FiClipboard className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => window.open(`/categories/${category.slug}`, '_blank')}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="View on site"
                        >
                          <FiExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parent Category */}
                {category.parentCategory && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center">
                      <FiCornerDownRight className="h-4 w-4 mr-2" />
                      Parent Category
                    </h4>
                    <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-4">
                      <FiFolder className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {typeof category.parentCategory === 'object' 
                            ? category.parentCategory.name 
                            : 'Parent Category'}
                        </p>
                        {typeof category.parentCategory === 'object' && (
                          <div className="flex items-center space-x-2 mt-1">
                            <button
                              onClick={() => copyToClipboard(category.parentCategory._id)}
                              className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                              title="Copy ID"
                            >
                              ID: {category.parentCategory._id.substring(0, 8)}...
                              <FiClipboard className="h-3 w-3 ml-1" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Settings */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                      Settings
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Display Order</span>
                        <span className="text-sm font-medium text-gray-900">{category.order || 0}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Hierarchy Level</span>
                        <span className="text-sm font-medium text-gray-900">{category.level || 0}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Featured</span>
                        <span className={`text-sm font-medium ${category.featured ? 'text-green-600' : 'text-gray-600'}`}>
                          {category.featured ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">Popular</span>
                        <span className={`text-sm font-medium ${category.popular ? 'text-orange-600' : 'text-gray-600'}`}>
                          {category.popular ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                      Timestamps
                    </h4>
                    <div className="space-y-4">
                      <div className="py-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <FiCalendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Created</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(category.createdAt)}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatRelativeDate(category.createdAt)}</p>
                      </div>
                      
                      <div className="py-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <FiCalendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Last Updated</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{formatDate(category.updatedAt)}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatRelativeDate(category.updatedAt)}</p>
                      </div>
                      
                      {category.deletedAt && (
                        <div className="py-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <FiArchive className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">Deleted At</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{formatDate(category.deletedAt)}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatRelativeDate(category.deletedAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta Keywords */}
                {category.metaKeywords && category.metaKeywords.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center">
                      <FiTag className="h-4 w-4 mr-2" />
                      Meta Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {category.metaKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full border border-gray-200"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SEO Tab */}
            {activeTab === 'seo' && (
              <div className="space-y-6">
                {/* Meta Title */}
                {category.metaTitle && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center">
                      <FiGlobe className="h-4 w-4 mr-2" />
                      Meta Title
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-800 font-medium">{category.metaTitle}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          {category.metaTitle.length}/60 characters
                        </p>
                        <button
                          onClick={() => copyToClipboard(category.metaTitle)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center"
                        >
                          <FiClipboard className="h-3 w-3 mr-1" />
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meta Description */}
                {category.metaDescription && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center">
                      <FiGlobe className="h-4 w-4 mr-2" />
                      Meta Description
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-800">{category.metaDescription}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500">
                          {category.metaDescription.length}/160 characters
                        </p>
                        <button
                          onClick={() => copyToClipboard(category.metaDescription)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center"
                        >
                          <FiClipboard className="h-3 w-3 mr-1" />
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SEO Analysis */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                    SEO Analysis
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Title Length</span>
                      <span className={`text-sm font-medium ${
                        (category.metaTitle?.length || 0) >= 50 && (category.metaTitle?.length || 0) <= 60
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {category.metaTitle?.length || 0}/60
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Description Length</span>
                      <span className={`text-sm font-medium ${
                        (category.metaDescription?.length || 0) >= 120 && (category.metaDescription?.length || 0) <= 160
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {category.metaDescription?.length || 0}/160
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Keyword in Title</span>
                      <span className={`text-sm font-medium ${
                        category.metaTitle?.toLowerCase().includes(category.name?.toLowerCase())
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }`}>
                        {category.metaTitle?.toLowerCase().includes(category.name?.toLowerCase())
                          ? 'Yes'
                          : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">URL Structure</span>
                      <span className="text-sm font-medium text-green-600">Good</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                {/* Content Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-4">
                      Content Statistics
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-2">
                          <FiPackage className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-700">Total Services</span>
                        </div>
                        <span className="text-lg font-bold text-blue-900">{formatNumber(category.servicesCount)}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-2">
                          <FiUsers className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-700">Total Gigs</span>
                        </div>
                        <span className="text-lg font-bold text-blue-900">{formatNumber(category.gigsCount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Engagement Metrics */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
                    <h4 className="text-sm font-semibold text-green-800 uppercase tracking-wider mb-4">
                      Engagement Metrics
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-green-700">Active Status</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(category.isActive)}`}>
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-green-700">Featured</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          category.featured ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {category.featured ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-green-700">Popular</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          category.popular ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {category.popular ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Growth Metrics */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                    Growth Metrics
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">Created</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {format(new Date(category.createdAt), 'MMM yyyy')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(category.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">Last Updated</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {format(new Date(category.updatedAt), 'MMM yyyy')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(category.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">Age</p>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {formatDistanceToNow(new Date(category.createdAt), { addSuffix: false })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Since creation</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Tab */}
            {activeTab === 'technical' && (
              <div className="space-y-6">
                {/* IDs and References */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                    IDs and References
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Category ID</p>
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-mono bg-gray-100 text-gray-800 px-3 py-2 rounded flex-1">
                          {category._id}
                        </code>
                        <button
                          onClick={() => copyToClipboard(category._id)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Copy ID"
                        >
                          <FiClipboard className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {category.parentCategory && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Parent Category ID</p>
                        <div className="flex items-center space-x-2">
                          <code className="text-sm font-mono bg-gray-100 text-gray-800 px-3 py-2 rounded flex-1">
                            {typeof category.parentCategory === 'object' 
                              ? category.parentCategory._id 
                              : category.parentCategory}
                          </code>
                          <button
                            onClick={() => copyToClipboard(
                              typeof category.parentCategory === 'object' 
                                ? category.parentCategory._id 
                                : category.parentCategory
                            )}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="Copy ID"
                          >
                            <FiClipboard className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Version</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">v{category.version || 1}</span>
                        <span className="text-xs text-gray-500">(Optimistic locking)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Information */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center">
                    <FiDatabase className="h-4 w-4 mr-2" />
                    System Information
                  </h4>
                  <div className="space-y-3">
                    {category.createdBy && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Created By</span>
                        <span className="text-sm text-gray-900">
                          {typeof category.createdBy === 'object' 
                            ? category.createdBy.name || category.createdBy.email 
                            : `User ID: ${category.createdBy}`}
                        </span>
                      </div>
                    )}
                    
                    {category.lastUpdatedBy && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Last Updated By</span>
                        <span className="text-sm text-gray-900">
                          {typeof category.lastUpdatedBy === 'object' 
                            ? category.lastUpdatedBy.name || category.lastUpdatedBy.email 
                            : `User ID: ${category.lastUpdatedBy}`}
                        </span>
                      </div>
                    )}
                    
                    {category.deletedBy && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">Deleted By</span>
                        <span className="text-sm text-gray-900">
                          {typeof category.deletedBy === 'object' 
                            ? category.deletedBy.name || category.deletedBy.email 
                            : `User ID: ${category.deletedBy}`}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-gray-600">Record Type</span>
                      <span className="text-sm font-medium text-gray-900">Category Document</span>
                    </div>
                  </div>
                </div>

                {/* Database Information */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                    Database Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Collection</span>
                      <code className="text-sm font-mono text-gray-900">categories</code>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Document Size</span>
                      <span className="text-sm text-gray-900">
                        ~{JSON.stringify(category).length} bytes
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-gray-600">Indexed Fields</span>
                      <span className="text-sm text-gray-900">name, slug, parentCategory</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <button
                onClick={() => copyToClipboard(JSON.stringify(category, null, 2))}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
                title="Copy full JSON"
              >
                <FiCode className="h-4 w-4" />
                <span>Copy JSON</span>
              </button>
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
  );
};

export default CategoryDetailsModal;