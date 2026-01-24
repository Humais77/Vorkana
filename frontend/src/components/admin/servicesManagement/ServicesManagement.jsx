// ServicesManagement.jsx - Professional UI Update with All Fixes
import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { 
  useAdminServices, 
  useBulkServiceOperations,
  useCategoriesForDropdown,
  useUsersForDropdown,
  useBulkRestoreServices,
  useExportServices,
  useServiceStats
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
  FiLock,
  FiPercent,
  FiActivity,
  FiTarget,
  FiBarChart2,
  FiEyeOff,
  FiTrendingDown,
  FiAward,
  FiTag
} from 'react-icons/fi';
import { format, subDays } from 'date-fns';
import ServiceEditModal from './ServiceEditModal';
import ServiceDetailsModal from './ServiceDetailsModal';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

// Stat Card Component (Reusable)
const StatCard = memo(({ title, value, icon: Icon, color, trend, subtitle, loading }) => {
  const getColorClasses = (color) => {
    const colors = {
      indigo: 'bg-indigo-100 text-indigo-600',
      green: 'bg-green-100 text-green-600',
      blue: 'bg-blue-100 text-blue-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      gray: 'bg-gray-100 text-gray-600'
    };
    return colors[color] || colors.indigo;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow h-full">
      <div className="flex items-start justify-between h-full">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 mb-1 truncate">{title}</p>
          <div className="flex items-baseline gap-2 mb-1">
            {loading ? (
              <div className="h-7 w-20 bg-gray-100 rounded animate-pulse"></div>
            ) : (
              <>
                <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
                {trend && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${trend.value > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                  </span>
                )}
              </>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 ${getColorClasses(color)}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

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
  isDeletingId,
  containerRef
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
  const actionMenuRef = useRef(null);

  // Handle action menu position
  const getActionMenuPosition = () => {
    if (!actionMenuRef.current || !containerRef.current) return {};
    
    const menuRect = actionMenuRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const rowRect = actionMenuRef.current.closest('tr').getBoundingClientRect();
    
    // Check if menu would overflow bottom
    const spaceBelow = containerRect.bottom - rowRect.bottom;
    const menuHeight = 200; // Approximate menu height
    
    if (spaceBelow < menuHeight && rowRect.top > menuHeight) {
      // Position above if there's not enough space below
      return { bottom: '100%', top: 'auto' };
    }
    
    // Default position below
    return { top: '100%', bottom: 'auto' };
  };

  const actionMenuStyle = actionMenuId === service._id ? getActionMenuPosition() : {};

  return (
    <React.Fragment>
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(service._id)}
              disabled={isDeleting}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center min-w-0">
            <button
              onClick={() => !isDeleting && onToggleExpand(service._id)}
              disabled={isDeleting}
              className="p-1 hover:bg-gray-100 rounded mr-2 flex-shrink-0 disabled:opacity-50"
            >
              {isExpanded ? (
                <FiChevronLeft className="h-4 w-4 text-gray-500 rotate-270" />
              ) : (
                <FiChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isUpdating && (
                  <FiLoader className="h-3 w-3 animate-spin text-blue-500 flex-shrink-0" />
                )}
                <p className="text-sm font-medium text-gray-900 truncate">{service.title}</p>
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {service.category?.name || 'No category'}
              </div>
              <div className="text-xs text-gray-400 truncate mt-0.5">
                By {service.createdBy?.name || 'Unknown'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)} truncate`}>
              {statusText}
            </span>
            {service.isFeatured && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 truncate">
                <FiStar className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>FEATURED</span>
              </span>
            )}
            {service.isRecommended && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 truncate">
                <FiAward className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>RECOMMENDED</span>
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-gray-900">
            <div className="flex items-center gap-1">
              <FiDollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="font-medium truncate">
                ${(service.price || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500 truncate mt-0.5">
              <FiClock className="h-3 w-3 inline mr-1 flex-shrink-0" />
              {service.deliveryTime || 0} {service.deliveryTimeUnit || 'days'}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FiUser className="h-3.5 w-3.5 text-gray-600" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{service.createdBy?.name || 'Unknown'}</div>
              <div className="text-xs text-gray-500 truncate">{service.createdBy?.email || ''}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-gray-500 truncate">
            {service.createdAt ? format(new Date(service.createdAt), 'MMM d, yyyy') : 'N/A'}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1" ref={actionMenuRef}>
            <button
              onClick={() => !isDeleting && onView(service)}
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
              title="View Details"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              onClick={() => !isDeleting && onEdit(service)}
              disabled={isDeleting || isUpdating}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
              title="Edit Service"
            >
              {isUpdating ? (
                <FiLoader className="h-4 w-4 animate-spin" />
              ) : (
                <FiEdit2 className="h-4 w-4" />
              )}
            </button>
            
            <div className="relative flex-shrink-0">
              <button
                onClick={() => !isDeleting && onOpenActionMenu(actionMenuId === service._id ? null : service._id)}
                disabled={isDeleting}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiMoreVertical className="h-4 w-4" />
              </button>
              
              {actionMenuId === service._id && !isDeleting && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => onOpenActionMenu(null)}
                  />
                  <div 
                    className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
                    style={actionMenuStyle}
                  >
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Quick Actions
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onFeatureToggle(service);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FiStar className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{service.isFeatured ? 'Remove Featured' : 'Mark as Featured'}</span>
                      </button>
                      
                      {status === 'active' ? (
                        <button
                          onClick={() => {
                            onStatusToggle(service, 'paused');
                            onOpenActionMenu(null);
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FiLock className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">Pause Service</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onStatusToggle(service, 'active');
                            onOpenActionMenu(null);
                          }}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FiUnlock className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">Activate Service</span>
                        </button>
                      )}
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button
                        onClick={() => {
                          onDelete(service);
                          onOpenActionMenu(null);
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Delete Service</span>
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
          <td colSpan="7" className="px-4 py-3 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</h4>
                <div className="relative">
                  <p className="text-sm text-gray-700 line-clamp-3 pr-4">
                    {service.description || 'No description available'}
                  </p>
                  {service.description && service.description.length > 150 && (
                    <div className="absolute bottom-0 right-0 bg-gradient-to-l from-gray-50 to-transparent pl-4">
                      <span className="text-xs text-gray-400">...</span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Stats</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <FiEye className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-sm truncate">{service.views || 0} views</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiShoppingCart className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                        <span className="text-sm truncate">{service.ordersCount || 0} orders</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiStar className="h-3.5 w-3.5 text-yellow-400 flex-shrink-0" />
                        <span className="text-sm truncate">{service.rating?.toFixed(1) || '0.0'} rating</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {service.tags?.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 rounded border border-gray-200 truncate">
                          {tag}
                        </span>
                      ))}
                      {(!service.tags || service.tags.length === 0) && (
                        <span className="text-sm text-gray-400">No tags</span>
                      )}
                    </div>
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

// Main Component
const ServicesManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    featured: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    minPrice: '',
    maxPrice: '',
    category: '',
    recommended: ''
  });
  const [page, setPage] = useState(1);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);
  const [expandedServices, setExpandedServices] = useState([]);
  const [updatingServiceId, setUpdatingServiceId] = useState(null);
  const [deletingServiceId, setDeletingServiceId] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const searchTimeoutRef = useRef(null);
  const tableContainerRef = useRef(null);
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
    recommended: filters.recommended || undefined,
    includeInactive: true
  });
  
  const { data: categoriesData } = useCategoriesForDropdown();
  const { data: usersData } = useUsersForDropdown();
  const { data: serviceStatsData, isLoading: statsLoadingData } = useServiceStats();
  
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

  // Handle manual search
  const handleSearch = useCallback((e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearchTerm(searchInput);
  }, [searchInput]);

  // Handle search input change without auto-search
  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearchTerm('');
    setPage(1);
  }, []);

  useEffect(() => {
    setStatsLoading(statsLoadingData);
  }, [statsLoadingData]);

  const stats = useMemo(() => {
    const statsOverview = serviceStatsData?.data?.overview || {};
    const byCategory = serviceStatsData?.data?.byCategory || [];
    const growth = serviceStatsData?.data?.growth || [];
    
    // Calculate percentages and additional stats
    const totalServices = statsOverview.totalServices || services.length;
    const activeServices = statsOverview.activeServices || services.filter(s => s.status === 'active').length;
    const draftServices = statsOverview.draftServices || services.filter(s => s.status === 'draft').length;
    const pendingServices = statsOverview.pendingServices || services.filter(s => s.status === 'pending').length;
    const pausedServices = statsOverview.pausedServices || services.filter(s => s.status === 'paused').length;
    const suspendedServices = statsOverview.suspendedServices || services.filter(s => s.status === 'suspended').length;
    const featuredServices = statsOverview.featuredServices || services.filter(s => s.isFeatured).length;
    const recommendedServices = statsOverview.recommendedServices || services.filter(s => s.isRecommended).length;
    
    // Calculate conversion rates
    const views = statsOverview.totalViews || services.reduce((sum, s) => sum + (s.views || 0), 0);
    const orders = statsOverview.totalOrders || services.reduce((sum, s) => sum + (s.ordersCount || 0), 0);
    const conversionRate = views > 0 ? ((orders / views) * 100) : 0;
    
    // Calculate average values
    const avgPrice = statsOverview.avgPrice || (services.length > 0 ? services.reduce((sum, s) => sum + (s.price || 0), 0) / services.length : 0);
    const avgRating = statsOverview.avgRating || (services.length > 0 ? services.reduce((sum, s) => sum + (s.rating || 0), 0) / services.length : 0);
    const avgDeliveryTime = statsOverview.avgDeliveryTime || (services.length > 0 ? services.reduce((sum, s) => sum + (s.deliveryTime || 0), 0) / services.length : 0);
    
    // Calculate revenue
    const totalRevenue = statsOverview.totalRevenue || services.reduce((sum, s) => sum + (s.price || 0) * (s.ordersCount || 0), 0);
    const avgRevenuePerService = services.length > 0 ? totalRevenue / services.length : 0;
    
    // Calculate engagement
    const totalLikes = statsOverview.totalLikes || services.reduce((sum, s) => sum + (s.likes || 0), 0);
    const avgLikesPerService = services.length > 0 ? totalLikes / services.length : 0;
    
    // Calculate recent growth
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentServices = services.filter(s => new Date(s.createdAt) >= sevenDaysAgo).length;
    const growthRate = totalServices > 0 ? ((recentServices / totalServices) * 100) : 0;
    
    // Calculate status percentages
    const activePercentage = totalServices > 0 ? ((activeServices / totalServices) * 100) : 0;
    const draftPercentage = totalServices > 0 ? ((draftServices / totalServices) * 100) : 0;
    
    // Get top category
    const topCategory = byCategory[0] || null;

    return {
      // Overview stats
      total: totalServices,
      active: activeServices,
      draft: draftServices,
      pending: pendingServices,
      paused: pausedServices,
      suspended: suspendedServices,
      featured: featuredServices,
      recommended: recommendedServices,
      
      // Performance stats
      totalViews: views,
      totalOrders: orders,
      conversionRate: conversionRate.toFixed(1),
      totalLikes: totalLikes,
      avgLikesPerService: avgLikesPerService.toFixed(1),
      
      // Financial stats
      totalRevenue: totalRevenue,
      avgRevenuePerService: avgRevenuePerService.toFixed(0),
      avgPrice: avgPrice.toFixed(0),
      
      // Quality stats
      avgRating: avgRating.toFixed(1),
      avgDeliveryTime: avgDeliveryTime.toFixed(0),
      
      // Growth stats
      recentGrowth: recentServices,
      growthRate: growthRate.toFixed(1),
      monthlyGrowth: growth.length,
      
      // Category stats
      topCategory: topCategory,
      categoriesWithServices: byCategory.length,
      
      // Percentage stats
      activePercentage: activePercentage.toFixed(1),
      draftPercentage: draftPercentage.toFixed(1),
      featuredPercentage: totalServices > 0 ? ((featuredServices / totalServices) * 100).toFixed(1) : 0
    };
  }, [services, serviceStatsData]);
const formatPrice = (price, currency = 'USD') => {
  if (price === undefined || price === null) return '$0.00';
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numPrice);
};
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
        'unfeature': 'unfeature',
        'recommend': 'recommend',
        'unrecommend': 'unrecommend'
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
      setForceDelete(false);
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
    setForceDelete(false);
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Service Management</h1>
          <p className="text-gray-600 text-sm mt-0.5">Manage and monitor all platform services</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCreateService}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            <FiPlus className="h-3.5 w-3.5" />
            <span>Create Service</span>
          </button>
          <button
            onClick={exportServices}
            disabled={isExporting}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            <FiDownload className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={refreshData}
            disabled={isRefetching || isBulkOperating}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Services"
          value={stats.total?.toLocaleString() || '0'}
          icon={FiPackage}
          color="indigo"
          subtitle={`${stats.active} active`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Active Services"
          value={stats.active?.toLocaleString() || '0'}
          icon={FiCheckCircle}
          color="green"
          subtitle={`${stats.activePercentage}% of total`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Featured"
          value={stats.featured?.toLocaleString() || '0'}
          icon={FiStar}
          color="purple"
          subtitle={`${stats.featuredPercentage}% of total`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Total Revenue"
          value={`$${(stats.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={FiDollarSign}
          color="blue"
          subtitle={`Avg: $${stats.avgRevenuePerService}`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Avg Rating"
          value={stats.avgRating || '0.0'}
          icon={FiStar}
          color="yellow"
          subtitle={`${stats.totalOrders} orders`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate || 0}%`}
          icon={FiPercent}
          color="green"
          subtitle={`${stats.totalViews} views`}
          loading={statsLoading}
        />
      </div>

      {/* Additional Stats Row - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Pending"
          value={stats.pending?.toLocaleString() || '0'}
          icon={FiClock}
          color="orange"
          subtitle="Awaiting approval"
          loading={statsLoading}
        />
        
        <StatCard
          title="Draft"
          value={stats.draft?.toLocaleString() || '0'}
          icon={FiEdit2}
          color="gray"
          subtitle={`${stats.draftPercentage}% of total`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Suspended"
          value={stats.suspended?.toLocaleString() || '0'}
          icon={FiXCircle}
          color="red"
          subtitle="Blocked services"
          loading={statsLoading}
        />
        
        <StatCard
          title="Recommended"
          value={stats.recommended?.toLocaleString() || '0'}
          icon={FiAward}
          color="blue"
          subtitle="Curated picks"
          loading={statsLoading}
        />
        
        <StatCard
          title="Recent Growth"
          value={stats.recentGrowth?.toLocaleString() || '0'}
          icon={FiTrendingUp}
          color="green"
          subtitle={`7d (${stats.growthRate}%)`}
          loading={statsLoading}
        />
        
        <StatCard
          title="Avg Delivery"
          value={`${stats.avgDeliveryTime || 0}d`}
          icon={FiClock}
          color="purple"
          subtitle="Average timeline"
          loading={statsLoading}
        />
      </div>

      {/* Bulk Actions */}
      {selectedServices.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FiPackage className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-indigo-900 text-sm">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-indigo-600">Choose an action to perform</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleBulkAction('activate')}
                disabled={isBulkOperating}
                className="px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <FiCheckCircle className="h-3.5 w-3.5" />
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('pause')}
                disabled={isBulkOperating}
                className="px-2.5 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-200 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <FiXCircle className="h-3.5 w-3.5" />
                Pause
              </button>
              <button
                onClick={() => handleBulkAction('feature')}
                disabled={isBulkOperating}
                className="px-2.5 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <FiStar className="h-3.5 w-3.5" />
                Feature
              </button>
              <button
                onClick={() => handleBulkAction('recommend')}
                disabled={isBulkOperating}
                className="px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <FiAward className="h-3.5 w-3.5" />
                Recommend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search services by title, description, or tags..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-24 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <FiX className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isTableLoading}
                  className="px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Search"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            disabled={isBulkOperating}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 text-sm font-medium text-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
          >
            <FiFilter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded text-sm bg-white"
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
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded text-sm bg-white"
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
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Price Range</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="w-full px-2.5 py-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="w-full px-2.5 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-2.5 py-2 border border-gray-300 rounded text-sm bg-white"
              >
                <option value="createdAt">Date Created</option>
                <option value="price">Price</option>
                <option value="title">Title</option>
                <option value="rating">Rating</option>
                <option value="ordersCount">Orders</option>
                <option value="views">Views</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" ref={tableContainerRef}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedServices.length === services.length && services.length > 0}
                      onChange={toggleSelectAll}
                      disabled={isBulkOperating}
                      className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[200px]">
                  Service Details
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[120px]">
                  Price & Delivery
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[150px]">
                  Provider
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                  Created
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
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
                  containerRef={tableContainerRef}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {services.length === 0 && !isTableLoading && (
          <div className="text-center py-12">
            <FiPackage className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="mt-2 text-base font-semibold text-gray-900">No services found</h3>
            <p className="mt-1 text-gray-500 text-sm max-w-md mx-auto">
              {searchTerm || Object.values(filters).some(v => v) 
                ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                : 'No services available. Create your first service to get started.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-xs text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> services
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isBulkOperating}
                  className="px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 text-xs transition-colors"
                >
                  <FiChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
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
                        className={`px-2.5 py-1.5 rounded text-xs font-medium min-w-[36px] transition-colors ${
                          page === pageNum
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
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
                  className="px-2.5 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 text-xs transition-colors"
                >
                  <span>Next</span>
                  <FiChevronRight className="h-3.5 w-3.5" />
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
           formatPrice={formatPrice} 
        />
      )}

      {showDeleteModal && selectedService && (
        <DeleteConfirmationModal
          item={selectedService}
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedService(null);
            setForceDelete(false);
          }}
          onDelete={handleDeleteService}
          type="service"
          loading={deleteServiceMutation.isLoading || deletingServiceId === selectedService._id}
          dependencies={{
            orders: selectedService.ordersCount || 0,
            reviews: selectedService.reviewsCount || 0
          }}
          forceDelete={forceDelete}
          onForceDeleteChange={setForceDelete}
        />
      )}
    </div>
  );
};

export default ServicesManagement;