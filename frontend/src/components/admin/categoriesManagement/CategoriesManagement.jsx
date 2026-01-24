// CategoriesManagement.jsx - Updated with debounced search
import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { 
  useAdminCategories, 
  useUpdateCategory, 
  useCreateCategory, 
  useDeleteCategory,
  useBulkCategoryOperations, 
  useExportCategories, 
  useCategoryStats
} from '../../../hooks/useAdminDashboard';
import { useCategoryToast } from '../../../hooks/useCategoryToast';
import {
  FiFolder,
  FiSearch,
  FiDownload,
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
  FiMoreVertical,
  FiTrendingUp,
  FiX,
  FiLoader,
  FiGrid,
  FiHash,
  FiBarChart2,
  FiPackage,
  FiUsers,
  FiTrendingDown,
  FiActivity,
  FiDatabase,
  FiPercent,
  FiClock
} from 'react-icons/fi';
import { format, subDays } from 'date-fns';
import CategoryCreateModal from './CategoryCreateModal';
import CategoryEditModal from './CategoryEditModal';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import CategoryDetailsModal from './CategoryDetailsModal';

// Category Table Row Component
const CategoryTableRow = memo(({ 
  category, 
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
  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-700 border border-green-200' 
      : 'bg-red-100 text-red-700 border border-red-200';
  };

  const getFeaturedColor = (featured) => {
    return featured 
      ? 'bg-purple-100 text-purple-700 border border-purple-200' 
      : 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  const isUpdating = isUpdatingId === category._id;
  const isDeleting = isDeletingId === category._id;

  return (
    <React.Fragment>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(category._id)}
            disabled={isDeleting}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center">
            <button
              onClick={() => !isDeleting && onToggleExpand(category._id)}
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
                <p className="text-sm font-medium text-gray-900">{category.name}</p>
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center">
                <FiHash className="h-3 w-3 mr-1" />
                {category.slug || 'no-slug'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(category.isActive)}`}>
              {category.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
            {category.featured && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFeaturedColor(category.featured)}`}>
                <FiStar className="h-3 w-3 mr-1" />
                FEATURED
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">
            <div className="flex items-center gap-1">
              <FiGrid className="h-3 w-3 text-gray-400" />
              <span>{category.servicesCount || 0} services</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {category.gigsCount || 0} gigs
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-500">
            {category.createdAt ? format(new Date(category.createdAt), 'MMM d, yyyy') : 'N/A'}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => !isDeleting && onView(category)}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => !isDeleting && onEdit(category)}
              disabled={isDeleting || isUpdating}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Category"
            >
              {isUpdating ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                <FiEdit2 className="h-4 w-4" />
              )}
            </button>
            
            <div className="relative">
              <button
                onClick={() => !isDeleting && onOpenActionMenu(actionMenuId === category._id ? null : category._id)}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === category._id && !isDeleting && (
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
                          onDelete(category);
                          onOpenActionMenu(null);
                        }}
                        disabled={isDeleting}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <FiTrash2 className="h-4 w-4 mr-3" />
                        Delete Category
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
                <p className="text-sm text-gray-700">{category.description || 'No description provided'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Settings</h4>
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-gray-500">Order:</span> {category.order || 0}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Version:</span> {category.version || 1}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Last Updated</h4>
                <p className="text-sm text-gray-700">
                  {category.updatedAt ? format(new Date(category.updatedAt), 'MMM d, yyyy HH:mm') : 'N/A'}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

CategoryTableRow.displayName = 'CategoryTableRow';

// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Main Component
const CategoriesManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms delay
  const [filters, setFilters] = useState({
    status: '',
    featured: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [page, setPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [updatingCategoryId, setUpdatingCategoryId] = useState(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  const limit = 20;
  
  const { 
    data, 
    isLoading, 
    isFetching,
    refetch, 
    isRefetching
  } = useAdminCategories({
    page,
    limit,
    search: debouncedSearchTerm, // Use debounced search term
    ...filters
  });
  
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const bulkOperationsMutation = useBulkCategoryOperations();
  const exportCategoriesMutation = useExportCategories();
  
  const { data: categoryStatsData } = useCategoryStats();
  
  const {
    showCategoryLoading,
    showCategorySuccess,
    showCategoryError,
    showCategoryWarning,
    dismissCategoryToast
  } = useCategoryToast();
  
  const categories = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setPage(1);
    setSelectedCategories([]);
    setExpandedCategories([]);
    refetch();
  }, [refetch]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
    setSelectedCategories([]);
  }, []);

  const handleBulkAction = useCallback(async (action) => {
    if (selectedCategories.length === 0) {
      showCategoryWarning('Please select categories first');
      return;
    }

    const loadingToastId = showCategoryLoading(`Processing ${selectedCategories.length} categories...`);

    try {
      const bulkData = {
        ids: selectedCategories,
        operation: action
      };

      await bulkOperationsMutation.mutateAsync(bulkData);
      setSelectedCategories([]);
      dismissCategoryToast(loadingToastId);
      showCategorySuccess(`${selectedCategories.length} categories updated successfully`);
    } catch (error) {
      dismissCategoryToast(loadingToastId);
      showCategoryError(error.response?.data?.message || 'Failed to perform bulk action');
    }
  }, [selectedCategories, bulkOperationsMutation, showCategoryLoading, showCategorySuccess, showCategoryError, showCategoryWarning, dismissCategoryToast]);

  const handleUpdateCategory = useCallback(async (categoryData) => {
    if (!selectedCategory) return;
    
    const loadingToastId = showCategoryLoading('Updating category...');
    setUpdatingCategoryId(selectedCategory._id);
    
    try {
      await updateCategoryMutation.mutateAsync({
        id: selectedCategory._id,
        data: categoryData
      });
      dismissCategoryToast(loadingToastId);
      showCategorySuccess('Category updated successfully');
      setShowEditModal(false);
      setSelectedCategory(null);
      setUpdatingCategoryId(null);
      refetch();
    } catch (error) {
      dismissCategoryToast(loadingToastId);
      setUpdatingCategoryId(null);
      showCategoryError(error.response?.data?.message || 'Failed to update category');
      throw error;
    }
  }, [selectedCategory, updateCategoryMutation, refetch, showCategoryLoading, showCategorySuccess, showCategoryError, dismissCategoryToast]);

  const handleDeleteCategory = useCallback(async (deleteOptions) => {
    const loadingToastId = showCategoryLoading('Deleting category...');
    setDeletingCategoryId(deleteOptions.id);
    
    try {
      await deleteCategoryMutation.mutateAsync(deleteOptions);
      dismissCategoryToast(loadingToastId);
      showCategorySuccess('Category deleted successfully');
      setShowDeleteModal(false);
      setSelectedCategory(null);
      setForceDelete(false);
      setDeletingCategoryId(null);
      refetch();
    } catch (error) {
      dismissCategoryToast(loadingToastId);
      setDeletingCategoryId(null);
      showCategoryError(error.response?.data?.message || 'Failed to delete category');
      throw error;
    }
  }, [deleteCategoryMutation, refetch, showCategoryLoading, showCategorySuccess, showCategoryError, dismissCategoryToast]);

  const toggleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      setSelectedCategories(categories.map(cat => cat._id));
    } else {
      setSelectedCategories([]);
    }
  }, [categories]);

  const toggleSelectCategory = useCallback((categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const toggleExpandCategory = useCallback((categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const handleEdit = useCallback((category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  }, []);

  const handleView = useCallback((category) => {
    setSelectedCategory(category);
    setShowCategoryDetails(true);
  }, []);

  const handleDelete = useCallback((category) => {
    setSelectedCategory(category);
    setForceDelete(false);
    setShowDeleteModal(true);
  }, []);

  const refreshData = useCallback(() => {
    setSelectedCategories([]);
    setExpandedCategories([]);
    refetch();
    showCategorySuccess('Data refreshed');
  }, [refetch, showCategorySuccess]);

  const exportCategories = useCallback(async () => {
    const loadingToastId = showCategoryLoading('Exporting categories...');
    
    try {
      const response = await exportCategoriesMutation.mutateAsync('csv');
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `categories_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      dismissCategoryToast(loadingToastId);
      showCategorySuccess('Categories exported successfully');
    } catch (error) {
      dismissCategoryToast(loadingToastId);
      showCategoryError('Failed to export categories');
    }
  }, [exportCategoriesMutation, showCategoryLoading, showCategorySuccess, showCategoryError, dismissCategoryToast]);

  const stats = useMemo(() => {
    const categoryStats = categoryStatsData?.data?.overview || {};
    
    // Calculate derived stats
    const totalCategories = pagination.total || categories.length;
    const activeCategories = categories.filter(c => c.isActive).length;
    const featuredCategories = categories.filter(c => c.featured).length;
    
    // Use actual stats from backend, fallback to calculated values
    return {
      // Basic stats
      total: categoryStats.totalCategories || totalCategories,
      active: categoryStats.activeCategories || activeCategories,
      inactive: categoryStats.inactiveCategories || (totalCategories - activeCategories),
      featured: categoryStats.featuredCategories || featuredCategories,
      popular: categoryStats.popularCategories || categories.filter(c => c.popular).length,
      
      // Content stats
      totalServices: Math.max(0, categoryStats.totalServices || categories.reduce((sum, cat) => sum + (cat.servicesCount || 0), 0)),
      totalGigs: Math.max(0, categoryStats.totalGigs || categories.reduce((sum, cat) => sum + (cat.gigsCount || 0), 0)),
      
      // Average stats from backend
      avgServicesPerCategory: Math.max(0, categoryStats.avgServicesPerCategory || 0),
      avgGigsPerCategory: Math.max(0, categoryStats.avgGigsPerCategory || 0),
      
      // Range stats from backend
      maxServices: Math.max(0, categoryStats.maxServices || 0),
      maxGigs: Math.max(0, categoryStats.maxGigs || 0),
      minServices: Math.max(0, categoryStats.minServices || 0),
      minGigs: Math.max(0, categoryStats.minGigs || 0),
      
      // Hierarchy stats
      categoriesWithParent: Math.max(0, categoryStats.categoriesWithParent || categories.filter(c => c.parentCategory).length),
      categoriesWithoutParent: Math.max(0, categoryStats.categoriesWithoutParent || categories.filter(c => !c.parentCategory).length),
      
      // Additional derived stats
      avgUtilization: totalCategories > 0 
        ? ((activeCategories / totalCategories) * 100).toFixed(1)
        : 0,
      serviceDensity: totalCategories > 0 
        ? ((categoryStats.totalServices || 0) / totalCategories).toFixed(1)
        : 0
    };
  }, [categories, pagination.total, categoryStatsData]);

  const isCreating = createCategoryMutation.isLoading;
  const isUpdating = updateCategoryMutation.isLoading;
  const isDeleting = deleteCategoryMutation.isLoading;
  const isBulkOperating = bulkOperationsMutation.isLoading;
  const isExporting = exportCategoriesMutation.isLoading;
  const isTableLoading = isLoading || isFetching;

  if (isTableLoading && !categories.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-600 mt-1">Organize and manage content categories</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportCategories}
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
            Add Category
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Categories Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded-full ${stats.active > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {stats.active} active
                </span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {stats.featured} featured
                </span>
              </div>
            </div>
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FiFolder className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
        
        {/* Active Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Status</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Utilization</span>
                  <span className="font-semibold">{stats.avgUtilization}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full" 
                    style={{ width: `${Math.min(100, stats.avgUtilization)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FiActivity className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        {/* Content Distribution Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Content Distribution</p>
              <div className="mt-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Services</span>
                  <span className="text-sm font-bold text-blue-600">{stats.totalServices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Gigs</span>
                  <span className="text-sm font-bold text-purple-600">{stats.totalGigs}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>Density</span>
                  <span>{stats.serviceDensity} per category</span>
                </div>
              </div>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiPackage className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        {/* Performance Metrics Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Performance</p>
              <div className="mt-1 space-y-1">
                <div className="flex items-center gap-2">
                  <FiTrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Max: {stats.maxServices} services</span>
                </div>
                <div className="flex items-center gap-2">
                  <FiTrendingDown className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Avg: {stats.avgServicesPerCategory.toFixed(1)}/category</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {stats.categoriesWithParent} with parent category
                </div>
              </div>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiBarChart2 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCategories.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiFolder className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-indigo-900">
                  {selectedCategories.length} categor{selectedCategories.length > 1 ? 'ies' : 'y'} selected
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
                placeholder="Search categories by name or slug..."
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
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Featured</label>
              <select
                value={filters.featured}
                onChange={(e) => handleFilterChange('featured', e.target.value)}
                disabled={isTableLoading}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All</option>
                <option value="true">Featured</option>
                <option value="false">Not Featured</option>
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
                <option value="servicesCount">Services Count</option>
                <option value="gigsCount">Gigs Count</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                disabled={isTableLoading}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedCategories.length === categories.length && categories.length > 0}
                    onChange={toggleSelectAll}
                    disabled={isBulkOperating || isTableLoading}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Category Details
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
              {categories.map((category) => (
                <CategoryTableRow
                  key={category._id}
                  category={category}
                  isExpanded={expandedCategories.includes(category._id)}
                  isSelected={selectedCategories.includes(category._id)}
                  onToggleExpand={toggleExpandCategory}
                  onToggleSelect={toggleSelectCategory}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onOpenActionMenu={setActionMenu}
                  actionMenuId={actionMenu}
                  isUpdatingId={updatingCategoryId}
                  isDeletingId={deletingCategoryId}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {categories.length === 0 && !isTableLoading && (
          <div className="text-center py-16">
            <FiFolder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No categories found</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              {searchTerm || Object.values(filters).some(f => f !== '' && f !== null) 
                ? "Try adjusting your search or filter criteria to find what you're looking for."
                : "No categories available. Create your first category to get started."}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create First Category
            </button>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> categories
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
        <CategoryCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (data) => {
            try {
              await createCategoryMutation.mutateAsync(data);
              showCategorySuccess('Category created successfully');
              setShowCreateModal(false);
              refetch();
            } catch (error) {
              showCategoryError(error.response?.data?.message || 'Failed to create category');
            }
          }}
          loading={createCategoryMutation.isLoading}
        />
      )}
      
      {showEditModal && selectedCategory && (
        <CategoryEditModal
          category={selectedCategory}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCategory(null);
          }}
          onSubmit={handleUpdateCategory}
          loading={updateCategoryMutation.isLoading}
        />
      )}
      
      {showCategoryDetails && selectedCategory && (
        <CategoryDetailsModal
          category={selectedCategory}
          stats={stats} // Pass stats to modal
          isOpen={showCategoryDetails}
          onClose={() => {
            setShowCategoryDetails(false);
            setSelectedCategory(null);
          }}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
      
      {showDeleteModal && selectedCategory && (
        <DeleteConfirmationModal
          item={selectedCategory}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCategory(null);
            setForceDelete(false);
          }}
          onDelete={handleDeleteCategory}
          type="category"
          loading={deleteCategoryMutation.isLoading || deletingCategoryId === selectedCategory._id}
          dependencies={{
            services: selectedCategory.servicesCount || 0,
            gigs: selectedCategory.gigsCount || 0,
            subcategories: selectedCategory.subcategoriesCount || 0
          }}
          forceDelete={forceDelete}
          onForceDeleteChange={setForceDelete}
        />
      )}
    </div>
  );
};

export default CategoriesManagement;