// Dashboard.js - OPTIMIZED VERSION
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  useMyGigs, 
  useDeleteMultipleGigs, 
  useUpdateMultipleGigsStatus,
  extractGigsFromResponse
} from '../../hooks/useGigs';
import { useMyServices, useDeleteService } from '../../hooks/useServices';
import { toast } from 'react-hot-toast';
import { isProfileCompleteEnough, calculateProfileCompletion, getProfileSuggestions } from '../../utils/profileUtils';
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
  X,
  Award,
  User,
  Briefcase,
  Grid3x3,
  List,
  Edit,
  Star,
  Package,
  ArrowRight,
  BarChart3,
  TrendingUp,
  Calendar,
  CreditCard,
  MessageSquare,
  Users,
  AlertCircle,
  Shield,
  Info
} from 'lucide-react';

// Memoized Stats Card
const StatsCard = memo(({ title, value, subValue, icon: Icon, colorClass, subText }) => (
  <div className={`${colorClass} rounded-2xl p-6 border ${colorClass.includes('blue') ? 'border-blue-100' : colorClass.includes('green') ? 'border-green-100' : 'border-orange-100'}`}>
    <div className="flex items-center">
      <Icon className={`w-5 h-5 ${colorClass.includes('blue') ? 'text-blue-600' : colorClass.includes('green') ? 'text-green-600' : 'text-orange-600'} mr-2`} />
      <span className={`text-sm font-medium ${colorClass.includes('blue') ? 'text-blue-900' : colorClass.includes('green') ? 'text-green-900' : 'text-orange-900'}`}>{title}</span>
    </div>
    <p className={`text-2xl font-bold ${colorClass.includes('blue') ? 'text-blue-900' : colorClass.includes('green') ? 'text-green-900' : 'text-orange-900'} mt-2`}>{value}</p>
    <div className="flex items-center mt-1">
      <span className={`text-xs ${colorClass.includes('blue') ? 'text-blue-600' : colorClass.includes('green') ? 'text-green-600' : 'text-orange-600'}`}>
        {subValue}
      </span>
    </div>
    {subText && <p className="text-xs text-gray-500 mt-1">{subText}</p>}
  </div>
));
StatsCard.displayName = 'StatsCard';

// Memoized Profile Warning Banner
const ProfileWarningBanner = memo(({ profileCompletion, profileSuggestions, onCompleteProfile }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200 shadow-lg p-6"
  >
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="bg-yellow-100 p-3 rounded-full">
          <Shield className="w-8 h-8 text-yellow-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-yellow-900 mb-1">
            Complete Your Profile to Start Creating
          </h3>
          <p className="text-yellow-800 mb-3">
            Your profile is {profileCompletion}% complete. You need at least 70% completion to create gigs and services.
          </p>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm text-yellow-800 mb-1">
                <span>Profile Progress</span>
                <span className="font-bold">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2.5">
                <div 
                  className="bg-yellow-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
            {profileSuggestions.length > 0 && (
              <div>
                <p className="text-sm text-yellow-800 font-medium mb-1">Suggested improvements:</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {profileSuggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-center">
                      <ArrowRight className="w-3 h-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onCompleteProfile}
        className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap flex-shrink-0"
      >
        Complete Profile Now
      </button>
    </div>
  </motion.div>
));
ProfileWarningBanner.displayName = 'ProfileWarningBanner';

// Memoized Profile Info Bar
const ProfileInfoBar = memo(({ profileCompletion, canCreateContent, onImproveProfile }) => {
  const statusColor = useMemo(() => {
    if (profileCompletion >= 80) return 'bg-green-100 text-green-800';
    if (profileCompletion >= 70) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  }, [profileCompletion]);

  const statusIcon = useMemo(() => 
    canCreateContent ? CheckCircle : AlertCircle
  , [canCreateContent]);

  const statusText = useMemo(() => 
    canCreateContent ? 'Ready to Create Content' : 'Complete Profile Required'
  , [canCreateContent]);

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900">Profile Status:</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-48">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Completion</span>
                <span className="font-bold">{profileCompletion}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    profileCompletion >= 80 ? 'bg-green-600' :
                    profileCompletion >= 70 ? 'bg-blue-600' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              {React.createElement(statusIcon, { className: "w-3 h-3 mr-1" })}
              {statusText}
            </span>
          </div>
        </div>
        <button
          onClick={onImproveProfile}
          className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex-shrink-0"
        >
          Improve Profile
        </button>
      </div>
    </div>
  );
});
ProfileInfoBar.displayName = 'ProfileInfoBar';

// Memoized Bulk Actions Bar
const BulkActionsBar = memo(({ 
  activeTab, 
  selectedCount, 
  onUpdateStatus, 
  onDelete,
  isUpdating,
  isDeleting
}) => {
  if (!selectedCount) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4 mb-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <CheckSquare className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
          <span className="font-medium text-blue-900">
            {selectedCount} {activeTab === 'services' ? 'service(s)' : 'gig(s)'} selected
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onUpdateStatus('active')}
            disabled={isUpdating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isUpdating ? 'Updating...' : 'Make Active'}
          </button>
          <button
            onClick={() => onUpdateStatus('paused')}
            disabled={isUpdating}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isUpdating ? 'Updating...' : 'Pause'}
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Trash2 className="w-4 h-4 mr-2 flex-shrink-0" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </motion.div>
  );
});
BulkActionsBar.displayName = 'BulkActionsBar';

