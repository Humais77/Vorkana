import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Calendar,
  MapPin,
  Globe,
  Award,
  Star,
  Edit2,
  Plus,
  Trash2,
  EyeOff,
  CheckSquare,
  Square,
  ExternalLink,
  FileText,
  DollarSign,
  Tag,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { 
  useMyGigs, 
  useDeleteMultipleGigs, 
  useUpdateMultipleGigsStatus,
  useGigStats,
  extractGigsFromResponse
} from '../../hooks/useGigs';
import { toast } from 'react-hot-toast';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [selectedGigs, setSelectedGigs] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  
  // Memoized profile data to prevent unnecessary re-renders
  const profileData = useMemo(() => ({
    name: user?.name || '',
    bio: user?.bio || 'Experienced freelancer specializing in web development and design.',
    location: user?.location || 'San Francisco, CA',
    skills: user?.skills || ['React', 'Node.js', 'UI/UX Design', 'TypeScript'],
    hourlyRate: user?.hourlyRate || 50,
    availability: user?.availability || 'full-time'
  }), [user]);

  // Fetch user's gigs using the new hook
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

  // Extract gigs from response using helper function
  const gigs = useMemo(() => 
    extractGigsFromResponse(gigsResponse) || [], 
    [gigsResponse]
  );

  // Delete multiple gigs mutation
  const deleteMultipleGigsMutation = useDeleteMultipleGigs();
  
  // Update multiple gigs status mutation
  const updateMultipleGigsStatusMutation = useUpdateMultipleGigsStatus();
  
  // Get gig statistics - will handle empty states gracefully
  const { data: statsResponse, isLoading: statsLoading } = useGigStats();
  
  // Memoized stats - FIXED: Handle empty/null stats properly
  const stats = useMemo(() => {
    // Default empty stats
    const defaultStats = {
      totalGigs: 0,
      activeGigs: 0,
      totalOrders: 0,
      totalBudget: 0,
      avgBudget: 0,
      averageRating: 4.8
    };

    // If stats are loading or not available, return defaults
    if (statsLoading || !statsResponse) {
      return defaultStats;
    }

    // If stats request failed but returned a fallback
    if (statsResponse.isFallback) {
      return {
        ...defaultStats,
        ...statsResponse.data?.overview?.[0]
      };
    }

    // If stats request was successful
    if (statsResponse.success && statsResponse.data) {
      // Extract stats from response
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

    // Fallback to local calculation from gigs array
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

  // Reset selection when gigs change
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
      // Error is handled by the mutation
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
      // Error is handled by the mutation
    }
  };

  // Memoized filter function
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
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sticky top-8">
              {/* Profile Header */}
              <div className="text-center mb-8">
                <div className="relative mx-auto w-32 h-32 mb-4">
                  <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
                <p className="text-gray-600 mt-1">{user?.email}</p>
                <div className="flex items-center justify-center mt-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="ml-1 font-medium">{stats.averageRating || '4.8'}</span>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className="text-gray-600">Top Rated</span>
                </div>
              </div>

              {/* Profile Stats */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">Member Since</span>
                  <span className="font-semibold">
                    {new Date(user?.createdAt).getFullYear() || '2023'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-semibold text-green-600">2 hours</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">Job Success</span>
                  <span className="font-semibold text-green-600">98%</span>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  About
                </h3>
                <p className="text-gray-600 text-sm">
                  {profileData.bio}
                </p>
              </div>

              {/* Skills */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Award className="w-4 h-4 mr-2" />
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profileData.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-3" />
                  <span>{profileData.location}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Globe className="w-4 h-4 mr-3" />
                  <span>English (Fluent)</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-3" />
                  <span>Available {profileData.availability}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <DollarSign className="w-4 h-4 mr-3" />
                  <span>${profileData.hourlyRate}/hour</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Gigs */}
          <div className="lg:col-span-3">
            {/* Header with Actions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">My Gigs</h2>
                  <p className="text-gray-600 mt-1">Manage your freelance services</p>
                </div>
                <button
                  onClick={handleCreateGig}
                  disabled={isLoading}
                  className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Gig
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
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

            {/* Filters */}
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

            {/* Gigs Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading your gigs...</p>
                </div>
              ) : filteredGigs.length === 0 ? (
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
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-4 px-6 text-left">
                          <div className="flex items-center">
                            <button
                              onClick={handleSelectAll}
                              disabled={filteredGigs.length === 0}
                              className="mr-3 disabled:opacity-50"
                            >
                              {allSelected ? (
                                <CheckSquare className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                            <span className="text-sm font-semibold text-gray-700 uppercase">Gig</span>
                          </div>
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
              )}
            </div>

            {/* Stats Summary */}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;