// DeleteConfirmationModal.jsx - Unified Production-Ready Modal
import React, { useState, useEffect } from 'react';
import { 
  FiTrash2, 
  FiAlertTriangle, 
  FiInfo, 
  FiDatabase, 
  FiHardDrive,
  FiLoader,
  FiAlertCircle,
  FiUsers,
  FiBriefcase,
  FiPackage,
  FiFolder,
  FiUser,
  FiX
} from 'react-icons/fi';

const DeleteConfirmationModal = ({ 
  item, 
  isOpen, 
  onClose, 
  onDelete, 
  permanent = false,
  loading = false,
  type = 'category', // 'category', 'subcategory', 'service', 'gig', 'user'
  dependencies = {},
  forceDelete = false,
  onForceDeleteChange = () => {}
}) => {
  const [deleteType, setDeleteType] = useState(permanent ? 'permanent' : 'soft');
  const [localForceDelete, setLocalForceDelete] = useState(forceDelete);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDeleteType(permanent ? 'permanent' : 'soft');
      setLocalForceDelete(false);
      setError('');
      setIsDeleting(false);
    }
  }, [isOpen, permanent]);

  // Handle parent forceDelete prop changes
  useEffect(() => {
    setLocalForceDelete(forceDelete);
  }, [forceDelete]);

  if (!isOpen || !item) return null;

  // Type-specific configurations
  const typeConfig = {
    category: {
      icon: FiFolder,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-100',
      title: 'Category',
      nameKey: 'name',
      dependencies: {
        services: { label: 'Services', icon: FiPackage, color: 'text-blue-600' },
        gigs: { label: 'Gigs', icon: FiBriefcase, color: 'text-green-600' },
        subcategories: { label: 'Subcategories', icon: FiFolder, color: 'text-purple-600' }
      }
    },
    subcategory: {
      icon: FiFolder,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-100',
      title: 'Subcategory',
      nameKey: 'name',
      dependencies: {
        services: { label: 'Services', icon: FiPackage, color: 'text-blue-600' },
        gigs: { label: 'Gigs', icon: FiBriefcase, color: 'text-green-600' }
      }
    },
    service: {
      icon: FiPackage,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
      title: 'Service',
      nameKey: 'title',
      dependencies: {
        orders: { label: 'Orders', icon: FiDatabase, color: 'text-green-600' },
        reviews: { label: 'Reviews', icon: FiUsers, color: 'text-yellow-600' }
      }
    },
    gig: {
      icon: FiBriefcase,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
      title: 'Gig',
      nameKey: 'title',
      dependencies: {
        bids: { label: 'Bids', icon: FiUsers, color: 'text-purple-600' },
        messages: { label: 'Messages', icon: FiDatabase, color: 'text-blue-600' }
      }
    },
    user: {
      icon: FiUser,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-100',
      title: 'User',
      nameKey: 'name',
      dependencies: {
        services: { label: 'Services', icon: FiPackage, color: 'text-blue-600' },
        gigs: { label: 'Gigs', icon: FiBriefcase, color: 'text-green-600' },
        orders: { label: 'Orders', icon: FiDatabase, color: 'text-purple-600' }
      }
    }
  };

  const config = typeConfig[type] || typeConfig.category;
  const Icon = config.icon;
  const itemName = item[config.nameKey] || 'Unknown';

  // Calculate actual dependencies
  const getActualDependencies = () => {
    if (dependencies && Object.keys(dependencies).length > 0) {
      return dependencies;
    }

    // Fallback to item properties
    const deps = {};
    Object.keys(config.dependencies).forEach(key => {
      if (key === 'services') {
        deps[key] = item.servicesCount || item.services?.length || 0;
      } else if (key === 'gigs') {
        deps[key] = item.gigsCount || item.gigs?.length || 0;
      } else if (key === 'subcategories') {
        deps[key] = item.subcategoriesCount || item.subcategories?.length || 0;
      } else if (key === 'orders') {
        deps[key] = item.ordersCount || item.orders?.length || 0;
      } else if (key === 'reviews') {
        deps[key] = item.reviewsCount || item.reviews?.length || 0;
      } else if (key === 'bids') {
        deps[key] = item.bids?.length || 0;
      } else {
        deps[key] = item[key] || 0;
      }
    });
    
    return deps;
  };

  const actualDependencies = getActualDependencies();
  const hasDependencies = Object.values(actualDependencies).some(count => count > 0);

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setError('');
    setIsDeleting(true);
    
    // Validate permanent delete with dependencies
    if (deleteType === 'permanent' && hasDependencies && !localForceDelete) {
      setError(`${config.title} has active dependencies. Check "Force delete" to proceed.`);
      setIsDeleting(false);
      return;
    }

    try {
      const deleteOptions = {
        id: item._id,
        permanent: deleteType === 'permanent',
        force: localForceDelete
      };
      
      await onDelete(deleteOptions);
      handleClose();
    } catch (err) {
      console.error('Delete error:', err);
      
      // Parse error message
      let errorMessage = 'Failed to delete item';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.code === 'DEPENDENCIES_EXIST') {
        errorMessage = 'Cannot delete with active dependencies. Use force delete or remove dependencies first.';
        if (err.response.data.details) {
          errorMessage += ' (' + Object.entries(err.response.data.details)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ') + ')';
        }
      } else if (err.response?.data?.code === 'ALREADY_DELETED') {
        errorMessage = 'This item is already deleted.';
      } else if (err.response?.data?.code === 'NOT_FOUND') {
        errorMessage = 'Item not found. It may have been already deleted.';
      }
      
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setDeleteType(permanent ? 'permanent' : 'soft');
    setLocalForceDelete(false);
    setError('');
    setIsDeleting(false);
    onClose();
  };

  const handleForceDeleteChange = (value) => {
    setLocalForceDelete(value);
    onForceDeleteChange(value);
  };

  const isLoading = loading || isDeleting;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${config.bgColor}`}>
              <Icon className={`h-6 w-6 ${config.iconColor}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Delete {config.title}</h3>
              <p className="text-sm text-gray-500">{itemName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiX className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className={`border rounded-lg p-4 ${
            deleteType === 'permanent' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex">
              <FiAlertTriangle className={`h-5 w-5 mr-3 flex-shrink-0 ${
                deleteType === 'permanent' ? 'text-red-500' : 'text-yellow-500'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  deleteType === 'permanent' ? 'text-red-800' : 'text-yellow-800'
                }`}>
                  {deleteType === 'permanent' ? 'Permanent Deletion Warning' : 'Deletion Warning'}
                </p>
                <p className={`text-sm mt-1 ${
                  deleteType === 'permanent' ? 'text-red-700' : 'text-yellow-700'
                }`}>
                  {deleteType === 'permanent' 
                    ? 'This action will permanently delete all data and cannot be undone.'
                    : 'This action will mark the item as deleted but keep data for recovery.'}
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <FiAlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Delete Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Deletion Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteType('soft')}
                disabled={isLoading}
                className={`p-4 border rounded-lg text-left transition-all ${
                  deleteType === 'soft'
                    ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-100'
                    : 'border-gray-300 hover:border-orange-200 hover:bg-orange-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center mb-2">
                  <div className={`h-5 w-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    deleteType === 'soft' 
                      ? 'border-orange-600 bg-orange-600' 
                      : 'border-gray-400'
                  }`}>
                    {deleteType === 'soft' && (
                      <div className="h-2 w-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="font-medium">Soft Delete</span>
                </div>
                <p className="text-sm text-gray-600">
                  Archive item, keep data for recovery
                </p>
              </button>
              
              <button
                type="button"
                onClick={() => setDeleteType('permanent')}
                disabled={isLoading}
                className={`p-4 border rounded-lg text-left transition-all ${
                  deleteType === 'permanent'
                    ? 'border-red-300 bg-red-50 ring-2 ring-red-100'
                    : 'border-gray-300 hover:border-red-200 hover:bg-red-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center mb-2">
                  <div className={`h-5 w-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    deleteType === 'permanent' 
                      ? 'border-red-600 bg-red-600' 
                      : 'border-gray-400'
                  }`}>
                    {deleteType === 'permanent' && (
                      <div className="h-2 w-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="font-medium">Permanent Delete</span>
                </div>
                <p className="text-sm text-gray-600">
                  Remove all data permanently
                </p>
              </button>
            </div>
          </div>

          {/* Dependencies Warning */}
          {hasDependencies && (
            <div className={`border rounded-lg p-4 ${
              deleteType === 'permanent' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start">
                <FiInfo className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${
                  deleteType === 'permanent' ? 'text-amber-500' : 'text-blue-500'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium mb-3 ${
                    deleteType === 'permanent' ? 'text-amber-800' : 'text-blue-800'
                  }`}>
                    This {config.title.toLowerCase()} has dependencies:
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {Object.entries(config.dependencies).map(([key, depConfig]) => {
                      const count = actualDependencies[key] || 0;
                      if (count <= 0) return null;
                      
                      const DepIcon = depConfig.icon;
                      return (
                        <div key={key} className={`flex flex-col items-center p-3 rounded-lg ${
                          deleteType === 'permanent' ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                          <DepIcon className={`h-4 w-4 mb-2 ${depConfig.color}`} />
                          <span className="font-medium text-gray-900">{count}</span>
                          <span className={`text-xs mt-1 ${
                            deleteType === 'permanent' ? 'text-amber-700' : 'text-blue-700'
                          }`}>
                            {depConfig.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {deleteType === 'permanent' && hasDependencies && (
                    <div className="mt-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={localForceDelete}
                          onChange={(e) => handleForceDeleteChange(e.target.checked)}
                          disabled={isLoading}
                          className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 disabled:opacity-50"
                        />
                        <span className="ml-2 text-sm font-medium text-amber-800">
                          Force delete despite dependencies
                        </span>
                      </label>
                      <p className="text-xs text-amber-700 mt-1 ml-6">
                        This will also delete all associated dependencies.
                      </p>
                    </div>
                  )}
                  
                  {deleteType === 'soft' && hasDependencies && (
                    <p className="text-sm text-blue-700">
                      With soft delete, these dependencies will remain but the {config.title.toLowerCase()} will be hidden.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading || (deleteType === 'permanent' && hasDependencies && !localForceDelete)}
              className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                deleteType === 'permanent'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <FiLoader className="h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <FiTrash2 className="h-4 w-4" />
                  <span>
                    {deleteType === 'permanent' ? 'Delete Permanently' : 'Soft Delete'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Default props
DeleteConfirmationModal.defaultProps = {
  permanent: false,
  loading: false,
  type: 'category',
  dependencies: {},
  forceDelete: false,
  onForceDeleteChange: () => {}
};

export default DeleteConfirmationModal;