// Memoized Item Card for Grid View
const ItemCard = memo(({ 
  item, 
  type, 
  isSelected, 
  onSelect, 
  onClick, 
  getStatusColor, 
  getStatusIcon 
}) => {
  const bgColor = type === 'services' ? 'hover:text-green-600' : 'hover:text-blue-600';
  const hoverBg = type === 'services' ? 'hover:bg-green-50' : 'hover:bg-blue-50';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <button
              onClick={() => onSelect(item._id || item.id)}
              className="mr-3 flex-shrink-0"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-green-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
            <div className="min-w-0">
              <h4 
                className={`font-medium text-gray-900 ${bgColor} cursor-pointer truncate`}
                onClick={() => onClick(item._id || item.id)}
              >
                {item.title || `Untitled ${type === 'services' ? 'Service' : 'Gig'}`}
              </h4>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${getStatusColor(item.status)}`}>
                {getStatusIcon(item.status)}
                <span className="ml-1 truncate">
                  {item.status ? 
                    item.status.charAt(0).toUpperCase() + item.status.slice(1) 
                    : 'Draft'
                  }
                </span>
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {item.shortDescription || item.description || 'No description available'}
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <DollarSign className="w-4 h-4 text-gray-600 mr-1 flex-shrink-0" />
            <span className="font-bold text-gray-900 truncate">
              ${type === 'services' ? (item.price || 0) : (item.budget || item.price || 0)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <Tag className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">
              {item.category?.name || 'Uncategorized'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onClick(item._id || item.id)}
              className={`p-2 text-gray-600 ${bgColor} ${hoverBg} rounded-lg transition-colors flex-shrink-0`}
              title="View Details"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
ItemCard.displayName = 'ItemCard';

// Memoized Empty State
const EmptyState = memo(({ 
  type, 
  filter, 
  onCreate, 
  icon: Icon, 
  createButtonText,
  gradientFrom,
  gradientTo
}) => {
  const getTitle = useCallback(() => {
    if (filter === 'all') return `No ${type} found`;
    return `No ${type} with status "${filter}" found`;
  }, [type, filter]);

  const getDescription = useCallback(() => {
    if (filter === 'all') return `You haven't created any ${type} yet`;
    return `You don't have any ${type} with this status`;
  }, [type, filter]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
    >
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{getTitle()}</h3>
        <p className="text-gray-600 mb-6">{getDescription()}</p>
        <button
          onClick={onCreate}
          className={`inline-flex items-center px-5 py-3 bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white rounded-xl font-medium hover:opacity-90 transition-opacity`}
        >
          <Plus className="w-5 h-5 mr-2" />
          {createButtonText}
        </button>
      </div>
    </motion.div>
  );
});
EmptyState.displayName = 'EmptyState';

