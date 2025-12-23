// components/admin/ServicesManagement.jsx
// components/admin/ServicesManagement.jsx
import { useState, useMemo, useEffect } from 'react';
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
  FiGrid,
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
import { adminAPI } from '../../api/admin';
const ServicesManagement = () => {
  const navigate= useNavigate();
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [viewingService, setViewingService] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [actionMenu, setActionMenu] = useState(null);
  const [serviceStats, setServiceStats] = useState({ 
    total: 0, 
    active: 0, 
    featured: 0, 
    orders: 0,
    revenue: 0
  });

  const limit = 12;
  
  // Fetch data with proper parameters
  const { data, isLoading, refetch, isRefetching } = useAdminServices({
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
  
  // Fetch categories and users for dropdowns
  const { data: categoriesData } = useCategoriesForDropdown();
  const { data: usersData } = useUsersForDropdown();
  
  const updateServiceMutation = useUpdateService();
  const deleteServiceMutation = useDeleteService();
  const createServiceMutation = useCreateService();
  const bulkServiceMutation = useBulkServiceOperations();
  
  const services = data?.data || [];
  const categories = categoriesData?.data || [];
  const users = usersData?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1 };
  const stats = data?.stats || {};

  // Alternative: Compare specific values instead of the whole object
const statsString = JSON.stringify(stats || {});

useEffect(() => {
  if (stats) {
    setServiceStats({
      total: stats.total || 0,
      active: stats.active || 0,
      featured: stats.featured || 0,
      orders: stats.orders || 0,
      revenue: stats.revenue || 0
    });
  }
}, [stats?.total, stats?.active, stats?.featured, stats?.orders, stats?.revenue]);
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
        'recommend': 'recommend',
        'unrecommend': 'unrecommend',
        'delete': 'delete'
      };

      const operation = operationMap[action];
      
      if (action === 'delete') {
        setServiceToDelete({ type: 'bulk', ids: selectedServices });
        setShowDeleteModal(true);
        return;
      }

      const response = await bulkServiceMutation.mutateAsync({
        ids: selectedServices,
        operation,
        data: action === 'activate' ? { status: 'active' } : 
              action === 'pause' ? { status: 'paused' } : {}
      });

      if (response.data?.success) {
        toast.success(`${selectedServices.length} services ${action}d`);
        setSelectedServices([]);
        refetch();
      } else {
        toast.error(response.data?.message || 'Action failed');
      }
    } catch (error) {
      toast.error('Failed to perform bulk action: ' + (error.response?.data?.message || error.message || error.toString()));
    }
  };

 // In ServicesManagement.jsx - Update handleDeleteService
