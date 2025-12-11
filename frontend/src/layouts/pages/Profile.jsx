import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  User
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  useMyGigs, 
  useDeleteMultipleGigs, 
  useUpdateMultipleGigsStatus,
  useGigStats,
  extractGigsFromResponse
} from '../../hooks/useGigs';
import { useSwitchRole } from '../../hooks/useUser';
import { toast } from 'react-hot-toast';
import ProfileSidebar from '../../components/ProfileSidebar';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const switchRoleMutation = useSwitchRole();
  const [selectedGigs, setSelectedGigs] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [switchDirection, setSwitchDirection] = useState(''); 
  
  const { 
    data: gigsResponse, 
    isLoading, 
    error, 
    refetch 
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
  
  const { data: statsResponse, isLoading: statsLoading } = useGigStats();
  
  const stats = useMemo(() => {
    const defaultStats = {
      totalGigs: 0,
      activeGigs: 0,
      totalOrders: 0,
      totalBudget: 0,
      avgBudget: 0,
      averageRating: 4.8
    };

    if (statsLoading || !statsResponse) {
      return defaultStats;
    }
    if (statsResponse.isFallback) {
      return {
        ...defaultStats,
        ...statsResponse.data?.overview?.[0]
      };
    }
    if (statsResponse.success && statsResponse.data) {
      if (statsResponse.data.overview && Array.isArray(statsResponse.data.overview)) {
        const overview = statsResponse.data.overview[0] || {};
        return {
          totalGigs: overview.totalGigs || 0,
          activeGigs: overview.activeGigs || 0,
          totalOrders: overview.totalOrders || 0,
          totalBudget: overview.totalBudget || 0,
          avgBudget: overview.avgBudget || 0,
          averageRating: overview.averageRating || 4.8
        };
      }
    }

    return {
      totalGigs: gigs.length,
      activeGigs: gigs.filter(g => g.status === 'active' || g.status === 'open').length,
      totalOrders: gigs.reduce((sum, gig) => sum + (gig.orders || gig.proposals?.length || 0), 0),
      totalBudget: gigs.reduce((sum, gig) => sum + (gig.budget || gig.price || 0), 0),
      avgBudget: gigs.length > 0 ? 
        gigs.reduce((sum, gig) => sum + (gig.budget || gig.price || 0), 0) / gigs.length : 0,
      averageRating: 4.8
    };
  }, [statsResponse, statsLoading, gigs]);

  const resetSelection = useCallback(() => {
    setSelectedGigs([]);
    setAllSelected(false);
  }, []);

  useEffect(() => {
    resetSelection();
  }, [gigs, resetSelection]);

  const handleCreateGig = () => {
    navigate('/create-gig');
  };

  const handleGigClick = (gigId) => {
    navigate(`/gig/${gigId}`);
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedGigs([]);
    } else {
      const filteredGigs = filterGigs(gigs);
      setSelectedGigs(filteredGigs.map(gig => gig._id));
    }
    setAllSelected(!allSelected);
  };

  const handleSelectGig = (gigId) => {
    setSelectedGigs(prev =>
      prev.includes(gigId)
        ? prev.filter(id => id !== gigId)
        : [...prev, gigId]
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
    }
  };

  const handleUpdateStatus = async (status) => {
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
    }
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
      console.error('Role switch failed:', error);
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

  const filteredGigs = useMemo(() => filterGigs(gigs), [gigs, filterGigs]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'paused': 
      case 'cancelled': return 'bg-orange-100 text-orange-800';
      case 'completed': 
      case 'closed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'assigned': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'paused': 
      case 'cancelled': return <EyeOff className="w-4 h-4" />;
      case 'completed': 
      case 'closed': return <Award className="w-4 h-4" />;
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error loading gigs</h2>
          <p className="text-gray-600 mb-6">{error.message || 'Failed to load your gigs'}</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
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
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {user?.role === 'seller' ? 'My Gigs' : 'My Profile'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {user?.role === 'seller' 
                      ? 'Manage your freelance services' 
                      : 'View your profile information'}
                  </p>
                </div>
                {user?.role === 'seller' && (
                  <button
                    onClick={handleCreateGig}
                    disabled={isLoading}
                    className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Gig
                  </button>
                )}
              </div>
            </div>

            {user?.role === 'seller' ? (
              <SellerGigsView 
                selectedGigs={selectedGigs}
                allSelected={allSelected}
                statusFilter={statusFilter}
                filteredGigs={filteredGigs}
                isLoading={isLoading}
                stats={stats}
                statsLoading={statsLoading}
                handleSelectAll={handleSelectAll}
                handleSelectGig={handleSelectGig}
                handleUpdateStatus={handleUpdateStatus}
                handleDeleteGigs={handleDeleteGigs}
                handleGigClick={handleGigClick}
                handleCreateGig={handleCreateGig}
                setStatusFilter={setStatusFilter}
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
                  Switch to seller mode to create and manage your own gigs.
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

const SellerGigsView = ({
  selectedGigs,
  allSelected,
  statusFilter,
  filteredGigs,
  isLoading,
  stats,
  statsLoading,
  handleSelectAll,
  handleSelectGig,
  handleUpdateStatus,
  handleDeleteGigs,
  handleGigClick,
  handleCreateGig,
  setStatusFilter,
  getStatusColor,
  getStatusIcon,
  deleteMultipleGigsMutation,
  updateMultipleGigsStatusMutation
}) => (
  <>
    {selectedGigs.length > 0 && (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <CheckSquare className="w-5 h-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-900">
              {selectedGigs.length} gig(s) selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleUpdateStatus('active')}
              disabled={updateMultipleGigsStatusMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMultipleGigsStatusMutation.isPending ? 'Updating...' : 'Make Active'}
            </button>
            <button
              onClick={() => handleUpdateStatus('paused')}
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
          </div>
        </div>
      </div>
    )}

    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <button
              onClick={handleSelectAll}
              disabled={isLoading || filteredGigs.length === 0}
              className="flex items-center mr-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {allSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
            <span className="text-gray-600">Select All</span>
          </div>
          <span className="text-gray-500">
            {filteredGigs.length} gig{filteredGigs.length !== 1 ? 's' : ''} found
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
    </div>

    <GigsTable 
      filteredGigs={filteredGigs}
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

    <StatsSummary stats={stats} statsLoading={statsLoading} />
  </>
);

const GigsTable = ({
  filteredGigs,
  isLoading,
  selectedGigs,
  handleSelectGig,
  handleGigClick,
  handleDeleteGigs,
  handleCreateGig,
  statusFilter,
  getStatusColor,
  getStatusIcon
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your gigs...</p>
        </div>
      </div>
    );
  }

  if (filteredGigs.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
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
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
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
                <span className="text-sm font-semibold text-gray-700 uppercase">Price</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Orders</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700 uppercase">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredGigs.map((gig) => (
              <tr
                key={gig._id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectGig(gig._id);
                      }}
                      className="mr-3"
                    >
                      {selectedGigs.includes(gig._id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <div 
                      className="cursor-pointer"
                      onClick={() => handleGigClick(gig._id)}
                    >
                      <h4 className="font-medium text-gray-900 hover:text-blue-600">
                        {gig.title || 'Untitled Gig'}
                      </h4>
                      <div className="flex items-center mt-1">
                        <Tag className="w-3 h-3 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-600">
                          {gig.category || gig.projectCategory?.name || 'Uncategorized'}
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
                        gig.status.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ') 
                        : 'Draft'
                      }
                    </span>
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-gray-600 mr-1" />
                    <span className="font-medium">
                      ${gig.price || gig.budget || 0}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-gray-600 mr-1" />
                    <span>{gig.orders || gig.proposals?.length || 0}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleGigClick(gig._id)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectGig(gig._id);
                        if (window.confirm('Are you sure you want to delete this gig?')) {
                          handleDeleteGigs([gig._id]);
                        }
                      }}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatsSummary = ({ stats, statsLoading }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-blue-800">Total Gigs</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {stats.totalGigs}
          </p>
          {statsLoading && (
            <p className="text-xs text-blue-600 mt-1">Loading...</p>
          )}
        </div>
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
          <FileText className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-green-800">Active Gigs</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {stats.activeGigs}
          </p>
          {statsLoading && (
            <p className="text-xs text-green-600 mt-1">Loading...</p>
          )}
        </div>
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-purple-800">Total Orders</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">
            {stats.totalOrders}
          </p>
          {statsLoading && (
            <p className="text-xs text-purple-600 mt-1">Loading...</p>
          )}
        </div>
        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
          <Award className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  </div>
);

const RoleSwitchDialog = ({
  showSwitchDialog,
  setShowSwitchDialog,
  switchDirection,
  handleSwitchRole,
  switchRoleMutation
}) => {
  if (!showSwitchDialog) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 opacity-100">
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
                      <span className="text-sm text-gray-700">Lose access to gig creation and management</span>
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
                      <span className="text-sm text-gray-700">Create and manage gigs/services</span>
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
      </div>
    </div>
  );
};

const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default Profile;