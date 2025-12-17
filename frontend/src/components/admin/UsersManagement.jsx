import { useState, useMemo } from 'react';
import { useAdminUsers, useUpdateUser, useDeleteUser } from '../../hooks/useAdminDashboard';
import { toast } from 'react-hot-toast';
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiMail,
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
  FiUnlock,
  FiUser,
  FiCalendar,
  FiClock,
  FiMoreVertical,
  FiRefreshCw,
  FiFileText,
  FiCreditCard,
  FiActivity
} from 'react-icons/fi';
import { format } from 'date-fns';

const UsersManagement = () => {
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
  const [userToDelete, setUserToDelete] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [userStats, setUserStats] = useState({ total: 0, active: 0, sellers: 0, buyers: 0 });
  const [actionMenu, setActionMenu] = useState(null);

  const limit = 10;
  const { data, isLoading, refetch, isRefetching } = useAdminUsers({
    page,
    limit,
    search: searchTerm,
    ...filters
  });
  
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  
  const users = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  // Calculate user stats
  useMemo(() => {
    if (users.length > 0) {
      const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        sellers: users.filter(u => u.role === 'seller').length,
        buyers: users.filter(u => u.role === 'buyer').length
      };
      setUserStats(stats);
    }
  }, [users]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first');
      return;
    }

    try {
      switch (action) {
        case 'activate':
          await Promise.all(selectedUsers.map(userId =>
            updateUserMutation.mutateAsync({ id: userId, data: { isActive: true } })
          ));
          toast.success(`${selectedUsers.length} users activated`);
          break;
        
        case 'deactivate':
          await Promise.all(selectedUsers.map(userId =>
            updateUserMutation.mutateAsync({ id: userId, data: { isActive: false } })
          ));
          toast.success(`${selectedUsers.length} users deactivated`);
          break;
        
        case 'verify':
          await Promise.all(selectedUsers.map(userId =>
            updateUserMutation.mutateAsync({ id: userId, data: { emailVerified: true } })
          ));
          toast.success(`${selectedUsers.length} users verified`);
          break;
        
        case 'make_seller':
          await Promise.all(selectedUsers.map(userId =>
            updateUserMutation.mutateAsync({ id: userId, data: { role: 'seller' } })
          ));
          toast.success(`${selectedUsers.length} users updated to sellers`);
          break;
        
        case 'make_buyer':
          await Promise.all(selectedUsers.map(userId =>
            updateUserMutation.mutateAsync({ id: userId, data: { role: 'buyer' } })
          ));
          toast.success(`${selectedUsers.length} users updated to buyers`);
          break;
        
        case 'delete':
          setUserToDelete({ type: 'bulk', ids: selectedUsers });
          setShowDeleteModal(true);
          return;
      }
      
      setSelectedUsers([]);
      refetch();
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  };

  const handleDeleteUser = async () => {
    try {
      if (userToDelete.type === 'single') {
        await deleteUserMutation.mutateAsync(userToDelete.id);
        toast.success('User deleted successfully');
      } else if (userToDelete.type === 'bulk') {
        await Promise.all(userToDelete.ids.map(id =>
          deleteUserMutation.mutateAsync(id)
        ));
        toast.success(`${userToDelete.ids.length} users deleted`);
      }
      setSelectedUsers([]);
      refetch();
    } catch (error) {
      toast.error('Failed to delete users');
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleViewUser = (user) => {
    setViewingUser(user);
    setShowUserDetails(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (data) => {
    try {
      await updateUserMutation.mutateAsync({ id: editingUser._id, data });
      toast.success('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      refetch();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(user => user._id));
    } else {
      setSelectedUsers([]);
    }
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getStatusColor = (status) => {
    return status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800 border border-purple-200',
      seller: 'bg-blue-100 text-blue-800 border border-blue-200',
      buyer: 'bg-green-100 text-green-800 border border-green-200',
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

  const exportUsers = () => {
    // Implementation for exporting users
    toast.success('Export feature coming soon');
  };

  const refreshData = () => {
    refetch();
    toast.success('Data refreshed');
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return format(new Date(date), 'MMM d, yyyy HH:mm');
  };

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
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2">
            <FiPlus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <p className="text-sm text-gray-600">Sellers</p>
              <p className="text-2xl font-bold mt-1">{userStats.sellers}</p>
            </div>
            <FiCreditCard className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Buyers</p>
              <p className="text-2xl font-bold mt-1">{userStats.buyers}</p>
            </div>
            <FiActivity className="h-8 w-8 text-orange-500" />
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
                onClick={() => handleBulkAction('verify')}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 flex items-center space-x-1"
              >
                <FiShield className="h-4 w-4" />
                <span>Verify Email</span>
              </button>
              <button
                onClick={() => handleBulkAction('make_seller')}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 flex items-center space-x-1"
              >
                <FiCreditCard className="h-4 w-4" />
                <span>Make Seller</span>
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
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
                  <FiXCircle className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
          
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex space-x-2">
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
                <option value="user">User</option>
              </select>
              
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
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
                <option value="updatedAt">Last Updated</option>
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
                <tr 
                  key={user._id} 
                  className={`hover:bg-gray-50 ${!user.isActive ? 'bg-red-50' : ''}`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => toggleSelectUser(user._id)}
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
                          ID: {user._id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col space-y-1">
                      <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                      {user.isActive ? null : (
                        <span className="text-xs text-red-600">Inactive</span>
                      )}
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
                        onClick={() => handleViewUser(user)}
                        className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        title="View Details"
                      >
                        <FiEye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit User"
                      >
                        <FiEdit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setUserToDelete({ type: 'single', id: user._id });
                          setShowDeleteModal(true);
                        }}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete User"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === user._id ? null : user._id)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                        >
                          <FiMoreVertical className="h-4 w-4" />
                        </button>
                        
                        {actionMenu === user._id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenu(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleBulkAction(user.isActive ? 'deactivate' : 'activate');
                                    setActionMenu(null);
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
                                      handleBulkAction('verify');
                                      setActionMenu(null);
                                    }}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <FiShield className="h-4 w-4 mr-2" />
                                    Verify Email
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    updateUserMutation.mutate({
                                      id: user._id,
                                      data: { role: user.role === 'seller' ? 'buyer' : 'seller' }
                                    });
                                    setActionMenu(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <FiCreditCard className="h-4 w-4 mr-2" />
                                  Switch to {user.role === 'seller' ? 'Buyer' : 'Seller'}
                                </button>
                                <button
                                  onClick={() => {
                                    // Send reset password email
                                    toast.success('Reset password email sent');
                                    setActionMenu(null);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  <FiLock className="h-4 w-4 mr-2" />
                                  Reset Password
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {users.length === 0 && (
          <div className="text-center py-12">
            <FiUsers className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-2 text-gray-500">Try adjusting your search or filter criteria.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilters({
                  role: '',
                  status: '',
                  verified: '',
                  sortBy: 'createdAt',
                  sortOrder: 'desc'
                });
                setPage(1);
              }}
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
                  className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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
                  className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <FiChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserDetails && viewingUser && (
        <UserDetailsModal
          user={viewingUser}
          onClose={() => {
            setShowUserDetails(false);
            setViewingUser(null);
          }}
        />
      )}

      {/* Edit User Modal */}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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

// User Details Modal Component
const UserDetailsModal = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiXCircle className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          {/* User details content */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="flex items-center space-x-4">
              <img
                className="h-20 w-20 rounded-full object-cover"
                src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                alt={user.name}
              />
              <div>
                <h4 className="text-xl font-bold text-gray-900">{user.name}</h4>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'seller' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* User Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Joined</p>
                <p className="font-medium">{format(new Date(user.createdAt), 'MMM d, yyyy')}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Last Login</p>
                <p className="font-medium">{user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy') : 'Never'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Email Status</p>
                <p className={`font-medium ${user.emailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                  {user.emailVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">2FA</p>
                <p className="font-medium">{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
            
            {/* Additional Info */}
            <div className="space-y-4">
              <h5 className="font-semibold text-gray-900">Additional Information</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">User ID</p>
                  <p className="font-mono text-sm">{user._id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-medium">{format(new Date(user.updatedAt), 'MMM d, yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Edit User Modal Component
const EditUserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    role: user.role || 'user',
    isActive: user.isActive || false,
    emailVerified: user.emailVerified || false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="user">User</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.emailVerified}
                  onChange={(e) => setFormData({...formData, emailVerified: e.target.checked})}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Email Verified</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ userToDelete, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <FiTrash2 className="h-6 w-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
          </div>
          
          <p className="text-gray-600 mb-6">
            {userToDelete.type === 'single'
              ? 'Are you sure you want to delete this user? This action cannot be undone.'
              : `Are you sure you want to delete ${userToDelete.ids.length} users? This action cannot be undone.`}
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;