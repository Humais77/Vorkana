import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
  useAdminGigs, 
  useCreateGig, 
  useUpdateGig, 
  useDeleteGig,
  useBulkGigOperations,
  useCategoriesForDropdown,
  useUsersForDropdown, 
  useExportGigs, 
  useGigStats
} from '../../../hooks/useAdminDashboard';
import { useGigToast } from '../../../hooks/useGigToast';
import {
  FiBriefcase,
  FiDownload,
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
  FiDollarSign,
  FiClock,
  FiUser,
  FiMoreVertical,
  FiChevronDown,
  FiChevronUp,
  FiUnlock,
  FiX,
  FiLoader
} from 'react-icons/fi';
import { format } from 'date-fns';
import GigViewModal from './GigViewModal';
import GigEditModal from './GigEditModal';
import GigDeleteModal from './GigDeleteModal';

// Memoized table row to prevent unnecessary re-renders
const GigTableRow = memo(({ 
  gig, 
  isExpanded, 
  isSelected, 
  onToggleExpand, 
  onToggleSelect, 
  onView, 
  onEdit, 
  onDelete,
  onOpenActionMenu,
  actionMenuId,
  isUpdatingId,
  isDeletingId
}) => {
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

  const isUpdating = isUpdatingId === gig._id;
  const isDeleting = isDeletingId === gig._id;

  return (
    <React.Fragment>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(gig._id)}
            disabled={isDeleting}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
          />
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => !isDeleting && onToggleExpand(gig._id)}
              disabled={isDeleting}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              {isExpanded ? (
                <FiChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <FiChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <div>
              <div className="flex items-center space-x-2">
                {isUpdating && (
                  <FiLoader className="h-3 w-3 animate-spin text-blue-500" />
                )}
                <div className="text-sm font-medium text-gray-900">{gig.title}</div>
                {isDeleting && (
                  <span className="text-xs text-red-500">Deleting...</span>
                )}
              </div>
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
              onClick={() => !isDeleting && onView(gig)}
              disabled={isDeleting}
              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => !isDeleting && onEdit(gig)}
              disabled={isDeleting || isUpdating}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
              title="Edit Gig"
            >
              {isUpdating ? (
                <FiLoader className="h-4 w-4 animate-spin text-blue-500" />
              ) : (
                <FiEdit2 className="h-4 w-4" />
              )}
            </button>
            
            {/* 3-dot menu */}
            <div className="relative">
              <button
                onClick={() => !isDeleting && onOpenActionMenu(actionMenuId === gig._id ? null : gig._id)}
                disabled={isDeleting}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === gig._id && !isDeleting && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => onOpenActionMenu(null)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onDelete(gig);
                          onOpenActionMenu(null);
                        }}
                        disabled={isDeleting}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FiTrash2 className="h-4 w-4 mr-2" />
                        )}
                        {isDeleting ? 'Deleting...' : 'Delete Gig'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </td>
      </tr>
      
      {isExpanded && (
        <tr>
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
                <div className="text-xs font-semibold text-gray-500 uppercase">Skills</div>
                <div className="text-sm">
                  <div className="flex flex-wrap gap-1">
                    {gig.skillsRequired?.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-gray-100 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

GigTableRow.displayName = 'GigTableRow';

// Main Component
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedGig, setSelectedGig] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedGigs, setExpandedGigs] = useState([]);
  const [updatingGigId, setUpdatingGigId] = useState(null);
  const [deletingGigId, setDeletingGigId] = useState(null);

  const limit = 20;
  
  // Use React Query with proper caching
  const { 
    data, 
    isLoading, 
    refetch, 
    isRefetching 
  } = useAdminGigs({
    page,
    limit,
    search: searchTerm,
    ...filters,
    populateSubcategories: true
  });
  
  const updateGigMutation = useUpdateGig();
  const deleteGigMutation = useDeleteGig();
  const bulkOperationsMutation = useBulkGigOperations();
  const { data: categoriesData } = useCategoriesForDropdown();
  const { data: usersData } = useUsersForDropdown();
  const exportGigsMutation = useExportGigs();
  const { data: gigStatsData } = useGigStats();
  
  // Use custom toast hook
  const {
    showGigLoading,
    showGigSuccess,
    showGigError,
    showGigWarning,
    showGigInfo,
    dismissGigToast
  } = useGigToast();

  const gigs = useMemo(() => {
    if (!data?.data) return [];
    
    return data.data.map(gig => ({
      ...gig,
      subcategory: gig.subcategory?._id ? {
        _id: gig.subcategory._id,
        name: gig.subcategory.name,
        description: gig.subcategory.description
      } : null
    }));
  }, [data]);
  
  const pagination = data?.pagination || { total: 0, totalPages: 1 };
  const categories = categoriesData?.data || [];
  const users = usersData?.data || [];

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPage(1);
        refetch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, refetch]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setPage(1);
    refetch();
  }, [refetch]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleBulkAction = useCallback(async (action) => {
    if (selectedGigs.length === 0) {
      showGigWarning('Please select gigs first');
      return;
    }

    const loadingToastId = showGigLoading(`Processing ${selectedGigs.length} gigs...`);

    try {
      await bulkOperationsMutation.mutateAsync({
        ids: selectedGigs,
        operation: action
      });
      
      setSelectedGigs([]);
      refetch();
      dismissGigToast(loadingToastId);
      showGigSuccess(`${selectedGigs.length} gigs ${action}ed successfully`);
    } catch (error) {
      dismissGigToast(loadingToastId);
      const errorMessage = error.response?.data?.message || 'Failed to perform bulk action';
      const validationErrors = error.response?.data?.errors;
      
      if (validationErrors) {
        validationErrors.forEach(err => showGigError(err));
      } else {
        showGigError(errorMessage);
      }
    }
  }, [selectedGigs, bulkOperationsMutation, refetch, showGigLoading, showGigSuccess, showGigError, showGigWarning, dismissGigToast]);

  const handleSaveGig = useCallback(async (gigData) => {
    if (!selectedGig) return;
    
    const loadingToastId = showGigLoading('Updating gig...');

    try {
      setUpdatingGigId(selectedGig._id);
      await updateGigMutation.mutateAsync({
        id: selectedGig._id,
        data: gigData
      });
      
      dismissGigToast(loadingToastId);
      showGigSuccess('Gig updated successfully');
      setShowEditModal(false);
      setSelectedGig(null);
      setUpdatingGigId(null);
      refetch();
    } catch (error) {
      dismissGigToast(loadingToastId);
      setUpdatingGigId(null);
      throw error;
    }
  }, [selectedGig, updateGigMutation, refetch, showGigLoading, showGigSuccess, dismissGigToast]);

  const handleDeleteGig = useCallback(async (deleteOptions) => {
    const loadingToastId = showGigLoading('Deleting gig...');
    
    try {
      setDeletingGigId(deleteOptions.id);
      await deleteGigMutation.mutateAsync(deleteOptions);
      
      dismissGigToast(loadingToastId);
      showGigSuccess('Gig deleted successfully');
      setShowDeleteModal(false);
      setSelectedGig(null);
      setDeletingGigId(null);
      refetch();
    } catch (error) {
      dismissGigToast(loadingToastId);
      setDeletingGigId(null);
      throw error;
    }
  }, [deleteGigMutation, refetch, showGigLoading, showGigSuccess, dismissGigToast]);

  const toggleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      setSelectedGigs(gigs.map(gig => gig._id));
    } else {
      setSelectedGigs([]);
    }
  }, [gigs]);

  const toggleSelectGig = useCallback((gigId) => {
    setSelectedGigs(prev =>
      prev.includes(gigId)
        ? prev.filter(id => id !== gigId)
        : [...prev, gigId]
    );
  }, []);

  const toggleExpandGig = useCallback((gigId) => {
    setExpandedGigs(prev =>
      prev.includes(gigId)
        ? prev.filter(id => id !== gigId)
        : [...prev, gigId]
    );
  }, []);

  const handleEdit = useCallback((gig) => {
    setSelectedGig(gig);
    setShowEditModal(true);
  }, []);

  const handleView = useCallback((gig) => {
    setSelectedGig(gig);
    setShowViewModal(true);
  }, []);

  const handleDelete = useCallback((gig) => {
    setSelectedGig(gig);
    setShowDeleteModal(true);
  }, []);

  const exportGigs = useCallback(async () => {
    const loadingToastId = showGigLoading('Exporting gigs...');
    
    try {
      const response = await exportGigsMutation.mutateAsync('csv');
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gigs_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      dismissGigToast(loadingToastId);
      showGigSuccess('Gigs exported successfully');
    } catch (error) {
      dismissGigToast(loadingToastId);
      showGigError('Failed to export gigs');
    }
  }, [exportGigsMutation, showGigLoading, showGigSuccess, showGigError, dismissGigToast]);

  const refreshData = useCallback(() => {
    refetch();
    setSelectedGigs([]);
    setExpandedGigs([]);
    showGigSuccess('Data refreshed');
  }, [refetch, showGigSuccess]);

  // Memoized stats calculation
  const stats = useMemo(() => {
    const gigStats = gigStatsData?.data?.overview?.[0] || {};
    
    return {
      total: gigStats.totalGigs || pagination.total || gigs.length,
      open: gigStats.openGigs || gigs.filter(g => g.status === 'open').length,
      inProgress: gigStats.inProgressGigs || gigs.filter(g => g.status === 'in_progress').length,
      completed: gigStats.completedGigs || gigs.filter(g => g.status === 'completed').length,
      totalBudget: gigStats.totalBudget || gigs.reduce((sum, g) => sum + (g.budget || 0), 0),
      avgBudget: gigStats.avgBudget || (gigs.length > 0 ? gigs.reduce((sum, g) => sum + (g.budget || 0), 0) / gigs.length : 0),
      totalBids: gigStats.totalBids || gigs.reduce((sum, g) => sum + (g.bids?.length || 0), 0),
      avgBidsPerGig: gigStats.avgBidsPerGig || (gigs.length > 0 ? gigs.reduce((sum, g) => sum + (g.bids?.length || 0), 0) / gigs.length : 0)
    };
  }, [gigs, pagination.total, gigStatsData]);

  // Loading states
  const isUpdating = updateGigMutation.isLoading;
  const isDeleting = deleteGigMutation.isLoading;
  const isBulkOperating = bulkOperationsMutation.isLoading;
  const isExporting = exportGigsMutation.isLoading;

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
            onClick={exportGigs}
            disabled={isExporting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <FiLoader className="h-4 w-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FiDownload className="h-4 w-4" />
                <span>Export</span>
              </>
            )}
          </button>

          <button
            onClick={refreshData}
            disabled={isRefetching || isBulkOperating}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
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
                disabled={isBulkOperating}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 flex items-center space-x-1 disabled:opacity-50"
              >
                {isBulkOperating ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle className="h-4 w-4" />
                    <span>Open</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleBulkAction('pause')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200 flex items-center space-x-1 disabled:opacity-50"
              >
                {isBulkOperating ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiXCircle className="h-4 w-4" />
                    <span>Close</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 flex items-center space-x-1 disabled:opacity-50"
              >
                {isBulkOperating ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </>
                )}
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
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setPage(1);
                    refetch();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            disabled={isBulkOperating}
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <FiFilter className="h-4 w-4" />
            <span className="hidden md:inline">Filters</span>
          </button>
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
                    disabled={isBulkOperating}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
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
              {gigs.map((gig) => (
                <GigTableRow
                  key={gig._id}
                  gig={gig}
                  isExpanded={expandedGigs.includes(gig._id)}
                  isSelected={selectedGigs.includes(gig._id)}
                  onToggleExpand={toggleExpandGig}
                  onToggleSelect={toggleSelectGig}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onOpenActionMenu={setActionMenu}
                  actionMenuId={actionMenu}
                  isUpdatingId={updatingGigId}
                  isDeletingId={deletingGigId}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {gigs.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FiBriefcase className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No gigs found</h3>
            <p className="mt-2 text-gray-500">Try adjusting your search or filters</p>
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
                  disabled={page === 1 || isBulkOperating}
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
                        disabled={isBulkOperating}
                        className={`px-3 py-1.5 rounded-md text-sm ${
                          page === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        } disabled:opacity-50`}
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
                        disabled={isBulkOperating}
                        className={`px-3 py-1.5 rounded-md text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50`}
                      >
                        {pagination.totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages || isBulkOperating}
                  className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <FiChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && selectedGig && (
        <GigEditModal
          gig={selectedGig}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedGig(null);
          }}
          onSave={handleSaveGig}
          categories={categories}
          users={users}
          loading={isUpdating}
          error={updateGigMutation.error}
        />
      )}
      
      {showViewModal && selectedGig && (
        <GigViewModal
          gig={selectedGig}
          onClose={() => {
            setShowViewModal(false);
            setSelectedGig(null);
          }}
        />
      )}
      
      {showDeleteModal && selectedGig && (
        <GigDeleteModal
          gig={selectedGig}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedGig(null);
          }}
          onDelete={handleDeleteGig}
          loading={isDeleting}
          error={deleteGigMutation.error}
        />
      )}
    </div>
  );
};

export default GigsManagement;