const handleDeleteService = async () => {
  try {
    console.log('Deleting service:', serviceToDelete);
    
    let response;
    
    if (serviceToDelete.type === 'single') {
      // Use the new admin delete endpoint
      response = await adminAPI.deleteService(serviceToDelete.id, false); // false for soft delete
    } else if (serviceToDelete.type === 'bulk') {
      // For bulk delete, we need to handle differently
      const deletePromises = serviceToDelete.ids.map(id => 
        adminAPI.deleteService(id, false)
      );
      
      const results = await Promise.allSettled(deletePromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.data?.success);
      const failed = results.filter(r => r.status === 'rejected' || !r.value?.data?.success);
      
      if (failed.length > 0) {
        toast.error(`${failed.length} services failed to delete`);
      }
      if (successful.length > 0) {
        toast.success(`${successful.length} services deleted successfully`);
      }
      
      setSelectedServices([]);
      refetch();
      setShowDeleteModal(false);
      setServiceToDelete(null);
      return;
    }

    if (response.data?.success) {
      toast.success('Service deleted successfully');
      setSelectedServices([]);
      refetch();
    } else {
      toast.error(response.data?.message || 'Delete failed');
    }
  } catch (error) {
    console.error('Delete service error:', error);
    
    // Detailed error handling
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          toast.error(data.message || 'Invalid request');
          break;
        case 401:
          toast.error('Authentication required');
          break;
        case 403:
          toast.error('You do not have permission to delete this service');
          break;
        case 404:
          toast.error('Service not found');
          break;
        case 500:
          toast.error('Server error: ' + (data.message || 'Please try again later'));
          break;
        default:
          toast.error(`Delete failed: ${data.message || 'Unknown error'}`);
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error(`Delete failed: ${error.message}`);
    }
  } finally {
    setShowDeleteModal(false);
    setServiceToDelete(null);
  }
};

 const handleViewService = (service) => {
  // Should navigate to ADMIN route, not user route
  navigate(`/admin/services/${service._id}`);
};

 const handleEditService = (service) => {
  // Should navigate to ADMIN route, not user route
  navigate(`/admin/services/${service._id}/edit`);
};


  const handleCreateService = () => {
   navigate('/services/create');
  };

  const handleUpdateService = async (data) => {
    try {
      if (editingService?._id) {
        const response = await updateServiceMutation.mutateAsync({ 
          id: editingService._id, 
          data 
        });
        if (response.data?.success) {
          toast.success('Service updated successfully');
          setShowEditModal(false);
          setEditingService(null);
          refetch();
        } else {
          toast.error(response.data?.message || 'Update failed');
        }
      }
    } catch (error) {
      toast.error('Failed to save service: ' + (error.response?.data?.message || error.message || error.toString()));
    }
  };

  const handleSaveNewService = async (formData) => {
    try {
      const response = await createServiceMutation.mutateAsync(formData);
      if (response.data?.success) {
        toast.success('Service created successfully');
        setShowCreateModal(false);
        refetch();
      } else {
        toast.error(response.data?.message || 'Creation failed');
      }
    } catch (error) {
      toast.error('Failed to create service: ' + (error.response?.data?.message || error.message || error.toString()));
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedServices(services.map(service => service._id));
    } else {
      setSelectedServices([]);
    }
  };

  const toggleSelectService = (serviceId) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

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

  const getFeaturedColor = (featured) => {
    return featured ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const refreshData = () => {
    refetch();
    toast.success('Data refreshed');
  };

  const duplicateService = async (service) => {
    try {
      // Create duplicate service data
      const duplicateData = {
        title: `${service.title} (Copy)`,
        description: service.description,
        category: service.category?._id || service.category,
        price: service.price,
        currency: service.currency || 'USD',
        deliveryTime: service.deliveryTime,
        deliveryTimeUnit: service.deliveryTimeUnit || 'days',
        revisions: service.revisions || 1,
        status: 'draft'
      };

      const response = await createServiceMutation.mutateAsync(duplicateData);
      if (response.data?.success) {
        toast.success('Service duplicated successfully');
        refetch();
      } else {
        toast.error(response.data?.message || 'Duplication failed');
      }
    } catch (error) {
      toast.error('Failed to duplicate service: ' + (error.response?.data?.message || error.message || error.toString()));
    }
  };

  const formatPrice = (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  // Add "Apply Filters" button functionality
  const applyFilters = () => {
    setPage(1);
    refetch();
    toast.success('Filters applied');
  };

  // Add "Clear Filters" button functionality
  const clearFilters = () => {
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
  };

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
                onClick={() => handleBulkAction('recommend')}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 flex items-center space-x-1"
              >
                <FiThumbsUp className="h-4 w-4" />
                <span>Recommend</span>
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
                placeholder="Search services by title, description, or tags..."
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
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paused">Paused</option>
                <option value="suspended">Suspended</option>
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
            
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-600'}`}
                title="Grid View"
              >
                <FiGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-600'}`}
                title="List View"
              >
                <FiList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
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

      {/* Services Grid/List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard
              key={service._id}
              service={service}
              isSelected={selectedServices.includes(service._id)}
              onSelect={() => toggleSelectService(service._id)}
              onView={() => handleViewService(service)}
              onEdit={() => handleEditService(service)}
              onDelete={() => {
                setServiceToDelete({ type: 'single', id: service._id });
                setShowDeleteModal(true);
              }}
              onDuplicate={() => duplicateService(service)}
              actionMenu={actionMenu}
              setActionMenu={setActionMenu}
              formatPrice={formatPrice}
            />
          ))}
        </div>
      ) : (
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
                  <tr key={service._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service._id)}
                        onChange={() => toggleSelectService(service._id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        {service.thumbnail ? (
                          <img
                            src={service.thumbnail}
                            alt={service.title}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FiPackage className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">{service.title}</div>
                          {service.createdBy?.name && (
                            <div className="text-xs text-gray-500 mt-1">By {service.createdBy.name}</div>
                          )}
                          {service.category?.name && (
                            <div className="text-xs text-gray-400 mt-0.5">{service.category.name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatPrice(service.price, service.currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {service.deliveryTime} {service.deliveryTimeUnit}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                        </span>
                        {service.isFeatured && (
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getFeaturedColor(service.isFeatured)}`}>
                            Featured
                          </span>
                        )}
                        {service.isRecommended && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            Recommended
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-1">
                        <FiActivity className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{service.ordersCount || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-1">
                        <FiStar className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-medium">{service.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-xs text-gray-400">({service.reviewsCount || 0})</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {format(new Date(service.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewService(service)}
                          className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="View Details"
                        >
                          <FiEye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditService(service)}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Service"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setServiceToDelete({ type: 'single', id: service._id });
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete Service"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {services.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FiPackage className="h-12 w-12 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No services found</h3>
          <p className="mt-2 text-gray-500">Try adjusting your search or filter criteria.</p>
          <a
            href="/services/create"
            className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            Create Service
          </a>
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

      {/* Service Details Modal */}
      {showServiceDetails && viewingService && (
        <ServiceDetailsModal
          service={viewingService}
          onClose={() => {
            setShowServiceDetails(false);
            setViewingService(null);
          }}
          formatPrice={formatPrice}
        />
      )}

      {/* Edit Service Modal */}
      {showEditModal && editingService && (
        <EditServiceModal
          service={editingService}
          onClose={() => {
            setShowEditModal(false);
            setEditingService(null);
          }}
          onSave={handleUpdateService}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          type="service"
          itemToDelete={serviceToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setServiceToDelete(null);
          }}
          onConfirm={handleDeleteService}
        />
      )}
      // Add this before the closing tag of the main return:
{/* Create Service Modal */}
{showCreateModal && (
  <CreateServiceModal
    onClose={() => setShowCreateModal(false)}
    onSuccess={() => {
      setShowCreateModal(false);
      refetch();
    }}
    categories={categories}
    users={users}
    onCreate={handleSaveNewService}
  />
)}

{/* Edit Service Modal */}
{showEditModal && editingService && (
  <EditServiceModal
    service={editingService}
    categories={categories}
    users={users}
    onClose={() => {
      setShowEditModal(false);
      setEditingService(null);
    }}
    onSave={handleUpdateService}
  />
)}

{/* Service Details Modal */}
{showServiceDetails && viewingService && (
  <ServiceDetailsModal
    service={viewingService}
    onClose={() => {
      setShowServiceDetails(false);
      setViewingService(null);
    }}
    formatPrice={formatPrice}
  />
)}

{/* Delete Confirmation Modal */}
{showDeleteModal && (
  <DeleteConfirmationModal
    type="service"
    itemToDelete={serviceToDelete}
    onClose={() => {
      setShowDeleteModal(false);
      setServiceToDelete(null);
    }}
    onConfirm={handleDeleteService}
  />
)}
    </div>
  );
};


