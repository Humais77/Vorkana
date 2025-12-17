import React from 'react';
import { useState, useMemo } from 'react';
import { useAdminCategories, useUpdateCategory, useCreateCategory, useDeleteCategory } from '../../hooks/useAdminDashboard';
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
  FiCopy,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
import { format } from 'date-fns';

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
    parentId: '',
    sortOrder: 0,
    metaTitle: '',
    metaDescription: '',
    slug: ''
  });
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);

  const limit = 20;
  const { data, isLoading, refetch, isRefetching } = useAdminCategories({
    page,
    limit,
    search: searchTerm,
    ...filters
  });
  
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();
  
  const categories = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  // Calculate category stats
  useMemo(() => {
    if (categories.length > 0) {
      const stats = {
        total: categories.length,
        active: categories.filter(c => c.isActive).length,
        featured: categories.filter(c => c.featured).length,
        services: categories.reduce((sum, cat) => sum + (cat.serviceCount || 0), 0)
      };
    }
  }, [categories]);

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
    if (selectedCategories.length === 0) {
      toast.error('Please select categories first');
      return;
    }

    try {
      switch (action) {
        case 'activate':
          await Promise.all(selectedCategories.map(id =>
            updateCategoryMutation.mutateAsync({ id, data: { isActive: true } })
          ));
          toast.success(`${selectedCategories.length} categories activated`);
          break;
        
        case 'deactivate':
          await Promise.all(selectedCategories.map(id =>
            updateCategoryMutation.mutateAsync({ id, data: { isActive: false } })
          ));
          toast.success(`${selectedCategories.length} categories deactivated`);
          break;
        
        case 'feature':
          await Promise.all(selectedCategories.map(id =>
            updateCategoryMutation.mutateAsync({ id, data: { featured: true } })
          ));
          toast.success(`${selectedCategories.length} categories featured`);
          break;
        
        case 'unfeature':
          await Promise.all(selectedCategories.map(id =>
            updateCategoryMutation.mutateAsync({ id, data: { featured: false } })
          ));
          toast.success(`${selectedCategories.length} categories unfeatured`);
          break;
        
        case 'delete':
          setCategoryToDelete({ type: 'bulk', ids: selectedCategories });
          setShowDeleteModal(true);
          return;
      }
      
      setSelectedCategories([]);
      refetch();
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          id: editingCategory._id,
          data: categoryForm
        });
        toast.success('Category updated successfully');
      } else {
        await createCategoryMutation.mutateAsync(categoryForm);
        toast.success('Category created successfully');
      }
      
      handleCloseModal();
      refetch();
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '📁',
      isActive: category.isActive,
      featured: category.featured || false,
      parentId: category.parentId || '',
      sortOrder: category.sortOrder || 0,
      metaTitle: category.metaTitle || '',
      metaDescription: category.metaDescription || '',
      slug: category.slug || ''
    });
    setShowEditModal(true);
  };

  const handleView = (category) => {
    setViewingCategory(category);
    setShowCategoryDetails(true);
  };

  const handleDelete = (category) => {
    setCategoryToDelete({ type: 'single', id: category._id });
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      icon: '📁',
      isActive: true,
      featured: false,
      parentId: '',
      sortOrder: 0,
      metaTitle: '',
      metaDescription: '',
      slug: ''
    });
  };

  const handleDeleteCategory = async () => {
    try {
      if (categoryToDelete.type === 'single') {
        await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
        toast.success('Category deleted successfully');
      } else if (categoryToDelete.type === 'bulk') {
        await Promise.all(categoryToDelete.ids.map(id =>
          deleteCategoryMutation.mutateAsync(id)
        ));
        toast.success(`${categoryToDelete.ids.length} categories deleted`);
      }
      setSelectedCategories([]);
      refetch();
    } catch (error) {
      toast.error('Failed to delete categories');
    } finally {
      setShowDeleteModal(false);
      setCategoryToDelete(null);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCategories(categories.map(cat => cat._id));
    } else {
      setSelectedCategories([]);
    }
  };

  const toggleSelectCategory = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getStatusColor = (status) => {
    return status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getFeaturedColor = (featured) => {
    return featured ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
  };

  const refreshData = () => {
    refetch();
    toast.success('Data refreshed');
  };

  const duplicateCategory = async (category) => {
    try {
      const newCategory = {
        name: `${category.name} (Copy)`,
        description: category.description,
        icon: category.icon,
        isActive: category.isActive,
        featured: category.featured,
        parentId: category.parentId,
        sortOrder: category.sortOrder + 1,
        slug: `${category.slug}-copy`
      };
      
      await createCategoryMutation.mutateAsync(newCategory);
      toast.success('Category duplicated successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to duplicate category');
    }
  };

  const generateSlug = (name) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const toggleExpandCategory = (categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

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
                onClick={() => handleBulkAction('feature')}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 flex items-center space-x-1"
              >
                <FiStar className="h-4 w-4" />
                <span>Feature</span>
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
                placeholder="Search categories by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </form>
          
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex space-x-2">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              
              <select
                value={filters.featured}
                onChange={(e) => handleFilterChange('featured', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Featured Status</option>
                <option value="true">Featured</option>
                <option value="false">Not Featured</option>
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
                <option value="sortOrder">Sort Order</option>
                <option value="updatedAt">Last Updated</option>
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

      {/* Categories Table */}
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
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Category Details
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Services
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
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category._id);
          
          return (
            <React.Fragment key={category._id}>
              {/* Main Row */}
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category._id)}
                    onChange={() => toggleSelectCategory(category._id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-3">
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleExpandCategory(category._id)}
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
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-1">
                    <FiPackage className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{category.serviceCount || 0}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {format(new Date(category.createdAt), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleView(category)}
                      className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      title="View Details"
                    >
                      <FiEye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit Category"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === category._id ? null : category._id)}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      >
                        <FiMoreVertical className="h-4 w-4" />
                      </button>
                      
                      {actionMenu === category._id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10"
                            onClick={() => setActionMenu(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  duplicateCategory(category);
                                  setActionMenu(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                <FiCopy className="h-4 w-4 mr-2" />
                                Duplicate
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(category);
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
                <tr key={`${category._id}-expanded`}>
                  <td colSpan="6" className="px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase">Description</div>
                        <div className="text-sm text-gray-700">
                          {category.description || 'No description provided'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase">Meta Information</div>
                        <div className="text-sm">
                          <div className="truncate"><span className="text-gray-500">Title:</span> {category.metaTitle || 'N/A'}</div>
                          <div className="truncate"><span className="text-gray-500">Keywords:</span> {category.metaKeywords?.join(', ') || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase">Statistics</div>
                        <div className="text-sm">
                          <div><span className="text-gray-500">Sort Order:</span> {category.sortOrder || 0}</div>
                          <div><span className="text-gray-500">Gigs:</span> {category.gigsCount || 0}</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase">Last Updated</div>
                        <div className="text-sm text-gray-700">
                          {format(new Date(category.updatedAt), 'MMM d, yyyy HH:mm')}
                        </div>
                        <div className="pt-2">
                          <button
                            onClick={() => handleView(category)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            View Full Details →
                          </button>
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
        {categories.length === 0 && (
          <div className="text-center py-12">
            <FiFolder className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No categories found</h3>
            <p className="mt-2 text-gray-500">Create your first category to get started.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <FiPlus className="h-4 w-4 inline mr-2" />
              Add Category
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

      {/* Create/Edit Modal - Larger Size */}
      {(showCreateModal || showEditModal) && (
        <CategoryModal
          isOpen={showCreateModal || showEditModal}
          isEditing={!!editingCategory}
          formData={categoryForm}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          onChange={setCategoryForm}
          onGenerateSlug={() => {
            if (categoryForm.name) {
              setCategoryForm({...categoryForm, slug: generateSlug(categoryForm.name)});
            }
          }}
        />
      )}

      {/* Category Details Modal */}
      {showCategoryDetails && viewingCategory && (
        <CategoryDetailsModal
          category={viewingCategory}
          onClose={() => {
            setShowCategoryDetails(false);
            setViewingCategory(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          type="category"
          itemToDelete={categoryToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setCategoryToDelete(null);
          }}
          onConfirm={handleDeleteCategory}
        />
      )}
    </div>
  );
};

// Category Modal Component - Larger Size
const CategoryModal = ({ isOpen, isEditing, formData, onClose, onSubmit, onChange, onGenerateSlug }) => {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Category' : 'Create New Category'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => onChange({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    placeholder="Enter category name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => onChange({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    rows="4"
                    placeholder="Enter category description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => onChange({...formData, icon: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      placeholder="Emoji or short text"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slug
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => onChange({...formData, slug: e.target.value})}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                        placeholder="URL-friendly name"
                      />
                      <button
                        type="button"
                        onClick={onGenerateSlug}
                        className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => onChange({...formData, sortOrder: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                    min="0"
                  />
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Settings</label>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => onChange({...formData, isActive: e.target.checked})}
                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-base text-gray-900 font-medium">Active</span>
                        <p className="text-sm text-gray-500">Category will be visible to users</p>
                      </div>
                    </label>
                    
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => onChange({...formData, featured: e.target.checked})}
                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-base text-gray-900 font-medium">Featured</span>
                        <p className="text-sm text-gray-500">Category will be highlighted as featured</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      value={formData.metaTitle}
                      onChange={(e) => onChange({...formData, metaTitle: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      placeholder="SEO title"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 50-60 characters</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meta Description
                    </label>
                    <textarea
                      value={formData.metaDescription}
                      onChange={(e) => onChange({...formData, metaDescription: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                      rows="3"
                      placeholder="SEO description"
                    />
                    <p className="text-xs text-gray-500 mt-1">Recommended: 150-160 characters</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parent Category
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => onChange({...formData, parentId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base"
                  >
                    <option value="">No parent category</option>
                    {/* You would map through existing categories here */}
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
                {isEditing ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Category Details Modal Component
const CategoryDetailsModal = ({ category, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Category Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiXCircle className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-indigo-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">{category.icon || '📁'}</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">{category.name}</h4>
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {category.featured && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      Featured
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Description */}
            {category.description && (
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Description</h5>
                <p className="text-gray-600">{category.description}</p>
              </div>
            )}
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Sort Order</p>
                <p className="font-medium">{category.sortOrder || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Services</p>
                <p className="font-medium">{category.serviceCount || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Gigs</p>
                <p className="font-medium">{category.gigsCount || 0}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium">{format(new Date(category.createdAt), 'MMM d, yyyy')}</p>
              </div>
            </div>
            
            {/* SEO Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">SEO Information</h5>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Slug</p>
                    <p className="font-mono text-sm bg-gray-50 p-2 rounded">{category.slug || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Meta Title</p>
                    <p className="text-sm">{category.metaTitle || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Meta Description</p>
                    <p className="text-sm">{category.metaDescription || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Technical Information</h5>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Category ID</p>
                    <p className="font-mono text-sm bg-gray-50 p-2 rounded">{category._id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="text-sm">{format(new Date(category.updatedAt), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created By</p>
                    <p className="text-sm">{category.createdBy?.name || 'System'}</p>
                  </div>
                </div>
              </div>
            </div>
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

// Delete Confirmation Modal Component
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
              : `Are you sure you want to delete ${itemToDelete.ids.length} ${type}${itemToDelete.ids.length > 1 ? 's' : ''}? This action cannot be undone.`}
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

export default CategoriesManagement;