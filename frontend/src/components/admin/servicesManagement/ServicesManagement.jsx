// ServicesManagement.jsx - Professional UI Update
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
  useAdminServices, 
  useBulkServiceOperations,
  useCategoriesForDropdown,
  useUsersForDropdown,
  useBulkRestoreServices,
  useExportServices
} from '../../../hooks/useAdminDashboard';
import { useUpdateService, useDeleteService, useCreateService } from '../../../hooks/useServices';
import { useServiceToast } from '../../../hooks/useServiceToast';
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
  FiStar,
  FiX,
  FiRotateCcw,
  FiLoader,
  FiTrendingUp,
  FiShoppingCart,
  FiMessageSquare,
  FiHeart,
  FiDownload,
  FiExternalLink,
  FiCopy,
  FiUnlock,
  FiLock
} from 'react-icons/fi';
import { format } from 'date-fns';
import ServiceEditModal from './ServiceEditModal';
import ServiceDetailsModal from './ServiceDetailsModal';
import ServiceDeleteModal from './ServiceDeleteModal';

// Service Table Row Component
const ServiceTableRow = memo(({
  service,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onFeatureToggle,
  onStatusToggle,
  onOpenActionMenu,
  actionMenuId,
  isUpdatingId,
  isDeletingId
}) => {
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700 border border-green-200',
      draft: 'bg-gray-100 text-gray-700 border border-gray-200',
      pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      paused: 'bg-orange-100 text-orange-700 border border-orange-200',
      suspended: 'bg-red-100 text-red-700 border border-red-200'
    };
    return colors[status] || colors.draft;
  };

  const isUpdating = isUpdatingId === service._id;
  const isDeleting = isDeletingId === service._id;
  const status = service?.status || 'draft';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <React.Fragment>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(service._id)}
            disabled={isDeleting}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center">
            <button
              onClick={() => !isDeleting && onToggleExpand(service._id)}
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
                <p className="text-sm font-medium text-gray-900">{service.title}</p>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {service.category?.name || 'No category'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                By {service.createdBy?.name || 'Unknown'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
              {statusText}
            </span>
            {service.isFeatured && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                <FiStar className="h-3 w-3 mr-1" />
                FEATURED
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-900">
            <div className="flex items-center gap-1">
              <FiDollarSign className="h-4 w-4 text-gray-400" />
              <span className="font-medium">
                ${(service.price || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <FiClock className="h-3 w-3 inline mr-1" />
              {service.deliveryTime || 0} {service.deliveryTimeUnit || 'days'}
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
              <FiUser className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-medium">{service.createdBy?.name || 'Unknown'}</div>
              <div className="text-xs text-gray-500">{service.createdBy?.email || ''}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="text-sm text-gray-500">
            {service.createdAt ? format(new Date(service.createdAt), 'MMM d, yyyy') : 'N/A'}
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => !isDeleting && onView(service)}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => !isDeleting && onEdit(service)}
              disabled={isDeleting || isUpdating}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Service"
            >
              {isUpdating ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                <FiEdit2 className="h-4 w-4" />
              )}
            </button>
            
            <div className="relative">
              <button
                onClick={() => !isDeleting && onOpenActionMenu(actionMenuId === service._id ? null : service._id)}
                disabled={isDeleting}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === service._id && !isDeleting && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => onOpenActionMenu(null)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Quick Actions
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onFeatureToggle(service);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiStar className="h-4 w-4 mr-3" />
                        {service.isFeatured ? 'Remove Featured' : 'Mark as Featured'}
                      </button>
                      
                      {status === 'active' ? (
                        <button
                          onClick={() => {
                            onStatusToggle(service, 'paused');
                            onOpenActionMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FiLock className="h-4 w-4 mr-3" />
                          Pause Service
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onStatusToggle(service, 'active');
                            onOpenActionMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FiUnlock className="h-4 w-4 mr-3" />
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
                        <FiTrash2 className="h-4 w-4 mr-3" />
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
          <td colSpan="7" className="px-6 py-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-gray-700">
                  {service.description?.substring(0, 150) || 'No description'}
                  {service.description?.length > 150 && '...'}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stats</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FiEye className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{service.views || 0} views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiShoppingCart className="h-4 w-4 text-blue-400" />
                    <span className="text-sm">{service.ordersCount || 0} orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiStar className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm">{service.rating?.toFixed(1) || '0.0'} rating</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {service.tags?.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 text-xs bg-gray-100 rounded border border-gray-200">
                      {tag}
                    </span>
                  ))}
                  {(!service.tags || service.tags.length === 0) && (
                    <span className="text-sm text-gray-400">No tags</span>
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

ServiceTableRow.displayName = 'ServiceTableRow';

// Main Component
const ServicesManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    featured: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    minPrice: '',
    maxPrice: '',
    category: ''
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
  const [updatingServiceId, setUpdatingServiceId] = useState(null);
  const [deletingServiceId, setDeletingServiceId] = useState(null);

  const limit = 12;
  
  const {
    showServiceLoading,
    showServiceSuccess,
    showServiceError,
    showServiceWarning,
    dismissServiceToast
  } = useServiceToast();
  
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
    includeInactive: true
  });
  
  const { data: categoriesData } = useCategoriesForDropdown();
  const { data: usersData } = useUsersForDropdown();
  
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const createServiceMutation = useCreateService();
  const bulkServiceMutation = useBulkServiceOperations();
  const bulkRestoreMutation = useBulkRestoreServices();
  const exportServicesMutation = useExportServices();

  const services = useMemo(() => {
    if (!data?.data) return [];
    return data.data;
  }, [data]);
  
  const categories = categoriesData?.data || [];
  const users = usersData?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '') {
        setPage(1);
        refetch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, refetch]);

  const stats = useMemo(() => {
    return {
      total: pagination.total || services.length,
      active: services.filter(s => s.status === 'active').length,
      draft: services.filter(s => s.status === 'draft').length,
      pending: services.filter(s => s.status === 'pending').length,
      paused: services.filter(s => s.status === 'paused').length,
      featured: services.filter(s => s.isFeatured).length,
      totalRevenue: services.reduce((sum, s) => sum + (s.price || 0) * (s.ordersCount || 0), 0)
    };
  }, [services, pagination.total]);

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
    if (selectedServices.length === 0) {
      showServiceWarning('Please select services first');
      return;
    }

    const loadingToastId = showServiceLoading(`Processing ${selectedServices.length} services...`);

    try {
      const operationMap = {
        'activate': 'activate',
        'pause': 'pause',
        'feature': 'feature',
        'unfeature': 'unfeature'
      };

      const operation = operationMap[action];
      
      await bulkServiceMutation.mutateAsync({
        ids: selectedServices,
        operation,
        data: action === 'activate' ? { status: 'active' } : 
              action === 'pause' ? { status: 'paused' } : {}
      });

      dismissServiceToast(loadingToastId);
      showServiceSuccess(`${selectedServices.length} services ${action}d successfully`);
      setSelectedServices([]);
      refetch();
    } catch (error) {
      dismissServiceToast(loadingToastId);
      showServiceError(error.response?.data?.message || 'Failed to perform bulk action');
    }
  }, [selectedServices, bulkServiceMutation, refetch, showServiceLoading, showServiceSuccess, showServiceError, showServiceWarning, dismissServiceToast]);

  const handleUpdateService = useCallback(async (serviceData) => {
    if (!selectedService) return;
    
    const loadingToastId = showServiceLoading('Updating service...');
    setUpdatingServiceId(selectedService._id);
    
    try {
      await updateServiceMutation.mutateAsync({
        id: selectedService._id,
        data: serviceData
      });
      dismissServiceToast(loadingToastId);
      showServiceSuccess('Service updated successfully');
      setShowEditModal(false);
      setSelectedService(null);
      setUpdatingServiceId(null);
      refetch();
    } catch (error) {
      dismissServiceToast(loadingToastId);
      setUpdatingServiceId(null);
      showServiceError(error.response?.data?.message || 'Failed to update service');
      throw error;
    }
  }, [selectedService, updateServiceMutation, refetch, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast]);

  const handleDeleteService = useCallback(async (deleteOptions) => {
    const loadingToastId = showServiceLoading('Deleting service...');
    setDeletingServiceId(deleteOptions.id);
    
    try {
      await deleteServiceMutation.mutateAsync(deleteOptions);
      dismissServiceToast(loadingToastId);
      showServiceSuccess('Service deleted successfully');
      setShowDeleteModal(false);
      setSelectedService(null);
      setDeletingServiceId(null);
      refetch();
    } catch (error) {
      dismissServiceToast(loadingToastId);
      setDeletingServiceId(null);
      showServiceError(error.response?.data?.message || 'Failed to delete service');
      throw error;
    }
  }, [deleteServiceMutation, refetch, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast]);

  const toggleFeature = useCallback(async (service) => {
    const loadingToastId = showServiceLoading(
      service.isFeatured ? 'Removing featured status...' : 'Setting as featured...'
    );
    
    try {
      setUpdatingServiceId(service._id);
      
      await updateServiceMutation.mutateAsync({
        id: service._id,
        data: { isFeatured: !service.isFeatured }
      });
      
      dismissServiceToast(loadingToastId);
      showServiceSuccess(
        `Service ${!service.isFeatured ? 'marked as featured' : 'removed from featured'} successfully`
      );
      refetch();
    } catch (error) {
      dismissServiceToast(loadingToastId);
      showServiceError(error.response?.data?.message || 'Failed to update feature status');
    } finally {
      setUpdatingServiceId(null);
    }
  }, [updateServiceMutation, refetch, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast]);

  const toggleStatus = useCallback(async (service, newStatus) => {
    const loadingToastId = showServiceLoading(`Updating status to ${newStatus}...`);
    
    try {
      setUpdatingServiceId(service._id);
      
      await updateServiceMutation.mutateAsync({
        id: service._id,
        data: { status: newStatus }
      });
      
      dismissServiceToast(loadingToastId);
      showServiceSuccess(`Service status updated to ${newStatus}`);
      refetch();
    } catch (error) {
      dismissServiceToast(loadingToastId);
      showServiceError(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingServiceId(null);
    }
  }, [updateServiceMutation, refetch, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast]);

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

  const handleEdit = useCallback((service) => {
    setSelectedService(service);
    setShowEditModal(true);
  }, []);

  const handleView = useCallback((service) => {
    setSelectedService(service);
    setShowDetailsModal(true);
  }, []);

  const handleDelete = useCallback((service) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  }, []);

  const refreshData = useCallback(() => {
    refetch();
    setSelectedServices([]);
    setExpandedServices([]);
    showServiceSuccess('Data refreshed');
  }, [refetch, showServiceSuccess]);

  const exportServices = useCallback(async () => {
    const loadingToastId = showServiceLoading('Exporting services...');
    
    try {
      const response = await exportServicesMutation.mutateAsync('csv');
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `services_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      dismissServiceToast(loadingToastId);
      showServiceSuccess('Services exported successfully');
    } catch (error) {
      dismissServiceToast(loadingToastId);
      showServiceError('Failed to export services');
    }
  }, [exportServicesMutation, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast]);

  const handleCreateService = useCallback(() => {
    window.open('/admin/service/create', '_blank');
  }, []);

  const isUpdating = updateServiceMutation.isLoading;
  const isDeleting = deleteServiceMutation.isLoading;
  const isCreating = createServiceMutation.isLoading;
  const isBulkOperating = bulkServiceMutation.isLoading || bulkRestoreMutation.isLoading;
  const isExporting = exportServicesMutation.isLoading;
  const isTableLoading = isLoading || isRefetching;

  if (isTableLoading && !services.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor all platform services</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCreateService}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <FiPlus className="h-4 w-4" />
            Create Service
          </button>
          <button
            onClick={exportServices}
            disabled={isExporting}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <FiDownload className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={refreshData}
            disabled={isRefetching || isBulkOperating}
            className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Services</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FiPackage className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FiCheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{stats.draft}</p>
            </div>
            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <FiEdit2 className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Featured</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.featured}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiStar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FiClock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                ${(stats.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiDollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedServices.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiPackage className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-indigo-900">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
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
                onClick={() => handleBulkAction('pause')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiXCircle className="h-4 w-4" />
                Pause
              </button>
              <button
                onClick={() => handleBulkAction('feature')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiStar className="h-4 w-4" />
                Feature
              </button>
              <button
                onClick={() => handleBulkAction('unfeature')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <FiStar className="h-4 w-4" />
                Unfeature
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
                placeholder="Search services by title, description, or tags..."
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
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paused">Paused</option>
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
                {categories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
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
                <option value="price">Price</option>
                <option value="title">Title</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedServices.length === services.length && services.length > 0}
                    onChange={toggleSelectAll}
                    disabled={isBulkOperating}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Service Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Price & Delivery
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
              {services.map((service) => (
                <ServiceTableRow
                  key={service._id}
                  service={service}
                  isExpanded={expandedServices.includes(service._id)}
                  isSelected={selectedServices.includes(service._id)}
                  onToggleExpand={toggleExpandService}
                  onToggleSelect={toggleSelectService}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onFeatureToggle={toggleFeature}
                  onStatusToggle={toggleStatus}
                  onOpenActionMenu={setActionMenu}
                  actionMenuId={actionMenu}
                  isUpdatingId={updatingServiceId}
                  isDeletingId={deletingServiceId}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {services.length === 0 && !isTableLoading && (
          <div className="text-center py-16">
            <FiPackage className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No services found</h3>
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
                <span className="font-medium">{pagination.total}</span> services
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
      {showEditModal && selectedService && (
        <ServiceEditModal
          service={selectedService}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedService(null);
          }}
          onSubmit={handleUpdateService}
          loading={isUpdating}
          categories={categories}
          users={users}
        />
      )}

      {showDetailsModal && selectedService && (
        <ServiceDetailsModal
          service={selectedService}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedService(null);
          }}
          onEdit={handleEdit}
          onDelete={handleDelete}
          categories={categories}
          users={users}
        />
      )}

      {showDeleteModal && selectedService && (
        <ServiceDeleteModal
          service={selectedService}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedService(null);
          }}
          onDelete={handleDeleteService}
          loading={isDeleting}
        />
      )}
    </div>
  );
};

export default ServicesManagement;