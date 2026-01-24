// GigsManagement.jsx - Professional UI Update with All Fixes
import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
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
  FiAlertCircle,
  FiPercent,
  FiActivity,
  FiCalendar,
  FiTarget,
  FiBarChart2,
  FiPackage,
  FiMessageSquare,
  FiStar,
  FiHeart
} from 'react-icons/fi';
import { format, subDays } from 'date-fns';
import GigEditModal from './GigEditModal';
import GigViewModal from './GigViewModal';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

// Stat Card Component
const StatCard = memo(({ title, value, icon: Icon, color, trend, subtitle, loading }) => {
  const getColorClasses = (color) => {
    const colors = {
      indigo: 'bg-indigo-100 text-indigo-600',
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      gray: 'bg-gray-100 text-gray-600'
    };
    return colors[color] || colors.indigo;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="flex items-start justify-between h-full">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 mb-1 truncate">{title}</p>
          <div className="flex items-baseline gap-2 mb-1">
            {loading ? (
              <div className="h-7 w-20 bg-gray-100 rounded animate-pulse"></div>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
                {trend && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${trend.value > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                  </span>
                )}
              </>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 ${getColorClasses(color)}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

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
  isDeletingId,
  containerRef
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
  const actionMenuRef = useRef(null);

  // Handle action menu position
  const getActionMenuPosition = () => {
    if (!actionMenuRef.current || !containerRef.current) return {};
    
    const menuRect = actionMenuRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const rowRect = actionMenuRef.current.closest('tr').getBoundingClientRect();
    
    // Check if menu would overflow bottom
    const spaceBelow = containerRect.bottom - rowRect.bottom;
    const menuHeight = 200; // Approximate menu height
    
    if (spaceBelow < menuHeight && rowRect.top > menuHeight) {
      // Position above if there's not enough space below
      return { bottom: '100%', top: 'auto' };
    }
    
    // Default position below
    return { top: '100%', bottom: 'auto' };
  };

  const actionMenuStyle = actionMenuId === gig._id ? getActionMenuPosition() : {};

  return (
    <React.Fragment>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(gig._id)}
              disabled={isDeleting}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => !isDeleting && onToggleExpand(gig._id)}
              disabled={isDeleting}
              className="p-1 hover:bg-gray-100 rounded mr-2 flex-shrink-0 disabled:opacity-50"
            >
              {isExpanded ? (
                <FiChevronLeft className="h-4 w-4 text-gray-500 rotate-270" />
              ) : (
                <FiChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isUpdating && (
                  <FiLoader className="h-3 w-3 animate-spin text-blue-500 flex-shrink-0" />
                )}
                <p className="text-sm font-medium text-gray-900 truncate">{gig.title}</p>
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {gig.projectCategory?.name || 'No category'}
              </div>
              <div className="text-xs text-gray-400 truncate mt-0.5">
                By {gig.createdBy?.name || 'Unknown'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(gig.status)} truncate`}>
              {gig.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(gig.urgency)} truncate`}>
              {gig.urgency.toUpperCase()}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-gray-900">
            <div className="flex items-center gap-1">
              <FiDollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="font-medium truncate">
                ${(gig.budget || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 truncate mt-0.5">
              <FiClock className="h-3 w-3 inline mr-1 flex-shrink-0" />
              {gig.timeline || 0} {gig.timelineUnit || 'days'}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FiUser className="h-3.5 w-3.5 text-gray-600" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{gig.createdBy?.name || 'Unknown'}</div>
              <div className="text-xs text-gray-500 truncate">{gig.createdBy?.email || ''}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-gray-500 truncate">
            {gig.createdAt ? format(new Date(gig.createdAt), 'MMM d, yyyy') : 'N/A'}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1" ref={actionMenuRef}>
            <button
              onClick={() => !isDeleting && onView(gig)}
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => !isDeleting && onEdit(gig)}
              disabled={isDeleting || isUpdating}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
              title="Edit Gig"
            >
              {isUpdating ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                <FiEdit2 className="h-4 w-4" />
              )}
            </button>
            
            <div className="relative flex-shrink-0">
              <button
                onClick={() => !isDeleting && onOpenActionMenu(actionMenuId === gig._id ? null : gig._id)}
                disabled={isDeleting}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === gig._id && !isDeleting && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => onOpenActionMenu(null)}
                  />
                  <div 
                    className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
                    style={actionMenuStyle}
                  >
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Quick Actions
                    </div>
                    <div className="py-1">
                      {gig.status === 'open' ? (
                        <button
                          onClick={() => {
                            onOpenActionMenu(null);
                            // Handle close gig
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FiLock className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">Close Gig</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onOpenActionMenu(null);
                            // Handle open gig
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FiUnlock className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">Open Gig</span>
                        </button>
                      )}
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button
                        onClick={() => {
                          onDelete(gig);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Delete Gig</span>
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
          <td colSpan="7" className="px-4 py-3 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</h4>
                <div className="relative">
                  <p className="text-sm text-gray-700 line-clamp-3 pr-4">
                    {gig.description || 'No description available'}
                  </p>
                  {gig.description && gig.description.length > 150 && (
                    <div className="absolute bottom-0 right-0 bg-gradient-to-l from-gray-50 to-transparent pl-4">
                      <span className="text-xs text-gray-400">...</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Details</h4>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <FiUsers className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm truncate">{gig.bids?.length || 0} bids</span>
                  </div>
                  <div className="text-sm truncate">
                    <span className="text-gray-500">Visibility:</span> {gig.visibility}
                  </div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2 mb-1.5">Skills</h4>
                  <div className="flex flex-wrap gap-1">
                    {gig.skillsRequired?.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 rounded border border-gray-200 truncate">
                        {skill}
                      </span>
                    ))}
                    {(!gig.skillsRequired || gig.skillsRequired.length === 0) && (
                      <span className="text-sm text-gray-400">No skills specified</span>
                    )}
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
  const [searchInput, setSearchInput] = useState('');
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
  const [forceDelete, setForceDelete] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGig, setSelectedGig] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedGigs, setExpandedGigs] = useState([]);
  const [updatingGigId, setUpdatingGigId] = useState(null);
  const [deletingGigId, setDeletingGigId] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const searchTimeoutRef = useRef(null);
  const tableContainerRef = useRef(null);
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
  const { data: gigStatsData, isLoading: statsLoadingData } = useGigStats();
  
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

  // Handle manual search
  const handleSearch = useCallback((e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearchTerm(searchInput);
  }, [searchInput]);

  // Handle search input change without auto-search
  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearchTerm('');
    setPage(1);
  }, []);

  useEffect(() => {
    setStatsLoading(statsLoadingData);
  }, [statsLoadingData]);

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
      await deleteGigMutation.mutateAsync(deleteOptions);
      dismissGigToast(loadingToastId);
      showGigSuccess('Gig deleted successfully');
      setShowDeleteModal(false);
      setSelectedGig(null);
      setForceDelete(false);
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
    setForceDelete(false);
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

  // Calculate enhanced stats
  const stats = useMemo(() => {
    const gigStats = gigStatsData?.data?.overview?.[0] || {};
    const byStatus = gigStatsData?.data?.byStatus || [];
    const byCategory = gigStatsData?.data?.byCategory || [];
    const growth = gigStatsData?.data?.growth || [];
    
    // Calculate percentages
    const totalGigs = gigStats.totalGigs || gigs.length;
    const openGigs = gigStats.openGigs || gigs.filter(g => g.status === 'open').length;
    const inProgressGigs = gigStats.inProgressGigs || gigs.filter(g => g.status === 'in_progress').length;
    const completedGigs = gigStats.completedGigs || gigs.filter(g => g.status === 'completed').length;
    const avgBudget = gigStats.avgBudget || (gigs.length > 0 ? gigs.reduce((sum, g) => sum + (g.budget || 0), 0) / gigs.length : 0);
    
    // Calculate completion rate
    const completionRate = totalGigs > 0 ? ((completedGigs / totalGigs) * 100) : 0;
    
    // Calculate average timeline
    const avgTimeline = gigs.length > 0 ? 
      gigs.reduce((sum, g) => sum + (g.timeline || 0), 0) / gigs.length : 0;
    
    // Calculate urgency distribution
    const urgencyCounts = {
      urgent: gigs.filter(g => g.urgency === 'urgent').length,
      high: gigs.filter(g => g.urgency === 'high').length,
      medium: gigs.filter(g => g.urgency === 'medium').length,
      low: gigs.filter(g => g.urgency === 'low').length
    };
    
    // Calculate recent growth (last 7 days)
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentGigs = gigs.filter(g => new Date(g.createdAt) >= sevenDaysAgo).length;
    const growthRate = totalGigs > 0 ? ((recentGigs / totalGigs) * 100) : 0;
    
    return {
      // Overview stats
      total: totalGigs,
      open: openGigs,
      inProgress: inProgressGigs,
      completed: completedGigs,
      cancelled: gigStats.cancelledGigs || gigs.filter(g => g.status === 'cancelled').length,
      assigned: gigStats.assignedGigs || gigs.filter(g => g.status === 'assigned').length,
      closed: gigStats.closedGigs || gigs.filter(g => g.status === 'closed').length,
      
      // Financial stats
      totalBudget: gigStats.totalBudget || gigs.reduce((sum, g) => sum + (g.budget || 0), 0),
      avgBudget: avgBudget,
      maxBudget: gigStats.maxBudget || Math.max(...gigs.map(g => g.budget || 0), 0),
      minBudget: gigStats.minBudget || Math.min(...gigs.map(g => g.budget || 0), 0),
      
      // Performance stats
      completionRate: completionRate.toFixed(1),
      avgTimeline: avgTimeline.toFixed(1),
      totalBids: gigStats.totalBids || gigs.reduce((sum, g) => sum + (g.bids?.length || 0), 0),
      avgBids: gigs.length > 0 ? gigs.reduce((sum, g) => sum + (g.bids?.length || 0), 0) / gigs.length : 0,
      
      // Urgency stats
      urgentGigs: urgencyCounts.urgent,
      highUrgencyGigs: urgencyCounts.high,
      mediumUrgencyGigs: urgencyCounts.medium,
      lowUrgencyGigs: urgencyCounts.low,
      
      // Growth stats
      recentGrowth: recentGigs,
      growthRate: growthRate.toFixed(1),
      monthlyGrowth: growth.length,
      
      // Category stats
      topCategory: byCategory[0] || null,
      categoriesWithGigs: byCategory.length
    };
  }, [gigs, gigStatsData]);

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Gig Management</h1>
          <p className="text-gray-600 text-sm mt-0.5">Manage projects and freelance opportunities</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportGigs}
            disabled={isExporting || isTableLoading}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {isExporting ? (
              <>
                <FiLoader className="h-3.5 w-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <FiDownload className="h-3.5 w-3.5" />
                <span>Export</span>
              </>
            )}
          </button>
          <button
            onClick={refreshData}
            disabled={isRefetching || isBulkOperating || isTableLoading}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => window.open('/admin/gig/create', '_blank')}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <FiPlus className="h-3.5 w-3.5" />
            <span>Create Gig</span>
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Gigs"
          value={stats.total?.toLocaleString() || '0'}
          icon={FiBriefcase}
          color="indigo"
          subtitle={`${stats.open} open`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Open Gigs"
          value={stats.open?.toLocaleString() || '0'}
          icon={FiUnlock}
          color="green"
          subtitle={`${stats.urgentGigs} urgent`}
          loading={statsLoading}
        />
        
        <StatCard
          title="In Progress"
          value={stats.inProgress?.toLocaleString() || '0'}
          icon={FiActivity}
          color="blue"
          subtitle={`${stats.assigned} assigned`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Completed"
          value={stats.completed?.toLocaleString() || '0'}
          icon={FiCheckCircle}
          color="gray"
          subtitle={`${stats.completionRate}% rate`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Total Budget"
          value={`$${(stats.totalBudget || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={FiDollarSign}
          color="purple"
          subtitle={`Avg: $${(stats.avgBudget || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Avg Timeline"
          value={`${stats.avgTimeline || 0}d`}
          icon={FiClock}
          color="orange"
          subtitle={`${stats.totalBids || 0} bids`}
          loading={statsLoading}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Cancelled"
          value={stats.cancelled?.toLocaleString() || '0'}
          icon={FiXCircle}
          color="red"
          subtitle={`${((stats.cancelled / stats.total) * 100 || 0).toFixed(1)}%`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Recent Growth"
          value={stats.recentGrowth?.toLocaleString() || '0'}
          icon={FiTrendingUp}
          color="green"
          subtitle={`7d (${stats.growthRate}%)`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Categories"
          value={stats.categoriesWithGigs?.toLocaleString() || '0'}
          icon={FiPackage}
          color="blue"
          subtitle={stats.topCategory ? stats.topCategory._id : 'None'}
          loading={statsLoading}
        />
        
        <StatCard
          title="Avg Bids/Gig"
          value={stats.avgBids?.toFixed(1) || '0.0'}
          icon={FiUsers}
          color="purple"
          subtitle={`${stats.totalBids || 0} total`}
          loading={statsLoading}
        />
        
        <StatCard
          title="High Urgency"
          value={stats.highUrgencyGigs?.toLocaleString() || '0'}
          icon={FiAlertCircle}
          color="orange"
          subtitle={`${stats.urgentGigs} urgent`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Closed"
          value={stats.closed?.toLocaleString() || '0'}
          icon={FiLock}
          color="yellow"
          subtitle="Archived gigs"
          loading={statsLoading}
        />
      </div>

      {/* Bulk Actions */}
      {selectedGigs.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiBriefcase className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-indigo-900 text-sm">
                  {selectedGigs.length} gig{selectedGigs.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-indigo-600">Choose an action to perform</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleBulkAction('open')}
                disabled={isBulkOperating}
                className="px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <FiCheckCircle className="h-3.5 w-3.5" />
                Open
              </button>
              <button
                onClick={() => handleBulkAction('close')}
                disabled={isBulkOperating}
                className="px-2.5 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-200 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <FiXCircle className="h-3.5 w-3.5" />
                Close
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={isBulkOperating}
                className="px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <FiTrash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search gigs by title, description, or skills..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-24 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <FiX className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isTableLoading}
                  className="px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Search"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            disabled={isBulkOperating}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            <FiFilter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded text-sm bg-white"
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
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded text-sm bg-white"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Budget Range</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minBudget}
                  onChange={(e) => handleFilterChange('minBudget', e.target.value)}
                  className="w-full px-2.5 py-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxBudget}
                  onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
                  className="w-full px-2.5 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded text-sm bg-white"
              >
                <option value="createdAt">Date Created</option>
                <option value="budget">Budget</option>
                <option value="title">Title</option>
                <option value="updatedAt">Last Updated</option>
                <option value="timeline">Timeline</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Gigs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" ref={tableContainerRef}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedGigs.length === gigs.length && gigs.length > 0}
                      onChange={toggleSelectAll}
                      disabled={isBulkOperating}
                      className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                  Gig Details
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                  Status & Urgency
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                  Budget & Timeline
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[150px]">
                  Provider
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                  Created
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
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
                  containerRef={tableContainerRef}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {gigs.length === 0 && !isTableLoading && (
          <div className="text-center py-12">
            <FiBriefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="mt-2 text-base font-semibold text-gray-900">No gigs found</h3>
            <p className="mt-1 text-gray-500 text-sm max-w-md mx-auto">
              {searchTerm || Object.values(filters).some(v => v) 
                ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                : 'No gigs available. Create your first gig to get started.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-xs text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> gigs
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isBulkOperating}
                  className="px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 text-xs transition-colors"
                >
                  <FiChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
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
                        className={`px-2.5 py-1.5 rounded text-xs font-medium min-w-[36px] transition-colors ${
                          page === pageNum
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
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
                  className="px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 text-xs transition-colors"
                >
                  <span>Next</span>
                  <FiChevronRight className="h-3.5 w-3.5" />
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
        <DeleteConfirmationModal
          item={selectedGig}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedGig(null);
            setForceDelete(false);
          }}
          onDelete={handleDeleteGig}
          type="gig"
          loading={deleteGigMutation.isLoading || deletingGigId === selectedGig._id}
          dependencies={{
            bids: selectedGig.bids?.length || 0,
            messages: selectedGig.messages?.length || 0
          }}
          forceDelete={forceDelete}
          onForceDeleteChange={setForceDelete}
        />
      )}
    </div>
  );
};

export default GigsManagement;