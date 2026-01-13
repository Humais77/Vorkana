// UserManagement.jsx - UPDATED DATA EXTRACTION LOGIC
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
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
  FiHash,
  FiAlertCircle
} from 'react-icons/fi';
import { format, differenceInDays } from 'date-fns';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import UserDetailsModal from './UserDetailsModal';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

// Error Boundary Component
const ErrorBoundaryFallback = ({ error, resetErrorBoundary }) => (
  <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-center mb-3">
      <FiAlertCircle className="h-6 w-6 text-red-500 mr-2" />
      <h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
    </div>
    <p className="text-sm text-red-700 mb-2">Error: {error.message}</p>
    <div className="bg-white p-3 rounded border border-red-100 mb-4">
      <p className="text-xs text-red-600 font-mono">{error.stack?.split('\n')[0]}</p>
    </div>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
    >
      Try again
    </button>
  </div>
);

// Loading Skeleton Component
const TableSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-16 bg-gray-100 animate-pulse rounded"></div>
    ))}
  </div>
);

// Enhanced User Table Row Component with error handling
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
  const [rowError, setRowError] = useState(null);

  // Validate user object
  const safeUser = useMemo(() => {
    if (!user || typeof user !== 'object') {
      return {
        _id: 'error',
        name: 'Invalid User Data',
        email: 'N/A',
        role: 'user',
        isActive: false,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        picture: null
      };
    }
    return user;
  }, [user]);

  const getRoleColor = (role) => {
    if (!role) return 'bg-gray-100 text-gray-800 border border-gray-200';
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border border-purple-200',
      user: 'bg-gray-100 text-gray-800 border border-gray-200',
      seller: 'bg-blue-100 text-blue-800 border border-blue-200',
      buyer: 'bg-green-100 text-green-800 border border-green-200'
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
    try {
      return format(new Date(date), 'MMM d, yyyy HH:mm');
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const getMemberDuration = (createdAt) => {
    if (!createdAt) return 'N/A';
    try {
      const days = differenceInDays(new Date(), new Date(createdAt));
      if (days < 1) return 'Today';
      if (days === 1) return 'Yesterday';
      if (days < 30) return `${days} days`;
      if (days < 365) return `${Math.floor(days / 30)} months`;
      return `${Math.floor(days / 365)} years`;
    } catch (error) {
      console.error('Date calculation error:', error);
      return 'N/A';
    }
  };

  const handleSingleUpdate = async (userId, data, actionName) => {
    try {
      setLocalLoading(true);
      setRowError(null);
      
      if (!userId) {
        throw new Error('Invalid user ID');
      }
      
      await onUpdateUser(userId, data);
      toast.success(`User ${actionName.toLowerCase()} successfully`);
    } catch (error) {
      console.error(`[USER ACTION ERROR] ${actionName}:`, error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to update user';
      setRowError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLocalLoading(false);
    }
  };

  if (rowError) {
    return (
      <tr className="bg-red-50">
        <td colSpan="7" className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiAlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-red-800">Error loading user data</p>
                <p className="text-xs text-red-600">{rowError}</p>
              </div>
            </div>
            <button
              onClick={() => setRowError(null)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`hover:bg-gray-50 ${!safeUser.isActive ? 'bg-red-50' : ''} ${localLoading ? 'opacity-50' : ''}`}>
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(safeUser._id)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          disabled={localLoading || safeUser._id === 'error'}
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 flex-shrink-0">
            <img
              className="h-10 w-10 rounded-full object-cover"
              src={safeUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(safeUser.name || 'User')}&background=random`}
              alt={safeUser.name || 'User'}
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(safeUser.name || 'User')}&background=random`;
              }}
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {safeUser.name || 'No name'}
              {safeUser.role === 'admin' && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Admin
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 truncate">{safeUser.email || 'No email'}</div>
            <div className="text-xs text-gray-400 mt-1">
              <div className="flex items-center">
                <FiHash className="h-3 w-3 mr-1" />
                {safeUser._id?.substring(0, 8) || 'N/A'}...
              </div>
              <div className="mt-1">
                Member for {getMemberDuration(safeUser.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col space-y-1">
          <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getRoleColor(safeUser.role)}`}>
            {safeUser.role || 'user'}
          </span>
          {safeUser.accountType && safeUser.accountType !== 'basic' && (
            <span className="px-2 py-0.5 inline-flex text-xs leading-3 font-medium rounded-full bg-amber-100 text-amber-800 mt-1">
              {safeUser.accountType}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon(safeUser.isActive)}
          <span className={`text-sm ${safeUser.isActive ? 'text-green-700' : 'text-red-700'}`}>
            {safeUser.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-2">
          {safeUser.emailVerified ? (
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
            <span>{formatDate(safeUser.lastLoginAt)}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Joined: {safeUser.createdAt ? format(new Date(safeUser.createdAt), 'MMM d, yyyy') : 'N/A'}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(safeUser)}
            className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
            title="View Details"
            disabled={localLoading || safeUser._id === 'error'}
          >
            <FiEye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(safeUser)}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
            title="Edit User"
            disabled={localLoading || safeUser._id === 'error'}
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(safeUser)}
            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Delete User"
            disabled={localLoading || safeUser._id === 'error'}
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => onToggleActionMenu(actionMenuId === safeUser._id ? null : safeUser._id)}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              disabled={localLoading || safeUser._id === 'error'}
            >
              <FiMoreVertical className="h-4 w-4" />
            </button>
            
            {actionMenuId === safeUser._id && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => onToggleActionMenu(null)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    <button
                      onClick={() => handleSingleUpdate(safeUser._id, { isActive: !safeUser.isActive }, safeUser.isActive ? 'Deactivate' : 'Activate')}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      disabled={localLoading}
                    >
                      {safeUser.isActive ? (
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
                      {localLoading && (
                        <div className="ml-auto animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                      )}
                    </button>
                    {!safeUser.emailVerified && (
                      <button
                        onClick={() => handleSingleUpdate(safeUser._id, { emailVerified: true }, 'Verify Email')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        disabled={localLoading}
                      >
                        <FiShield className="h-4 w-4 mr-2" />
                        Verify Email
                      </button>
                    )}
                    {safeUser.role !== 'admin' && (
                      <button
                        onClick={() => handleSingleUpdate(safeUser._id, { role: 'admin' }, 'Make Admin')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        disabled={localLoading}
                      >
                        <FiShield className="h-4 w-4 mr-2" />
                        Make Admin
                      </button>
                    )}
                    {safeUser.role === 'admin' && (
                      <button
                        onClick={() => handleSingleUpdate(safeUser._id, { role: 'user' }, 'Make User')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        disabled={localLoading}
                      >
                        <FiShield className="h-4 w-4 mr-2" />
                        Remove Admin
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
}, (prevProps, nextProps) => {
  // Custom comparison function for performance
  return (
    prevProps.user._id === nextProps.user._id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.actionMenuId === nextProps.actionMenuId
  );
});

UserTableRow.displayName = 'UserTableRow';

// Main Component with enhanced error handling
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
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  const limit = 10;
  
  // React Query hooks with caching
  const { 
    data, 
    isLoading, 
    refetch, 
    isRefetching,
    error: queryError
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
  if (!data) return [];
  
  // Debug logging
  console.log('[USERS EXTRACTION] Raw data structure:', {
    hasDataProp: !!data.data,
    dataType: typeof data.data,
    dataKeys: Object.keys(data)
  });
  
  // First check if data.data exists and is an object with users array
  if (data.data && typeof data.data === 'object') {
    // Check multiple possible user array locations
    if (Array.isArray(data.data.users)) {
      console.log('[USERS EXTRACTION] Found users in data.data.users');
      return data.data.users;
    }
    if (Array.isArray(data.data)) {
      console.log('[USERS EXTRACTION] Found users in data.data (direct array)');
      return data.data;
    }
    if (data.data.data && Array.isArray(data.data.data)) {
      console.log('[USERS EXTRACTION] Found users in data.data.data');
      return data.data.data;
    }
  }
  
  // Check direct properties
  if (Array.isArray(data.users)) {
    console.log('[USERS EXTRACTION] Found users in data.users');
    return data.users;
  }
  
  if (Array.isArray(data)) {
    console.log('[USERS EXTRACTION] Found users in data (direct array)');
    return data;
  }
  
  // Fallback to empty array
  console.log('[USERS EXTRACTION] No users found, returning empty array');
  return [];
}, [data]);
const pagination = useMemo(() => {
  try {
    if (!data) {
      return { total: 0, totalPages: 1, page: 1, limit };
    }

    // Check multiple possible pagination locations
    let total = 0;
    let pageNum = parseInt(page) || 1;
    
    // Check data.data.pagination
    if (data.data && data.data.pagination) {
      const paginationData = data.data.pagination;
      total = paginationData.total || paginationData.count || 0;
      console.log('[PAGINATION] Found in data.data.pagination:', paginationData);
    }
    // Check data.pagination
    else if (data.pagination) {
      total = data.pagination.total || data.pagination.count || 0;
      console.log('[PAGINATION] Found in data.pagination:', data.pagination);
    }
    // Check data.total directly
    else if (data.total !== undefined) {
      total = data.total;
      console.log('[PAGINATION] Found in data.total:', total);
    }
    // Check data.data.total
    else if (data.data && data.data.total !== undefined) {
      total = data.data.total;
      console.log('[PAGINATION] Found in data.data.total:', total);
    }
    // Use users length as last resort
    else if (Array.isArray(users)) {
      total = users.length;
      console.log('[PAGINATION] Using users length as total:', total);
    }
    
    const totalPages = Math.ceil(total / limit) || 1;
    
    return {
      total,
      totalPages,
      page: pageNum,
      limit,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    };
  } catch (err) {
    console.error('[PAGINATION ERROR]', err);
    return { total: 0, totalPages: 1, page: 1, limit, hasNext: false, hasPrev: false };
  }
}, [data, users, page, limit]);
  // Memoized stats calculation with safe array handling
const userStats = useMemo(() => {
  try {
    if (!Array.isArray(users)) return { total: 0, active: 0, admins: 0 };
    
    const safeUsers = users.filter(user => user && user._id);
    
    const stats = {
      total: pagination.total || safeUsers.length,
      active: safeUsers.filter(u => u.isActive === true).length,
      inactive: safeUsers.filter(u => u.isActive === false).length,
      admins: safeUsers.filter(u => u.role === 'admin').length,
      sellers: safeUsers.filter(u => u.role === 'seller').length,
      buyers: safeUsers.filter(u => u.role === 'buyer').length,
      verified: safeUsers.filter(u => u.emailVerified === true).length,
      unverified: safeUsers.filter(u => !u.emailVerified).length,
      newToday: safeUsers.filter(u => {
        const createdDate = new Date(u.createdAt);
        const today = new Date();
        return createdDate.toDateString() === today.toDateString();
      }).length,
      online: safeUsers.filter(u => {
        if (!u.lastSeenAt) return false;
        const lastSeen = new Date(u.lastSeenAt);
        const now = new Date();
        return (now - lastSeen) < 5 * 60 * 1000; // Last 5 minutes
      }).length
    };
    
    stats.verifiedPercentage = stats.total > 0 
      ? Math.round((stats.verified / stats.total) * 100) 
      : 0;
    stats.activePercentage = stats.total > 0 
      ? Math.round((stats.active / stats.total) * 100) 
      : 0;
    
    return stats;
  } catch (err) {
    return { 
      total: 0, 
      active: 0, 
      admins: 0,
      sellers: 0,
      buyers: 0,
      verified: 0,
      unverified: 0,
      newToday: 0,
      online: 0,
      verifiedPercentage: 0,
      activePercentage: 0
    };
  }
}, [users, pagination.total]);
  // Handle query errors
  useEffect(() => {
    if (queryError) {
      console.error('Query error:', queryError);
      setError(queryError.message || 'Failed to load users');
    } else {
      setError(null);
    }
  }, [queryError]);

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
      const result = await bulkUserMutation.mutateAsync({
        ids: selectedUsers,
        operation: action
      });
      
      if (result.success) {
        toast.success(result.message || `${selectedUsers.length} users updated successfully`);
        setSelectedUsers([]);
        
        // Invalidate cache
        queryClient.invalidateQueries(['admin', 'users']);
      } else {
        toast.error(result.message || 'Failed to perform bulk action');
      }
    } catch (error) {
      console.error('[BULK ACTION ERROR]', error);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to perform bulk action';
      
      // Show validation errors if they exist
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err);
        });
      } else {
        toast.error(errorMessage);
      }
    }
  }, [selectedUsers, bulkUserMutation, queryClient]);

const handleDeleteUser = useCallback(async (deleteOptions) => {
  try {
    const { permanent = false } = deleteOptions;
    
    console.log('[DELETE HANDLER] Starting delete:', { 
      userToDelete, 
      permanent,
      type: userToDelete?.type 
    });
    
    if (userToDelete?.type === 'single' && userToDelete?.id) {
      const userId = userToDelete.id;
      
      // Validate ID format
      if (!userId || userId === 'undefined' || userId === 'null' || userId.includes('[object')) {
        toast.error('Invalid user ID format');
        return;
      }
      
      console.log('[DELETE HANDLER] Deleting single user:', userId);
      
      if (permanent) {
        // Permanent delete
        await deleteUserMutation.mutateAsync({
          id: userId,
          permanent: true
        });
        toast.success('User permanently deleted');
      } else {
        // Soft delete (deactivate)
        await updateUserMutation.mutateAsync({
          id: userId,
          data: { 
            isActive: false, 
            deletedAt: new Date().toISOString() 
          }
        });
        toast.success('User deactivated successfully');
      }
    } else if (userToDelete?.type === 'bulk' && userToDelete?.ids) {
      console.log('[DELETE HANDLER] Deleting bulk users:', userToDelete.ids.length);
      
      // Validate all IDs
      const validIds = userToDelete.ids.filter(id => 
        id && id !== 'undefined' && id !== 'null' && !id.includes('[object')
      );
      
      if (validIds.length === 0) {
        toast.error('No valid user IDs found');
        return;
      }
      
      if (permanent) {
        // Permanent bulk delete - use bulk mutation if available
        await bulkUserMutation.mutateAsync({
          ids: validIds,
          operation: 'delete',
          data: { permanent: true }
        });
        toast.success(`${validIds.length} users permanently deleted`);
      } else {
        // Soft bulk delete
        await bulkUserMutation.mutateAsync({
          ids: validIds,
          operation: 'deactivate'
        });
        toast.success(`${validIds.length} users deactivated`);
      }
    }
    
    setSelectedUsers([]);
    setShowDeleteModal(false);
    setUserToDelete(null);
    
    // Invalidate cache
    queryClient.invalidateQueries(['admin', 'users']);
    
  } catch (error) {
    console.error('[DELETE HANDLER ERROR]', error);
    
    // Provide more detailed error message
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Failed to delete users';
    
    toast.error(`Delete failed: ${errorMessage}`);
  }
}, [userToDelete, deleteUserMutation, updateUserMutation, bulkUserMutation, queryClient]);
  const handleViewUser = useCallback((user) => {
    if (!user || typeof user !== 'object') {
      toast.error('Invalid user data');
      return;
    }
    setViewingUser(user);
    setShowUserDetails(true);
  }, []);

  const handleEditUser = useCallback((user) => {
    if (!user || typeof user !== 'object') {
      toast.error('Invalid user data');
      return;
    }
    setEditingUser(user);
    setShowEditModal(true);
  }, []);

  const handleUpdateUser = useCallback(async (userId, data) => {
    if (!userId) {
      toast.error('Invalid user ID');
      return;
    }
    
    try {
      await updateUserMutation.mutateAsync({ id: userId, data });
      
      // Invalidate cache
      queryClient.invalidateQueries(['admin', 'users']);
      
    } catch (error) {
      console.error('Update user error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to update user';
      throw new Error(errorMessage);
    }
  }, [updateUserMutation, queryClient]);

  const handleUserCreated = useCallback(() => {
    toast.success('User created successfully!');
    setShowCreateModal(false);
    
    // Invalidate cache
    queryClient.invalidateQueries(['admin', 'users']);
  }, [queryClient]);

  const toggleSelectAll = useCallback((e) => {
    if (!Array.isArray(users)) {
      toast.error('Cannot select users: data not loaded');
      return;
    }
    
    const validUsers = users.filter(user => user && user._id);
    
    if (e.target.checked) {
      setSelectedUsers(validUsers.map(user => user._id));
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
// Update the handleDelete function to extract ID properly
const handleDelete = useCallback((user) => {
  if (!user) {
    toast.error('Invalid user data');
    return;
  }
  
  // Safely extract the ID
  let userId;
  if (typeof user === 'string') {
    userId = user;
  } else if (user._id) {
    userId = user._id;
  } else if (user.id) {
    userId = user.id;
  } else {
    toast.error('No valid user ID found');
    return;
  }
  
  // Validate the ID format
  if (!userId || 
      userId === 'undefined' || 
      userId === 'null' || 
      userId.includes('[object') ||
      userId.includes('temp-')) {
    toast.error('Invalid user ID format');
    return;
  }
  
  console.log('[DELETE USER] Setting user to delete:', { 
    type: 'single', 
    id: userId,
    userEmail: user.email || 'No email'
  });
  
  setUserToDelete({ type: 'single', id: userId });
  setShowDeleteModal(true);
}, []);

// Also update bulk delete handler
const handleBulkDelete = useCallback(() => {
  if (selectedUsers.length === 0) {
    toast.error('Please select users first');
    return;
  }
  
  console.log('[BULK DELETE] Setting users to delete:', { 
    type: 'bulk', 
    ids: selectedUsers,
    count: selectedUsers.length 
  });
  
  setUserToDelete({ type: 'bulk', ids: selectedUsers });
  setShowDeleteModal(true);
}, [selectedUsers]);

  const refreshData = useCallback(() => {
    try {
      refetch();
      setSelectedUsers([]);
      toast.success('Data refreshed');
    } catch (error) {
      console.error('Refresh error:', error);
      toast.error('Failed to refresh data');
    }
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
      console.error('Export error:', error);
      toast.error('Failed to export users');
    }
  }, [exportUsersMutation]);

  const handleCreateUser = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  // Reset error when data loads successfully
  useEffect(() => {
    if (data && !isLoading) {
      setError(null);
    }
  }, [data, isLoading]);

  // Loading state with skeleton
  if (isLoading && !users.length) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-64 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="h-10 w-24 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-24 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-10 w-24 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
        
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="h-20 bg-gray-100 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <TableSkeleton />
      </div>
    );
  }

  // Error state with debug info
  if (error && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-3">
            <FiAlertCircle className="h-6 w-6 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-red-800">Error Loading Users</h3>
          </div>
          <p className="text-sm text-red-700 mb-2">{error}</p>
          
          {/* Debug Information */}
          {debugInfo && (
            <div className="mt-4 p-3 bg-white border border-gray-200 rounded">
              <p className="text-xs font-medium text-gray-700 mb-1">Debug Information:</p>
              <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                {debugInfo}
              </pre>
            </div>
          )}
          
          <div className="flex space-x-3 mt-4">
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              Retry
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
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
            disabled={exportUsersMutation.isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2 disabled:opacity-50"
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
      // Replace the current Quick Stats section with this enhanced version
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">Total Users</p>
        <p className="text-2xl font-bold mt-1">{userStats.total.toLocaleString()}</p>
        <div className="flex items-center mt-1">
          <span className="text-xs text-green-600 font-medium">
            +{userStats.newToday} today
          </span>
          <span className="mx-2 text-gray-300">|</span>
          <span className="text-xs text-blue-600">
            {userStats.online} online
          </span>
        </div>
      </div>
      <FiUsers className="h-8 w-8 text-blue-500" />
    </div>
  </div>
  
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">Active Users</p>
        <p className="text-2xl font-bold mt-1">{userStats.active.toLocaleString()}</p>
        <div className="mt-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full" 
              style={{ width: `${userStats.activePercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {userStats.activePercentage}% of total
          </p>
        </div>
      </div>
      <FiUserCheck className="h-8 w-8 text-green-500" />
    </div>
  </div>
  
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">Verified Users</p>
        <p className="text-2xl font-bold mt-1">{userStats.verified.toLocaleString()}</p>
        <div className="mt-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${userStats.verifiedPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {userStats.verifiedPercentage}% verified
          </p>
        </div>
      </div>
      <FiShield className="h-8 w-8 text-blue-500" />
    </div>
  </div>
  
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">User Roles</p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="text-center">
            <p className="text-lg font-bold text-purple-600">{userStats.admins}</p>
            <p className="text-xs text-gray-500">Admins</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-600">{userStats.sellers}</p>
            <p className="text-xs text-gray-500">Sellers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{userStats.buyers}</p>
            <p className="text-xs text-gray-500">Buyers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-600">{userStats.total - (userStats.admins + userStats.sellers + userStats.buyers)}</p>
            <p className="text-xs text-gray-500">Regular</p>
          </div>
        </div>
      </div>
      <FiUserCheck className="h-8 w-8 text-indigo-500" />
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
                disabled={bulkUserMutation.isLoading}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 flex items-center space-x-1 disabled:opacity-50"
              >
                <FiCheckCircle className="h-4 w-4" />
                <span>Activate</span>
                {bulkUserMutation.isLoading && (
                  <div className="ml-1 animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                )}
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                disabled={bulkUserMutation.isLoading}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200 flex items-center space-x-1 disabled:opacity-50"
              >
                <FiUserX className="h-4 w-4" />
                <span>Deactivate</span>
              </button>
              <button
                onClick={() => handleBulkAction('verify-email')}
                disabled={bulkUserMutation.isLoading}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 flex items-center space-x-1 disabled:opacity-50"
              >
                <FiShield className="h-4 w-4" />
                <span>Verify Email</span>
              </button>
              <button
                onClick={() => handleBulkAction('promote-admin')}
                disabled={bulkUserMutation.isLoading}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 flex items-center space-x-1 disabled:opacity-50"
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
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
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
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
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
                    checked={users.length > 0 && selectedUsers.length === users.filter(user => user && user._id).length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    disabled={!Array.isArray(users) || users.length === 0}
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
              {Array.isArray(users) && users.length > 0 ? (
                users.map((user) => (
                  <UserTableRow
                    key={user?._id || Math.random()}
                    user={user}
                    isSelected={selectedUsers.includes(user?._id)}
                    onToggleSelect={toggleSelectUser}
                    onView={handleViewUser}
                    onEdit={handleEditUser}
                    onDelete={handleDelete}
                    onToggleActionMenu={toggleActionMenu}
                    actionMenuId={actionMenu}
                    onUpdateUser={handleUpdateUser}
                    updateMutation={updateUserMutation}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center">
                    <FiUsers className="h-12 w-12 text-gray-300 mx-auto" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
                    <p className="mt-2 text-gray-500">Try adjusting your search or filter criteria.</p>
                    <button
                      onClick={handleClearFilters}
                      className="mt-4 px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {Array.isArray(users) && users.length === 0 && !isLoading && (
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