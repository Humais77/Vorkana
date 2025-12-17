// GigsManagement.jsx
import React from 'react';
import { useState, useMemo } from 'react';
import { 
  useAdminGigs, 
  useCreateGig, 
  useUpdateGig, 
  useDeleteGig,
  useBulkGigOperations,
  useCategoriesForDropdown,
  useUsersForDropdown
} from '../../hooks/useAdminDashboard';
import { toast } from 'react-hot-toast';
import {
  FiBriefcase,
  FiSearch,
  FiFilter,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiPlus,
  FiCheckCircle,
  FiXCircle,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiStar,
  FiDollarSign,
  FiClock,
  FiUser,
  FiMoreVertical,
  FiCopy,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiFlag,
  FiLock,
  FiUnlock,
  FiDownload
} from 'react-icons/fi';
import { format } from 'date-fns';

const GigsManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    minBudget: '',
    maxBudget: '',
    urgency: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [page, setPage] = useState(1);
  const [selectedGigs, setSelectedGigs] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGigDetails, setShowGigDetails] = useState(false);
  const [gigToDelete, setGigToDelete] = useState(null);
  const [editingGig, setEditingGig] = useState(null);
  const [viewingGig, setViewingGig] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedGigs, setExpandedGigs] = useState([]);
  
  const [gigForm, setGigForm] = useState({
    title: '',
    description: '',
    budget: '',
    currency: 'USD',
    timeline: '',
    timelineUnit: 'days',
    projectCategory: '',
    subcategory: '',
    skillsRequired: [],
    deliverables: [],
    urgency: 'medium',
    visibility: 'public',
    status: 'open'
  });

  const limit = 20;
  const { data, isLoading, refetch, isRefetching } = useAdminGigs({
    page,
    limit,
    search: searchTerm,
    ...filters
  });
  
  const createGigMutation = useCreateGig();
  const updateGigMutation = useUpdateGig();
  const deleteGigMutation = useDeleteGig();
  const bulkOperationsMutation = useBulkGigOperations();
  const { data: categoriesData } = useCategoriesForDropdown();
  const { data: usersData } = useUsersForDropdown();
  
  const gigs = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };
  const categories = categoriesData?.data || [];
  const users = usersData?.data || [];

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
    if (selectedGigs.length === 0) {
      toast.error('Please select gigs first');
      return;
    }

    try {
      await bulkOperationsMutation.mutateAsync({
        ids: selectedGigs,
        operation: action
      });
      
      setSelectedGigs([]);
      refetch();
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingGig) {
        await updateGigMutation.mutateAsync({
          id: editingGig._id,
          data: gigForm
        });
        toast.success('Gig updated successfully');
      } else {
        await createGigMutation.mutateAsync(gigForm);
        toast.success('Gig created successfully');
      }
      
      handleCloseModal();
      refetch();
    } catch (error) {
      toast.error('Failed to save gig');
    }
  };

  const handleEdit = (gig) => {
    setEditingGig(gig);
    setGigForm({
      title: gig.title,
      description: gig.description || '',
      budget: gig.budget || '',
      currency: gig.currency || 'USD',
      timeline: gig.timeline || '',
      timelineUnit: gig.timelineUnit || 'days',
      projectCategory: gig.projectCategory?._id || '',
      subcategory: gig.subcategory?._id || '',
      skillsRequired: gig.skillsRequired || [],
      deliverables: gig.deliverables || [],
      urgency: gig.urgency || 'medium',
      visibility: gig.visibility || 'public',
      status: gig.status || 'open'
    });
    setShowEditModal(true);
  };

  const handleView = (gig) => {
    setViewingGig(gig);
    setShowGigDetails(true);
  };

  const handleDelete = (gig) => {
    setGigToDelete({ type: 'single', id: gig._id });
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingGig(null);
    setGigForm({
      title: '',
      description: '',
      budget: '',
      currency: 'USD',
      timeline: '',
      timelineUnit: 'days',
      projectCategory: '',
      subcategory: '',
      skillsRequired: [],
      deliverables: [],
      urgency: 'medium',
      visibility: 'public',
      status: 'open'
    });
  };

  const handleDeleteGig = async () => {
    try {
      if (gigToDelete.type === 'single') {
        await deleteGigMutation.mutateAsync(gigToDelete.id);
        toast.success('Gig deleted successfully');
      } else if (gigToDelete.type === 'bulk') {
        await Promise.all(gigToDelete.ids.map(id =>
          deleteGigMutation.mutateAsync(id)
        ));
        toast.success(`${gigToDelete.ids.length} gigs deleted`);
      }
      setSelectedGigs([]);
      refetch();
    } catch (error) {
      toast.error('Failed to delete gigs');
    } finally {
      setShowDeleteModal(false);
      setGigToDelete(null);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedGigs(gigs.map(gig => gig._id));
    } else {
      setSelectedGigs([]);
    }
  };

  const toggleSelectGig = (gigId) => {
    setSelectedGigs(prev =>
      prev.includes(gigId)
        ? prev.filter(id => id !== gigId)
        : [...prev, gigId]
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      assigned: 'bg-purple-100 text-purple-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      closed: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[urgency] || 'bg-gray-100 text-gray-800';
  };

  const refreshData = () => {
    refetch();
    toast.success('Data refreshed');
  };

  const toggleExpandGig = (gigId) => {
    setExpandedGigs(prev =>
      prev.includes(gigId)
        ? prev.filter(id => id !== gigId)
        : [...prev, gigId]
    );
  };

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: gigs.length,
      open: gigs.filter(g => g.status === 'open').length,
      inProgress: gigs.filter(g => g.status === 'in_progress').length,
      completed: gigs.filter(g => g.status === 'completed').length,
      totalBudget: gigs.reduce((sum, g) => sum + (g.budget || 0), 0),
      avgBudget: gigs.length > 0 ? gigs.reduce((sum, g) => sum + (g.budget || 0), 0) / gigs.length : 0
    };
  }, [gigs]);

  if (isLoading && !gigs.length) {
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
          <h1 className="text-2xl font-bold text-gray-900">Gig Management</h1>
          <p className="text-gray-600">Manage projects and freelance opportunities</p>
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
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <FiPlus className="h-4 w-4" />
            <span>Add Gig</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Gigs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FiBriefcase className="h-8 w-8 text-indigo-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Gigs</p>
              <p className="text-2xl font-bold text-green-600">{stats.open}</p>
            </div>
            <FiUnlock className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            </div>
            <FiClock className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-purple-600">
                ${stats.totalBudget.toLocaleString()}
              </p>
            </div>
            <FiDollarSign className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedGigs.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <FiBriefcase className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-medium text-indigo-800">
                  {selectedGigs.length} gig{selectedGigs.length > 1 ? 's' : ''} selected
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
                <span>Open</span>
              </button>
              <button
                onClick={() => handleBulkAction('pause')}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200 flex items-center space-x-1"
              >
                <FiXCircle className="h-4 w-4" />
                <span>Close</span>
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
                placeholder="Search gigs by title, description, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </form>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50"
            >
              <FiFilter className="h-4 w-4" />
              <span className="hidden md:inline">Filters</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="assigned">Assigned</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minBudget}
                  onChange={(e) => handleFilterChange('minBudget', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxBudget}
                  onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="createdAt">Date Created</option>
                <option value="budget">Budget</option>
                <option value="title">Title</option>
                <option value="updatedAt">Last Updated</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Gigs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedGigs.length === gigs.length && gigs.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gig Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Urgency
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {gigs.map((gig) => {
                const isExpanded = expandedGigs.includes(gig._id);
                
                return (
                  <React.Fragment key={gig._id}>
                    {/* Main Row */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedGigs.includes(gig._id)}
                          onChange={() => toggleSelectGig(gig._id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => toggleExpandGig(gig._id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isExpanded ? (
                              <FiChevronUp className="h-4 w-4 text-gray-500" />
                            ) : (
                              <FiChevronDown className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{gig.title}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {gig.projectCategory?.name || 'No category'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(gig.status)}`}>
                            {gig.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(gig.urgency)}`}>
                            {gig.urgency.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-1">
                          <FiDollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">
                            {gig.budget?.toLocaleString() || '0'} {gig.currency}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <FiUser className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{gig.createdBy?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{gig.createdBy?.email || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {format(new Date(gig.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleView(gig)}
                            className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="View Details"
                          >
                            <FiEye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(gig)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Gig"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActionMenu(actionMenu === gig._id ? null : gig._id)}
                              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                            >
                              <FiMoreVertical className="h-4 w-4" />
                            </button>
                            
                            {actionMenu === gig._id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10"
                                  onClick={() => setActionMenu(null)}
                                />
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                                  <div className="py-1">
                                    <button
                                      onClick={() => {
                                        handleDelete(gig);
                                        setActionMenu(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      <FiTrash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr key={`${gig._id}-expanded`}>
                        <td colSpan="7" className="px-4 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-gray-500 uppercase">Description</div>
                              <div className="text-sm text-gray-700">
                                {gig.description?.substring(0, 150) || 'No description'}
                                {gig.description?.length > 150 && '...'}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-gray-500 uppercase">Details</div>
                              <div className="text-sm">
                                <div><span className="text-gray-500">Timeline:</span> {gig.timeline} {gig.timelineUnit}</div>
                                <div><span className="text-gray-500">Bids:</span> {gig.bids?.length || 0}</div>
                                <div><span className="text-gray-500">Visibility:</span> {gig.visibility}</div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-gray-500 uppercase">Skills & Deliverables</div>
                              <div className="text-sm">
                                <div className="mb-2">
                                  <span className="text-gray-500">Skills:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {gig.skillsRequired?.slice(0, 3).map((skill, idx) => (
                                      <span key={idx} className="px-2 py-1 text-xs bg-gray-100 rounded">
                                        {skill}
                                      </span>
                                    ))}
                                    {gig.skillsRequired?.length > 3 && (
                                      <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                                        +{gig.skillsRequired.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {gigs.length === 0 && (
          <div className="text-center py-12">
            <FiBriefcase className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No gigs found</h3>
            <p className="mt-2 text-gray-500">Create your first gig to get started.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <FiPlus className="h-4 w-4 inline mr-2" />
              Add Gig
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
                <span className="font-medium">{pagination.total}</span> gigs
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

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <GigModal
          isOpen={showCreateModal || showEditModal}
          isEditing={!!editingGig}
          formData={gigForm}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          onChange={setGigForm}
          categories={categories}
          users={users}
        />
      )}

      {/* Gig Details Modal */}
      {showGigDetails && viewingGig && (
        <GigDetailsModal
          gig={viewingGig}
          onClose={() => {
            setShowGigDetails(false);
            setViewingGig(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          type="gig"
          itemToDelete={gigToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setGigToDelete(null);
          }}
          onConfirm={handleDeleteGig}
        />
      )}
    </div>
  );
};

// Gig Modal Component
const GigModal = ({ 
  isOpen, 
  isEditing, 
  formData, 
  onClose, 
  onSubmit, 
  onChange,
  categories,
  users 
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  const [skillInput, setSkillInput] = useState('');
  const [deliverableInput, setDeliverableInput] = useState('');

  const addSkill = () => {
    if (skillInput.trim()) {
      const newSkills = [...(formData.skillsRequired || []), skillInput.trim()];
      onChange({ ...formData, skillsRequired: newSkills });
      setSkillInput('');
    }
  };

  const removeSkill = (index) => {
    const newSkills = formData.skillsRequired.filter((_, i) => i !== index);
    onChange({ ...formData, skillsRequired: newSkills });
  };

  const addDeliverable = () => {
    if (deliverableInput.trim()) {
      const newDeliverables = [...(formData.deliverables || []), deliverableInput.trim()];
      onChange({ ...formData, deliverables: newDeliverables });
      setDeliverableInput('');
    }
  };

  const removeDeliverable = (index) => {
    const newDeliverables = formData.deliverables.filter((_, i) => i !== index);
    onChange({ ...formData, deliverables: newDeliverables });
  };

  const handleKeyPress = (e, type) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'skill') addSkill();
      if (type === 'deliverable') addDeliverable();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Gig' : 'Create New Gig'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiXCircle className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => onChange({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter gig title"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => onChange({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows="4"
                  placeholder="Describe the project requirements"
                />
              </div>
              
              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.projectCategory}
                    onChange={(e) => onChange({...formData, projectCategory: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategory
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) => onChange({...formData, subcategory: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select subcategory</option>
                    {/* You would filter subcategories based on selected category */}
                  </select>
                </div>
              </div>
              
              {/* Budget & Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget *
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={formData.currency}
                      onChange={(e) => onChange({...formData, currency: e.target.value})}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                    </select>
                    <input
                      type="number"
                      required
                      min="5"
                      max="100000"
                      value={formData.budget}
                      onChange={(e) => onChange({...formData, budget: e.target.value})}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Budget amount"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeline *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.timeline}
                      onChange={(e) => onChange({...formData, timeline: e.target.value})}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Timeline"
                    />
                    <select
                      value={formData.timelineUnit}
                      onChange={(e) => onChange({...formData, timelineUnit: e.target.value})}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Skills Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills Required
                </label>
                <div className="mb-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'skill')}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Add a skill and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skillsRequired.map((skill, index) => (
                    <div key={index} className="flex items-center bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="ml-2 text-indigo-600 hover:text-indigo-900"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Deliverables */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deliverables
                </label>
                <div className="mb-3">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={deliverableInput}
                      onChange={(e) => setDeliverableInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'deliverable')}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Add a deliverable and press Enter"
                    />
                    <button
                      type="button"
                      onClick={addDeliverable}
                      className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full">
                      <span>{deliverable}</span>
                      <button
                        type="button"
                        onClick={() => removeDeliverable(index)}
                        className="ml-2 text-green-600 hover:text-green-900"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => onChange({...formData, status: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="assigned">Assigned</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Urgency
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => onChange({...formData, urgency: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visibility
                  </label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => onChange({...formData, visibility: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="invite_only">Invite Only</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                {isEditing ? 'Update Gig' : 'Create Gig'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Gig Details Modal Component
const GigDetailsModal = ({ gig, onClose }) => {
  if (!gig) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Gig Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiXCircle className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{gig.title}</h2>
              <div className="flex items-center space-x-4 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(gig.status)}`}>
                  {gig.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getUrgencyColor(gig.urgency)}`}>
                  {gig.urgency.toUpperCase()}
                </span>
              </div>
            </div>
            
            {/* Description */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-line">{gig.description}</p>
              </div>
            </div>
            
            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Budget & Timeline</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Budget:</span>
                      <span className="font-medium">{gig.budget?.toLocaleString()} {gig.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Timeline:</span>
                      <span className="font-medium">{gig.timeline} {gig.timelineUnit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">{gig.projectCategory?.name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Client Information</h5>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <FiUser className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{gig.createdBy?.name || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{gig.createdBy?.email || ''}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Skills Required</h5>
                  <div className="flex flex-wrap gap-2">
                    {gig.skillsRequired?.map((skill, index) => (
                      <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                        {skill}
                      </span>
                    )) || <span className="text-gray-500">No skills specified</span>}
                  </div>
                </div>
                
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Deliverables</h5>
                  <ul className="list-disc list-inside space-y-1">
                    {gig.deliverables?.map((item, index) => (
                      <li key={index} className="text-gray-700">{item}</li>
                    )) || <li className="text-gray-500">No deliverables specified</li>}
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Visibility</p>
                <p className="font-medium">{gig.visibility || 'public'}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium">{format(new Date(gig.createdAt), 'MMM d, yyyy HH:mm')}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">{format(new Date(gig.updatedAt), 'MMM d, yyyy HH:mm')}</p>
              </div>
            </div>
            
            {/* Bids Section */}
            {gig.bids && gig.bids.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Bids ({gig.bids.length})</h4>
                <div className="space-y-3">
                  {gig.bids.slice(0, 3).map((bid, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">${bid.price}</p>
                          <p className="text-sm text-gray-500">Delivery: {bid.deliveryTime} {bid.deliveryTimeUnit}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          bid.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {bid.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {gig.bids.length > 3 && (
                    <p className="text-center text-gray-500">+ {gig.bids.length - 3} more bids</p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Delete Confirmation Modal (reuse from CategoriesManagement)
const DeleteConfirmationModal = ({ type, itemToDelete, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <FiTrash2 className="h-6 w-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
          </div>
          
          <p className="text-gray-600 mb-6">
            {itemToDelete.type === 'single'
              ? `Are you sure you want to delete this ${type}? This action cannot be undone.`
              : `Are you sure you want to delete ${itemToDelete.ids.length} ${type}s? This action cannot be undone.`}
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getStatusColor = (status) => {
  const colors = {
    open: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    assigned: 'bg-purple-100 text-purple-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    closed: 'bg-yellow-100 text-yellow-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getUrgencyColor = (urgency) => {
  const colors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };
  return colors[urgency] || 'bg-gray-100 text-gray-800';
};

export default GigsManagement;