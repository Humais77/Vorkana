// components/admin/modals/ServiceDeleteModal.jsx
import React, { useState } from 'react';
import { 
  FiX, 
  FiTrash2, 
  FiAlertTriangle, 
  FiInfo, 
} from 'react-icons/fi';

const ServiceDeleteModal = ({ 
  service, 
  isOpen, 
  onClose, 
  onDelete, 
  permanent = false,
  loading = false 
}) => {
  const [deleteType, setDeleteType] = useState(permanent ? 'permanent' : 'soft');
  const [forceDelete, setForceDelete] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !service) return null;

  const getDependencyStats = () => {
    return {
      orders: service.ordersCount || 0,
      reviews: service.reviewsCount || 0,
      views: service.views || 0,
      likes: service.likes || 0
    };
  };

  const dependencies = getDependencyStats();
  const hasDependencies = dependencies.orders > 0 || dependencies.reviews > 0;

  const handleDelete = async () => {
    setError('');
    
    if (!forceDelete && hasDependencies && deleteType === 'permanent') {
      setError('Service has active orders or reviews. Check "Force delete" to proceed.');
      return;
    }

    try {
      const deleteOptions = {
        id: service._id,
        permanent: deleteType === 'permanent',
        force: forceDelete
      };
      
      await onDelete(deleteOptions);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete service');
    }
  };

  const handleClose = () => {
    setDeleteType(permanent ? 'permanent' : 'soft');
    setForceDelete(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
              <FiTrash2 className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Service</h3>
              <p className="text-sm text-gray-500">{service.title}</p>
            </div>
          </div>

          {/* Warning Message */}
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <FiAlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-800 font-medium">
                    {deleteType === 'permanent' 
                      ? 'Permanent deletion cannot be undone!' 
                      : 'Soft deletion can be reversed later.'}
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {deleteType === 'permanent' 
                      ? 'All service data will be permanently removed from the database.'
                      : 'The service will be marked as deleted but kept in the database.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Delete Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Delete Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteType('soft')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  deleteType === 'soft'
                    ? 'border-red-300 bg-red-50 ring-2 ring-red-200'
                    : 'border-gray-300 hover:border-red-200 hover:bg-red-50'
                }`}
              >
                <div className="flex items-center mb-2">
                  <div className={`h-5 w-5 rounded-full border-2 mr-2 flex items-center justify-center ${
                    deleteType === 'soft' 
                      ? 'border-red-600 bg-red-600' 
                      : 'border-gray-400'
                  }`}>
                    {deleteType === 'soft' && (
                      <div className="h-2 w-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="font-medium">Soft Delete</span>
                </div>
                <p className="text-sm text-gray-600">
                  Archive service, keep data for recovery
                </p>
              </button>
              
              <button
                type="button"
                onClick={() => setDeleteType('permanent')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  deleteType === 'permanent'
                    ? 'border-red-300 bg-red-50 ring-2 ring-red-200'
                    : 'border-gray-300 hover:border-red-200 hover:bg-red-50'
                }`}
              >
                <div className="flex items-center mb-2">
                  <div className={`h-5 w-5 rounded-full border-2 mr-2 flex items-center justify-center ${
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
            <div className="mb-6">
              <div className={`border rounded-lg p-4 ${
                deleteType === 'permanent' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-start">
                  <FiInfo className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${
                    deleteType === 'permanent' ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium mb-2 ${
                      deleteType === 'permanent' ? 'text-amber-800' : 'text-blue-800'
                    }`}>
                      This service has dependencies:
                    </p>
                    
                    {deleteType === 'permanent' && hasDependencies && (
                      <div className="mt-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={forceDelete}
                            onChange={(e) => setForceDelete(e.target.checked)}
                            className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <span className="ml-2 text-sm font-medium text-amber-800">
                            Force delete despite dependencies
                          </span>
                        </label>
                        <p className="text-xs text-amber-700 mt-1 ml-6">
                          This will delete all associated orders and reviews.
                        </p>
                      </div>
                    )}
                    
                    {deleteType === 'soft' && hasDependencies && (
                      <p className="text-sm text-blue-700 mt-3">
                        With soft delete, these dependencies will remain but the service will be hidden.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors ${
                deleteType === 'permanent'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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

export default ServiceDeleteModal;