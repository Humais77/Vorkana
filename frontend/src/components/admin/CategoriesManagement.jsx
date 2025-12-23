// CategoriesManagement.jsx - OPTIMIZED VERSION
import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  useAdminCategories, 
  useUpdateCategory, 
  useCreateCategory, 
  useDeleteCategory,
  useBulkCategoryOperations
} from '../../hooks/useAdminDashboard';
import { useAdminStore } from '../../store/useAdminStore';
import { toast } from 'react-hot-toast';
import {
  FiFolder,
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
  FiArchive,
  FiX,
  FiList,
  FiGrid,
  FiClock
} from 'react-icons/fi';
import { format } from 'date-fns';

// Memoized Category Row Component
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
  onToggleActionMenu,
  actionMenuId
}) => {
  const getStatusColor = (status) => {
    return status ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200';
  };

  const getFeaturedColor = (featured) => {
    return featured ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  return (
    <React.Fragment>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(category._id)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onToggleExpand(category._id)}
              className="mr-2 p-1 hover:bg-gray-100 rounded"
            >
              {isExpanded ? (
                <FiChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <FiChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <div>
              <div className="text-sm font-medium text-gray-900">{category.name}</div>
              <div className="text-xs text-gray-500 mt-1">Slug: {category.slug || 'N/A'}</div>
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
          {format(new Date(category.createdAt), 'MMM d, yyyy')}
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView(category)}
              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEdit(category)}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit Category"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => onToggleActionMenu(actionMenuId === category._id ? null : category._id)}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === category._id && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => onToggleActionMenu(null)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onDuplicate(category);
                          onToggleActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span className="mr-2">📋</span>
                        Duplicate
                      </button>
                      <button
                        onClick={() => {
                          onDelete(category);
                          onToggleActionMenu(null);
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
      
      {isExpanded && (
        <tr>
          <td colSpan="8" className="px-4 py-4 bg-gray-50">
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
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Last Updated</div>
                <div className="text-sm text-gray-700">
                  {format(new Date(category.updatedAt), 'MMM d, yyyy HH:mm')}
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

// Memoized Category Card Component
const CategoryCard = memo(({ 
  category, 
  isSelected, 
  onSelect, 
  onView, 
  onEdit, 
  onDelete,
  onToggleActionMenu,
  actionMenuId
}) => {
  return (
    <div className={`bg-white rounded-lg border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500 ring-opacity-20' : 'border-gray-200'} p-6 hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <div className="h-16 w-16 bg-indigo-100 rounded-lg flex items-center justify-center">
            <span className="text-2xl">{category.icon || '📁'}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{category.name}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {category.isActive ? 'Active' : 'Inactive'}
              </span>
              {category.featured && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Featured
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => onToggleActionMenu(actionMenuId === category._id ? null : category._id)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <FiMoreVertical className="h-5 w-5" />
          </button>
          
          {actionMenuId === category._id && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => onToggleActionMenu(null)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onView();
                      onToggleActionMenu(null);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FiEye className="h-4 w-4 mr-2" />
                    View Details
                  </button>
                  <button
                    onClick={() => {
                      onEdit();
                      onToggleActionMenu(null);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FiEdit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      onToggleActionMenu(null);
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
      
      {category.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{category.servicesCount || 0}</div>
          <div className="text-xs text-gray-500">Services</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{category.gigsCount || 0}</div>
          <div className="text-xs text-gray-500">Gigs</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          <div>Order: {category.order || 0}</div>
        </div>
        <div className="text-sm text-gray-500 flex items-center">
          <FiClock className="h-3 w-3 mr-1" />
          {format(new Date(category.createdAt), 'MMM d')}
        </div>
      </div>
    </div>
  );
});

CategoryCard.displayName = 'CategoryCard';

// Main Component
const CategoriesManagement = () => {
  const setCategories = useAdminStore((state) => state.setCategories);

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewingCategory, setViewingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '📁',
    isActive: true,
    featured: false,
    popular: false,
    parentId: '',
    order: 0,
    metaTitle: '',
    metaDescription: '',
    slug: ''
  });
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [viewMode, setViewMode] = useState('table');

  const limit = 20;
  const { data, isLoading, refetch, isRefetching } = useAdminCategories({
    page,
    limit,
    search: searchTerm,
    ...filters
  }, {
    onSuccess: (data) => {
      if (data && data.data) {
        setCategories(data);
      }
    }
  });
  
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  const bulkCategoryMutation = useBulkCategoryOperations();
  
  const categories = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  // Memoized stats calculation
  const categoryStats = useMemo(() => {
    if (categories.length === 0) {
      return { 
        total: 0, 
        active: 0, 
        featured: 0, 
        popular: 0,
        totalServices: 0,
        totalGigs: 0,
        totalSubcategories: 0
      };
    }
    
    let totalSubcategories = 0;
    
    categories.forEach(category => {
      if (category.parentCategory) {
        totalSubcategories++;
      }
    });
    
    return {
      total: categories.length,
      active: categories.filter(c => c.isActive).length,
      featured: categories.filter(c => c.featured).length,
      popular: categories.filter(c => c.popular).length,
      totalServices: categories.reduce((sum, cat) => sum + (cat.servicesCount || 0), 0),
      totalGigs: categories.reduce((sum, cat) => sum + (cat.gigsCount || 0), 0),
      totalSubcategories
    };
  }, [categories]);

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

  const handleBulkAction = useCallback(async (action) => {
    if (selectedCategories.length === 0) {
      toast.error('Please select categories first');
      return;
    }

    try {
      const bulkData = {
        ids: selectedCategories,
        operation: action,
        data: {}
      };

      switch (action) {
        case 'activate':
          bulkData.data = { isActive: true };
          break;
        case 'deactivate':
          bulkData.data = { isActive: false };
          break;
        case 'feature':
          bulkData.data = { featured: true };
          break;
        case 'unfeature':
          bulkData.data = { featured: false };
          break;
        case 'popular':
          bulkData.data = { popular: true };
          break;
        case 'unpopular':
          bulkData.data = { popular: false };
          break;
        case 'delete':
          setCategoryToDelete({ type: 'bulk', ids: selectedCategories });
          setShowDeleteModal(true);
          return;
        default:
          break;
      }

      if (bulkData.data && Object.keys(bulkData.data).length > 0) {
        await bulkCategoryMutation.mutateAsync(bulkData);
        toast.success(`${selectedCategories.length} categories updated`);
        setSelectedCategories([]);
        refetch();
      }
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  }, [selectedCategories, bulkCategoryMutation, refetch]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      const categoryData = {
        ...categoryForm,
        slug: categoryForm.slug || categoryForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      };
      
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory._id,
          data: categoryData
        });
        toast.success('Category updated successfully');
      } else {
        await createCategoryMutation.mutateAsync(categoryData);
        toast.success('Category created successfully');
      }
      
      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingCategory(null);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    }
  }, [editingCategory, categoryForm, updateCategoryMutation, createCategoryMutation, refetch]);

  const handleEdit = useCallback((category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '📁',
      isActive: category.isActive,
      featured: category.featured || false,
      popular: category.popular || false,
      parentId: category.parentCategory || '',
      order: category.order || 0,
      metaTitle: category.metaTitle || '',
      metaDescription: category.metaDescription || '',
      slug: category.slug || ''
    });
    setShowEditModal(true);
  }, []);

  const handleView = useCallback((category) => {
    setViewingCategory(category);
    setShowCategoryDetails(true);
  }, []);

  const handleDelete = useCallback((category) => {
    setCategoryToDelete({ type: 'single', id: category._id });
    setShowDeleteModal(true);
  }, []);

  const handleDuplicate = useCallback(async (category) => {
    try {
      const newCategory = {
        name: `${category.name} (Copy)`,
        description: category.description,
        icon: category.icon,
        isActive: category.isActive,
        featured: category.featured,
        popular: category.popular,
        parentCategory: category.parentCategory,
        order: category.order + 1,
        slug: `${category.slug || category.name.toLowerCase().replace(/\s+/g, '-')}-copy`
      };
      
      await createCategoryMutation.mutateAsync(newCategory);
      toast.success('Category duplicated successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to duplicate category');
    }
  }, [createCategoryMutation, refetch]);

  const handleDeleteCategory = useCallback(async () => {
    try {
      if (categoryToDelete?.type === 'single' && categoryToDelete?.id) {
        await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
        toast.success('Category deleted successfully');
      } else if (categoryToDelete?.type === 'bulk' && categoryToDelete?.ids) {
        await bulkCategoryMutation.mutateAsync({
          ids: categoryToDelete.ids,
          operation: 'delete',
          data: {}
        });
        toast.success(`${categoryToDelete.ids.length} categories deleted`);
      }
      
      setSelectedCategories([]);
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete categories');
    }
  }, [categoryToDelete, deleteCategoryMutation, bulkCategoryMutation, refetch]);

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

  const toggleActionMenu = useCallback((categoryId) => {
    setActionMenu(actionMenu === categoryId ? null : categoryId);
  }, [actionMenu]);

  const toggleExpandCategory = useCallback((categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const refreshData = useCallback(() => {
    refetch();
    setSelectedCategories([]);
    toast.success('Data refreshed');
  }, [refetch]);

  if (isLoading && !categories.length) {
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
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-600">Organize and manage content categories</p>
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
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Categories</p>
              <p className="text-2xl font-bold mt-1">{categoryStats.total}</p>
            </div>
            <FiFolder className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold mt-1">{categoryStats.active}</p>
            </div>
            <FiCheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Featured</p>
              <p className="text-2xl font-bold mt-1">{categoryStats.featured}</p>
            </div>
            <FiStar className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Services</p>
              <p className="text-2xl font-bold mt-1">{categoryStats.totalServices}</p>
            </div>
            <FiPackage className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Subcategories</p>
              <p className="text-2xl font-bold mt-1">{categoryStats.totalSubcategories}</p>
            </div>
            <FiFolderPlus className="h-8 w-8 text-teal-500" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Popular</p>
              <p className="text-2xl font-bold mt-1">{categoryStats.popular}</p>
            </div>
            <FiTrendingUp className="h-8 w-8 text-yellow-500" />
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
                className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 flex items-center space-x-1"
              >
                <FiCheckCircle className="h-4 w-4" />
                <span>Activate</span>
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200 flex items-center space-x-1"
              >
                <FiXCircle className="h-4 w-4" />
                <span>Deactivate</span>
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
                placeholder="Search categories..."
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
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 ${viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-600'}`}
                title="Table View"
              >
                <FiList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-2 ${viewMode === 'card' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-600'}`}
                title="Card View"
              >
                <FiGrid className="h-4 w-4" />
              </button>
            </div>
            
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
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Featured</label>
              <select
                value={filters.featured}
                onChange={(e) => handleFilterChange('featured', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="order">Sort Order</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* View Content */}
      {viewMode === 'table' ? (
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
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
                    onToggleActionMenu={toggleActionMenu}
                    actionMenuId={actionMenu}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard
              key={category._id}
              category={category}
              isSelected={selectedCategories.includes(category._id)}
              onSelect={() => toggleSelectCategory(category._id)}
              onView={() => handleView(category)}
              onEdit={() => handleEdit(category)}
              onDelete={() => handleDelete(category)}
              onToggleActionMenu={toggleActionMenu}
              actionMenuId={actionMenu}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {categories.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FiFolder className="h-12 w-12 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No categories found</h3>
          <p className="mt-2 text-gray-500">Try adjusting your search or filter criteria.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 inline-flex items-center"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            Add Category
          </button>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> categories
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>
            {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 rounded-md ${
                    page === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {pagination.totalPages > 5 && (
              <>
                <span className="px-2">...</span>
                <button
                  onClick={() => setPage(pagination.totalPages)}
                  className={`px-3 py-1 rounded-md ${
                    page === pagination.totalPages
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

     
    </div>
  );
};

export default CategoriesManagement;