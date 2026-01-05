import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
  useAdminServices, 
  useUpdateService, 
  useDeleteService, 
  useBulkServiceOperations,
  useCreateService,
  useCategoriesForDropdown,
  useUsersForDropdown
} from '../../../hooks/useAdminDashboard';
import { toast } from 'react-hot-toast';
import {
  FiPackage,
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
  FiStar,
  FiX
} from 'react-icons/fi';
import { format } from 'date-fns';
import ServiceEditModal from './ServiceEditModal';
import ServiceDetailsModal from './ServiceDetailsModal';
import ServiceDeleteModal from './ServiceDeleteModal';

// Memoized table row for list view with expandable rows
const ServiceTableRow = memo(({
  service,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onOpenActionMenu,
  actionMenuId,
  onFeatureToggle,
  onStatusToggle,
  onDuplicate,
  formatPrice
}) => {
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      paused: 'bg-orange-100 text-orange-800',
      denied: 'bg-red-100 text-red-800',
      suspended: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || colors.draft;
  };

  // Get status with fallback
  const status = service?.status || 'draft';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <React.Fragment>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(service._id)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onToggleExpand(service._id)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {isExpanded ? (
                <FiChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <FiChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <div>
              <div className="text-sm font-medium text-gray-900 line-clamp-1">
                {service?.title || 'Untitled Service'}
              </div>
              {service?.createdBy?.name && (
                <div className="text-xs text-gray-500 mt-1">By {service.createdBy.name}</div>
              )}
              {service?.category?.name && (
                <div className="text-xs text-gray-400 mt-0.5">{service.category.name}</div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
              {statusText}
            </span>
            {service?.isFeatured && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                Featured
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-1">
            <FiDollarSign className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">
              {formatPrice(service?.price || 0, service?.currency || 'USD')}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {service?.deliveryTime || 0} {service?.deliveryTimeUnit || 'days'}
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
              <FiUser className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-medium">{service?.createdBy?.name || 'Unknown'}</div>
              <div className="text-xs text-gray-500">{service?.createdBy?.email || ''}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 text-sm text-gray-500">
          {service?.createdAt ? format(new Date(service.createdAt), 'MMM d, yyyy') : 'N/A'}
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onView(service)}
              className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEdit(service)}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit Service"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            
            {/* 3-dot menu */}
            <div className="relative">
              <button
                onClick={() => onOpenActionMenu(actionMenuId === service._id ? null : service._id)}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === service._id && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => onOpenActionMenu(null)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onDuplicate(service);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiCheckCircle className="h-4 w-4 mr-2" />
                        Duplicate Service
                      </button>
                      <button
                        onClick={() => {
                          onFeatureToggle(service);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-purple-600 hover:bg-purple-50"
                      >
                        <FiStar className="h-4 w-4 mr-2" />
                        {service?.isFeatured ? 'Remove Featured' : 'Mark as Featured'}
                      </button>
                      {status === 'active' ? (
                        <button
                          onClick={() => {
                            onStatusToggle(service, 'paused');
                            onOpenActionMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                        >
                          <FiXCircle className="h-4 w-4 mr-2" />
                          Pause Service
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onStatusToggle(service, 'active');
                            onOpenActionMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                        >
                          <FiCheckCircle className="h-4 w-4 mr-2" />
                          Activate Service
                        </button>
                      )}
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          onDelete(service);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4 mr-2" />
                        Delete Service
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
                  {service.description?.substring(0, 150) || 'No description'}
                  {service.description?.length > 150 && '...'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Details</div>
                <div className="text-sm">
                  <div><span className="text-gray-500">Revisions:</span> {service.revisions || 1}</div>
                  <div><span className="text-gray-500">Delivery:</span> {service.deliveryTime || 0} {service.deliveryTimeUnit || 'days'}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Tags</div>
                <div className="text-sm">
                  <div className="flex flex-wrap gap-1">
                    {service.tags?.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-gray-100 rounded">
                        {tag}
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

ServiceTableRow.displayName = 'ServiceTableRow';

// Main ServicesManagement Component
const ServicesManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    featured: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    minPrice: '',
    maxPrice: '',
    category: '',
    isActive: ''
  });
  const [page, setPage] = useState(1);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedServices, setExpandedServices] = useState([]);

  const limit = 12;
  
  // Fetch data
  const { 
    data, 
    isLoading, 
    refetch, 
    isRefetching 
  } = useAdminServices({
    page,
    limit,
    search: searchTerm,
    status: filters.status || undefined,
    featured: filters.featured || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    category: filters.category || undefined,
    isActive: filters.isActive || undefined
  });
  
  // Fetch categories and users
  const { data: categoriesData } = useCategoriesForDropdown();
  const { data: usersData } = useUsersForDropdown();
  
  // Use mutations
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const createServiceMutation = useCreateService();
  const bulkServiceMutation = useBulkServiceOperations();
  
  // Memoized derived data
  const services = useMemo(() => {
    if (!data?.data) return [];
    
    return data.data.map(service => ({
      ...service,
      // Ensure category is properly structured
      category: service.category?._id ? {
        _id: service.category._id,
        name: service.category.name,
        description: service.category.description
      } : null
    }));
  }, [data]);
  
  const categories = useMemo(() => categoriesData?.data || [], [categoriesData]);
  const users = useMemo(() => usersData?.data || [], [usersData]);
  const pagination = data?.pagination || { total: 0, totalPages: 1 };
  const stats = data?.stats || {};

  const serviceStats = useMemo(() => ({
    total: stats.total || 0,
    active: stats.active || 0,
    featured: stats.featured || 0,
  }), [stats.total, stats.active, stats.featured]);

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

  const handleViewService = useCallback((service) => {
    setSelectedService(service);
    setShowDetailsModal(true);
  }, []);

  const handleEditService = useCallback((service) => {
    setSelectedService(service);
    setShowEditModal(true);
  }, []);

  const handleDeleteServiceClick = useCallback((service) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  }, []);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedServices.length === 0) {
      toast.error('Please select services first');
      return;
    }
    
    setShowDeleteModal(true);
  }, [selectedServices]);

  const handleSubmitEdit = useCallback(async (formData) => {
    if (!selectedService) return;
    
    try {
      await updateServiceMutation.mutateAsync({
        id: selectedService._id,
        data: formData
      });
      toast.success('Service updated successfully');
      setShowEditModal(false);
      setSelectedService(null);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Failed to update service');
    }
  }, [selectedService, updateServiceMutation, refetch]);

  const handleSubmitDelete = useCallback(async (deleteOptions) => {
    try {
      if (selectedServices.length > 1) {
        // Handle bulk deletion
        const deletePromises = selectedServices.map(id => 
          deleteServiceMutation.mutateAsync({
            id,
            permanent: deleteOptions?.permanent || false,
            force: deleteOptions?.force || false
          })
        );
        
        await Promise.all(deletePromises);
        toast.success(`${selectedServices.length} services deleted successfully`);
        setSelectedServices([]);
      } else {
        // Handle single deletion
        await deleteServiceMutation.mutateAsync(deleteOptions);
        toast.success('Service deleted successfully');
      }
      
      setShowDeleteModal(false);
      setSelectedService(null);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Failed to delete service');
    }
  }, [selectedServices, deleteServiceMutation, refetch]);

  const handleBulkAction = useCallback(async (action) => {
    if (selectedServices.length === 0) {
      toast.error('Please select services first');
      return;
    }

    try {
      const operationMap = {
        'activate': 'activate',
        'pause': 'pause',
        'feature': 'feature',
        'unfeature': 'unfeature',
        'delete': 'delete'
      };

      const operation = operationMap[action];
      
      if (action === 'delete') {
        handleBulkDeleteClick();
        return;
      }

      await bulkServiceMutation.mutateAsync({
        ids: selectedServices,
        operation,
        data: action === 'activate' ? { status: 'active' } : 
              action === 'pause' ? { status: 'paused' } : {}
      });

      setSelectedServices([]);
      refetch();
      toast.success(`${selectedServices.length} services ${action}d`);
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  }, [selectedServices, bulkServiceMutation, refetch, handleBulkDeleteClick]);

  const duplicateService = useCallback(async (service) => {
    try {
      const duplicateData = {
        title: `${service.title} (Copy)`,
        description: service.description,
        category: service.category?._id || service.category,
        subcategory: service.subcategory?._id || service.subcategory,
        price: service.price,
        currency: service.currency || 'USD',
        deliveryTime: service.deliveryTime,
        deliveryTimeUnit: service.deliveryTimeUnit || 'days',
        revisions: service.revisions || 1,
        status: 'draft',
        tags: service.tags || [],
        features: service.features || [],
        shortDescription: service.shortDescription || ''
      };

      await createServiceMutation.mutateAsync(duplicateData);
      toast.success('Service duplicated successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to duplicate service');
    }
  }, [createServiceMutation, refetch]);

  const toggleFeature = useCallback(async (service) => {
    try {
      await updateServiceMutation.mutateAsync({
        id: service._id,
        data: { isFeatured: !service.isFeatured }
      });
      toast.success(`Service ${!service.isFeatured ? 'featured' : 'unfeatured'} successfully`);
      refetch();
    } catch (error) {
      toast.error('Failed to update feature status');
    }
  }, [updateServiceMutation, refetch]);

  const toggleStatus = useCallback(async (service, newStatus) => {
    try {
      await updateServiceMutation.mutateAsync({
        id: service._id,
        data: { status: newStatus }
      });
      toast.success(`Service status updated to ${newStatus}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update service status');
    }
  }, [updateServiceMutation, refetch]);

  const formatPrice = useCallback((price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  }, []);

  const applyFilters = useCallback(() => {
    setPage(1);
    refetch();
    toast.success('Filters applied');
  }, [refetch]);

  const clearFilters = useCallback(() => {
    setFilters({
      status: '',
      featured: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      minPrice: '',
      maxPrice: '',
      category: '',
      isActive: ''
    });
    setSearchTerm('');
    setPage(1);
    refetch();
    toast.success('Filters cleared');
  }, [refetch]);

  const refreshData = useCallback(() => {
    refetch();
    toast.success('Data refreshed');
  }, [refetch]);

  const toggleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      setSelectedServices(services.map(service => service._id));
    } else {
      setSelectedServices([]);
    }
  }, [services]);

  const toggleSelectService = useCallback((serviceId) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  }, []);

  const toggleExpandService = useCallback((serviceId) => {
    setExpandedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  }, []);

  // Create categories map for ServiceDetailsModal
  const categoriesMap = useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      map[cat._id] = cat;
      if (cat.subcategories) {
        cat.subcategories.forEach(sub => {
          map[sub._id] = sub;
        });
      }
    });
    return map;
  }, [categories]);

  // Create users map for ServiceDetailsModal
  const usersMap = useMemo(() => {
    const map = {};
    users.forEach(user => {
      map[user._id] = user;
    });
    return map;
  }, [users]);

  if (isLoading && !services.length) {
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
          <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
          <p className="text-gray-600">Manage and monitor all platform services</p>
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
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Services</p>
              <p className="text-2xl font-bold mt-1">{serviceStats.total}</p>
            </div>
            <FiPackage className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold mt-1">{serviceStats.active}</p>
            </div>
            <FiCheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      
      </div>

      {/* Bulk Actions */}
      {selectedServices.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <FiPackage className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="font-medium text-indigo-800">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
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
                onClick={() => handleBulkAction('pause')}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200 flex items-center space-x-1"
              >
                <FiXCircle className="h-4 w-4" />
                <span>Pause</span>
              </button>
              <button
                onClick={() => handleBulkAction('feature')}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 flex items-center space-x-1"
              >
                <FiStar className="h-4 w-4" />
                <span>Feature</span>
              </button>
              <button
                onClick={handleBulkDeleteClick}
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
                placeholder="Search services by title, description, or tags..."
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
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50"
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
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paused">Paused</option>
                <option value="suspended">Suspended</option>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedServices.length === services.length && services.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price & Delivery
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
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
              {services.map((service) => (
                <ServiceTableRow
                  key={service._id}
                  service={service}
                  isExpanded={expandedServices.includes(service._id)}
                  isSelected={selectedServices.includes(service._id)}
                  onToggleExpand={toggleExpandService}
                  onToggleSelect={toggleSelectService}
                  onView={handleViewService}
                  onEdit={handleEditService}
                  onDelete={handleDeleteServiceClick}
                  onOpenActionMenu={setActionMenu}
                  actionMenuId={actionMenu}
                  onFeatureToggle={toggleFeature}
                  onStatusToggle={toggleStatus}
                  onDuplicate={duplicateService}
                  formatPrice={formatPrice}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {services.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <FiPackage className="h-12 w-12 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No services found</h3>
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
                <span className="font-medium">{pagination.total}</span> services
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
      {showEditModal && selectedService && (
        <ServiceEditModal
          service={selectedService}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedService(null);
          }}
          onSubmit={handleSubmitEdit}
          loading={updateServiceMutation.isLoading}
          categories={categories}
          users={users}
        />
      )}

      {/* Service Details Modal */}
      {showDetailsModal && selectedService && (
        <ServiceDetailsModal
          service={selectedService}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedService(null);
          }}
          onEdit={() => {
            setShowDetailsModal(false);
            setShowEditModal(true);
          }}
          onDelete={() => {
            setShowDetailsModal(false);
            handleDeleteServiceClick(selectedService);
          }}
          onDuplicate={() => duplicateService(selectedService)}
          categoriesMap={categoriesMap}
          usersMap={usersMap}
          formatPrice={formatPrice}
        />
      )}

      {/* Delete Service Modal */}
      {showDeleteModal && selectedService && (
        <ServiceDeleteModal
          service={selectedService}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedService(null);
          }}
          onDelete={handleSubmitDelete}
          permanent={false}
          loading={deleteServiceMutation.isLoading}
        />
      )}
    </div>
  );
};

export default ServicesManagement;