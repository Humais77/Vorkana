// UserManagement.jsx - OPTIMIZED VERSION
import React, { useState, useMemo, useCallback, memo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminUsers, useUpdateUser, useDeleteUser ,useBulkUserOperations, useExportUsers } from '../../../hooks/useAdminDashboard';
import { toast } from 'react-hot-toast';
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
  FiLock,
  FiMoreVertical,
  FiRefreshCw,
  FiX,
  FiClock,
  FiHash
} from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import UserDetailsModal from './UserDetailsModal';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

// Memoized User Row Component
const UserTableRow = memo(({
  user,
  isSelected,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onToggleActionMenu,
  actionMenuId,
  onUpdateUser
}) => {
  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border border-purple-200',
      user: 'bg-gray-100 text-gray-800 border border-gray-200'
    };
    return colors[role] || colors.user;
  };

  const getStatusIcon = (status) => {
    return status ? (
      <FiCheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <FiXCircle className="h-4 w-4 text-red-500" />
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return format(new Date(date), 'MMM d, yyyy HH:mm');
  };

  const getMemberDuration = (createdAt) => {
    if (!createdAt) return '';
    const days = differenceInDays(new Date(), new Date(createdAt));
    if (days < 1) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  };

  return (
    <tr className={`hover:bg-gray-50 ${!user.isActive ? 'bg-red-50' : ''}`}>
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(user._id)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 flex-shrink-0">
            <img
              className="h-10 w-10 rounded-full object-cover"
              src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
              alt={user.name}
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {user.name}
              {user.role === 'admin' && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Admin
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 truncate">{user.email}</div>
            <div className="text-xs text-gray-400 mt-1">
              <div className="flex items-center">
                <FiHash className="h-3 w-3 mr-1" />
                {user._id.substring(0, 8)}...
              </div>
              <div className="mt-1">
                Member for {getMemberDuration(user.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getRoleColor(user.role)}`}>
            {user.role}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon(user.isActive)}
          <span className={`text-sm ${user.isActive ? 'text-green-700' : 'text-red-700'}`}>
            {user.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-2">
          {user.emailVerified ? (
            <>
              <FiCheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700">Verified</span>
            </>
          ) : (
            <>
              <FiXCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-700">Pending</span>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-gray-500">
        <div className="flex flex-col">
          <div className="flex items-center space-x-1">
            <FiClock className="h-3 w-3" />
            <span>{formatDate(user.lastLoginAt)}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Joined: {format(new Date(user.createdAt), 'MMM d, yyyy')}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(user)}
            className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="View Details"
          >
            <FiEye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(user)}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit User"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(user)}
            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete User"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => onToggleActionMenu(actionMenuId === user._id ? null : user._id)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <FiMoreVertical className="h-4 w-4" />
            </button>
            
            {actionMenuId === user._id && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => onToggleActionMenu(null)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onUpdateUser(user._id, { isActive: !user.isActive });
                        onToggleActionMenu(null);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {user.isActive ? (
                        <>
                          <FiUserX className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <FiUserCheck className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </button>
                    {!user.emailVerified && (
                      <button
                        onClick={() => {
                          onUpdateUser(user._id, { emailVerified: true });
                          onToggleActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiShield className="h-4 w-4 mr-2" />
                        Verify Email
                      </button>
                    )}
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => {
                          onUpdateUser(user._id, { role: 'admin' });
                          onToggleActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiShield className="h-4 w-4 mr-2" />
                        Make Admin
                      </button>
                    )}
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
  
  // React Query hooks with caching
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
  const users = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  // Memoized stats calculation
  const userStats = useMemo(() => {
    if (users.length === 0) {
      return { total: 0, active: 0, admins: 0 };
    }
    
    return {
      total: pagination.total,
      active: users.filter(u => u.isActive).length,
      admins: users.filter(u => u.role === 'admin').length
    };
  }, [users, pagination.total]);

  // Memoized handlers
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  }, [refetch]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilters({
      role: '',
      status: '',
      verified: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setPage(1);
    setSelectedUsers([]);
    refetch();
  }, [refetch]);

  const handleBulkAction = useCallback(async (action) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first');
      return;
    }

    try {
      const updatePromises = selectedUsers.map(userId => {
        switch (action) {
          case 'activate':
            return updateUserMutation.mutateAsync({ id: userId, data: { isActive: true } });
          case 'deactivate':
            return updateUserMutation.mutateAsync({ id: userId, data: { isActive: false } });
          case 'verify':
            return updateUserMutation.mutateAsync({ id: userId, data: { emailVerified: true } });
          case 'make_admin':
            return updateUserMutation.mutateAsync({ id: userId, data: { role: 'admin' } });
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(updatePromises);
      toast.success(`${selectedUsers.length} users updated successfully`);
      setSelectedUsers([]);
      
      // Invalidate cache
      queryClient.invalidateQueries(['admin', 'users']);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to perform bulk action');
    }
  }, [selectedUsers, updateUserMutation, queryClient]);

  const handleDeleteUser = useCallback(async () => {
    try {
      if (userToDelete?.type === 'single' && userToDelete?.id) {
        await deleteUserMutation.mutateAsync(userToDelete.id);
        toast.success('User deleted successfully');
      } else if (userToDelete?.type === 'bulk' && userToDelete?.ids) {
        await Promise.all(
          userToDelete.ids.map(id => deleteUserMutation.mutateAsync(id))
        );
        toast.success(`${userToDelete.ids.length} users deleted`);
      }
      
      setSelectedUsers([]);
      setShowDeleteModal(false);
      setUserToDelete(null);
      
      // Invalidate cache
      queryClient.invalidateQueries(['admin', 'users']);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete users');
    }
  }, [userToDelete, deleteUserMutation, queryClient]);

  const handleViewUser = useCallback((user) => {
    setViewingUser(user);
    setShowUserDetails(true);
  }, []);

  const handleEditUser = useCallback((user) => {
    setEditingUser(user);
    setShowEditModal(true);
  }, []);

  const handleUpdateUser = useCallback(async (data) => {
    if (!editingUser?._id) return;
    
    try {
      await updateUserMutation.mutateAsync({ id: editingUser._id, data });
      toast.success('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      
      // Invalidate cache
      queryClient.invalidateQueries(['admin', 'users']);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  }, [editingUser, updateUserMutation, queryClient]);

  const handleSingleUpdateUser = useCallback(async (userId, data) => {
    try {
      await updateUserMutation.mutateAsync({ id: userId, data });
      
      // Invalidate cache
      queryClient.invalidateQueries(['admin', 'users']);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    }
  }, [updateUserMutation, queryClient]);

  const handleUserCreated = useCallback(() => {
    toast.success('User created successfully!');
    setShowCreateModal(false);
    
    // Invalidate cache
    queryClient.invalidateQueries(['admin', 'users']);
  }, [queryClient]);

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

  const handleDelete = useCallback((user) => {
    setUserToDelete({ type: 'single', id: user._id });
    setShowDeleteModal(true);
  }, []);

  const refreshData = useCallback(() => {
    refetch();
    setSelectedUsers([]);
    toast.success('Data refreshed');
  }, [refetch]);

  const exportUsers = useCallback(async () => {
  try {
    const response = await exportUsersMutation.mutateAsync('csv');
    
    // Create blob and download
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Users exported successfully');
  } catch (error) {
    toast.error('Failed to export users');
  }
}, [exportUsersMutation]);

  const handleCreateUser = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  if (isLoading && !users.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage and monitor all user accounts</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={refreshData}
            disabled={isRefetching}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportUsers}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <FiDownload className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button 
            onClick={handleCreateUser}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <FiPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold mt-1">{userStats.total}</p>
            </div>
            <FiUsers className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold mt-1">{userStats.active}</p>
            </div>
            <FiUserCheck className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Admins</p>
              <p className="text-2xl font-bold mt-1">{userStats.admins}</p>
            </div>
            <FiShield className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <FiUserCheck className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-medium text-indigo-800">
                  {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-indigo-600">Choose an action to perform</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
  <button
    onClick={() => handleBulkAction('activate')}
    className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 flex items-center space-x-1"
  >
    <FiCheckCircle className="h-4 w-4" />
    <span>Activate</span>
  </button>
  <button
    onClick={() => handleBulkAction('deactivate')}
    className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200 flex items-center space-x-1"
  >
    <FiUserX className="h-4 w-4" />
    <span>Deactivate</span>
  </button>
  <button
    onClick={() => handleBulkAction('verify-email')}
    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 flex items-center space-x-1"
  >
    <FiShield className="h-4 w-4" />
    <span>Verify Email</span>
  </button>
  <button
    onClick={() => handleBulkAction('promote-admin')}
    className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 flex items-center space-x-1"
  >
    <FiShield className="h-4 w-4" />
    <span>Make Admin</span>
  </button>
  <button
    onClick={() => {
      setUserToDelete({ type: 'bulk', ids: selectedUsers });
      setShowDeleteModal(true);
    }}
    className="px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 flex items-center space-x-1"
  >
    <FiTrash2 className="h-4 w-4" />
    <span>Delete</span>
  </button>
</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <form onSubmit={handleSearch} className="flex-1 md:mr-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
          
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex space-x-2">
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50"
            >
              <FiFilter className="h-4 w-4" />
              <span className="hidden md:inline">More Filters</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Verified</label>
              <select
                value={filters.verified}
                onChange={(e) => handleFilterChange('verified', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All</option>
                <option value="true">Verified</option>
                <option value="false">Not Verified</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verified
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <UserTableRow
                  key={user._id}
                  user={user}
                  isSelected={selectedUsers.includes(user._id)}
                  onToggleSelect={toggleSelectUser}
                  onView={handleViewUser}
                  onEdit={handleEditUser}
                  onDelete={handleDelete}
                  onToggleActionMenu={toggleActionMenu}
                  actionMenuId={actionMenu}
                  onUpdateUser={handleSingleUpdateUser}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {users.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FiUsers className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-2 text-gray-500">Try adjusting your search or filter criteria.</p>
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> users
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  <FiChevronLeft className="h-4 w-4" />
                </button>
                
                <div className="flex items-center space-x-1">
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
                        className={`px-3 py-1.5 rounded-md text-sm ${
                          page === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {pagination.totalPages > 5 && page < pagination.totalPages - 2 && (
                    <>
                      <span className="px-2 text-gray-400">...</span>
                      <button
                        onClick={() => setPage(pagination.totalPages)}
                        className={`px-3 py-1.5 rounded-md text-sm border border-gray-300 hover:bg-gray-50`}
                      >
                        {pagination.totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
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
          onSuccess={handleUserCreated}
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
          onSave={handleUpdateUser}
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