// CategoriesManagement.jsx - UPDATED with real-time updates
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
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
  FiStar,
  FiPackage,
  FiMoreVertical,
  FiChevronDown,
  FiChevronUp,
  FiTrendingUp,
  FiFolderPlus,
  FiX,
  FiClock,
  FiLoader,
  FiAlertTriangle
} from 'react-icons/fi';
import { format } from 'date-fns';
import CategoryCreateModal from './CategoryCreateModal';
import CategoryEditModal from './CategoryEditModal';
import CategoryDeleteModal from './CategoryDeleteModal';
import CategoryDetailsModal from './CategoryDetailsModal';

// Memoized table row component
const CategoryTableRow = memo(({ 
  category, 
  isExpanded, 
  isSelected, 
  onToggleExpand, 
  onToggleSelect, 
  onView, 
  onEdit, 
  onDelete,
  onDuplicate,
  onOpenActionMenu,
  actionMenuId,
  isUpdatingId,
  isDeletingId,
  isCreatingId,
  hasError
}) => {
  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200';
  };

  const getFeaturedColor = (featured) => {
    return featured 
      ? 'bg-purple-100 text-purple-800 border border-purple-200' 
      : 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const isUpdating = isUpdatingId === category._id;
  const isDeleting = isDeletingId === category._id;
  const isCreating = isCreatingId === category._id;
  const hasItemError = hasError === category._id;

  return (
    <React.Fragment>
      <tr className={`hover:bg-gray-50 ${hasItemError ? 'bg-red-50' : ''} ${isCreating ? 'bg-blue-50' : ''}`}>
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(category._id)}
            disabled={isDeleting || isCreating}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
          />
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => !isDeleting && onToggleExpand(category._id)}
              disabled={isDeleting || isCreating}
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
                {(isUpdating || isCreating) && (
                  <FiLoader className="h-3 w-3 animate-spin text-blue-500" />
                )}
                {isDeleting && (
                  <FiLoader className="h-3 w-3 animate-spin text-red-500" />
                )}
                {hasItemError && (
                  <FiAlertTriangle className="h-3 w-3 text-red-500" />
                )}
                <div className={`text-sm font-medium ${hasItemError ? 'text-red-700' : 'text-gray-900'}`}>
                  {category.name}
                  {isCreating && category.__isOptimistic && (
                    <span className="ml-2 text-xs text-blue-600">(Creating...)</span>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Slug: {category.slug || 'N/A'}
                {isCreating && category.__isOptimistic && (
                  <span className="ml-2 text-blue-500">Temporary ID</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(category.isActive)}`}>
              {category.isActive ? 'Active' : 'Inactive'}
            </span>
            {category.featured && (
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getFeaturedColor(category.featured)}`}>
                Featured
              </span>
            )}
            {category.popular && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                Popular
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 text-sm text-gray-500">
          {category.createdAt ? format(new Date(category.createdAt), 'MMM d, yyyy') : 'Just now'}
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => !isDeleting && !isCreating && onView(category)}
              disabled={isDeleting || isCreating}
              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => !isDeleting && !isCreating && onEdit(category)}
              disabled={isDeleting || isCreating || isUpdating}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
              title="Edit Category"
            >
              {isUpdating ? (
                <FiLoader className="h-4 w-4 animate-spin text-blue-500" />
              ) : (
                <FiEdit2 className="h-4 w-4" />
              )}
            </button>
            <div className="relative">
              <button
                onClick={() => !isDeleting && !isCreating && onOpenActionMenu(actionMenuId === category._id ? null : category._id)}
                disabled={isDeleting || isCreating}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === category._id && !isDeleting && !isCreating && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => onOpenActionMenu(null)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onDuplicate(category);
                          onOpenActionMenu(null);
                        }}
                        disabled={isDeleting || isCreating}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        <span className="mr-2">📋</span>
                        Duplicate
                      </button>
                      <button
                        onClick={() => {
                          onDelete(category);
                          onOpenActionMenu(null);
                        }}
                        disabled={isDeleting || isCreating}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FiTrash2 className="h-4 w-4 mr-2" />
                        )}
                        {isDeleting ? 'Deleting...' : 'Delete'}
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
          <td colSpan="5" className="px-4 py-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Description</div>
                <div className="text-sm text-gray-700">
                  {category.description || 'No description provided'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Stats</div>
                <div className="text-sm">
                  <div><span className="text-gray-500">Services:</span> {category.servicesCount || 0}</div>
                  <div><span className="text-gray-500">Gigs:</span> {category.gigsCount || 0}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Settings</div>
                <div className="text-sm">
                  <div><span className="text-gray-500">Order:</span> {category.order || 0}</div>
                  <div><span className="text-gray-500">Level:</span> {category.level || 0}</div>
                  <div><span className="text-gray-500">Version:</span> {category.version || 1}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Last Updated</div>
                <div className="text-sm text-gray-700">
                  {category.updatedAt ? format(new Date(category.updatedAt), 'MMM d, yyyy HH:mm') : 'N/A'}
                  {category.__isOptimistic && (
                    <div className="text-xs text-blue-600 mt-1">Optimistic update</div>
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

CategoryTableRow.displayName = 'CategoryTableRow';

// Main Component with improved state management
const CategoriesManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
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
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [updatingCategoryId, setUpdatingCategoryId] = useState(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);
  const [creatingCategoryId, setCreatingCategoryId] = useState(null);
  const [errorCategoryId, setErrorCategoryId] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const limit = 20;
  
  // React Query hooks with proper error handling
  const { 
    data, 
    isLoading, 
    isFetching,
    refetch, 
    isRefetching,
    error: fetchError
  } = useAdminCategories({
    page,
    limit,
    search: searchTerm,
    ...filters,
    _refresh: lastRefresh // Force refresh when needed
  });
  
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const bulkOperationsMutation = useBulkCategoryOperations();
  const exportCategoriesMutation = useExportCategories();
  
  const { data: categoryStatsData } = useCategoryStats();
  
  // Use custom toast hook
  const {
    showCategoryLoading,
    showCategorySuccess,
    showCategoryError,
    showCategoryWarning,
    showCategoryInfo,
    dismissCategoryToast
  } = useCategoryToast();
  
  const categories = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  // Handle fetch errors
  useEffect(() => {
    if (fetchError) {
      console.error('Categories fetch error:', fetchError);
      showCategoryError('Failed to load categories. Please refresh.');
    }
  }, [fetchError, showCategoryError]);

  // Memoized handlers
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setPage(1);
    setSelectedCategories([]);
    setExpandedCategories([]);
    refetch();
  }, [refetch]);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

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
      showCategorySuccess(`${selectedCategories.length} categories ${action}ed successfully`);
    } catch (error) {
      dismissCategoryToast(loadingToastId);
      const errorMessage = error.response?.data?.message || 'Failed to perform bulk action';
      const validationErrors = error.response?.data?.errors;
      
      if (validationErrors) {
        validationErrors.forEach(err => showCategoryError(err));
      } else {
        showCategoryError(errorMessage);
      }
    }
  }, [selectedCategories, bulkOperationsMutation, showCategoryLoading, showCategorySuccess, showCategoryError, showCategoryWarning, dismissCategoryToast]);

  const handleCreateCategory = useCallback(async (categoryData) => {
    const loadingToastId = showCategoryLoading('Creating category...');
    setCreatingCategoryId('temp'); // Set temporary ID
    
    try {
      const result = await createCategoryMutation.mutateAsync(categoryData);
      dismissCategoryToast(loadingToastId);
      showCategorySuccess('Category created successfully');
      setShowCreateModal(false);
      setCreatingCategoryId(null);
      
      // Force immediate UI update
      setLastRefresh(Date.now());
      
      return result;
    } catch (error) {
      dismissCategoryToast(loadingToastId);
      setCreatingCategoryId(null);
      setErrorCategoryId('temp');
      
      // Show specific error messages
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => showCategoryError(err));
      } else {
        showCategoryError(error.response?.data?.message || 'Failed to create category');
      }
      
      throw error;
    }
  }, [createCategoryMutation, showCategoryLoading, showCategorySuccess, showCategoryError, dismissCategoryToast]);

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
      
      // Force immediate UI update
      setLastRefresh(Date.now());
    } catch (error) {
      dismissCategoryToast(loadingToastId);
      setUpdatingCategoryId(null);
      setErrorCategoryId(selectedCategory._id);
      
      // Show specific error messages
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => showCategoryError(err));
      } else {
        showCategoryError(error.response?.data?.message || 'Failed to update category');
      }
      
      throw error;
    }
  }, [selectedCategory, updateCategoryMutation, showCategoryLoading, showCategorySuccess, showCategoryError, dismissCategoryToast]);

  const handleDeleteCategory = useCallback(async (deleteOptions) => {
    const loadingToastId = showCategoryLoading('Deleting category...');
    setDeletingCategoryId(deleteOptions.id);
    
    try {
      await deleteCategoryMutation.mutateAsync(deleteOptions);
      dismissCategoryToast(loadingToastId);
      showCategorySuccess('Category deleted successfully');
      setShowDeleteModal(false);
      setSelectedCategory(null);
      setDeletingCategoryId(null);
      
      // Force immediate UI update
      setLastRefresh(Date.now());
    } catch (error) {
      dismissCategoryToast(loadingToastId);
      setDeletingCategoryId(null);
      setErrorCategoryId(deleteOptions.id);
      
      // Show specific error messages
      const errorMessage = error.response?.data?.message || 'Failed to delete category';
      if (error.response?.data?.details) {
        showCategoryError(`${errorMessage}: ${error.response.data.details}`);
      } else {
        showCategoryError(errorMessage);
      }
      
      throw error;
    }
  }, [deleteCategoryMutation, showCategoryLoading, showCategorySuccess, showCategoryError, dismissCategoryToast]);

  const handleDuplicate = useCallback(async (category) => {
    const loadingToastId = showCategoryLoading('Duplicating category...');
    
    try {
      const duplicateData = {
        name: `${category.name} (Copy)`,
        description: category.description,
        parentCategory: category.parentCategory?._id || category.parentCategory || '',
        featured: category.featured,
        popular: category.popular,
        isActive: category.isActive,
        order: (category.order || 0) + 1,
        metaTitle: category.metaTitle,
        metaDescription: category.metaDescription,
        slug: `${category.slug}-copy-${Date.now()}`
      };
      
      await createCategoryMutation.mutateAsync(duplicateData);
      dismissCategoryToast(loadingToastId);
      showCategorySuccess('Category duplicated successfully');
    } catch (error) {
      dismissCategoryToast(loadingToastId);
      const errorMessage = error.response?.data?.message || 'Failed to duplicate category';
      const validationErrors = error.response?.data?.errors;
      
      if (validationErrors) {
        validationErrors.forEach(err => showCategoryError(err));
      } else {
        showCategoryError(errorMessage);
      }
    }
  }, [createCategoryMutation, showCategoryLoading, showCategorySuccess, showCategoryError, dismissCategoryToast]);

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
    setShowDeleteModal(true);
  }, []);

  const refreshData = useCallback(() => {
    setSelectedCategories([]);
    setExpandedCategories([]);
    setErrorCategoryId(null);
    setLastRefresh(Date.now());
    showCategorySuccess('Data refreshed');
  }, [showCategorySuccess]);

  // Memoized stats calculation
  const stats = useMemo(() => {
    const active = categories.filter(c => c.isActive).length;
    const featured = categories.filter(c => c.featured).length;
    const popular = categories.filter(c => c.popular).length;
    const totalServices = categories.reduce((sum, cat) => sum + (cat.servicesCount || 0), 0);
    const totalGigs = categories.reduce((sum, cat) => sum + (cat.gigsCount || 0), 0);

    return {
      total: pagination.total || categories.length,
      active,
      featured,
      popular,
      totalServices,
      totalGigs
    };
  }, [categories, pagination.total]);

  // Clear error after timeout
  useEffect(() => {
    if (errorCategoryId) {
      const timer = setTimeout(() => {
        setErrorCategoryId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorCategoryId]);

  // Loading states
  const isCreating = createCategoryMutation.isLoading;
  const isUpdating = updateCategoryMutation.isLoading;
  const isDeleting = deleteCategoryMutation.isLoading;
  const isBulkOperating = bulkOperationsMutation.isLoading;
  const isExporting = exportCategoriesMutation.isLoading;

  const isTableLoading = isLoading || isFetching;
  const showSkeleton = isTableLoading && !categories.length;

  if (showSkeleton) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
            <p className="text-gray-600">Organize and manage content categories</p>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-20"></div>
            </div>
          ))}
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="h-64 flex items-center justify-center">
            <FiLoader className="h-8 w-8 animate-spin text-indigo-600" />
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
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-600">Organize and manage content categories</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportCategories}
            disabled={isExporting || isTableLoading}
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
            disabled={isRefetching || isBulkOperating || isTableLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={isCreating || isTableLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <FiLoader className="h-4 w-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <FiPlus className="h-4 w-4" />
                <span>Add Category</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <FiFolder className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <FiCheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Featured</p>
              <p className="text-2xl font-bold text-purple-600">{stats.featured}</p>
            </div>
            <FiStar className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Popular</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.popular}</p>
            </div>
            <FiTrendingUp className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCategories.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <FiFolder className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-medium text-indigo-800">
                  {selectedCategories.length} categor{selectedCategories.length > 1 ? 'ies' : 'y'} selected
                </p>
                <p className="text-sm text-indigo-600">Choose an action to perform</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                disabled={isBulkOperating || isTableLoading}
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
                    <span>Activate</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                disabled={isBulkOperating || isTableLoading}
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
                    <span>Deactivate</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={isBulkOperating || isTableLoading}
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
                placeholder="Search categories by name, slug, or description..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                disabled={isTableLoading}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setPage(1);
                    if (!isTableLoading) {
                      refetch();
                    }
                  }}
                  disabled={isTableLoading}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            disabled={isBulkOperating || isTableLoading}
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
                disabled={isTableLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Featured</label>
              <select
                value={filters.featured}
                onChange={(e) => handleFilterChange('featured', e.target.value)}
                disabled={isTableLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                <option value="">All</option>
                <option value="true">Featured</option>
                <option value="false">Not Featured</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                disabled={isTableLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="order">Sort Order</option>
                <option value="updatedAt">Last Updated</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                disabled={isTableLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedCategories.length === categories.length && categories.length > 0}
                    onChange={toggleSelectAll}
                    disabled={isBulkOperating || isTableLoading || categories.length === 0}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Tags
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
                  onDuplicate={handleDuplicate}
                  onOpenActionMenu={setActionMenu}
                  actionMenuId={actionMenu}
                  isUpdatingId={updatingCategoryId}
                  isDeletingId={deletingCategoryId}
                  isCreatingId={creatingCategoryId}
                  hasError={errorCategoryId}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {categories.length === 0 && !isTableLoading && (
          <div className="text-center py-12">
            <FiFolder className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No categories found</h3>
            <p className="mt-2 text-gray-500">Try adjusting your search or filters</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create your first category
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
                <span className="font-medium">{pagination.total}</span> categories
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isBulkOperating || isTableLoading}
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
                        disabled={isBulkOperating || isTableLoading}
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
                        disabled={isBulkOperating || isTableLoading}
                        className={`px-3 py-1.5 rounded-md text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50`}
                      >
                        {pagination.totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages || isBulkOperating || isTableLoading}
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
      {showCreateModal && (
        <CategoryCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateCategory}
          loading={createCategoryMutation.isLoading}
          error={createCategoryMutation.error}
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
          error={updateCategoryMutation.error}
        />
      )}
      
      {showCategoryDetails && selectedCategory && (
        <CategoryDetailsModal
          category={selectedCategory}
          isOpen={showCategoryDetails}
          onClose={() => {
            setShowCategoryDetails(false);
            setSelectedCategory(null);
          }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      )}
      
      {showDeleteModal && selectedCategory && (
        <CategoryDeleteModal
          category={selectedCategory}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCategory(null);
          }}
          onDelete={handleDeleteCategory}
          loading={deleteCategoryMutation.isLoading}
          error={deleteCategoryMutation.error}
        />
      )}
    </div>
  );
};

export default CategoriesManagement;