// ServiceManagement.jsx - Updated with consistent toast handling
import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { 
  useAdminServices, 
  useBulkServiceOperations,
  useCategoriesForDropdown,
  useUsersForDropdown,
  useBulkRestoreServices
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
  FiChevronDown,
  FiChevronUp,
  FiStar,
  FiX,
  FiRotateCcw,
  FiCheck,
  FiAlertCircle,
  FiLoader,
  FiTrendingUp,
  FiShoppingCart,
  FiMessageSquare,
  FiHeart,
  FiDownload,
  FiUpload,
  FiExternalLink,
  FiCopy,
  FiUnlock,
  FiLock
} from 'react-icons/fi';
import { format } from 'date-fns';
import ServiceEditModal from './ServiceEditModal';
import ServiceDetailsModal from './ServiceDetailsModal';
import ServiceDeleteModal from './ServiceDeleteModal';
import StatsCard from './StatsCard';

// Enhanced Service Table Row Component
const ServiceTableRow = memo(({
  service,
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onView,
  onEdit,
  onDelete,
  onRestore,
  onOpenActionMenu,
  actionMenuId,
  onFeatureToggle,
  onStatusToggle,
  onDuplicate,
  formatPrice,
  loading,
  loadingServiceId,
  showToast
}) => {
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border border-green-200',
      draft: 'bg-gray-100 text-gray-800 border border-gray-200',
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      paused: 'bg-orange-100 text-orange-800 border border-orange-200',
      denied: 'bg-red-100 text-red-800 border border-red-200',
      suspended: 'bg-red-100 text-red-800 border border-red-200'
    };
    return colors[status] || colors.draft;
  };

  const status = service?.status || 'draft';
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  
  const isServiceLoading = loading && loadingServiceId === service._id;

  return (
    <React.Fragment>
      <tr className={`hover:bg-gray-50 transition-colors ${isServiceLoading ? 'opacity-75' : ''}`}>
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(service._id)}
            disabled={isServiceLoading}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
          />
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onToggleExpand(service._id)}
              disabled={isServiceLoading}
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
                <div className="text-sm font-medium text-gray-900 line-clamp-1">
                  {service?.title || 'Untitled Service'}
                </div>
                {isServiceLoading && (
                  <FiLoader className="h-3 w-3 animate-spin text-blue-500" />
                )}
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
            <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(status)}`}>
              {statusText}
            </span>
            {service?.isFeatured && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                Featured
              </span>
            )}
            {service?.isPopular && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                Popular
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
            {service.isActive ? (
              <>
                <button
                  onClick={() => onView(service)}
                  disabled={isServiceLoading}
                  className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-50"
                  title="View Details"
                >
                  <FiEye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onEdit(service)}
                  disabled={isServiceLoading}
                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                  title="Edit Service"
                >
                  <FiEdit2 className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onRestore(service)}
                disabled={isServiceLoading}
                className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded disabled:opacity-50"
                title="Restore Service"
              >
                <FiRotateCcw className="h-4 w-4" />
              </button>
            )}
            
            {/* Action Menu */}
            <div className="relative">
              <button
                onClick={() => onOpenActionMenu(actionMenuId === service._id ? null : service._id)}
                disabled={isServiceLoading}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === service._id && (
                <>
                  <div 
                    className="fixed inset-0 z-10"
                    onClick={() => onOpenActionMenu(null)}
                  />
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onView(service);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiEye className="h-4 w-4 mr-2" />
                        View Details
                      </button>
                      <button
                        onClick={() => {
                          onEdit(service);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                      >
                        <FiEdit2 className="h-4 w-4 mr-2" />
                        Edit Service
                      </button>
                      <button
                        onClick={() => {
                          onDuplicate(service);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiCopy className="h-4 w-4 mr-2" />
                        Duplicate
                      </button>
                      
                      {service.isActive && (
                        <>
                          <div className="border-t border-gray-100 my-1"></div>
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
                              <FiLock className="h-4 w-4 mr-2" />
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
                              <FiUnlock className="h-4 w-4 mr-2" />
                              Activate Service
                            </button>
                          )}
                        </>
                      )}
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      {service.isActive ? (
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
                      ) : (
                        <button
                          onClick={() => {
                            onRestore(service);
                            onOpenActionMenu(null);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50"
                        >
                          <FiRotateCcw className="h-4 w-4 mr-2" />
                          Restore Service
                        </button>
                      )}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Description</div>
                <div className="text-sm text-gray-700">
                  {service.description?.substring(0, 150) || 'No description'}
                  {service.description?.length > 150 && '...'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Stats</div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center">
                    <FiEye className="h-3 w-3 mr-1 text-gray-400" />
                    <span>{service.views || 0} views</span>
                  </div>
                  <div className="flex items-center">
                    <FiShoppingCart className="h-3 w-3 mr-1 text-blue-400" />
                    <span>{service.ordersCount || 0} orders</span>
                  </div>
                  <div className="flex items-center">
                    <FiStar className="h-3 w-3 mr-1 text-yellow-400" />
                    <span>{service.rating?.toFixed(1) || '0.0'} rating</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Delivery</div>
                <div className="text-sm">
                  <div><span className="text-gray-500">Time:</span> {service.deliveryTime || 0} {service.deliveryTimeUnit || 'days'}</div>
                  <div><span className="text-gray-500">Revisions:</span> {service.revisions || 1}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">Tags</div>
                <div className="text-sm">
                  <div className="flex flex-wrap gap-1">
                    {service.tags?.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs bg-gray-100 rounded border border-gray-200">
                        {tag}
                      </span>
                    ))}
                    {(!service.tags || service.tags.length === 0) && (
                      <span className="text-gray-400 text-xs">No tags</span>
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
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedServices, setExpandedServices] = useState([]);
  const [loadingServiceId, setLoadingServiceId] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  const limit = 12;
  
  // Use the service toast hook
  const {
    showServiceLoading,
    showServiceSuccess,
    showServiceError,
    showServiceWarning,
    dismissServiceToast
  } = useServiceToast();
  
  // Fetch data
  const { 
    data, 
    isLoading, 
    refetch, 
    isRefetching,
    error: fetchError
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
    isActive: filters.isActive || undefined,
    includeInactive: true
  });
  
  // Fetch categories and users
  const { data: categoriesData } = useCategoriesForDropdown();
  const { data: usersData } = useUsersForDropdown();
  
  // Use mutations
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const createServiceMutation = useCreateService();
  const bulkServiceMutation = useBulkServiceOperations();
  const bulkRestoreMutation = useBulkRestoreServices();
  
  // Show fetch error if exists
  useEffect(() => {
    if (fetchError) {
      showServiceError(fetchError);
    }
  }, [fetchError, showServiceError]);

  // Memoized derived data
  const services = useMemo(() => {
    if (!data?.data) return [];
    
    return data.data.map(service => ({
      ...service,
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

  // Memoized stats calculation
  const stats = useMemo(() => {
    const servicesList = services || [];
    
    return {
      total: servicesList.length,
      active: servicesList.filter(s => s.isActive && s.status === 'active').length,
      inactive: servicesList.filter(s => !s.isActive || s.status !== 'active').length,
      featured: servicesList.filter(s => s.isFeatured).length,
      draft: servicesList.filter(s => s.status === 'draft').length,
      pending: servicesList.filter(s => s.status === 'pending').length,
      suspended: servicesList.filter(s => s.status === 'suspended').length
    };
  }, [services]);

  const formatPrice = useCallback((price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim() !== searchTerm) {
        setSearchTerm(searchInput.trim());
        setPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, searchTerm]);

  // Memoized handlers
  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
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
      showServiceWarning('Please select services first');
      return;
    }
    
    setShowDeleteModal(true);
  }, [selectedServices, showServiceWarning]);

  const handleBulkRestoreClick = useCallback(async () => {
    if (selectedServices.length === 0) {
      showServiceWarning('Please select services first');
      return;
    }
    
    // Find inactive services
    const inactiveServices = services.filter(service => 
      selectedServices.includes(service._id) && (!service.isActive || service.status !== 'active')
    );
    
    if (inactiveServices.length === 0) {
      showServiceWarning('No inactive services selected');
      return;
    }
    
    // Show loading toast
    const loadingToastId = showServiceLoading(`Restoring ${inactiveServices.length} services...`);
    
    try {
      // Bulk restore
      const serviceIds = inactiveServices.map(s => s._id);
      await bulkRestoreMutation.mutateAsync(serviceIds);
      
      dismissServiceToast();
      showServiceSuccess(`${inactiveServices.length} services restored successfully`);
      setSelectedServices([]);
      refetch();
    } catch (error) {
      dismissServiceToast();
      showServiceError(error);
    }
  }, [selectedServices, services, bulkRestoreMutation, showServiceLoading, showServiceSuccess, showServiceError, showServiceWarning, dismissServiceToast, refetch]);

  const handleSubmitEdit = useCallback(async (formData) => {
    if (!selectedService) return;
    
    setLoadingServiceId(selectedService._id);
    const loadingToastId = showServiceLoading('Updating service...');
    
    try {
      await updateServiceMutation.mutateAsync({
        id: selectedService._id,
        data: formData
      });
      
      dismissServiceToast();
      showServiceSuccess('Service updated successfully');
      setShowEditModal(false);
      setSelectedService(null);
      refetch();
    } catch (error) {
      dismissServiceToast();
      showServiceError(error);
      // Re-throw error to be handled by modal
      throw error;
    } finally {
      setLoadingServiceId(null);
    }
  }, [selectedService, updateServiceMutation, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast, refetch]);

  const handleSubmitDelete = useCallback(async (deleteOptions) => {
    const loadingToastId = showServiceLoading('Deleting service...');
    
    try {
      setLoadingServiceId(deleteOptions.id);
      
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
        dismissServiceToast();
        showServiceSuccess(`${selectedServices.length} services deleted successfully`);
        setSelectedServices([]);
      } else {
        // Handle single deletion
        await deleteServiceMutation.mutateAsync(deleteOptions);
        dismissServiceToast();
        showServiceSuccess('Service deleted successfully');
      }
      
      setShowDeleteModal(false);
      setSelectedService(null);
      refetch();
    } catch (error) {
      dismissServiceToast();
      showServiceError(error);
      throw error;
    } finally {
      setLoadingServiceId(null);
    }
  }, [selectedServices, deleteServiceMutation, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast, refetch]);

  
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
        'unfeature': 'unfeature',
        'delete': 'delete',
        'restore': 'restore'
      };

      const operation = operationMap[action];
      
      if (action === 'delete') {
        handleBulkDeleteClick();
        dismissServiceToast();
        return;
      }
      
      if (action === 'restore') {
        handleBulkRestoreClick();
        dismissServiceToast();
        return;
      }

      await bulkServiceMutation.mutateAsync({
        ids: selectedServices,
        operation,
        data: action === 'activate' ? { status: 'active' } : 
              action === 'pause' ? { status: 'paused' } : {}
      });

      dismissServiceToast();
      showServiceSuccess(`${selectedServices.length} services ${action}d successfully`);
      setSelectedServices([]);
      refetch();
    } catch (error) {
      dismissServiceToast();
      showServiceError(error);
    }
  }, [selectedServices, bulkServiceMutation, handleBulkDeleteClick, handleBulkRestoreClick, showServiceLoading, showServiceSuccess, showServiceError, showServiceWarning, dismissServiceToast, refetch]);

  const duplicateService = useCallback(async (service) => {
    const loadingToastId = showServiceLoading('Duplicating service...');
    
    try {
      setLoadingServiceId(service._id);
      
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
        shortDescription: service.shortDescription || '',
        thumbnail: service.thumbnail,
        images: service.images || []
      };

      await createServiceMutation.mutateAsync(duplicateData);
      
      dismissServiceToast();
      showServiceSuccess('Service duplicated successfully');
      refetch();
    } catch (error) {
      dismissServiceToast();
      showServiceError(error);
    } finally {
      setLoadingServiceId(null);
    }
  }, [createServiceMutation, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast, refetch]);

  const toggleFeature = useCallback(async (service) => {
    const loadingToastId = showServiceLoading(
      service.isFeatured ? 'Removing featured status...' : 'Setting as featured...'
    );
    
    try {
      setLoadingServiceId(service._id);
      
      await updateServiceMutation.mutateAsync({
        id: service._id,
        data: { isFeatured: !service.isFeatured }
      });
      
      dismissServiceToast();
      showServiceSuccess(
        `Service ${!service.isFeatured ? 'marked as featured' : 'removed from featured'} successfully`
      );
      refetch();
    } catch (error) {
      dismissServiceToast();
      showServiceError(error);
    } finally {
      setLoadingServiceId(null);
    }
  }, [updateServiceMutation, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast, refetch]);

  const toggleStatus = useCallback(async (service, newStatus) => {
    const loadingToastId = showServiceLoading(`Updating status to ${newStatus}...`);
    
    try {
      setLoadingServiceId(service._id);
      
      await updateServiceMutation.mutateAsync({
        id: service._id,
        data: { status: newStatus }
      });
      
      dismissServiceToast();
      showServiceSuccess(`Service status updated to ${newStatus}`);
      refetch();
    } catch (error) {
      dismissServiceToast();
      showServiceError(error);
    } finally {
      setLoadingServiceId(null);
    }
  }, [updateServiceMutation, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast, refetch]);

  const applyFilters = useCallback(() => {
    setPage(1);
    refetch();
    showServiceSuccess('Filters applied');
  }, [refetch, showServiceSuccess]);

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
    setSearchInput('');
    setSearchTerm('');
    setPage(1);
    showServiceSuccess('Filters cleared');
  }, [showServiceSuccess]);

  const refreshData = useCallback(() => {
    const loadingToastId = showServiceLoading('Refreshing data...');
    
    refetch().then(() => {
      dismissServiceToast();
      showServiceSuccess('Data refreshed');
    }).catch((error) => {
      dismissServiceToast();
      showServiceError(error);
    });
  }, [refetch, showServiceLoading, showServiceSuccess, showServiceError, dismissServiceToast]);

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

  const handleCreateService = useCallback(() => {
    window.open('/admin/service/create', '_blank');
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

  // Loading states
  const isUpdating = updateServiceMutation.isLoading;
  const isDeleting = deleteServiceMutation.isLoading;
  const isCreating = createServiceMutation.isLoading;
  const isBulkOperating = bulkServiceMutation.isLoading || bulkRestoreMutation.isLoading;
  const isAnyLoading = isUpdating || isDeleting || isCreating || isBulkOperating;

  if (isLoading && !services.length) {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services Management</h1>
          <p className="text-gray-600">Manage and monitor all platform services</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCreateService}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <FiPlus className="h-4 w-4" />
            <span>Create Service</span>
          </button>
          <button
            onClick={refreshData}
            disabled={isRefetching || isAnyLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
          >
            <FiRefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatsCard
          title="Total Services"
          value={stats.total}
          icon={FiPackage}
          color="blue"
          description="All services"
        />
        <StatsCard
          title="Active"
          value={stats.active}
          icon={FiCheckCircle}
          color="green"
          description="Active services"
        />
        <StatsCard
          title="Inactive"
          value={stats.inactive}
          icon={FiXCircle}
          color="red"
          description="Inactive services"
        />
        <StatsCard
          title="Featured"
          value={stats.featured}
          icon={FiStar}
          color="purple"
          description="Featured services"
        />
        <StatsCard
          title="Draft"
          value={stats.draft}
          icon={FiEdit2}
          color="gray"
          description="Draft services"
        />
        <StatsCard
          title="Pending"
          value={stats.pending}
          icon={FiClock}
          color="yellow"
          description="Pending review"
        />
        <StatsCard
          title="Suspended"
          value={stats.suspended}
          icon={FiAlertCircle}
          color="orange"
          description="Suspended services"
        />
      </div>

      {/* Bulk Actions Bar */}
      {selectedServices.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiPackage className="h-5 w-5 text-indigo-600" />
              </div>
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
                disabled={isBulkOperating}
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
                onClick={() => handleBulkAction('pause')}
                disabled={isBulkOperating}
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
                    <span>Pause</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleBulkAction('feature')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200 flex items-center space-x-1 disabled:opacity-50"
              >
                {isBulkOperating ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiStar className="h-4 w-4" />
                    <span>Feature</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleBulkAction('restore')}
                disabled={isBulkOperating}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 flex items-center space-x-1 disabled:opacity-50"
              >
                {isBulkOperating ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiRotateCcw className="h-4 w-4" />
                    <span>Restore</span>
                  </>
                )}
              </button>
              <button
                onClick={handleBulkDeleteClick}
                disabled={isBulkOperating}
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

      {/* Search and Filters Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <form onSubmit={handleSearch} className="flex-1 md:mr-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search services by title, description, or tags..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              disabled={isAnyLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiFilter className="h-4 w-4" />
              <span className="hidden md:inline">Filters</span>
            </button>
            <button
              onClick={clearFilters}
              disabled={isAnyLoading}
              className="px-4 py-2 border border-gray-300 rounded-lg flex items-center space-x-2 hover:bg-gray-50 disabled:opacity-50"
            >
              <FiX className="h-4 w-4" />
              <span className="hidden md:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  disabled={isAnyLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
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
                  disabled={isAnyLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
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
                  disabled={isAnyLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
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
                    disabled={isAnyLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    disabled={isAnyLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={applyFilters}
                disabled={isAnyLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Apply Filters
              </button>
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
                    disabled={isAnyLoading}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
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
                  loading={isUpdating || isDeleting|| isCreating}
                  loadingServiceId={loadingServiceId}
                  showToast={showServiceSuccess}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {services.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <FiPackage className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No services found</h3>
            <p className="mt-2 text-gray-500">Try adjusting your search or filters</p>
            <div className="mt-6">
              <button
                onClick={handleCreateService}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FiPlus className="h-4 w-4 mr-2" />
                Create New Service
              </button>
            </div>
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
                  disabled={page === 1 || isAnyLoading}
                  className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center"
                >
                  <FiChevronLeft className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Previous</span>
                </button>
                
                <div className="flex items-center space-x-1">
                  {(() => {
                    const pages = [];
                    const maxPages = 5;
                    let startPage = Math.max(1, page - Math.floor(maxPages / 2));
                    let endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);
                    
                    if (endPage - startPage + 1 < maxPages) {
                      startPage = Math.max(1, endPage - maxPages + 1);
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setPage(i)}
                          disabled={isAnyLoading}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                            page === i
                              ? 'bg-indigo-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                          } disabled:opacity-50`}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                  })()}
                </div>
                
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages || isAnyLoading}
                  className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center"
                >
                  <span className="mr-1 hidden sm:inline">Next</span>
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
          loading={isUpdating}
          categories={categories}
          users={users}
          onError={showServiceError}
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
          onError={showServiceError}
          onSuccess={showServiceSuccess}
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
          loading={isDeleting || loadingServiceId === selectedService._id}
          onError={showServiceError}
        />
      )}

      
    </div>
  );
};

export default ServicesManagement;