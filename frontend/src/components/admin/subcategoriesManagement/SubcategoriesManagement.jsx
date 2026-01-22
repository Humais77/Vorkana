// SubcategoriesManagement.jsx - Professional UI Update
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
  useAdminSubcategories, 
  useUpdateSubcategory, 
  useCreateSubcategory, 
  useDeleteSubcategory,
  useBulkSubcategoryOperations,
  useCategoriesForDropdown,
  useExportSubcategories,
  useSubcategoryStats
} from '../../../hooks/useAdminDashboard';
import { useSubcategoryToast } from '../../../hooks/useSubcategoryToast';
import {
  FiFolder,
  FiTrendingUp,
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
  FiDownload,
  FiMoreVertical,
  FiX,
  FiLoader,
  FiGrid,
  FiHash,
  FiFolderPlus
} from 'react-icons/fi';
import { format } from 'date-fns';
import SubcategoryCreateModal from './SubcategoryCreateModal';
import SubcategoryEditModal from './SubcategoryEditModal';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import SubcategoryDetailsModal from './SubcategoryDetailsModal';

// Subcategory Table Row Component
const SubcategoryTableRow = memo(({ 
  subcategory, 
  isExpanded, 
  isSelected, 
  onToggleExpand, 
  onToggleSelect, 
  onView, 
  onEdit, 
  onDelete,
  onOpenActionMenu,
  actionMenuId,
  categoriesMap,
  isUpdatingId,
  isDeletingId
}) => {
  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-700 border border-green-200' 
      : 'bg-red-100 text-red-700 border border-red-200';
  };

  const isUpdating = isUpdatingId === subcategory._id;
  const isDeleting = isDeletingId === subcategory._id;
 const safeNumber = (value, defaultValue = 0) => {
    if (value === undefined || value === null) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : Math.max(0, num);
  };
  
  // Safely get services and gigs counts
  const servicesCount = safeNumber(subcategory.servicesCount);
  const gigsCount = safeNumber(subcategory.gigsCount);
  return (
    <React.Fragment>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(subcategory._id)}
            disabled={isDeleting}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center">
            <button
              onClick={() => !isDeleting && onToggleExpand(subcategory._id)}
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
                <p className="text-sm font-medium text-gray-900">{subcategory.name}</p>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center">
                <FiHash className="h-3 w-3 mr-1" />
                {subcategory.slug || 'no-slug'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Category: {categoriesMap[subcategory.category]?.name || 'N/A'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subcategory.isActive)}`}>
              {subcategory.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">
            <div className="flex items-center gap-1">
              <FiGrid className="h-3 w-3 text-gray-400" />
              <span>{servicesCount} services</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {gigsCount} gigs
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-500">
            {subcategory.createdAt ? format(new Date(subcategory.createdAt), 'MMM d, yyyy') : 'N/A'}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => !isDeleting && onView(subcategory)}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => !isDeleting && onEdit(subcategory)}
              disabled={isDeleting || isUpdating}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Subcategory"
            >
              {isUpdating ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                <FiEdit2 className="h-4 w-4" />
              )}
            </button>
            
            <div className="relative">
              <button
                onClick={() => !isDeleting && onOpenActionMenu(actionMenuId === subcategory._id ? null : subcategory._id)}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === subcategory._id && !isDeleting && (
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
                      <button
                        onClick={() => {
                          onDelete(subcategory);
                          onOpenActionMenu(null);
                        }}
                        disabled={isDeleting}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <FiTrash2 className="h-4 w-4 mr-3" />
                        Delete Subcategory
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
          <td colSpan="6" className="px-6 py-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-gray-700">{subcategory.description || 'No description provided'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Settings</h4>
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-gray-500">Order:</span> {subcategory.order || 0}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Category:</span> {categoriesMap[subcategory.category]?.name || 'N/A'}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Last Updated</h4>
                <p className="text-sm text-gray-700">
                  {subcategory.updatedAt ? format(new Date(subcategory.updatedAt), 'MMM d, yyyy HH:mm') : 'N/A'}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

SubcategoryTableRow.displayName = 'SubcategoryTableRow';

// Main Component
const SubcategoriesManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [page, setPage] = useState(1);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [showSubcategoryDetails, setShowSubcategoryDetails] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedSubcategories, setExpandedSubcategories] = useState([]);
  const [updatingSubcategoryId, setUpdatingSubcategoryId] = useState(null);
  const [deletingSubcategoryId, setDeletingSubcategoryId] = useState(null);

  const limit = 20;
  
  const { 
    data, 
    isLoading, 
    isFetching,
    refetch, 
    isRefetching
  } = useAdminSubcategories({
    page,
    limit,
    search: searchTerm,
    ...filters
  });
  
  const { data: categoriesData } = useCategoriesForDropdown();
  const categories = categoriesData?.data || [];
  
  const createSubcategoryMutation = useCreateSubcategory();
  const updateSubcategoryMutation = useUpdateSubcategory();
  const deleteSubcategoryMutation = useDeleteSubcategory();
  const bulkOperationsMutation = useBulkSubcategoryOperations();
  const exportSubcategoriesMutation = useExportSubcategories();
  const { data: statsData } = useSubcategoryStats();
const backendStats = statsData?.data?.overview || {};
  const subcategories = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  const {
    showSubcategoryLoading,
    showSubcategorySuccess,
    showSubcategoryError,
    showSubcategoryWarning,
    dismissSubcategoryToast
  } = useSubcategoryToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPage(1);
        refetch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, refetch]);

  const categoriesMap = useMemo(() => {
    return categories.reduce((map, cat) => {
      map[cat._id] = cat;
      return map;
    }, {});
  }, [categories]);

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
    if (selectedSubcategories.length === 0) {
      showSubcategoryWarning('Please select subcategories first');
      return;
    }

    const loadingToastId = showSubcategoryLoading(`Processing ${selectedSubcategories.length} subcategories...`);

    try {
      const bulkData = {
        ids: selectedSubcategories,
        operation: action
      };

      await bulkOperationsMutation.mutateAsync(bulkData);
      setSelectedSubcategories([]);
      refetch();
      dismissSubcategoryToast(loadingToastId);
      showSubcategorySuccess(`${selectedSubcategories.length} subcategories updated successfully`);
    } catch (error) {
      dismissSubcategoryToast(loadingToastId);
      showSubcategoryError(error.response?.data?.message || 'Failed to perform bulk action');
    }
  }, [selectedSubcategories, bulkOperationsMutation, refetch, showSubcategoryLoading, showSubcategorySuccess, showSubcategoryError, showSubcategoryWarning, dismissSubcategoryToast]);
// Utility functions
const safeNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : Math.max(0, num);
};

const formatNumber = (value) => {
  return safeNumber(value).toLocaleString('en-US');
};
  const handleUpdateSubcategory = useCallback(async (subcategoryData) => {
    if (!selectedSubcategory) return;
    
    const loadingToastId = showSubcategoryLoading('Updating subcategory...');
    setUpdatingSubcategoryId(selectedSubcategory._id);
    
    try {
      await updateSubcategoryMutation.mutateAsync({
        id: selectedSubcategory._id,
        data: subcategoryData
      });
      dismissSubcategoryToast(loadingToastId);
      showSubcategorySuccess('Subcategory updated successfully');
      setShowEditModal(false);
      setSelectedSubcategory(null);
      setUpdatingSubcategoryId(null);
      refetch();
    } catch (error) {
      dismissSubcategoryToast(loadingToastId);
      setUpdatingSubcategoryId(null);
      showSubcategoryError(error.response?.data?.message || 'Failed to update subcategory');
      throw error;
    }
  }, [selectedSubcategory, updateSubcategoryMutation, refetch, showSubcategoryLoading, showSubcategorySuccess, showSubcategoryError, dismissSubcategoryToast]);

  const handleDeleteSubcategory = useCallback(async (deleteOptions) => {
  const loadingToastId = showSubcategoryLoading('Deleting subcategory...');
  setDeletingSubcategoryId(deleteOptions.id);
  
  try {
    await deleteSubcategoryMutation.mutateAsync(deleteOptions);
    dismissSubcategoryToast(loadingToastId);
    showSubcategorySuccess('Subcategory deleted successfully');
    setShowDeleteModal(false);
    setSelectedSubcategory(null);
    setForceDelete(false);
    setDeletingSubcategoryId(null);
    refetch();
  } catch (error) {
    dismissSubcategoryToast(loadingToastId);
    setDeletingSubcategoryId(null);
    showSubcategoryError(error.response?.data?.message || 'Failed to delete subcategory');
    throw error;
  }
}, [deleteSubcategoryMutation, refetch, showSubcategoryLoading, showSubcategorySuccess, showSubcategoryError, dismissSubcategoryToast]);


  const toggleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      setSelectedSubcategories(subcategories.map(sub => sub._id));
    } else {
      setSelectedSubcategories([]);
    }
  }, [subcategories]);

  const toggleSelectSubcategory = useCallback((subcategoryId) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcategoryId)
        ? prev.filter(id => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  }, []);

  const toggleExpandSubcategory = useCallback((subcategoryId) => {
    setExpandedSubcategories(prev =>
      prev.includes(subcategoryId)
        ? prev.filter(id => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  }, []);

  const handleEdit = useCallback((subcategory) => {
    setSelectedSubcategory(subcategory);
    setShowEditModal(true);
  }, []);

  const handleView = useCallback((subcategory) => {
    setSelectedSubcategory(subcategory);
    setShowSubcategoryDetails(true);
  }, []);

  const handleDelete = useCallback((subcategory) => {
  setSelectedSubcategory(subcategory);
  setForceDelete(false);
  setShowDeleteModal(true);
}, []);


  const refreshData = useCallback(() => {
    setSelectedSubcategories([]);
    setExpandedSubcategories([]);
    refetch();
    showSubcategorySuccess('Data refreshed');
  }, [refetch, showSubcategorySuccess]);

  const exportSubcategories = useCallback(async () => {
    const loadingToastId = showSubcategoryLoading('Exporting subcategories...');
    
    try {
      const response = await exportSubcategoriesMutation.mutateAsync('csv');
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subcategories_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      dismissSubcategoryToast(loadingToastId);
      showSubcategorySuccess('Subcategories exported successfully');
    } catch (error) {
      dismissSubcategoryToast(loadingToastId);
      showSubcategoryError('Failed to export subcategories');
    }
  }, [exportSubcategoriesMutation, showSubcategoryLoading, showSubcategorySuccess, showSubcategoryError, dismissSubcategoryToast]);
const stats = useMemo(() => {
  // Log for debugging
  console.log('[DEBUG] Categories data:', {
    categoriesCount: categories.length,
    categoriesSample: categories.slice(0, 3).map(c => ({
      name: c.name,
      id: c._id,
      allowSubcategories: c.allowSubcategories
    })),
    backendByCategory: statsData?.data?.byCategory,
    backendByCategoryCount: statsData?.data?.byCategory?.length
  });
  
  // Calculate categories with subcategories from backend
  const categoriesWithSubcategories = statsData?.data?.byCategory?.length || 0;
  
  return {
    // Subcategories stats
    total: backendStats.totalSubcategories || pagination.total || subcategories.length,
    active: backendStats.activeSubcategories || subcategories.filter(s => s.isActive).length,
    inactive: subcategories.filter(s => !s.isActive).length,
    
    // Content stats
    totalServices: Math.max(0, backendStats.totalServices || 
      subcategories.reduce((sum, sub) => sum + (Math.max(0, sub.servicesCount || 0)), 0)),
    totalGigs: Math.max(0, backendStats.totalGigs || 
      subcategories.reduce((sum, sub) => sum + (Math.max(0, sub.gigsCount || 0)), 0)),
    
    // Categories - prioritize categories with subcategories from backend
    totalCategories: categoriesWithSubcategories > 0 ? categoriesWithSubcategories : categories.length,
    categoriesWithSubcategories: categoriesWithSubcategories,
    totalAllCategories: categories.length,
    
    // Additional metrics
    avgServices: Math.max(0, backendStats.avgServices || 0),
    avgGigs: Math.max(0, backendStats.avgGigs || 0)
  };
}, [backendStats, statsData, subcategories, pagination.total, categories]);

  const isCreating = createSubcategoryMutation.isLoading;
  const isUpdating = updateSubcategoryMutation.isLoading;
  const isDeleting = deleteSubcategoryMutation.isLoading;
  const isBulkOperating = bulkOperationsMutation.isLoading;
  const isExporting = exportSubcategoriesMutation.isLoading;
  const isTableLoading = isLoading || isFetching;

  if (isTableLoading && !subcategories.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subcategories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subcategory Management</h1>
          <p className="text-gray-600 mt-1">Organize and manage subcategories within categories</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportSubcategories}
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
            onClick={() => setShowCreateModal(true)}
            disabled={isCreating || isTableLoading}
            className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <FiPlus className="h-4 w-4" />
            Add Subcategory
          </button>
        </div>
      </div>

      {/* Stats Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Total Subcategories Card */}
  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">Total Subcategories</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {stats.total.toLocaleString()}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
            {stats.active} active
          </span>
          {stats.inactive > 0 && (
            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
              {stats.inactive} inactive
            </span>
          )}
        </div>
      </div>
      <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
        <FiFolder className="h-6 w-6 text-indigo-600" />
      </div>
    </div>
  </div>
  
  {/* Total Services Card */}
  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">Total Services</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">
          {stats.totalServices.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 mt-2 flex items-center">
          <FiTrendingUp className="h-3 w-3 mr-1" />
          Avg: {stats.avgServices.toFixed(1)} per subcategory
        </p>
      </div>
      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
        <FiGrid className="h-6 w-6 text-blue-600" />
      </div>
    </div>
  </div>
  
  {/* Total Gigs Card */}
  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">Total Gigs</p>
        <p className="text-2xl font-bold text-green-600 mt-1">
          {stats.totalGigs.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 mt-2 flex items-center">
          <FiTrendingUp className="h-3 w-3 mr-1" />
          Avg: {stats.avgGigs.toFixed(1)} per subcategory
        </p>
      </div>
      <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
        <FiBriefcase className="h-6 w-6 text-green-600" />
      </div>
    </div>
  </div>
  
  {/* Categories Card */}
  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-600">Categories</p>
      <p className="text-2xl font-bold text-purple-600 mt-1">
        {/* Use the backend byCategory count if available, otherwise use categories.length */}
        {safeNumber(
          statsData?.data?.byCategory?.length || 
          categories.length || 
          0
        ).toLocaleString()}
      </p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
          With subcategories
        </span>
        {/* Show total categories from dropdown if different */}
        {categories.length > 0 && categories.length !== (statsData?.data?.byCategory?.length || 0) && (
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
            {categories.length} total
          </span>
        )}
      </div>
    </div>
    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
      <FiFolderPlus className="h-6 w-6 text-purple-600" />
    </div>
  </div>
</div>
</div>

      {/* Bulk Actions */}
      {selectedSubcategories.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiFolder className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-indigo-900">
                  {selectedSubcategories.length} subcategor{selectedSubcategories.length > 1 ? 'ies' : 'y'} selected
                </p>
                <p className="text-sm text-indigo-600">Choose an action to perform</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiCheckCircle className="h-4 w-4" />
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiXCircle className="h-4 w-4" />
                Deactivate
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
                placeholder="Search subcategories by name or slug..."
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
            disabled={isBulkOperating || isTableLoading}
            className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            <FiFilter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                disabled={isTableLoading}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                disabled={isTableLoading}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                disabled={isTableLoading}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="order">Order</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Subcategories Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedSubcategories.length === subcategories.length && subcategories.length > 0}
                    onChange={toggleSelectAll}
                    disabled={isBulkOperating || isTableLoading}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Subcategory Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Content
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
              {subcategories.map((subcategory) => (
                <SubcategoryTableRow
                  key={subcategory._id}
                  subcategory={subcategory}
                  isExpanded={expandedSubcategories.includes(subcategory._id)}
                  isSelected={selectedSubcategories.includes(subcategory._id)}
                  onToggleExpand={toggleExpandSubcategory}
                  onToggleSelect={toggleSelectSubcategory}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onOpenActionMenu={setActionMenu}
                  actionMenuId={actionMenu}
                  categoriesMap={categoriesMap}
                  isUpdatingId={updatingSubcategoryId}
                  isDeletingId={deletingSubcategoryId}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {subcategories.length === 0 && !isTableLoading && (
          <div className="text-center py-16">
            <FiFolder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No subcategories found</h3>
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
                <span className="font-medium">{pagination.total}</span> subcategories
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
      {showCreateModal && (
        <SubcategoryCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (data) => {
            try {
              await createSubcategoryMutation.mutateAsync(data);
              showSubcategorySuccess('Subcategory created successfully');
              setShowCreateModal(false);
              refetch();
            } catch (error) {
              showSubcategoryError(error.response?.data?.message || 'Failed to create subcategory');
            }
          }}
          loading={createSubcategoryMutation.isLoading}
          categories={categories}
        />
      )}
      
      {showEditModal && selectedSubcategory && (
        <SubcategoryEditModal
          subcategory={selectedSubcategory}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSubcategory(null);
          }}
          onSubmit={handleUpdateSubcategory}
          loading={updateSubcategoryMutation.isLoading}
          categories={categories}
        />
      )}
      
      {showSubcategoryDetails && selectedSubcategory && (
        <SubcategoryDetailsModal
          subcategory={selectedSubcategory}
          isOpen={showSubcategoryDetails}
          onClose={() => {
            setShowSubcategoryDetails(false);
            setSelectedSubcategory(null);
          }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          categoriesMap={categoriesMap}
        />
      )}
      
     {showDeleteModal && selectedSubcategory && (
  <DeleteConfirmationModal
    item={selectedSubcategory}
    isOpen={showDeleteModal}
    onClose={() => {
      setShowDeleteModal(false);
      setSelectedSubcategory(null);
      setForceDelete(false);
    }}
    onDelete={handleDeleteSubcategory}
    type="subcategory"
    loading={deleteSubcategoryMutation.isLoading || deletingSubcategoryId === selectedSubcategory._id}
    dependencies={{
      services: selectedSubcategory.servicesCount || 0,
      gigs: selectedSubcategory.gigsCount || 0
    }}
    forceDelete={forceDelete}
    onForceDeleteChange={setForceDelete}
  />
)}
    </div>
  );
};

export default SubcategoriesManagement;