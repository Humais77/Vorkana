import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
  useAdminServices, 
  useUpdateService, 
  useDeleteService, 
  useBulkServiceOperations,
  useCreateService,
  useCategoriesForDropdown,
  useUsersForDropdown
} from '../../hooks/useAdminDashboard';
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
  FiX,
  FiSave,
  FiUpload,
  FiImage,
  FiTag,
  FiChevronLeft,
  FiChevronRight,
  FiList,
  FiRefreshCw,
  FiStar,
  FiCalendar,
  FiMoreVertical,
  FiDollarSign,
  FiClock,
  FiUsers,
  FiActivity,
  FiCopy,
  FiThumbsUp,
  FiPlay,
  FiPause,
  FiFileText,
  FiAlertTriangle
} from 'react-icons/fi';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ServiceCreateModal from './ServiceCreateModal';
import ServiceEditModal from './ServiceEditModal';
import ServiceDetailsModal from './ServiceDetailsModal';
import ServiceDeleteModal from './ServiceDeleteModal';

// Memoized table row for list view with 3-dot menu
const ServiceTableRow = memo(({
  service,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onFeatureToggle,
  onStatusToggle,
  actionMenu,
  setActionMenu,
  formatPrice
}) => {
  const navigate = useNavigate();
  
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border border-green-200',
      draft: 'bg-gray-100 text-gray-800 border border-gray-200',
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      paused: 'bg-orange-100 text-orange-800 border border-orange-200',
      denied: 'bg-red-100 text-red-800 border border-red-200',
      suspended: 'bg-purple-100 text-purple-800 border border-purple-200'
    };
    return colors[status] || colors.draft;
  };

  // Get status with fallback
  const status = service?.status || 'draft';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-3">
          {service?.thumbnail ? (
            <img
              src={service.thumbnail}
              alt={service.title || 'Service'}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="h-12 w-12 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
              <FiPackage className="h-6 w-6 text-gray-400" />
            </div>
          )}
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
        <div className="text-sm font-semibold text-gray-900">
          {formatPrice(service?.price || 0, service?.currency || 'USD')}
        </div>
        <div className="text-xs text-gray-500">
          {service?.deliveryTime || 0} {service?.deliveryTimeUnit || 'days'}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
            {statusText}
          </span>
          {service?.isFeatured && (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              Featured
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-1">
          <FiActivity className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium">{service?.ordersCount || 0}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-1">
          <FiStar className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-medium">
            {(service?.rating || 0).toFixed(1)}
          </span>
          <span className="text-xs text-gray-400">
            ({service?.reviewsCount || 0})
          </span>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-gray-500">
        {service?.createdAt ? format(new Date(service.createdAt), 'MMM d, yyyy') : 'N/A'}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={onView}
            className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
            title="View Details"
          >
            <FiEye className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Edit Service"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          
          {/* 3-dot menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActionMenu(actionMenu === service?._id ? null : service?._id);
              }}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="More Actions"
            >
              <FiMoreVertical className="h-4 w-4" />
            </button>
            
            {actionMenu === service?._id && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setActionMenu(null)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onDuplicate();
                        setActionMenu(null);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FiCopy className="h-4 w-4 mr-2" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => {
                        onFeatureToggle();
                        setActionMenu(null);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-purple-600 hover:bg-purple-50"
                    >
                      <FiStar className="h-4 w-4 mr-2" />
                      {service?.isFeatured ? 'Remove Featured' : 'Mark as Featured'}
                    </button>
                    {status === 'active' ? (
                      <button
                        onClick={() => {
                          onStatusToggle('paused');
                          setActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                      >
                        <FiPause className="h-4 w-4 mr-2" />
                        Pause Service
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onStatusToggle('active');
                          setActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                      >
                        <FiPlay className="h-4 w-4 mr-2" />
                        Activate Service
                      </button>
                    )}
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={() => {
                        onDelete();
                        setActionMenu(null);
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
  );
});

ServiceTableRow.displayName = 'ServiceTableRow';

// Main ServicesManagement Component
const ServicesManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    featured: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    minPrice: '',
    maxPrice: '',
    category: '',
    rating: '',
    isActive: ''
  });
  const [page, setPage] = useState(1);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  
  // MODAL STATES
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);

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
    rating: filters.rating || undefined,
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
  const services = data?.data || [];
  const categories = useMemo(() => categoriesData?.data || [], [categoriesData]);
  const users = useMemo(() => usersData?.data || [], [usersData]);
  const pagination = data?.pagination || { total: 0, totalPages: 1 };
  const stats = data?.stats || {};

  const serviceStats = useMemo(() => ({
    total: stats.total || 0,
    active: stats.active || 0,
    featured: stats.featured || 0,
    orders: stats.orders || 0,
    revenue: stats.revenue || 0
  }), [stats.total, stats.active, stats.featured, stats.orders, stats.revenue]);

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

  // MODAL HANDLERS
  const handleCreateService = useCallback(() => {
    setShowCreateModal(true);
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
    setServiceToDelete({ type: 'single', id: service._id });
    setShowDeleteModal(true);
  }, []);

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedServices.length === 0) {
      toast.error('Please select services first');
      return;
    }
    
    setServiceToDelete({ type: 'bulk', ids: selectedServices });
    setShowDeleteModal(true);
  }, [selectedServices]);

  const handleSubmitCreate = useCallback(async (formData) => {
    try {
      await createServiceMutation.mutateAsync(formData);
      toast.success('Service created successfully');
      setShowCreateModal(false);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Failed to create service');
    }
  }, [createServiceMutation, refetch]);

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
      if (serviceToDelete.type === 'bulk') {
        // Handle bulk deletion
        const deletePromises = serviceToDelete.ids.map(id => 
          deleteServiceMutation.mutateAsync({
            id,
            permanent: deleteOptions?.permanent || false,
            force: deleteOptions?.force || false
          })
        );
        
        await Promise.all(deletePromises);
        toast.success(`${serviceToDelete.ids.length} services deleted successfully`);
        setSelectedServices([]);
      } else {
        // Handle single deletion
        await deleteServiceMutation.mutateAsync(deleteOptions);
        toast.success('Service deleted successfully');
      }
      
      setShowDeleteModal(false);
      setServiceToDelete(null);
      setSelectedService(null);
      refetch();
    } catch (error) {
      toast.error(error.message || 'Failed to delete service');
    }
  }, [serviceToDelete, deleteServiceMutation, refetch]);

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
      rating: '',
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
          <button
            onClick={handleCreateService}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <FiPlus className="h-4 w-4" />
            <span>Add Service</span>
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
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Featured</p>
              <p className="text-2xl font-bold mt-1">{serviceStats.featured}</p>
            </div>
            <FiStar className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold mt-1">{serviceStats.orders}</p>
            </div>
            <FiActivity className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-2xl font-bold mt-1">{formatPrice(serviceStats.revenue)}</p>
            </div>
            <FiDollarSign className="h-8 w-8 text-green-500" />
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
                <FiPlay className="h-4 w-4" />
                <span>Activate</span>
              </button>
              <button
                onClick={() => handleBulkAction('pause')}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200 flex items-center space-x-1"
              >
                <FiPause className="h-4 w-4" />
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
          
          <div className="flex items-center space-x-3">
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
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="0"
                min="0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="100000"
                min="0"
              />
            </div>
            
            <div className="col-span-1 md:col-span-3 lg:col-span-5 flex justify-end space-x-2 mt-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Services List View */}
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
                  Service
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
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
                  isSelected={selectedServices.includes(service._id)}
                  onSelect={() => toggleSelectService(service._id)}
                  onView={() => handleViewService(service)}
                  onEdit={() => handleEditService(service)}
                  onDelete={() => handleDeleteServiceClick(service)}
                  onDuplicate={() => duplicateService(service)}
                  onFeatureToggle={() => toggleFeature(service)}
                  onStatusToggle={(newStatus) => toggleStatus(service, newStatus)}
                  actionMenu={actionMenu}
                  setActionMenu={setActionMenu}
                  formatPrice={formatPrice}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {services.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FiPackage className="h-12 w-12 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No services found</h3>
          <p className="mt-2 text-gray-500">Try adjusting your search or filter criteria.</p>
          <button
            onClick={handleCreateService}
            className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            Create Service
          </button>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> services
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                      : 'border border-gray-300'
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
                      : 'border border-gray-300'
                  }`}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* Create Service Modal */}
      {showCreateModal && (
        <ServiceCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleSubmitCreate}
          loading={createServiceMutation.isLoading}
          categories={categories}
          users={users}
        />
      )}

      {/* Edit Service Modal */}
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
      {showDeleteModal && serviceToDelete && (
        <ServiceDeleteModal
          service={serviceToDelete.type === 'single' 
            ? services.find(s => s._id === serviceToDelete.id) || selectedService
            : null}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setServiceToDelete(null);
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