const CreateServiceModal = ({ onClose, onSuccess, categories = [], users = [], onCreate }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    createdBy: '',
    price: '',
    currency: 'USD',
    deliveryTime: '',
    deliveryTimeUnit: 'days',
    revisions: 1,
    status: 'draft',
    isFeatured: false,
    isRecommended: false,
    isPopular: false,
    tags: [],
    features: [{ title: '', description: '' }],
    faqs: [{ question: '', answer: '' }],
    packages: [{
      name: 'Basic',
      description: 'Basic package',
      price: '',
      deliveryTime: '',
      features: []
    }]
  });

  const [newTag, setNewTag] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const createServiceMutation = useCreateService();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onCreate(formData);
      toast.success('Service created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to create service: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
    );
    
    if (validFiles.length !== files.length) {
      toast.error('Some files were invalid (max 5MB, images only)');
    }
    
    setImageFiles(prev => [...prev, ...validFiles]);
  };

  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024) {
      setThumbnailFile(file);
    } else {
      toast.error('Thumbnail must be an image (max 2MB)');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, { title: '', description: '' }]
    }));
  };

  const updateFeature = (index, field, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index][field] = value;
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const removeFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Create New Service</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Service title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Subcategory *
  </label>
  <select
    required
    value={formData.subcategory}
    onChange={(e) => setFormData({...formData, subcategory: e.target.value})}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    disabled={!formData.category}
  >
    <option value="">Select Subcategory</option>
    {categories
      .filter(cat => cat.parentCategory === formData.category || cat._id === formData.category)
      .map(subcat => (
        <option key={subcat._id} value={subcat._id}>
          {subcat.name}
        </option>
      ))}
  </select>
  {!formData.category && (
    <p className="text-xs text-gray-500 mt-1">Select a category first</p>
  )}