// Main Dashboard Component
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  
  const [selectedGigs, setSelectedGigs] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [allServicesSelected, setAllServicesSelected] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('services');
  const [viewMode, setViewMode] = useState('grid');
  
  // Profile calculations
  const profileCompletion = useMemo(() => calculateProfileCompletion(user), [user]);
  const canCreateContent = useMemo(() => isProfileCompleteEnough(user, 70), [user]);
  const profileSuggestions = useMemo(() => getProfileSuggestions(user), [user]);

  // Services hook
  const { 
    data: servicesResponse, 
    isLoading: servicesLoading, 
    refetch: refetchServices 
  } = useMyServices({
    status: serviceStatusFilter === 'all' ? undefined : serviceStatusFilter,
    limit: 50,
    sort: 'createdAt',
    order: 'desc'
  });

  // Memoized services extraction
  const services = useMemo(() => {
    if (!servicesResponse) return [];
    
    if (Array.isArray(servicesResponse)) {
      return servicesResponse;
    } else if (servicesResponse.data && Array.isArray(servicesResponse.data)) {
      return servicesResponse.data;
    } else if (servicesResponse.services && Array.isArray(servicesResponse.services)) {
      return servicesResponse.services;
    }
    
    return [];
  }, [servicesResponse]);

  // Gigs hook
  const { 
    data: gigsResponse, 
    isLoading: gigsLoading, 
    refetch: refetchGigs 
  } = useMyGigs({
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 50,
    sort: 'createdAt',
    order: 'desc'
  });

  // Memoized gigs extraction
  const gigs = useMemo(() => 
    extractGigsFromResponse(gigsResponse) || [], 
    [gigsResponse]
  );

  // Mutations
  const deleteMultipleGigsMutation = useDeleteMultipleGigs();
  const updateMultipleGigsStatusMutation = useUpdateMultipleGigsStatus();
  const deleteServiceMutation = useDeleteService();

  // Memoized stats
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

  // Reset selection
  const resetSelection = useCallback(() => {
    setSelectedGigs([]);
    setSelectedServices([]);
    setAllSelected(false);
    setAllServicesSelected(false);
  }, []);

  useEffect(() => {
    resetSelection();
  }, [gigs, services, resetSelection]);

  // Event handlers
  const handleCreateService = useCallback(() => {
    if (!canCreateContent) {
      toast.error('Complete your profile to create services');
      return;
    }
    navigate('/services/create');
  }, [canCreateContent, navigate]);

  const handleCreateGig = useCallback(() => {
    if (!canCreateContent) {
      toast.error('Complete your profile to create gigs');
      return;
    }
    navigate('/create-gig');
  }, [canCreateContent, navigate]);

  const handleCompleteProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const handleServiceClick = useCallback((serviceId) => {
    navigate(`/services/${serviceId}`);
  }, [navigate]);

  const handleGigClick = useCallback((gigId) => {
    navigate(`/gig/${gigId}`);
  }, [navigate]);

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedGigs([]);
    } else {
      const filteredGigs = filterGigs(gigs);
      setSelectedGigs(filteredGigs.map(gig => gig._id || gig.id));
    }
    setAllSelected(!allSelected);
  }, [allSelected, gigs]);

  const handleSelectAllServices = useCallback(() => {
    if (allServicesSelected) {
      setSelectedServices([]);
    } else {
      const filteredServices = filterServices(services);
      setSelectedServices(filteredServices.map(service => service._id || service.id));
    }
    setAllServicesSelected(!allServicesSelected);
  }, [allServicesSelected, services]);

  const handleSelectGig = useCallback((gigId) => {
    setSelectedGigs(prev =>
      prev.includes(gigId)
        ? prev.filter(id => id !== gigId)
        : [...prev, gigId]
    );
  }, []);

  const handleSelectService = useCallback((serviceId) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  }, []);

  const handleDeleteGigs = useCallback(async () => {
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
  }, [selectedGigs, deleteMultipleGigsMutation, resetSelection]);

  const handleDeleteServices = useCallback(async () => {
    if (selectedServices.length === 0) {
      toast.error('Please select services to delete');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedServices.length} service(s)? This action cannot be undone.`);
    if (!confirmed) return;

    try {
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
  }, [selectedServices, deleteServiceMutation, resetSelection, refetchServices]);

  const handleUpdateGigStatus = useCallback(async (status) => {
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
  }, [selectedGigs, updateMultipleGigsStatusMutation, resetSelection]);

  const handleUpdateServiceStatus = useCallback(async (status) => {
    if (selectedServices.length === 0) {
      toast.error('Please select services to update');
      return;
    }

    toast.info('Service status update feature coming soon');
  }, []);

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

  const getStatusColor = useCallback((status) => {
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
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'active':
      case 'open': return <CheckCircle className="w-4 h-4 flex-shrink-0" />;
      case 'draft': return <FileText className="w-4 h-4 flex-shrink-0" />;
      case 'paused': 
      case 'cancelled': 
      case 'denied': 
      case 'suspended': return <X className="w-4 h-4 flex-shrink-0" />;
      case 'completed': 
      case 'closed': 
      case 'pending': return <Award className="w-4 h-4 flex-shrink-0" />;
      case 'in_progress': return <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />;
      case 'assigned': return <User className="w-4 h-4 flex-shrink-0" />;
      default: return null;
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your dashboard</h2>
          <button
            onClick={() => navigate('/sign-in')}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const isLoading = activeTab === 'services' ? servicesLoading : gigsLoading;
  const hasSelectedItems = activeTab === 'services' 
    ? selectedServices.length > 0 
    : selectedGigs.length > 0;
  const selectedCount = activeTab === 'services' 
    ? selectedServices.length 
    : selectedGigs.length;
  const items = activeTab === 'services' ? filteredServices : filteredGigs;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage your services, gigs, and track your performance</p>
            </div>
          </div>
        </div>

        {/* Profile Completion Warning */}
        {!canCreateContent && (
          <ProfileWarningBanner
            profileCompletion={profileCompletion}
            profileSuggestions={profileSuggestions}
            onCompleteProfile={handleCompleteProfile}
          />
        )}

        {/* Profile Info Bar */}
        <ProfileInfoBar
          profileCompletion={profileCompletion}
          canCreateContent={canCreateContent}
          onImproveProfile={handleCompleteProfile}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Services"
            value={stats.totalServices}
            subValue={`(${stats.activeServices} active)`}
            icon={Package}
            colorClass="bg-blue-50"
          />
          <StatsCard
            title="Active Services"
            value={stats.activeServices}
            subValue={`of ${stats.totalServices} total`}
            icon={CheckCircle}
            colorClass="bg-green-50"
          />
          <StatsCard
            title="Total Gigs"
            value={stats.totalGigs}
            subValue={`(${stats.activeGigs} active)`}
            icon={FileText}
            colorClass="bg-orange-50"
          />
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Your Work</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateGig}
                disabled={!canCreateContent || isLoading}
                className={`flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  canCreateContent 
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
                title={!canCreateContent ? "Complete your profile to create gigs" : ""}
              >
                <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                Create Gig
              </button>
              <button
                onClick={handleCreateService}
                disabled={!canCreateContent || isLoading}
                className={`flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  canCreateContent 
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
                title={!canCreateContent ? "Complete your profile to create services" : ""}
              >
                <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                Create Service
              </button>
            </div>
          </div>

          {/* Info message for users who can't create content */}
          {!canCreateContent && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-blue-800 text-sm">
                  Complete your profile to unlock the ability to create gigs and services. 
                  A complete profile helps build trust with clients and increases your chances of success.
                </p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-gray-50 rounded-xl p-2 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setActiveTab('services')}
                  className={`px-5 py-2.5 font-medium transition-all flex-shrink-0 ${
                    activeTab === 'services'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Services ({stats.totalServices})</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('gigs')}
                  className={`px-5 py-2.5 font-medium transition-all flex-shrink-0 ${
                    activeTab === 'gigs'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="whitespace-nowrap">Gigs ({stats.totalGigs})</span>
                  </div>
                </button>
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
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <BulkActionsBar
            activeTab={activeTab}
            selectedCount={selectedCount}
            onUpdateStatus={activeTab === 'gigs' ? handleUpdateGigStatus : handleUpdateServiceStatus}
            onDelete={activeTab === 'gigs' ? handleDeleteGigs : handleDeleteServices}
            isUpdating={updateMultipleGigsStatusMutation.isPending}
            isDeleting={activeTab === 'gigs' 
              ? deleteMultipleGigsMutation.isPending 
              : deleteServiceMutation.isPending}
          />

          {/* Filter Bar */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
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
                        ? <CheckSquare className="w-5 h-5 text-green-600 flex-shrink-0" />
                        : <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      : allSelected
                        ? <CheckSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        : <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    }
                  </button>
                  <span className="text-gray-600 whitespace-nowrap">Select All</span>
                </div>
                <span className="text-gray-500 whitespace-nowrap">
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
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 min-w-[150px]"
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

          {/* Content Area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + viewMode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {isLoading ? (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading your {activeTab}...</p>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  type={activeTab}
                  filter={activeTab === 'services' ? serviceStatusFilter : statusFilter}
                  onCreate={activeTab === 'services' ? handleCreateService : handleCreateGig}
                  icon={activeTab === 'services' ? Briefcase : FileText}
                  createButtonText={`Create Your First ${activeTab === 'services' ? 'Service' : 'Gig'}`}
                  gradientFrom={activeTab === 'services' ? 'from-green-600' : 'from-blue-600'}
                  gradientTo={activeTab === 'services' ? 'to-emerald-600' : 'to-purple-600'}
                />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item) => (
                    <ItemCard
                      key={item._id || item.id}
                      item={item}
                      type={activeTab}
                      isSelected={activeTab === 'services' 
                        ? selectedServices.includes(item._id || item.id)
                        : selectedGigs.includes(item._id || item.id)
                      }
                      onSelect={activeTab === 'services' ? handleSelectService : handleSelectGig}
                      onClick={activeTab === 'services' ? handleServiceClick : handleGigClick}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                    />
                  ))}
                </div>
              ) : (
                <ListView
                  items={items}
                  type={activeTab}
                  selectedIds={activeTab === 'services' ? selectedServices : selectedGigs}
                  onSelect={activeTab === 'services' ? handleSelectService : handleSelectGig}
                  onClick={activeTab === 'services' ? handleServiceClick : handleGigClick}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Memoized List View Component
const ListView = memo(({ items, type, selectedIds, onSelect, onClick, getStatusColor, getStatusIcon }) => {
  const isService = type === 'services';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">{type === 'services' ? 'Service' : 'Gig'}</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Status</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">{type === 'services' ? 'Price' : 'Budget'}</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <motion.tr
                key={item._id || item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ backgroundColor: 'rgba(243, 244, 246, 0.5)' }}
                className="transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <button
                      onClick={() => onSelect(item._id || item.id)}
                      className="mr-3 flex-shrink-0"
                    >
                      {selectedIds.includes(item._id || item.id) ? (
                        <CheckSquare className={`w-5 h-5 ${isService ? 'text-green-600' : 'text-blue-600'}`} />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <div 
                      className="cursor-pointer min-w-0"
                      onClick={() => onClick(item._id || item.id)}
                    >
                      <h4 className={`font-medium text-gray-900 hover:${isService ? 'text-green-600' : 'text-blue-600'} truncate`}>
                        {item.title || `Untitled ${type === 'services' ? 'Service' : 'Gig'}`}
                      </h4>
                      <div className="flex items-center mt-1">
                        <Tag className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate">
                          {item.category?.name || 'Uncategorized'}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    <span className="ml-1">
                      {item.status ? 
                        item.status.charAt(0).toUpperCase() + item.status.slice(1) 
                        : 'Draft'
                      }
                    </span>
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-gray-600 mr-1 flex-shrink-0" />
                    <span className="font-medium">
                      ${isService ? (item.price || 0) : (item.budget || item.price || 0)}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onClick(item._id || item.id)}
                      className={`p-2 text-gray-600 hover:${isService ? 'text-green-600 hover:bg-green-50' : 'text-blue-600 hover:bg-blue-50'} rounded-lg transition-colors`}
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
});
ListView.displayName = 'ListView';

export default Dashboard;