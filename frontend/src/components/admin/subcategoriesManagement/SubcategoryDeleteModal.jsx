// SubcategoryDeleteModal.jsx - UPDATED
import React, { useState } from 'react';
import { 
  FiX, 
  FiTrash2, 
  FiAlertTriangle, 
  FiInfo, 
  FiDatabase, 
  FiFolder,
  FiHardDrive,
  FiArchive,
  FiPackage,
  FiUsers,
  FiLoader
} from 'react-icons/fi';

const SubcategoryDeleteModal = ({ 
  subcategory, 
  isOpen, 
  onClose, 
  onDelete, 
  permanent = false,
  loading = false,
  error: backendError
}) => {
  const [deleteType, setDeleteType] = useState(permanent ? 'permanent' : 'soft');
  const [forceDelete, setForceDelete] = useState(false);
  const [backendErrorState, setBackendErrorState] = useState('');

  // Handle backend errors
  React.useEffect(() => {
    if (backendError) {
      if (backendError.response?.data?.message) {
        setBackendErrorState(backendError.response.data.message);
      } else if (backendError.response?.data?.code === 'DEPENDENCIES_EXIST') {
        setBackendErrorState('Cannot delete subcategory with active services or gigs');
      } else {
        setBackendErrorState('Failed to delete subcategory');
      }
    } else {
      setBackendErrorState('');
    }
  }, [backendError]);

  if (!isOpen || !subcategory) return null;

  const handleDelete = async () => {
    setBackendErrorState('');
    
    if (!forceDelete && deleteType === 'permanent') {
      setBackendErrorState('Check "Force delete" to proceed with permanent deletion');
      return;
    }

    try {
      const deleteOptions = {
        id: subcategory._id,
        permanent: deleteType === 'permanent',
        force: forceDelete
      };
      
      await onDelete(deleteOptions);
      handleClose();
    } catch (err) {
      // Error is handled by parent component
      console.error('Delete error:', err);
    }
  };

  const handleClose = () => {
    setDeleteType(permanent ? 'permanent' : 'soft');
    setForceDelete(false);
    setBackendErrorState('');
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
              <h3 className="text-lg font-semibold text-gray-900">Delete Subcategory</h3>
              <p className="text-sm text-gray-500">{subcategory.name}</p>
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
                      ? 'All subcategory data will be permanently removed from the database.'
                      : 'The subcategory will be marked as deleted but kept in the database.'}
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
                  Archive subcategory, keep data for recovery
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

          {/* Force Delete Option */}
          {deleteType === 'permanent' && (
            <div className="mb-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FiAlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      Permanent deletion warning
                    </p>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={forceDelete}
                        onChange={(e) => setForceDelete(e.target.checked)}
                        className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="ml-2 text-sm text-amber-800">
                        I understand this action cannot be undone
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {(backendErrorState || backendErrorState) && (
            <div className="mb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{backendErrorState}</p>
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
              disabled={loading || (deleteType === 'permanent' && !forceDelete)}
              className={`px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors ${
                deleteType === 'permanent'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <FiLoader className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

export default SubcategoryDeleteModal;