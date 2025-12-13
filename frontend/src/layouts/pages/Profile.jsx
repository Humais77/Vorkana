import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ExternalLink,
  FileText,
  DollarSign,
  Tag,
  CheckCircle,
  Loader2,
  ArrowRightLeft,
  AlertTriangle,
  X,
  Award,
  User,
  Briefcase,
  Grid3x3,
  List,
  Edit,
  Star,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  useMyGigs, 
  useDeleteMultipleGigs, 
  useUpdateMultipleGigsStatus,
  extractGigsFromResponse
} from '../../hooks/useGigs';
import { useMyServices, useDeleteService } from '../../hooks/useServices';
import { useSwitchRole } from '../../hooks/useUser';
import { toast } from 'react-hot-toast';
import ProfileSidebar from '../../components/ProfileSidebar';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const switchRoleMutation = useSwitchRole();
  
  // Parse tab from URL
  const searchParams = new URLSearchParams(location.search);
  const urlTab = searchParams.get('tab');
  
  const [selectedGigs, setSelectedGigs] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [allServicesSelected, setAllServicesSelected] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(urlTab || 'services');
  const [viewMode, setViewMode] = useState('grid');
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [switchDirection, setSwitchDirection] = useState('');
  
  // Use services hook for seller
  const { 
    data: servicesResponse, 
    isLoading: servicesLoading, 
    error: servicesError, 
    refetch: refetchServices 
  } = useMyServices({
    status: serviceStatusFilter === 'all' ? undefined : serviceStatusFilter,
    limit: 50,
    sort: 'createdAt',
    order: 'desc'
  });

  const services = useMemo(() => 
    servicesResponse?.data || servicesResponse?.services || [], 
    [servicesResponse]
  );

  const { 
    data: gigsResponse, 
    isLoading: gigsLoading, 
    error: gigsError, 
    refetch: refetchGigs 
  } = useMyGigs({
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
    sort: 'createdAt',
    order: 'desc'
  });

  const gigs = useMemo(() => 
    extractGigsFromResponse(gigsResponse) || [], 
    [gigsResponse]
  );

  const deleteMultipleGigsMutation = useDeleteMultipleGigs();
  const updateMultipleGigsStatusMutation = useUpdateMultipleGigsStatus();
  const deleteServiceMutation = useDeleteService();
  
  // Calculate stats from actual data
  const stats = useMemo(() => {
    const activeServices = services.filter(s => s.status === 'active').length;
    const activeGigs = gigs.filter(g => g.status === 'active' || g.status === 'open').length;
    
    return {
      totalGigs: gigs.length,
      activeGigs: activeGigs,
      totalServices: services.length,
      activeServices: activeServices,
    };
  }, [gigs, services]);

  const resetSelection = useCallback(() => {
    setSelectedGigs([]);
    setSelectedServices([]);
    setAllSelected(false);
    setAllServicesSelected(false);
  }, []);

  useEffect(() => {
    resetSelection();
  }, [gigs, services, resetSelection]);

  // Sync URL with tab state
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'services';
    if (currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [location.search, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update URL without reloading page
    navigate(`/profile?tab=${tab}`, { replace: true });
  };

  const handleCreateService = () => {
    navigate('/services/create');
  };

  const handleCreateGig = () => {
    navigate('/create-gig');
  };

  const handleServiceClick = (serviceId) => {
    navigate(`/services/${serviceId}`);
  };

  const handleGigClick = (gigId) => {
    navigate(`/gig/${gigId}`);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedGigs([]);
    } else {
      const filteredGigs = filterGigs(gigs);
      setSelectedGigs(filteredGigs.map(gig => gig._id || gig.id));
    }
    setAllSelected(!allSelected);
  };

  const handleSelectAllServices = () => {
    if (allServicesSelected) {
      setSelectedServices([]);
    } else {
      const filteredServices = filterServices(services);
      setSelectedServices(filteredServices.map(service => service._id || service.id));
    }
    setAllServicesSelected(!allServicesSelected);
  };

  const handleSelectGig = (gigId) => {
    setSelectedGigs(prev =>
      prev.includes(gigId)
        ? prev.filter(id => id !== gigId)
        : [...prev, gigId]
    );
  };

  const handleSelectService = (serviceId) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleDeleteGigs = async () => {
    if (selectedGigs.length === 0) {
      toast.error('Please select gigs to delete');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedGigs.length} gig(s)? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteMultipleGigsMutation.mutateAsync(selectedGigs);
      resetSelection();
      toast.success('Gigs deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete gigs');
    }
  };

  const handleDeleteServices = async () => {
    if (selectedServices.length === 0) {
      toast.error('Please select services to delete');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedServices.length} service(s)? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      // Delete services one by one
      const deletePromises = selectedServices.map(serviceId => 
        deleteServiceMutation.mutateAsync({ id: serviceId })
      );
      
      await Promise.all(deletePromises);
      resetSelection();
      refetchServices();
      toast.success('Services deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete services');
    }
  };

  const handleUpdateGigStatus = async (status) => {
    if (selectedGigs.length === 0) {
      toast.error('Please select gigs to update');
      return;
    }

    try {
      await updateMultipleGigsStatusMutation.mutateAsync({
        ids: selectedGigs,
        status
      });
      resetSelection();
      toast.success(`Gigs marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update gigs status');
    }
  };

  const handleUpdateServiceStatus = async (status) => {
    if (selectedServices.length === 0) {
      toast.error('Please select services to update');
      return;
    }

    toast.info('Service status update feature coming soon');
    // TODO: Implement service status update
  };

  const handleSwitchRole = async () => {
    try {
      const newRole = switchDirection === 'toUser' ? 'user' : 'seller';
      await switchRoleMutation.mutateAsync(newRole);
      setShowSwitchDialog(false);
      
      toast.success(`Successfully switched to ${newRole} account`);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('Failed to switch role');
    }
  };

  const openSwitchToUserDialog = () => {
    setSwitchDirection('toUser');
    setShowSwitchDialog(true);
  };

  const openSwitchToSellerDialog = () => {
    setSwitchDirection('toSeller');
    setShowSwitchDialog(true);
  };

  const filterGigs = useCallback((gigsToFilter) => {
    if (statusFilter === 'all') return gigsToFilter;
    return gigsToFilter.filter(gig => gig.status === statusFilter);
  }, [statusFilter]);

  const filterServices = useCallback((servicesToFilter) => {
    if (serviceStatusFilter === 'all') return servicesToFilter;
    return servicesToFilter.filter(service => service.status === serviceStatusFilter);
  }, [serviceStatusFilter]);

  const filteredGigs = useMemo(() => filterGigs(gigs), [gigs, filterGigs]);
  const filteredServices = useMemo(() => filterServices(services), [services, filterServices]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'open': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'paused': 
      case 'cancelled': 
      case 'denied': 
      case 'suspended': return 'bg-orange-100 text-orange-800';
      case 'completed': 
      case 'closed': 
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'assigned': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
      case 'open': return <CheckCircle className="w-4 h-4" />;
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'paused': 
      case 'cancelled': 
      case 'denied': 
      case 'suspended': return <X className="w-4 h-4" />;
      case 'completed': 
      case 'closed': 
      case 'pending': return <Award className="w-4 h-4" />;
      case 'in_progress': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'assigned': return <User className="w-4 h-4" />;
      default: return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your profile</h2>
          <Link
            to="/sign-in"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Profile Info */}
          <div className="lg:col-span-1">
            <ProfileSidebar 
              onSwitchToUser={openSwitchToUserDialog}
              onSwitchToSeller={openSwitchToSellerDialog}
              switchRoleMutation={switchRoleMutation}
            />
          </div>

          <div className="lg:col-span-3">
            {user?.role === 'seller' ? (
              <SellerDashboard 
                activeTab={activeTab}
                handleTabChange={handleTabChange}
                viewMode={viewMode}
                setViewMode={setViewMode}
                selectedGigs={selectedGigs}
                selectedServices={selectedServices}
                allSelected={allSelected}
                allServicesSelected={allServicesSelected}
                statusFilter={statusFilter}
                serviceStatusFilter={serviceStatusFilter}
                filteredGigs={filteredGigs}
                filteredServices={filteredServices}
                servicesLoading={servicesLoading}
                gigsLoading={gigsLoading}
                stats={stats}
                handleSelectAll={handleSelectAll}
                handleSelectAllServices={handleSelectAllServices}
                handleSelectGig={handleSelectGig}
                handleSelectService={handleSelectService}
                handleUpdateGigStatus={handleUpdateGigStatus}
                handleUpdateServiceStatus={handleUpdateServiceStatus}
                handleDeleteGigs={handleDeleteGigs}
                handleDeleteServices={handleDeleteServices}
                handleGigClick={handleGigClick}
                handleServiceClick={handleServiceClick}
                handleCreateGig={handleCreateGig}
                handleCreateService={handleCreateService}
                setStatusFilter={setStatusFilter}
                setServiceStatusFilter={setServiceStatusFilter}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                deleteMultipleGigsMutation={deleteMultipleGigsMutation}
                updateMultipleGigsStatusMutation={updateMultipleGigsStatusMutation}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">You're in User Mode</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  As a user, you can browse and purchase services from sellers. 
                  Switch to seller mode to create and manage your own services.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={openSwitchToSellerDialog}
                    className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                  >
                    <ArrowRightLeft className="w-5 h-5 mr-2" />
                    Switch to Seller
                  </button>
                  <Link
                    to="/services"
                    className="inline-flex items-center px-5 py-3 border-2 border-blue-200 text-blue-600 rounded-xl font-medium hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    Browse Services
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <RoleSwitchDialog 
        showSwitchDialog={showSwitchDialog}
        setShowSwitchDialog={setShowSwitchDialog}
        switchDirection={switchDirection}
        handleSwitchRole={handleSwitchRole}
        switchRoleMutation={switchRoleMutation}
      />
    </div>
  );
};

const SellerDashboard = ({
  activeTab,
  handleTabChange,
  viewMode,
  setViewMode,
  selectedGigs,
  selectedServices,
  allSelected,
  allServicesSelected,
  statusFilter,
  serviceStatusFilter,
  filteredGigs,
  filteredServices,
  servicesLoading,
  gigsLoading,
  stats,
  handleSelectAll,
  handleSelectAllServices,
  handleSelectGig,
  handleSelectService,
  handleUpdateGigStatus,
  handleUpdateServiceStatus,
  handleDeleteGigs,
  handleDeleteServices,
  handleGigClick,
  handleServiceClick,
  handleCreateGig,
  handleCreateService,
  setStatusFilter,
  setServiceStatusFilter,
  getStatusColor,
  getStatusIcon,
  deleteMultipleGigsMutation,
  updateMultipleGigsStatusMutation
}) => {
  const isLoading = activeTab === 'services' ? servicesLoading : gigsLoading;
  const hasSelectedItems = activeTab === 'services' 
    ? selectedServices.length > 0 
    : selectedGigs.length > 0;
  const selectedCount = activeTab === 'services' 
    ? selectedServices.length 
    : selectedGigs.length;
  const items = activeTab === 'services' ? filteredServices : filteredGigs;

  return (
    <>
      {/* Updated Header Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          </div>
          <div className="flex gap-3">
  <button
    onClick={handleCreateGig}
    disabled={isLoading}
    className="flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Plus className="w-4 h-4 mr-2" />
    Create Gig
  </button>
  <button
    onClick={handleCreateService}
    disabled={isLoading}
    className="flex items-center px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Plus className="w-4 h-4 mr-2" />
    Create Service
  </button>
</div>
        </div>
        
        {/* Stats Counts Row - Only 3 stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center">
              <Package className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">Total Services</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-2">{stats.totalServices}</p>
            <div className="flex items-center mt-1">
              <span className="text-xs text-blue-600">
                ({stats.activeServices} active)
              </span>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">Active Services</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-2">{stats.activeServices}</p>
            <div className="flex items-center mt-1">
              <span className="text-xs text-green-600">
                of {stats.totalServices} total
              </span>
            </div>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-900">Total Gigs</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 mt-2">{stats.totalGigs}</p>
            <div className="flex items-center mt-1">
              <span className="text-xs text-orange-600">
                ({stats.activeGigs} active)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => handleTabChange('services')}
                className={`px-5 py-2 font-medium transition-all ${
                  activeTab === 'services'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Services ({stats.totalServices})
                </div>
              </button>
              <button
                onClick={() => handleTabChange('gigs')}
                className={`px-5 py-2 font-medium transition-all ${
                  activeTab === 'gigs'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Gigs ({stats.totalGigs})
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <Grid3x3 className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
              >
                <List className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {/* <button
              onClick={activeTab === 'services' ? handleCreateService : handleCreateGig}
              disabled={isLoading}
              className="inline-flex items-center px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create {activeTab === 'services' ? 'Service' : 'Gig'}
            </button> */}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar with Framer Motion */}
      <AnimatePresence>
        {hasSelectedItems && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-4 mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center">
                <CheckSquare className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-900">
                  {selectedCount} {activeTab === 'services' ? 'service(s)' : 'gig(s)'} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeTab === 'gigs' ? (
                  <>
                    <button
                      onClick={() => handleUpdateGigStatus('active')}
                      disabled={updateMultipleGigsStatusMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateMultipleGigsStatusMutation.isPending ? 'Updating...' : 'Make Active'}
                    </button>
                    <button
                      onClick={() => handleUpdateGigStatus('paused')}
                      disabled={updateMultipleGigsStatusMutation.isPending}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateMultipleGigsStatusMutation.isPending ? 'Updating...' : 'Pause'}
                    </button>
                    <button
                      onClick={handleDeleteGigs}
                      disabled={deleteMultipleGigsMutation.isPending}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleteMultipleGigsMutation.isPending ? 'Deleting...' : 'Delete'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleUpdateServiceStatus('active')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => handleUpdateServiceStatus('paused')}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      Pause
                    </button>
                    <button
                      onClick={handleDeleteServices}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <button
                onClick={activeTab === 'services' ? handleSelectAllServices : handleSelectAll}
                disabled={isLoading || items.length === 0}
                className="flex items-center mr-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activeTab === 'services' 
                  ? allServicesSelected
                    ? <CheckSquare className="w-5 h-5 text-green-600" />
                    : <Square className="w-5 h-5 text-gray-400" />
                  : allSelected
                    ? <CheckSquare className="w-5 h-5 text-blue-600" />
                    : <Square className="w-5 h-5 text-gray-400" />
                }
              </button>
              <span className="text-gray-600">Select All</span>
            </div>
            <span className="text-gray-500">
              {items.length} {activeTab === 'services' ? 'service' : 'gig'}{items.length !== 1 ? 's' : ''} found
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={activeTab === 'services' ? serviceStatusFilter : statusFilter}
              onChange={(e) => activeTab === 'services' 
                ? setServiceStatusFilter(e.target.value)
                : setStatusFilter(e.target.value)
              }
              disabled={isLoading}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="all">All Status</option>
              {activeTab === 'services' ? (
                <>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="denied">Denied</option>
                  <option value="suspended">Suspended</option>
                </>
              ) : (
                <>
                  <option value="open">Open</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="paused">Paused</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="closed">Closed</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Content Area - Fixed switching glitch */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + viewMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'services' ? (
            viewMode === 'grid' ? (
              <ServicesGridView 
                services={filteredServices}
                isLoading={isLoading}
                selectedServices={selectedServices}
                handleSelectService={handleSelectService}
                handleServiceClick={handleServiceClick}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
              />
            ) : (
              <ServicesListView 
                services={filteredServices}
                isLoading={isLoading}
                selectedServices={selectedServices}
                handleSelectService={handleSelectService}
                handleServiceClick={handleServiceClick}
                handleCreateService={handleCreateService}
                serviceStatusFilter={serviceStatusFilter}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
              />
            )
          ) : (
            viewMode === 'grid' ? (
              <GigsGridView 
                gigs={filteredGigs}
                isLoading={isLoading}
                selectedGigs={selectedGigs}
                handleSelectGig={handleSelectGig}
                handleGigClick={handleGigClick}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
              />
            ) : (
              <GigsListView 
                gigs={filteredGigs}
                isLoading={isLoading}
                selectedGigs={selectedGigs}
                handleSelectGig={handleSelectGig}
                handleGigClick={handleGigClick}
                handleDeleteGigs={handleDeleteGigs}
                handleCreateGig={handleCreateGig}
                statusFilter={statusFilter}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
              />
            )
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

// ServicesGridView component with Framer Motion
const ServicesGridView = ({ services, isLoading, selectedServices, handleSelectService, handleServiceClick, getStatusColor, getStatusIcon }) => {
  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
      >
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your services...</p>
        </div>
      </motion.div>
    );
  }

  if (services.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
      >
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-600 mb-6">You haven't created any services yet</p>
          <button
            onClick={() => window.location.href = '/services/create'}
            className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Service
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {services.map((service) => (
        <motion.div
          key={service._id || service.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <button
                  onClick={() => handleSelectService(service._id || service.id)}
                  className="mr-3"
                >
                  {selectedServices.includes(service._id || service.id) ? (
                    <CheckSquare className="w-5 h-5 text-green-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <div>
                  <h4 
                    className="font-medium text-gray-900 hover:text-green-600 cursor-pointer line-clamp-1"
                    onClick={() => handleServiceClick(service._id || service.id)}
                  >
                    {service.title || 'Untitled Service'}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)}
                    <span className="ml-1">
                      {service.status ? 
                        service.status.charAt(0).toUpperCase() + service.status.slice(1) 
                        : 'Draft'
                      }
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {service.shortDescription || service.description || 'No description available'}
            </p>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 text-gray-600 mr-1" />
                <span className="font-bold text-gray-900">
                  ${service.price || 0}
                </span>
              </div>
              
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Tag className="w-3 h-3 text-gray-400 mr-1" />
                <span className="text-xs text-gray-600">
                  {service.category?.name || 'Uncategorized'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleServiceClick(service._id || service.id)}
                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

// ServicesListView with Framer Motion
const ServicesListView = ({ services, isLoading, selectedServices, handleSelectService, handleServiceClick, handleCreateService, serviceStatusFilter, getStatusColor, getStatusIcon }) => {
  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
      >
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your services...</p>
        </div>
      </motion.div>
    );
  }

  if (services.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
      >
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-600 mb-6">
            {serviceStatusFilter === 'all' 
              ? "You haven't created any services yet"
              : `No services with status "${serviceStatusFilter}" found`}
          </p>
          <button
            onClick={handleCreateService}
            className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Service
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Service</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Status</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Price</span>
              </th>
              
             
             
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {services.map((service) => (
              <motion.tr
                key={service._id || service.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ backgroundColor: 'rgba(243, 244, 246, 0.5)' }}
                className="transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <button
                      onClick={() => handleSelectService(service._id || service.id)}
                      className="mr-3"
                    >
                      {selectedServices.includes(service._id || service.id) ? (
                        <CheckSquare className="w-5 h-5 text-green-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <div 
                      className="cursor-pointer"
                      onClick={() => handleServiceClick(service._id || service.id)}
                    >
                      <h4 className="font-medium text-gray-900 hover:text-green-600">
                        {service.title || 'Untitled Service'}
                      </h4>
                      <div className="flex items-center mt-1">
                        <Tag className="w-3 h-3 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-600">
                          {service.category?.name || 'Uncategorized'}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                    {getStatusIcon(service.status)}
                    <span className="ml-1">
                      {service.status ? 
                        service.status.charAt(0).toUpperCase() + service.status.slice(1) 
                        : 'Draft'
                      }
                    </span>
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-gray-600 mr-1" />
                    <span className="font-medium">
                      ${service.price || 0}
                    </span>
                  </div>
                </td>
                
                
                
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// GigsGridView with Framer Motion
const GigsGridView = ({ gigs, isLoading, selectedGigs, handleSelectGig, handleGigClick, getStatusColor, getStatusIcon }) => {
  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
      >
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your gigs...</p>
        </div>
      </motion.div>
    );
  }

  if (gigs.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
      >
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No gigs found</h3>
          <p className="text-gray-600 mb-6">You haven't created any gigs yet</p>
          <button
            onClick={() => window.location.href = '/create-gig'}
            className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Gig
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ staggerChildren: 0.1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {gigs.map((gig) => (
        <motion.div
          key={gig._id || gig.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <button
                  onClick={() => handleSelectGig(gig._id || gig.id)}
                  className="mr-3"
                >
                  {selectedGigs.includes(gig._id || gig.id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <div>
                  <h4 
                    className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer line-clamp-1"
                    onClick={() => handleGigClick(gig._id || gig.id)}
                  >
                    {gig.title || 'Untitled Gig'}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(gig.status)}`}>
                    {getStatusIcon(gig.status)}
                    <span className="ml-1">
                      {gig.status ? 
                        gig.status.charAt(0).toUpperCase() + gig.status.slice(1) 
                        : 'Draft'
                      }
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {gig.description || 'No description available'}
            </p>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 text-gray-600 mr-1" />
                <span className="font-bold text-gray-900">
                  ${gig.budget || gig.price || 0}
                </span>
              </div>
              
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Tag className="w-3 h-3 text-gray-400 mr-1" />
                <span className="text-xs text-gray-600">
                  {gig.category?.name || 'Uncategorized'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleGigClick(gig._id || gig.id)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Details"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

// GigsListView with Framer Motion
const GigsListView = ({ gigs, isLoading, selectedGigs, handleSelectGig, handleGigClick, handleDeleteGigs, handleCreateGig, statusFilter, getStatusColor, getStatusIcon }) => {
  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
      >
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your gigs...</p>
        </div>
      </motion.div>
    );
  }

  if (gigs.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
      >
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No gigs found</h3>
          <p className="text-gray-600 mb-6">
            {statusFilter === 'all' 
              ? "You haven't created any gigs yet"
              : `No gigs with status "${statusFilter}" found`}
          </p>
          <button
            onClick={handleCreateGig}
            className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Gig
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Gig</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Status</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Budget</span>
              </th>
              
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {gigs.map((gig) => (
              <motion.tr
                key={gig._id || gig.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ backgroundColor: 'rgba(243, 244, 246, 0.5)' }}
                className="transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <button
                      onClick={() => handleSelectGig(gig._id || gig.id)}
                      className="mr-3"
                    >
                      {selectedGigs.includes(gig._id || gig.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <div 
                      className="cursor-pointer"
                      onClick={() => handleGigClick(gig._id || gig.id)}
                    >
                      <h4 className="font-medium text-gray-900 hover:text-blue-600">
                        {gig.title || 'Untitled Gig'}
                      </h4>
                      <div className="flex items-center mt-1">
                        <Tag className="w-3 h-3 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-600">
                          {gig.category?.name || 'Uncategorized'}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(gig.status)}`}>
                    {getStatusIcon(gig.status)}
                    <span className="ml-1">
                      {gig.status ? 
                        gig.status.charAt(0).toUpperCase() + gig.status.slice(1) 
                        : 'Draft'
                      }
                    </span>
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-gray-600 mr-1" />
                    <span className="font-medium">
                      ${gig.budget || gig.price || 0}
                    </span>
                  </div>
                </td>
                
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleGigClick(gig._id || gig.id)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// RoleSwitchDialog with Framer Motion
const RoleSwitchDialog = ({
  showSwitchDialog,
  setShowSwitchDialog,
  switchDirection,
  handleSwitchRole,
  switchRoleMutation
}) => {
  return (
    <AnimatePresence>
      {showSwitchDialog && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setShowSwitchDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {switchDirection === 'toUser' ? 'Switch to User Account' : 'Switch to Seller Account'}
                  </h3>
                  <button
                    onClick={() => setShowSwitchDialog(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Warning Alert */}
                  <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-yellow-800 font-medium">
                        {switchDirection === 'toUser' 
                          ? 'You are switching back to user account' 
                          : 'Important: Account switch required'}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        {switchDirection === 'toUser'
                          ? 'You will lose access to seller features and gig management. You can switch back anytime.'
                          : 'To create and sell services, you need a seller account.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">
                      {switchDirection === 'toUser' ? 'You will:' : 'You will gain:'}
                    </h4>
                    <div className="space-y-2">
                      {switchDirection === 'toUser' ? (
                        <>
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 text-red-500 mt-0.5">•</div>
                            <span className="text-sm text-gray-700">Lose access to service creation and management</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 text-red-500 mt-0.5">•</div>
                            <span className="text-sm text-gray-700">No longer see seller dashboard</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 text-green-500 mt-0.5">•</div>
                            <span className="text-sm text-gray-700">Gain ability to browse and buy services</span>
                        </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">Create and manage services</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">Access seller dashboard and analytics</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">Earn money from your services</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowSwitchDialog(false)}
                      className="flex-1 py-3 text-gray-700 font-medium border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSwitchRole}
                      disabled={switchRoleMutation.isPending}
                      className={`flex-1 py-3 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 ${
                        switchDirection === 'toUser'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                      }`}
                    >
                      {switchRoleMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Switching...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="w-4 h-4" />
                          {switchDirection === 'toUser' ? 'Switch to User' : 'Switch to Seller'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Profile;