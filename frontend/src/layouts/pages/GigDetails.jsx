import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Star, 
  Heart, 
  Share2, 
  Flag, 
  Shield, 
  ChevronRight,
  ChevronLeft,
  Package,
  FileText,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  CheckCircle,
  DollarSign,
  Target,
  TrendingUp,
  Award,
  Globe,
  Zap,
  FileCheck,
  AlertCircle,
  Eye,
  Briefcase,
  Languages,
  GraduationCap,
  Activity,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import Zustand stores and TanStack Query hooks
import { useAuthStore } from '../../store/useAuthStore';
import { useGigStore } from '../../store/useGigStore';
import { useGig } from '../../hooks/useGigs';


const GigDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Zustand stores
  const { user, isAuthenticated } = useAuthStore();
  const { setGigDetails, clearGigDetails } = useGigStore();
  
  
  // TanStack Query hook for gig data
  const { 
    data: gigResponse, 
    isLoading: loading, 
    error, 
    refetch 
  } = useGig(id);

  // Extract gig data from response
  const gig = gigResponse?.gig || gigResponse;
  
  // Local state
  const [isLiked, setIsLiked] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [viewCount, setViewCount] = useState(0);

  // Update gig details in store when data loads
  useEffect(() => {
    if (gig) {
      setGigDetails(gig);
      // Set derived state
      // Simulate view count (in a real app, this would come from backend)
      setViewCount(Math.floor(Math.random() * 500) + 100);
    }
  }, [gig, setGigDetails]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      clearGigDetails();
    };
  }, [clearGigDetails]);

 
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleReport = () => {
    toast.info('Report feature coming soon');
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Refreshing gig details...');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: gig?.currency || 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : rating % 1 !== 0 && i === Math.floor(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 font-semibold">{rating}</span>
      </div>
    );
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateTimeAgo = (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  // Calculate account age
  const calculateAccountAge = (createdAt) => {
    if (!createdAt) return '';
    const created = new Date(createdAt);
    const now = new Date();
    const diffYears = now.getFullYear() - created.getFullYear();
    return `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Check if user is online
  const isUserOnline = (lastSeenAt) => {
    if (!lastSeenAt) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeenAt) > fiveMinutesAgo;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-gray-200 rounded-2xl h-96 mb-6"></div>
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="bg-gray-200 rounded-2xl h-96"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {error?.response?.status === 404 ? 'Gig Not Found' : 'Error Loading Gig'}
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {error?.response?.data?.message || 
             error?.message || 
             "The gig you're looking for doesn't exist or has been removed."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/gigs')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
            >
              Browse Gigs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get attachments that are images
  const imageAttachments = gig.attachments?.filter(attachment => 
    typeof attachment === 'string' && 
    /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment)
  ) || [];

  // Calculate derived values
  const timeAgo = calculateTimeAgo(gig.createdAt);
  const deadlineDate = gig.deadline ? new Date(gig.deadline) : null;
  const daysUntilDeadline = deadlineDate ? 
    Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

  // Extract user details from gig
  const gigUser = gig.createdBy;
  const userAge = calculateAge(gigUser?.dateOfBirth);
  const accountAge = calculateAccountAge(gigUser?.createdAt);
  const isOnline = isUserOnline(gigUser?.lastSeenAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <nav className="flex items-center space-x-2 text-sm">
              <button
                onClick={() => navigate('/')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Home
              </button>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <button
                onClick={() => navigate('/gigs')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Gigs
              </button>
              {gig.projectCategory && (
                <>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">{gig.projectCategory.name}</span>
                </>
              )}
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-emerald-600 font-medium truncate max-w-xs">
                {gig.title}
              </span>
            </nav>
            
            <button
              onClick={handleRefresh}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Gig Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title and Actions */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 pr-4 mb-2">
                    {gig.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(gig.status)}`}>
                      {gig.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(gig.urgency)}`}>
                      {gig.urgency.toUpperCase()} PRIORITY
                    </span>
                    <span className="flex items-center text-gray-500 text-sm">
                      <Eye className="h-4 w-4 mr-1" />
                      {viewCount} views
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
                    title={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart
                      className={`h-6 w-6 ${
                        isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'
                      }`}
                    />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-6 w-6 text-gray-400" />
                  </button>
                  <button
                    onClick={handleReport}
                    className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
                    title="Report"
                  >
                    <Flag className="h-6 w-6 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Enhanced User Info - Now Clickable */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                <Link 
                  to={`/profile/${gigUser?._id}`}
                  className="flex items-center space-x-4 group cursor-pointer flex-1"
                >
                  <div className="relative">
                    <img
                      src={gigUser?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                      alt={gigUser?.name}
                      className="w-16 h-16 rounded-full border-4 border-white shadow-lg group-hover:ring-2 group-hover:ring-emerald-500 transition-all"
                    />
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                    {gigUser?.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-bold text-gray-900 text-lg group-hover:text-emerald-700 transition-colors">
                        {gigUser?.name || 'User'}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {gigUser?.role === 'admin' ? 'Admin' : 'Client'}
                      </span>
                      {isOnline && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Online
                        </span>
                      )}
                    </div>
                    
                    {/* Enhanced User Details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
                      {gigUser?.occupation && (
                        <span className="flex items-center">
                          <Briefcase className="h-4 w-4 mr-1" />
                          {gigUser.occupation}
                        </span>
                      )}
                      
                      {gigUser?.country && (
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {gigUser.city ? `${gigUser.city}, ${gigUser.country}` : gigUser.country}
                        </span>
                      )}
                      
                      {gigUser?.rating && (
                        <span className="flex items-center">
                          {renderStars(gigUser.rating)}
                          <span className="ml-1">({gigUser.totalReviews || 0})</span>
                        </span>
                      )}
                      
                      {gigUser?.education && (
                        <span className="flex items-center">
                          <GraduationCap className="h-4 w-4 mr-1" />
                          {gigUser.education}
                        </span>
                      )}
                      
                      {gigUser?.languages && gigUser.languages.length > 0 && (
                        <span className="flex items-center">
                          <Languages className="h-4 w-4 mr-1" />
                          {gigUser.languages.length} language{gigUser.languages.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      
                      {gigUser?.createdAt && (
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Member for {accountAge}
                        </span>
                      )}
                    </div>
                    
                    {/* User Stats */}
                    <div className="flex flex-wrap gap-4 mt-3">
                      {gigUser?.completedOrders !== undefined && (
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {gigUser.completedOrders} completed order{gigUser.completedOrders !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      
                      {gigUser?.responseRate && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {gigUser.responseRate}% response rate
                          </span>
                        </div>
                      )}
                      
                      {gigUser?.responseTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Avg. response: {gigUser.responseTime}h
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* View Profile Link */}
                    <div className="mt-2">
                      <span className="text-emerald-600 text-sm font-medium group-hover:text-emerald-700 flex items-center gap-1">
                        View Full Profile
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>

              </div>

              {/* Budget & Deadline Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                      Project Budget
                    </h3>
                    <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                      Fixed Price
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">
                      {formatPrice(gig.budget)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Total project cost • {gig.currency}
                    </p>
                    <div className="mt-3 text-xs text-gray-600">
                      <span className="inline-block px-2 py-1 bg-white rounded border">
                        Min: {formatPrice(5)}
                      </span>
                      <span className="inline-block px-2 py-1 bg-white rounded border ml-2">
                        Max: {formatPrice(100000)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Project Timeline
                    </h3>
                    {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
                      <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                        {daysUntilDeadline} days left
                      </span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {gig.timeline}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      Expected delivery timeline
                    </p>
                    {gig.deadline && (
                      <div className="text-xs text-gray-600">
                        Deadline: {new Date(gig.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Gallery */}
              {imageAttachments.length > 0 && (
                <div className="mb-8">
                  <div className="relative h-96 rounded-2xl overflow-hidden mb-6">
                    <img
                      src={imageAttachments[activeImage]}
                      alt={gig.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    {imageAttachments.length > 1 && (
                      <>
                        <button
                          onClick={() => setActiveImage((prev) => (prev === 0 ? imageAttachments.length - 1 : prev - 1))}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
                        >
                          <ChevronLeft className="h-6 w-6 text-gray-700" />
                        </button>
                        <button
                          onClick={() => setActiveImage((prev) => (prev === imageAttachments.length - 1 ? 0 : prev + 1))}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg hover:bg-white transition-colors"
                        >
                          <ChevronRight className="h-6 w-6 text-gray-700" />
                        </button>
                      </>
                    )}
                  </div>
                  {imageAttachments.length > 1 && (
                    <div className="flex space-x-3 overflow-x-auto pb-3">
                      {imageAttachments.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImage(index)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                            activeImage === index
                              ? 'border-emerald-500'
                              : 'border-transparent'
                          }`}
                        >
                          <img
                            src={image}
                            alt={`${gig.title} ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-emerald-600" />
                  Project Description
                </h2>
                <div className="prose max-w-none">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                      {gig.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Gig Details */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-emerald-600" />
                  Project Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Project Requirements */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="h-5 w-5 text-emerald-600" />
                      Requirements
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                        <span className="text-gray-600">Communication Method</span>
                        <span className="font-semibold text-gray-900">{gig.communication}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                        <span className="text-gray-600">Project Type</span>
                        <span className="font-semibold text-gray-900">
                          {gig.visibility === 'public' ? 'Public Project' : 
                           gig.visibility === 'private' ? 'Private Project' : 'Invite Only'}
                        </span>
                      </div>
                      {gig.requirementsDocument && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                          <span className="text-gray-600">Requirements Document</span>
                          <a 
                            href={gig.requirementsDocument} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            Download
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Timeline Details */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-emerald-600" />
                      Timeline Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                        <span className="text-gray-600">Created</span>
                        <span className="font-semibold text-gray-900">{timeAgo}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                        <span className="text-gray-600">Last Updated</span>
                        <span className="font-semibold text-gray-900">
                          {calculateTimeAgo(gig.updatedAt)}
                        </span>
                      </div>
                      {gig.deadline && (
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                          <span className="text-gray-600">Deadline</span>
                          <span className="font-semibold text-gray-900">
                            {new Date(gig.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills Required */}
              {gig.skillsRequired && gig.skillsRequired.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Target className="h-6 w-6 text-emerald-600" />
                    Required Skills
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {gig.skillsRequired.map((skill, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-medium flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              {gig.deliverables && gig.deliverables.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <FileCheck className="h-6 w-6 text-emerald-600" />
                    Expected Deliverables
                  </h2>
                  <div className="space-y-3">
                    {gig.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex items-start bg-gray-50 p-4 rounded-xl">
                        <div className="flex-shrink-0 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center mr-3 mt-1">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-gray-700">{deliverable}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones (if any) */}
              {gig.milestones && gig.milestones.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Package className="h-6 w-6 text-emerald-600" />
                    Project Milestones
                  </h2>
                  <div className="space-y-4">
                    {gig.milestones.map((milestone, index) => (
                      <div key={index} className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                            milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            milestone.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {milestone.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        {milestone.description && (
                          <p className="text-gray-600 mb-3">{milestone.description}</p>
                        )}
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>Amount: {formatPrice(milestone.amount)}</span>
                          {milestone.dueDate && (
                            <span>Due: {new Date(milestone.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Updated */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      Posted {timeAgo} • Last updated: {new Date(gig.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Gig ID: {gig._id}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="flex items-center mr-4">
                      <Package className="h-4 w-4 mr-1" />
                      {gig.projectCategory?.name}
                    </span>
                    {gig.subcategory && (
                      <span className="flex items-center">
                        <ChevronRight className="h-4 w-4 mr-1" />
                        {gig.subcategory.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Gig Info & Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-8">

              {/* Project Quick Stats */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Project Stats</h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(gig.status)}`}>
                      {gig.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Urgency</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(gig.urgency)}`}>
                      {gig.urgency.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Views</span>
                    <span className="font-semibold text-blue-600">{viewCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Posted</span>
                    <span className="font-semibold text-gray-900">{timeAgo}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Communication</span>
                    <span className="font-semibold text-gray-900">{gig.communication}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Visibility</span>
                    <span className="font-semibold text-gray-900 capitalize">
                      {gig.visibility.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category & Tags */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Category & Tags</h3>
                <div className="space-y-4">
                  {gig.projectCategory && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Main Category</h4>
                      <div className="flex items-center p-3 bg-emerald-50 rounded-lg">
                        <Package className="h-5 w-5 text-emerald-600 mr-3" />
                        <div>
                          <span className="font-semibold text-gray-900 block">{gig.projectCategory.name}</span>
                          {gig.projectCategory.description && (
                            <p className="text-xs text-gray-500 mt-1">{gig.projectCategory.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {gig.subcategory && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Subcategory</h4>
                      <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                        <ChevronRight className="h-5 w-5 text-blue-600 mr-3" />
                        <span className="font-semibold text-gray-900">{gig.subcategory.name}</span>
                      </div>
                    </div>
                  )}

                  {gig.skillsRequired && gig.skillsRequired.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {gig.skillsRequired.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced User Information Card */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Client Profile</h3>
                <div className="space-y-4">
                  <Link 
                    to={`/profile/${gigUser?._id}`}
                    className="flex items-center space-x-3 group cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="relative">
                      <img
                        src={gigUser?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                        alt={gigUser?.name}
                        className="w-12 h-12 rounded-full border-2 border-white group-hover:border-emerald-100 transition-colors"
                      />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                        {gigUser?.name}
                      </h4>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        View Profile
                        <ExternalLink className="h-3 w-3" />
                      </p>
                    </div>
                  </Link>

                  {/* User Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {gigUser?.country && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <MapPin className="h-4 w-4 text-gray-600 mr-2" />
                        <div className="truncate">
                          <h4 className="text-xs text-gray-500">Location</h4>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {gigUser.country}
                          </p>
                        </div>
                      </div>
                    )}

                    {gigUser?.occupation && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Briefcase className="h-4 w-4 text-gray-600 mr-2" />
                        <div className="truncate">
                          <h4 className="text-xs text-gray-500">Occupation</h4>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {gigUser.occupation}
                          </p>
                        </div>
                      </div>
                    )}

                    {gigUser?.rating && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-gray-600 mr-2" />
                        <div>
                          <h4 className="text-xs text-gray-500">Rating</h4>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-medium text-gray-900 ml-1">
                              {gigUser.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {gigUser?.completedOrders !== undefined && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Activity className="h-4 w-4 text-gray-600 mr-2" />
                        <div>
                          <h4 className="text-xs text-gray-500">Completed</h4>
                          <p className="text-sm font-medium text-gray-900">
                            {gigUser.completedOrders}
                          </p>
                        </div>
                      </div>
                    )}

                    {gigUser?.accountType && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Award className="h-4 w-4 text-gray-600 mr-2" />
                        <div>
                          <h4 className="text-xs text-gray-500">Account Type</h4>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {gigUser.accountType}
                          </p>
                        </div>
                      </div>
                    )}

                    {gigUser?.languages && gigUser.languages.length > 0 && (
                      <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                        <Languages className="h-4 w-4 text-gray-600 mr-2" />
                        <div>
                          <h4 className="text-xs text-gray-500">Languages</h4>
                          <p className="text-sm font-medium text-gray-900">
                            {gigUser.languages.length}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* View Full Profile Button */}
                  <Link 
                    to={`/profile/${gigUser?._id}`}
                    className=" w-full text-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    View Full Profile
                  </Link>
                </div>
              </div>

              {/* Safety Tips */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-emerald-600" />
                  Safety Tips
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Secure Communication</h4>
                      <p className="text-xs text-gray-600">Keep all communication on the platform</p>
                    </div>
                  </div>
                  <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                      <Award className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Verified Identity</h4>
                      <p className="text-xs text-gray-600">Client identity is verified</p>
                    </div>
                  </div>
                  <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                      <Zap className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Fast Response</h4>
                      <p className="text-xs text-gray-600">Client typically responds within 24 hours</p>
                    </div>
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

export default GigDetails;