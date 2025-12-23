import { FiTrash2, FiX, FiAlertTriangle } from 'react-icons/fi';

const DeleteConfirmationModal = ({ userToDelete, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
              <FiAlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
              <p className="text-sm text-gray-500">
                {userToDelete.type === 'single'
                  ? 'This action cannot be undone'
                  : 'This action is permanent'}
              </p>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <FiAlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {userToDelete.type === 'single'
                    ? 'Are you sure you want to delete this user account?'
                    : `Are you sure you want to delete ${userToDelete.ids.length} user accounts?`}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {userToDelete.type === 'single'
                    ? 'All user data including profile, orders, and transactions will be permanently deleted.'
                    : 'All data for selected users will be permanently deleted.'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
            >
              <FiTrash2 className="h-4 w-4" />
              <span>
                {userToDelete.type === 'single' ? 'Delete User' : `Delete ${userToDelete.ids.length} Users`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;