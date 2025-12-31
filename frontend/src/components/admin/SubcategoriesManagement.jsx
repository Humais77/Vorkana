import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
  useAdminSubcategories, 
  useUpdateSubcategory, 
  useCreateSubcategory, 
  useDeleteSubcategory,
  useBulkSubcategoryOperations,
  useCategoriesForDropdown,useExportSubcategories, useSubcategoryStats 
} from '../../hooks/useAdminDashboard';
import { toast } from 'react-hot-toast';
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
  FiPackage,
  FiMoreVertical,
  FiChevronDown,
  FiChevronUp,
  FiTrendingUp,
  FiFolderPlus,
  FiX,
  FiClock
} from 'react-icons/fi';
import { format } from 'date-fns';
import SubcategoryCreateModal from './SubcategoryCreateModal';
import SubcategoryEditModal from './SubcategoryEditModal';
import SubcategoryDeleteModal from './SubcategoryDeleteModal';
import SubcategoryDetailsModal from './SubcategoryDetailsModal';

// Memoized table row component
const SubcategoryTableRow = memo(({ 
  subcategory, 
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
  categoriesMap
}) => {
  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border border-green-200' 
      : 'bg-red-100 text-red-800 border border-red-200';
  };

  return (
    <React.Fragment>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(subcategory._id)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onToggleExpand(subcategory._id)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {isExpanded ? (
                <FiChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <FiChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <div>
              <div className="text-sm font-medium text-gray-900">{subcategory.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                Slug: {subcategory.slug || 'N/A'} • 
                Category: {subcategory.category?.name || categoriesMap[subcategory.category]?._id || 'N/A'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(subcategory.isActive)}`}>
              {subcategory.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="text-sm text-gray-900">
            {format(new Date(subcategory.createdAt), 'MMM d, yyyy')}
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView(subcategory)}
              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEdit(subcategory)}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit Subcategory"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => onOpenActionMenu(actionMenuId === subcategory._id ? null : subcategory._id)}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === subcategory._id && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => onOpenActionMenu(null)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onDuplicate(subcategory);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <span className="mr-2">📋</span>
                        Duplicate
                      </button>
                      <button
                        onClick={() => {
                          onDelete(subcategory);
                          onOpenActionMenu(null);
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
          <td colSpan="5" className="px-4 py-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Description</div>
                <div className="text-sm text-gray-700">
                  {subcategory.description || 'No description provided'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Stats</div>
                <div className="text-sm">
                  <div><span className="text-gray-500">Services:</span> {subcategory.servicesCount || 0}</div>
                  <div><span className="text-gray-500">Gigs:</span> {subcategory.gigsCount || 0}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Settings</div>
                <div className="text-sm">
                  <div><span className="text-gray-500">Order:</span> {subcategory.order || 0}</div>
                  <div><span className="text-gray-500">Category:</span> {categoriesMap[subcategory.category]?.name || 'N/A'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Last Updated</div>
                <div className="text-sm text-gray-700">
                  {format(new Date(subcategory.updatedAt), 'MMM d, yyyy HH:mm')}
                </div>
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
  const [showSubcategoryDetails, setShowSubcategoryDetails] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedSubcategories, setExpandedSubcategories] = useState([]);

  const limit = 20;
  
  // React Query hooks
  const { 
    data, 
    isLoading, 
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
const { data: subcategoryStatsData } = useSubcategoryStats();
  const subcategories = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPage(1);
        refetch();
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm, refetch]);

  // Create categories map for quick lookup
  const categoriesMap = useMemo(() => {
    return categories.reduce((map, cat) => {
      map[cat._id] = cat;
      return map;
    }, {});
  }, [categories]);

  // Memoized handlers
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
    if (selectedSubcategories.length === 0) {
      toast.error('Please select subcategories first');
      return;
    }

    try {
      const bulkData = {
        ids: selectedSubcategories,
        operation: action
      };

      await bulkOperationsMutation.mutateAsync(bulkData);
      setSelectedSubcategories([]);
      refetch();
      toast.success(`${selectedSubcategories.length} subcategories ${action}ed successfully`);
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  }, [selectedSubcategories, bulkOperationsMutation, refetch]);

  const handleCreateSubcategory = useCallback(async (subcategoryData) => {
    try {
      await createSubcategoryMutation.mutateAsync(subcategoryData);
      toast.success('Subcategory created successfully');
      setShowCreateModal(false);
      refetch();
    } catch (error) {
      throw error;
    }
  }, [createSubcategoryMutation, refetch]);

  const handleUpdateSubcategory = useCallback(async (subcategoryData) => {
    if (!selectedSubcategory) return;
    
    try {
      await updateSubcategoryMutation.mutateAsync({
        id: selectedSubcategory._id,
        data: subcategoryData
      });
      toast.success('Subcategory updated successfully');
      setShowEditModal(false);
      setSelectedSubcategory(null);
      refetch();
    } catch (error) {
      throw error;
    }
  }, [selectedSubcategory, updateSubcategoryMutation, refetch]);

  const handleDeleteSubcategory = useCallback(async (deleteOptions) => {
    try {
      await deleteSubcategoryMutation.mutateAsync(deleteOptions);
      toast.success('Subcategory deleted successfully');
      setShowDeleteModal(false);
      setSelectedSubcategory(null);
      refetch();
    } catch (error) {
      throw error;
    }
  }, [deleteSubcategoryMutation, refetch]);

  const handleDuplicate = useCallback(async (subcategory) => {
    try {
      const duplicateData = {
        name: `${subcategory.name} (Copy)`,
        description: subcategory.description,
        category: subcategory.category?._id || subcategory.category || '',
        order: subcategory.order + 1,
        isActive: subcategory.isActive,
        metaTitle: subcategory.metaTitle,
        metaDescription: subcategory.metaDescription
      };
      
      await createSubcategoryMutation.mutateAsync(duplicateData);
      toast.success('Subcategory duplicated successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to duplicate subcategory');
    }
  }, [createSubcategoryMutation, refetch]);

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
    setShowDeleteModal(true);
  }, []);
const exportSubcategories = useCallback(async () => {
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
    
    toast.success('Subcategories exported successfully');
  } catch (error) {
    toast.error('Failed to export subcategories');
  }
}, [exportSubcategoriesMutation]);
  const refreshData = useCallback(() => {
    refetch();
    setSelectedSubcategories([]);
    setExpandedSubcategories([]);
    toast.success('Data refreshed');
  }, [refetch]);

  // Memoized stats calculation
  const stats = useMemo(() => {
    const active = subcategories.filter(s => s.isActive).length;
    const totalServices = subcategories.reduce((sum, sub) => sum + (sub.servicesCount || 0), 0);
    const totalGigs = subcategories.reduce((sum, sub) => sum + (sub.gigsCount || 0), 0);

    return {
      total: pagination.total || subcategories.length,
      active,
      totalServices,
      totalGigs
    };
  }, [subcategories, pagination.total]);

  if (isLoading && !subcategories.length) {
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
          <h1 className="text-2xl font-bold text-gray-900">Subcategory Management</h1>
          <p className="text-gray-600">Organize and manage subcategories within categories</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
  onClick={exportSubcategories}
  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
>
  <FiDownload className="h-4 w-4" />
  <span>Export</span>
</button>
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
            <span>Add Subcategory</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Subcategories</p>
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
              <p className="text-sm text-gray-600">Services</p>
              <p className="text-2xl font-bold text-orange-600">{stats.totalServices}</p>
            </div>
            <FiPackage className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gigs</p>
              <p className="text-2xl font-bold text-teal-600">{stats.totalGigs}</p>
            </div>
            <FiFolderPlus className="h-8 w-8 text-teal-600" />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedSubcategories.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <FiFolder className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-medium text-indigo-800">
                  {selectedSubcategories.length} subcategor{selectedSubcategories.length > 1 ? 'ies' : 'y'} selected
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
      {subcategoryStatsData && (
  <div className="bg-white rounded-lg border border-gray-200 p-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Subcategory Distribution</h3>
    <div className="space-y-3">
      {subcategoryStatsData?.data?.byCategory?.slice(0, 5).map((item, index) => (
        <div key={index} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full" 
                 style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}></div>
            <span className="text-sm text-gray-700 truncate">
              {item.category?.name || 'Unknown'}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-900">{item.count}</span>
            <span className="text-xs text-gray-500">
              {item.totalServices} services
            </span>
          </div>
        </div>
      ))}
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
                placeholder="Search subcategories by name, slug, or description..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50"
          >
            <FiFilter className="h-4 w-4" />
            <span className="hidden md:inline">Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="order">Sort Order</option>
                <option value="updatedAt">Last Updated</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Subcategories Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedSubcategories.length === subcategories.length && subcategories.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcategory Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
                  onDuplicate={handleDuplicate}
                  onOpenActionMenu={setActionMenu}
                  actionMenuId={actionMenu}
                  categoriesMap={categoriesMap}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {subcategories.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FiFolder className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No subcategories found</h3>
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
                <span className="font-medium">{pagination.total}</span> subcategories
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

      {/* Modals */}
      {showCreateModal && (
        <SubcategoryCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSubcategory}
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
          loading={updateSubcategoryMutation.isPending}
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
          onDuplicate={handleDuplicate}
          categoriesMap={categoriesMap}
        />
      )}
      
      {showDeleteModal && selectedSubcategory && (
        <SubcategoryDeleteModal
          subcategory={selectedSubcategory}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedSubcategory(null);
          }}
          onDelete={handleDeleteSubcategory}
        />
      )}
    </div>
  );
};

export default SubcategoriesManagement;