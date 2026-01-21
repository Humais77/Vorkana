// GigManagement.jsx - Professional UI Update
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
  useGigs,
  useUpdateGig,
  useDeleteGig,
  useDeleteMultipleGigs,
  useUpdateMultipleGigsStatus,
  useGigStats,
  useExportGigs
} from '../../../hooks/useGigs';
import { useCategoriesForDropdown, useUsersForDropdown } from '../../../hooks/useAdminDashboard';
import { useGigToast } from '../../../hooks/useGigToast';
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
  FiDollarSign,
  FiClock,
  FiUser,
  FiMoreVertical,
  FiX,
  FiLoader,
  FiUnlock,
  FiLock,
  FiDownload,
  FiTrendingUp,
  FiUsers,
  FiAlertCircle
} from 'react-icons/fi';
import { format } from 'date-fns';
import GigEditModal from './GigEditModal';
import GigViewModal from './GigViewModal';
import GigDeleteModal from './GigDeleteModal';

// Gig Table Row Component
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
      open: 'bg-green-100 text-green-700 border border-green-200',
      in_progress: 'bg-blue-100 text-blue-700 border border-blue-200',
      assigned: 'bg-purple-100 text-purple-700 border border-purple-200',
      completed: 'bg-gray-100 text-gray-700 border border-gray-200',
      cancelled: 'bg-red-100 text-red-700 border border-red-200',
      closed: 'bg-yellow-100 text-yellow-700 border border-yellow-200'
    };
    return colors[status] || colors.open;
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700 border border-gray-200',
      medium: 'bg-blue-100 text-blue-700 border border-blue-200',
      high: 'bg-orange-100 text-orange-700 border border-orange-200',
      urgent: 'bg-red-100 text-red-700 border border-red-200'
    };
    return colors[urgency] || colors.low;
  };

  const isUpdating = isUpdatingId === gig._id;
  const isDeleting = isDeletingId === gig._id;

  return (
    <React.Fragment>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(gig._id)}
            disabled={isDeleting}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center">
            <button
              onClick={() => !isDeleting && onToggleExpand(gig._id)}
              disabled={isDeleting}
              className="p-1 hover:bg-gray-100 rounded mr-3 disabled:opacity-50"
            >
              {isExpanded ? (
                <FiChevronLeft className="h-4 w-4 text-gray-500 rotate-270" />
              ) : (
                <FiChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <div>
              <div className="flex items-center gap-2">
                {isUpdating && (
                  <FiLoader className="h-3 w-3 animate-spin text-blue-500" />
                )}
                <p className="text-sm font-medium text-gray-900">{gig.title}</p>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {gig.projectCategory?.name || 'No category'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                By {gig.createdBy?.name || 'Unknown'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(gig.status)}`}>
              {gig.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(gig.urgency)}`}>
              {gig.urgency.toUpperCase()}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">
            <div className="flex items-center gap-1">
              <FiDollarSign className="h-4 w-4 text-gray-400" />
              <span className="font-medium">
                ${(gig.budget || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <FiClock className="h-3 w-3 inline mr-1" />
              {gig.timeline || 0} {gig.timelineUnit || 'days'}
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
              <FiUser className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-medium">{gig.createdBy?.name || 'Unknown'}</div>
              <div className="text-xs text-gray-500">{gig.createdBy?.email || ''}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-500">
            {gig.createdAt ? format(new Date(gig.createdAt), 'MMM d, yyyy') : 'N/A'}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => !isDeleting && onView(gig)}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => !isDeleting && onEdit(gig)}
              disabled={isDeleting || isUpdating}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Gig"
            >
              {isUpdating ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                <FiEdit2 className="h-4 w-4" />
              )}
            </button>
            
            <div className="relative">
              <button
                onClick={() => !isDeleting && onOpenActionMenu(actionMenuId === gig._id ? null : gig._id)}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === gig._id && !isDeleting && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => onOpenActionMenu(null)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Quick Actions
                    </div>
                    <div className="py-1">
                      {gig.status === 'open' ? (
                        <button
                          onClick={() => {
                            onOpenActionMenu(null);
                            // Handle close gig
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FiLock className="h-4 w-4 mr-3" />
                          Close Gig
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onOpenActionMenu(null);
                            // Handle open gig
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FiUnlock className="h-4 w-4 mr-3" />
                          Open Gig
                        </button>
                      )}
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button
                        onClick={() => {
                          onDelete(gig);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4 mr-3" />
                        Delete Gig
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
          <td colSpan="7" className="px-6 py-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-gray-700">
                  {gig.description?.substring(0, 150) || 'No description'}
                  {gig.description?.length > 150 && '...'}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FiUsers className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{gig.bids?.length || 0} bids</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Visibility:</span> {gig.visibility}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {gig.skillsRequired?.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs bg-gray-100 rounded border border-gray-200">
                      {skill}
                    </span>
                  ))}
                  {(!gig.skillsRequired || gig.skillsRequired.length === 0) && (
                    <span className="text-sm text-gray-400">No skills specified</span>
                  )}
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGig, setSelectedGig] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedGigs, setExpandedGigs] = useState([]);
  const [updatingGigId, setUpdatingGigId] = useState(null);
  const [deletingGigId, setDeletingGigId] = useState(null);

  const limit = 20;
  
  const { 
    data, 
    isLoading, 
    refetch, 
    isRefetching 
  } = useGigs({
    page,
    limit,
    search: searchTerm,
    ...filters,
    admin: true,
    includeDeleted: true
  });
  
  const updateGigMutation = useUpdateGig();
  const deleteGigMutation = useDeleteGig();
  const deleteMultipleMutation = useDeleteMultipleGigs();
  const updateStatusMutation = useUpdateMultipleGigsStatus();
  const exportGigsMutation = useExportGigs();
  const { data: gigStatsData } = useGigStats();
  
  const { data: categoriesData } = useCategoriesForDropdown();
  const { data: usersData } = useUsersForDropdown();
  
  const {
    showGigLoading,
    showGigSuccess,
    showGigError,
    showGigWarning,
    dismissGigToast
  } = useGigToast();

  const gigs = useMemo(() => {
    if (!data?.data) return [];
    return data.data;
  }, [data]);
  
  const pagination = data?.pagination || { total: 0, totalPages: 1 };
  const categories = categoriesData?.data || [];
  const users = usersData?.data || [];

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
      if (action === 'delete') {
        await deleteMultipleMutation.mutateAsync(selectedGigs);
      } else if (action === 'open') {
        await updateStatusMutation.mutateAsync({
          ids: selectedGigs,
          status: 'open'
        });
      } else if (action === 'close') {
        await updateStatusMutation.mutateAsync({
          ids: selectedGigs,
          status: 'closed'
        });
      }
      
      setSelectedGigs([]);
      refetch();
      dismissGigToast(loadingToastId);
      showGigSuccess(`${selectedGigs.length} gigs updated successfully`);
    } catch (error) {
      dismissGigToast(loadingToastId);
      showGigError(error.response?.data?.message || 'Failed to perform bulk action');
    }
  }, [selectedGigs, deleteMultipleMutation, updateStatusMutation, refetch, showGigLoading, showGigSuccess, showGigError, showGigWarning, dismissGigToast]);

  const handleUpdateGig = useCallback(async (gigData) => {
    if (!selectedGig) return;
    
    const loadingToastId = showGigLoading('Updating gig...');
    setUpdatingGigId(selectedGig._id);
    
    try {
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
      showGigError(error.response?.data?.message || 'Failed to update gig');
      throw error;
    }
  }, [selectedGig, updateGigMutation, refetch, showGigLoading, showGigSuccess, showGigError, dismissGigToast]);

  const handleDeleteGig = useCallback(async (deleteOptions) => {
    const loadingToastId = showGigLoading('Deleting gig...');
    setDeletingGigId(deleteOptions.id);
    
    try {
      await deleteGigMutation.mutateAsync({
        id: deleteOptions.id,
        options: {
          permanent: deleteOptions.permanent || false,
          force: deleteOptions.force || false
        }
      });
      
      dismissGigToast(loadingToastId);
      showGigSuccess('Gig deleted successfully');
      setShowDeleteModal(false);
      setSelectedGig(null);
      setDeletingGigId(null);
      refetch();
    } catch (error) {
      dismissGigToast(loadingToastId);
      setDeletingGigId(null);
      showGigError(error.response?.data?.message || 'Failed to delete gig');
      throw error;
    }
  }, [deleteGigMutation, refetch, showGigLoading, showGigSuccess, showGigError, dismissGigToast]);

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
    setShowDetailsModal(true);
  }, []);

  const handleDelete = useCallback((gig) => {
    setSelectedGig(gig);
    setShowDeleteModal(true);
  }, []);

  const refreshData = useCallback(() => {
    refetch();
    setSelectedGigs([]);
    setExpandedGigs([]);
    showGigSuccess('Data refreshed');
  }, [refetch, showGigSuccess]);

  const exportGigs = useCallback(async () => {
    const loadingToastId = showGigLoading('Exporting gigs...');
    
    try {
      const response = await exportGigsMutation.mutateAsync({
        format: 'csv',
        filters: filters,
        search: searchTerm
      });
      
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
  }, [exportGigsMutation, filters, searchTerm, showGigLoading, showGigSuccess, showGigError, dismissGigToast]);

  const stats = useMemo(() => {
    const gigStats = gigStatsData?.data?.overview?.[0] || {};
    
    return {
      total: pagination.total || gigs.length,
      open: gigStats.openGigs || gigs.filter(g => g.status === 'open').length,
      inProgress: gigStats.inProgressGigs || gigs.filter(g => g.status === 'in_progress').length,
      completed: gigStats.completedGigs || gigs.filter(g => g.status === 'completed').length,
      totalBudget: gigStats.totalBudget || gigs.reduce((sum, g) => sum + (g.budget || 0), 0),
      avgBudget: gigStats.avgBudget || (gigs.length > 0 ? gigs.reduce((sum, g) => sum + (g.budget || 0), 0) / gigs.length : 0),
      totalBids: gigStats.totalBids || gigs.reduce((sum, g) => sum + (g.bids?.length || 0), 0)
    };
  }, [gigs, pagination.total, gigStatsData]);

  const isUpdating = updateGigMutation.isLoading;
  const isDeleting = deleteGigMutation.isLoading;
  const isDeletingMultiple = deleteMultipleMutation.isLoading;
  const isUpdatingStatus = updateStatusMutation.isLoading;
  const isExporting = exportGigsMutation.isLoading;
  const isBulkOperating = isDeletingMultiple || isUpdatingStatus;
  const isTableLoading = isLoading || isRefetching;

  if (isTableLoading && !gigs.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading gigs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gig Management</h1>
          <p className="text-gray-600 mt-1">Manage projects and freelance opportunities</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportGigs}
            disabled={isExporting || isTableLoading}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {isExporting ? (
              <>
                <FiLoader className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FiDownload className="h-4 w-4" />
                Export
              </>
            )}
          </button>
          <button
            onClick={refreshData}
            disabled={isRefetching || isBulkOperating || isTableLoading}
            className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => window.open('/admin/gig/create', '_blank')}
            className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <FiPlus className="h-4 w-4" />
            Create Gig
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Gigs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FiBriefcase className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Gigs</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.open}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FiUnlock className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiClock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                ${(stats.totalBudget || 0).toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiDollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedGigs.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiBriefcase className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-indigo-900">
                  {selectedGigs.length} gig{selectedGigs.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-indigo-600">Choose an action to perform</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction('open')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiCheckCircle className="h-4 w-4" />
                Open
              </button>
              <button
                onClick={() => handleBulkAction('close')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiXCircle className="h-4 w-4" />
                Close
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
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
                placeholder="Search gigs by title, description, or skills..."
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
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            disabled={isBulkOperating}
            className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            <FiFilter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minBudget}
                  onChange={(e) => handleFilterChange('minBudget', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxBudget}
                  onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedGigs.length === gigs.length && gigs.length > 0}
                    onChange={toggleSelectAll}
                    disabled={isBulkOperating}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Gig Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status & Urgency
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Budget & Timeline
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
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
        {gigs.length === 0 && !isTableLoading && (
          <div className="text-center py-16">
            <FiBriefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No gigs found</h3>
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
                <span className="font-medium">{pagination.total}</span> gigs
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isBulkOperating}
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
                        disabled={isBulkOperating}
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
                  disabled={page === pagination.totalPages || isBulkOperating}
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
      {showEditModal && selectedGig && (
        <GigEditModal
          gig={selectedGig}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedGig(null);
          }}
          onSave={handleUpdateGig}
          categories={categories}
          users={users}
          loading={isUpdating}
        />
      )}
      
      {showDetailsModal && selectedGig && (
        <GigViewModal
          gig={selectedGig}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedGig(null);
          }}
          onEdit={handleEdit}
          onDelete={handleDelete}
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
        />
      )}
    </div>
  );
};

export default GigsManagement;