</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Created By (Optional)
              </label>
              <select
                value={formData.createdBy}
                onChange={(e) => setFormData({...formData, createdBy: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select User</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {/* Price and Delivery */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price *
              </label>
              <div className="flex">
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Time *
              </label>
              <div className="flex">
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({...formData, deliveryTime: e.target.value})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="7"
                />
                <select
                  value={formData.deliveryTimeUnit}
                  onChange={(e) => setFormData({...formData, deliveryTimeUnit: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-r-lg bg-gray-50"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revisions
              </label>
              <input
                type="number"
                min="0"
                max="99"
                value={formData.revisions}
                onChange={(e) => setFormData({...formData, revisions: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="6"
              placeholder="Detailed service description..."
            />
          </div>

          {/* Images Upload */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thumbnail (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="thumbnail"
                  onChange={handleThumbnailUpload}
                  accept="image/*"
                  className="hidden"
                />
                <label htmlFor="thumbnail" className="cursor-pointer">
                  {thumbnailFile ? (
                    <div className="flex items-center justify-center space-x-2">
                      <FiImage className="h-5 w-5 text-green-500" />
                      <span>{thumbnailFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setThumbnailFile(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <FiUpload className="h-8 w-8 mx-auto mb-2" />
                      <p>Click to upload thumbnail (max 2MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Images (Optional, max 10)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="images"
                  multiple
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <label htmlFor="images" className="cursor-pointer">
                  <div className="text-gray-500">
                    <FiUpload className="h-8 w-8 mx-auto mb-2" />
                    <p>Click to upload images (max 10, 5MB each)</p>
                  </div>
                </label>
              </div>
              {imageFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <div className="bg-gray-100 p-2 rounded">
                        <FiImage className="h-8 w-8 text-gray-400 mx-auto" />
                        <p className="text-xs truncate mt-1">{file.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== index))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <FiX className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Add tag"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <div key={index} className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                  <span className="text-sm">{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Features
              </label>
              <button
                type="button"
                onClick={addFeature}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
              >
                + Add Feature
              </button>
            </div>
            <div className="space-y-3">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={feature.title}
                    onChange={(e) => updateFeature(index, 'title', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Feature title"
                  />
                  <input
                    type="text"
                    value={feature.description}
                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Feature description"
                  />
                  {formData.features.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Featured</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isRecommended}
                onChange={(e) => setFormData({...formData, isRecommended: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Recommended</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPopular}
                onChange={(e) => setFormData({...formData, isPopular: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Popular</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FiSave className="h-4 w-4 mr-2" />
                  Create Service
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Service Card Component
const ServiceCard = ({ service, isSelected, onSelect, onView, onEdit, onDelete, onDuplicate, actionMenu, setActionMenu, formatPrice }) => {
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
          {service.thumbnail ? (
            <img
              src={service.thumbnail}
              alt={service.title}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="h-16 w-16 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
              <FiPackage className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 line-clamp-1">{service.title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
              </span>
              {service.isFeatured && (
                <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200`}>
                  Featured
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setActionMenu(actionMenu === service._id ? null : service._id)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <FiMoreVertical className="h-5 w-5" />
          </button>
          
          {actionMenu === service._id && (
            <>
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setActionMenu(null)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                <div className="py-1">
                   <button
          onClick={() => navigate(`/admin/services/${service._id}`)}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center justify-center"
        >
          <FiEye className="h-4 w-4 mr-1" />
          View
        </button>
                 <button
          onClick={() => navigate(`/admin/services/${service._id}/edit`)}
          className="flex-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center"
        >
          <FiEdit2 className="h-4 w-4 mr-1" />
          Edit
        </button>
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
                  {service.status === 'active' && (
                    <button
                      onClick={() => {
                        // Toggle pause/activate
                        toast.success('Feature coming soon');
                        setActionMenu(null);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                    >
                      <FiPause className="h-4 w-4 mr-2" />
                      Pause Service
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDelete();
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
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{formatPrice(service.price, service.currency)}</div>
          <div className="text-xs text-gray-500">Price</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">{service.deliveryTime}</div>
          <div className="text-xs text-gray-500">{service.deliveryTimeUnit}</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-500">
            <FiActivity className="h-4 w-4 mr-1" />
            <span>{service.ordersCount || 0} orders</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <FiStar className="h-4 w-4 mr-1 text-yellow-400" />
            <span>{service.rating?.toFixed(1) || '0.0'}</span>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          <FiCalendar className="h-4 w-4 inline mr-1" />
          {format(new Date(service.createdAt), 'MMM d')}
        </div>
      </div>
      
      <div className="mt-4 flex space-x-2">
        <button
          onClick={onView}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          View
        </button>
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

// Helper function for status color (used in ServiceCard)
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

// Service Details Modal Component
const ServiceDetailsModal = ({ service, onClose, formatPrice }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Service Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiXCircle className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {service.thumbnail ? (
              <img
                src={service.thumbnail}
                alt={service.title}
                className="h-32 w-32 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-32 w-32 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
                <FiPackage className="h-16 w-16 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900">{service.title}</h4>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </span>
                {service.isFeatured && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    Featured
                  </span>
                )}
                {service.isRecommended && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    Recommended
                  </span>
                )}
                {service.isPopular && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                    Popular
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="font-medium text-lg">{formatPrice(service.price, service.currency)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Delivery</p>
                  <p className="font-medium">{service.deliveryTime} {service.deliveryTimeUnit}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Rating</p>
                  <div className="flex items-center">
                    <FiStar className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="font-medium">{service.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-xs text-gray-500 ml-1">({service.reviewsCount || 0})</span>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Orders</p>
                  <p className="font-medium">{service.ordersCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Description */}
          {service.description && (
            <div>
              <h5 className="font-semibold text-gray-900 mb-2">Description</h5>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-600 whitespace-pre-line">{service.description}</p>
              </div>
            </div>
          )}
          
          {/* Images */}
          {service.images && service.images.length > 0 && (
            <div>
              <h5 className="font-semibold text-gray-900 mb-2">Service Images</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {service.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Service image ${index + 1}`}
                    className="h-32 w-full object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Views</p>
              <p className="font-medium">{service.views || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Likes</p>
              <p className="font-medium">{service.likes || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Revisions</p>
              <p className="font-medium">{service.revisions || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Created</p>
              <p className="font-medium">{format(new Date(service.createdAt), 'MMM d, yyyy')}</p>
            </div>
          </div>
          
          {/* SEO Info */}
          {(service.metaTitle || service.metaDescription) && (
            <div>
              <h5 className="font-semibold text-gray-900 mb-2">SEO Information</h5>
              <div className="space-y-2">
                {service.metaTitle && (
                  <div>
                    <p className="text-sm text-gray-600">Meta Title</p>
                    <p className="text-sm">{service.metaTitle}</p>
                  </div>
                )}
                {service.metaDescription && (
                  <div>
                    <p className="text-sm text-gray-600">Meta Description</p>
                    <p className="text-sm">{service.metaDescription}</p>
                  </div>
                )}
                {service.slug && (
                  <div>
                    <p className="text-sm text-gray-600">Slug</p>
                    <p className="font-mono text-sm">{service.slug}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Technical Info */}
          <div>
            <h5 className="font-semibold text-gray-900 mb-2">Technical Information</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Service ID</p>
                <p className="font-mono text-sm">{service._id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">{format(new Date(service.updatedAt), 'MMM d, yyyy HH:mm')}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                {service.createdBy && (
                  <>
                    <FiUsers className="h-4 w-4" />
                    <span>Created by: {service.createdBy.name}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Edit Service Modal Component
const EditServiceModal = ({ service, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: service.title || '',
    description: service.description || '',
    price: service.price || 0,
    currency: service.currency || 'USD',
    deliveryTime: service.deliveryTime || 1,
    deliveryTimeUnit: service.deliveryTimeUnit || 'days',
    revisions: service.revisions || 1,
    status: service.status || 'draft',
    isFeatured: service.isFeatured || false,
    isRecommended: service.isRecommended || false,
    isPopular: service.isPopular || false,
    category: service.category?._id || service.category || '',
    createdBy: service.createdBy?._id || service.createdBy || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Service</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Service title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows="4"
              placeholder="Service description"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Created By
              </label>
              <select
                value={formData.createdBy}
                onChange={(e) => setFormData({...formData, createdBy: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select User</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows="4"
              placeholder="Service description"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price *
              </label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
                <option value="INR">INR</option>
                <option value="PKR">PKR</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Time *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.deliveryTime}
                onChange={(e) => setFormData({...formData, deliveryTime: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Unit
              </label>
              <select
                value={formData.deliveryTimeUnit}
                onChange={(e) => setFormData({...formData, deliveryTimeUnit: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Revisions
            </label>
            <input
              type="number"
              min="0"
              max="99"
              value={formData.revisions}
              onChange={(e) => setFormData({...formData, revisions: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Featured</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRecommended}
                  onChange={(e) => setFormData({...formData, isRecommended: e.target.checked})}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Recommended</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isPopular}
                  onChange={(e) => setFormData({...formData, isPopular: e.target.checked})}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Popular</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Update Service
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Enhanced DeleteConfirmationModal component
const DeleteConfirmationModal = ({ type, itemToDelete, onClose, onConfirm }) => {
  const isBulk = itemToDelete?.type === 'bulk';
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <FiTrash2 className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
              {isBulk && (
                <p className="text-sm text-gray-500 mt-1">
                  {itemToDelete.ids.length} service{itemToDelete.ids.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <FiAlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">Warning</p>
                <p className="text-sm text-yellow-700 mt-1">
                  {isBulk
                    ? `This will permanently delete ${itemToDelete.ids.length} ${type}${itemToDelete.ids.length > 1 ? 's' : ''}. This action cannot be undone.`
                    : `This will permanently delete the ${type}. This action cannot be undone.`}
                </p>
              </div>
            </div>
          </div>
          
          {isBulk && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Affected Services:</p>
              <div className="max-h-40 overflow-y-auto">
                {/* You could list service titles here if you have them */}
                <p className="text-sm text-gray-600">
                  {itemToDelete.ids.length} service{itemToDelete.ids.length > 1 ? 's' : ''} will be deleted
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
            >
              <FiTrash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicesManagement;