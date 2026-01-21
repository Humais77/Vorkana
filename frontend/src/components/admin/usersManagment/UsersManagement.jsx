// UsersManagement.jsx - Professional UI Update
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminUsers, useUpdateUser, useDeleteUser, useBulkUserOperations, useExportUsers } from '../../../hooks/useAdminDashboard';
import { useUserToast } from '../../../hooks/useUserToast';
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiDownload,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiUserCheck,
  FiUserX,
  FiShield,
  FiMoreVertical,
  FiRefreshCw,
  FiX,
  FiClock,
  FiMail,
  FiUser,
  FiShield as FiAdmin,
  FiActivity,
  FiCalendar,
  FiCreditCard
} from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import UserDetailsModal from './UserDetailsModal';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

// Professional User Table Row Component
const UserTableRow = memo(({
  user,
  isSelected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onToggleActionMenu,
  actionMenuId,
  onUpdateUser,
  updateMutation
}) => {
  const [localLoading, setLocalLoading] = useState(false);

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700 border border-purple-200',
      user: 'bg-gray-100 text-gray-700 border border-gray-200',
      seller: 'bg-blue-100 text-blue-700 border border-blue-200',
      buyer: 'bg-green-100 text-green-700 border border-green-200',
      moderator: 'bg-orange-100 text-orange-700 border border-orange-200'
    };
    return colors[role] || colors.user;
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    try {
      return format(new Date(date), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleAction = async (userId, data, actionName) => {
    try {
      setLocalLoading(true);
      await onUpdateUser(userId, data);
    } catch (error) {
      console.error(`[USER ACTION ERROR] ${actionName}:`, error);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!user.isActive ? 'bg-red-50' : ''} ${localLoading ? 'opacity-50' : ''}`}>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(user._id)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0">
            <img
              className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
              src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=6d28d9&color=fff&bold=true`}
              alt={user.name || 'User'}
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=6d28d9&color=fff&bold=true`;
              }}
            />
          </div>
          <div className="ml-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900">{user.name || 'No name'}</p>
              {user.role === 'admin' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  <FiAdmin className="h-3 w-3 mr-1" />
                  Admin
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 flex items-center mt-1">
              <FiMail className="h-3 w-3 mr-1" />
              {user.email || 'No email'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              <span className="inline-flex items-center">
                <FiCalendar className="h-3 w-3 mr-1" />
                Joined {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
          {user.role?.toUpperCase() || 'USER'}
        </span>
      </td>
      
      <td className="px-6 py-4">
        <div className="flex items-center">
          {user.isActive ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <FiCheckCircle className="h-3 w-3 mr-1" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <FiXCircle className="h-3 w-3 mr-1" />
              Inactive
            </span>
          )}
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="flex items-center">
          {user.emailVerified ? (
            <span className="inline-flex items-center text-sm text-green-600">
              <FiCheckCircle className="h-4 w-4 mr-1" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center text-sm text-yellow-600">
              <FiXCircle className="h-4 w-4 mr-1" />
              Pending
            </span>
          )}
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">
          <div className="flex items-center">
            <FiClock className="h-3 w-3 mr-1 text-gray-400" />
            {formatDate(user.lastLoginAt) || 'Never logged in'}
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(user)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="View Details"
          >
            <FiEye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(user)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit User"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => onToggleActionMenu(actionMenuId === user._id ? null : user._id)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiMoreVertical className="h-4 w-4" />
            </button>
            
            {actionMenuId === user._id && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => onToggleActionMenu(null)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Quick Actions
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => handleAction(user._id, { isActive: !user.isActive }, user.isActive ? 'Deactivate' : 'Activate')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {user.isActive ? (
                        <>
                          <FiUserX className="h-4 w-4 mr-3" />
                          Deactivate User
                        </>
                      ) : (
                        <>
                          <FiUserCheck className="h-4 w-4 mr-3" />
                          Activate User
                        </>
                      )}
                    </button>
                    
                    {!user.emailVerified && (
                      <button
                        onClick={() => handleAction(user._id, { emailVerified: true }, 'Verify Email')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiShield className="h-4 w-4 mr-3" />
                        Verify Email
                      </button>
                    )}
                    
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleAction(user._id, { role: 'admin' }, 'Make Admin')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiAdmin className="h-4 w-4 mr-3" />
                        Make Admin
                      </button>
                    )}
                    
                    {user.role === 'admin' && (
                      <button
                        onClick={() => handleAction(user._id, { role: 'user' }, 'Remove Admin')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiUser className="h-4 w-4 mr-3" />
                        Remove Admin
                      </button>
                    )}
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    <button
                      onClick={() => onDelete(user)}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <FiTrash2 className="h-4 w-4 mr-3" />
                      Delete User
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
});

UserTableRow.displayName = 'UserTableRow';

// Main Component
const UsersManagement = () => {
  const queryClient = useQueryClient();
  const { 
    showUserLoading, 
    showUserSuccess, 
    showUserError, 
    showUserWarning,
    dismissUserToast 
  } = useUserToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    verified: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [page, setPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);

  const limit = 10;
  
  const { 
    data, 
    isLoading, 
    refetch, 
    isRefetching
  } = useAdminUsers({
    page,
    limit,
    search: searchTerm,
    ...filters
  });
  
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const bulkUserMutation = useBulkUserOperations();
  const exportUsersMutation = useExportUsers();

  const users = useMemo(() => {
    if (!data?.data) return [];
    return Array.isArray(data.data) ? data.data : data.data.users || [];
  }, [data]);

  const pagination = useMemo(() => {
    if (!data) return { total: 0, totalPages: 1, page: 1, limit };
    
    const paginationData = data.pagination || data.data?.pagination || {};
    const total = paginationData.total || users.length;
    const totalPages = Math.ceil(total / limit) || 1;
    
    return {
      total,
      totalPages,
      page: parseInt(page) || 1,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }, [data, users, page, limit]);

  const userStats = useMemo(() => {
    if (!Array.isArray(users)) return { total: 0, active: 0, admins: 0, verified: 0 };
    
    return {
      total: pagination.total,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      admins: users.filter(u => u.role === 'admin').length,
      verified: users.filter(u => u.emailVerified).length,
      unverified: users.filter(u => !u.emailVerified).length
    };
  }, [users, pagination.total]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  }, [refetch]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleBulkAction = useCallback(async (action) => {
    if (selectedUsers.length === 0) {
      showUserWarning('Please select users first');
      return;
    }

    const loadingToastId = showUserLoading(`Processing ${selectedUsers.length} users...`);

    try {
      const result = await bulkUserMutation.mutateAsync({
        ids: selectedUsers,
        operation: action
      });
      
      if (result.success) {
        dismissUserToast(loadingToastId);
        showUserSuccess(result.message || `${selectedUsers.length} users updated successfully`);
        setSelectedUsers([]);
        queryClient.invalidateQueries(['admin', 'users']);
      }
    } catch (error) {
      dismissUserToast(loadingToastId);
      showUserError(error.response?.data?.message || 'Failed to perform bulk action');
    }
  }, [selectedUsers, bulkUserMutation, queryClient, showUserLoading, showUserSuccess, showUserError, showUserWarning, dismissUserToast]);

  const handleUpdateUser = useCallback(async (userId, data) => {
    const loadingToastId = showUserLoading('Updating user...');
    
    try {
      await updateUserMutation.mutateAsync({ id: userId, data });
      dismissUserToast(loadingToastId);
      showUserSuccess('User updated successfully');
      queryClient.invalidateQueries(['admin', 'users']);
      
    } catch (error) {
      dismissUserToast(loadingToastId);
      const errorMessage = error.response?.data?.message || 'Failed to update user';
      showUserError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [updateUserMutation, queryClient, showUserLoading, showUserSuccess, showUserError, dismissUserToast]);

  const handleDeleteUser = useCallback(async (deleteOptions) => {
    const loadingToastId = showUserLoading('Deleting user...');
    
    try {
      if (userToDelete?.type === 'single' && userToDelete?.id) {
        await deleteUserMutation.mutateAsync({
          id: userToDelete.id,
          permanent: deleteOptions?.permanent || false
        });
      } else if (userToDelete?.type === 'bulk' && userToDelete?.ids) {
        await bulkUserMutation.mutateAsync({
          ids: userToDelete.ids,
          operation: 'delete',
          data: { permanent: deleteOptions?.permanent || false }
        });
      }
      
      dismissUserToast(loadingToastId);
      showUserSuccess('User(s) deleted successfully');
      setSelectedUsers([]);
      setShowDeleteModal(false);
      setUserToDelete(null);
      queryClient.invalidateQueries(['admin', 'users']);
      
    } catch (error) {
      dismissUserToast(loadingToastId);
      showUserError(error.response?.data?.message || 'Failed to delete users');
    }
  }, [userToDelete, deleteUserMutation, bulkUserMutation, queryClient, showUserLoading, showUserSuccess, showUserError, dismissUserToast]);

  const toggleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(user => user._id));
    } else {
      setSelectedUsers([]);
    }
  }, [users]);

  const toggleSelectUser = useCallback((userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }, []);

  const toggleActionMenu = useCallback((userId) => {
    setActionMenu(actionMenu === userId ? null : userId);
  }, [actionMenu]);

  const refreshData = useCallback(() => {
    refetch();
    setSelectedUsers([]);
    showUserSuccess('Data refreshed');
  }, [refetch, showUserSuccess]);

  const exportUsers = useCallback(async () => {
    const loadingToastId = showUserLoading('Exporting users...');
    
    try {
      const response = await exportUsersMutation.mutateAsync('csv');
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      dismissUserToast(loadingToastId);
      showUserSuccess('Users exported successfully');
    } catch (error) {
      dismissUserToast(loadingToastId);
      showUserError('Failed to export users');
    }
  }, [exportUsersMutation, showUserLoading, showUserSuccess, showUserError, dismissUserToast]);

  const handleDelete = useCallback((user) => {
    setUserToDelete({ type: 'single', id: user._id });
    setShowDeleteModal(true);
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedUsers.length === 0) {
      showUserWarning('Please select users first');
      return;
    }
    
    setUserToDelete({ type: 'bulk', ids: selectedUsers });
    setShowDeleteModal(true);
  }, [selectedUsers, showUserWarning]);

  if (isLoading && !users.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all user accounts</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={refreshData}
            disabled={isRefetching}
            className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportUsers}
            disabled={exportUsersMutation.isLoading}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <FiDownload className="h-4 w-4" />
            Export
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <FiPlus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{userStats.total}</p>
            </div>
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FiUsers className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{userStats.active}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FiUserCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{userStats.admins}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiAdmin className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{userStats.verified}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiShield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{userStats.inactive}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <FiUserX className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiUserCheck className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-indigo-900">
                  {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-indigo-600">Choose an action to perform</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                disabled={bulkUserMutation.isLoading}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiCheckCircle className="h-4 w-4" />
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                disabled={bulkUserMutation.isLoading}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiUserX className="h-4 w-4" />
                Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('verify-email')}
                disabled={bulkUserMutation.isLoading}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiShield className="h-4 w-4" />
                Verify Email
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 flex items-center gap-2 transition-colors"
              >
                <FiTrash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search users by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-2">
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <FiFilter className="h-4 w-4" />
              More Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Verified</label>
              <select
                value={filters.verified}
                onChange={(e) => handleFilterChange('verified', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="lastLoginAt">Last Login</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedUsers.length === users.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Verified
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((user) => (
                <UserTableRow
                  key={user._id}
                  user={user}
                  isSelected={selectedUsers.includes(user._id)}
                  onToggleSelect={toggleSelectUser}
                  onView={(user) => {
                    setViewingUser(user);
                    setShowUserDetails(true);
                  }}
                  onEdit={(user) => {
                    setEditingUser(user);
                    setShowEditModal(true);
                  }}
                  onDelete={handleDelete}
                  onToggleActionMenu={toggleActionMenu}
                  actionMenuId={actionMenu}
                  onUpdateUser={handleUpdateUser}
                  updateMutation={updateUserMutation}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {users.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <FiUsers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No users found</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              Try adjusting your search or filter criteria to find what you're looking for.
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> users
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 text-sm"
                >
                  <FiChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium min-w-[40px] ${
                          page === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 text-sm"
                >
                  Next
                  <FiChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            showUserSuccess('User created successfully!');
            setShowCreateModal(false);
            queryClient.invalidateQueries(['admin', 'users']);
          }}
        />
      )}
      
      {showUserDetails && viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          onClose={() => {
            setShowUserDetails(false);
            setViewingUser(null);
          }}
        />
      )}
      
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          onSave={(data) => handleUpdateUser(editingUser._id, data)}
        />
      )}
      
      {showDeleteModal && userToDelete && (
        <DeleteConfirmationModal
          userToDelete={userToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setUserToDelete(null);
          }}
          onConfirm={handleDeleteUser}
        />
      )}
    </div>
  );
};

export default UsersManagement;