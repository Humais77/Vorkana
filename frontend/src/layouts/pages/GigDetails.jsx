import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, 
  Heart, 
  Share2, 
  Flag, 
  Shield, 
  ChevronRight,
  ChevronLeft,
  MessageCircle,
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
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import Zustand stores and TanStack Query hooks
import { useAuthStore } from '../../store/useAuthStore';
import { useGigStore } from '../../store/useGigStore';
import { useGig } from '../../hooks/useGigs';

// Add this import - make sure the path is correct
import MessagingModal from '../../components/MessagingModal';

const GigDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Zustand stores
  const { user, isAuthenticated } = useAuthStore();
  const { setGigDetails, clearGigDetails } = useGigStore();
  
  // Add this state for the modal
  const [showMessaging, setShowMessaging] = useState(false);
  
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

  // Update the contact function
  const handleContactSeller = () => {
    if (!isAuthenticated) {
      toast.error('Please login to contact client');
      navigate('/sign-in');
      return;
    }
    
    if (gig?.createdBy?._id === user?._id) {
      toast.error('You cannot contact yourself');
      return;
    }
    
    // Open the messaging modal
    setShowMessaging(true);
  };

  

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Messaging Modal - MOVE THIS TO ROOT LEVEL */}
      <MessagingModal
        isOpen={showMessaging}
        onClose={() => setShowMessaging(false)}
        receiver={gig.createdBy}
        gig={gig}
      />
      
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

              {/* Client Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <img
                      src={gig.createdBy?.picture || gig.createdBy?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                      alt={gig.createdBy?.fullName || gig.createdBy?.username}
                      className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
                    />
                    {gig.createdBy?.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-bold text-gray-900 text-lg">
                        {gig.createdBy?.fullName || gig.createdBy?.username || 'Client'}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Client
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {gig.createdBy?.rating && renderStars(gig.createdBy.rating)}
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Member since {new Date(gig.createdBy?.createdAt).getFullYear() || '2022'}
                      </span>
                      <span className="flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        {gig.country}
                      </span>
                    </div>
                  </div>
                </div>
                {isAuthenticated && user?._id !== gig.createdBy?._id && (
                  <button
                    onClick={() => setShowMessaging(true)}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Message Client
                  </button>
                )}
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

              {/* Client Information */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Client Information</h3>
                <div className="space-y-4">
                  {gig.fullName && (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <User className="h-5 w-5 text-gray-600 mr-3" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Name</h4>
                        <p className="text-sm text-gray-600">{gig.fullName}</p>
                      </div>
                    </div>
                  )}

                  {gig.country && (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-5 w-5 text-gray-600 mr-3" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Location</h4>
                        <p className="text-sm text-gray-600">{gig.country}</p>
                      </div>
                    </div>
                  )}

                  {gig.communication && (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      {gig.communication === 'Phone' ? (
                        <Phone className="h-5 w-5 text-gray-600 mr-3" />
                      ) : gig.communication === 'Email' ? (
                        <Mail className="h-5 w-5 text-gray-600 mr-3" />
                      ) : (
                        <MessageCircle className="h-5 w-5 text-gray-600 mr-3" />
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-900">Preferred Contact</h4>
                        <p className="text-sm text-gray-600">{gig.communication}</p>
                      </div>
                    </div>
                  )}

                  {gig.createdBy?.rating && (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-gray-600 mr-3" />
                      <div>
                        <h4 className="font-semibold text-gray-900">Client Rating</h4>
                        <div className="flex items-center">
                          {renderStars(gig.createdBy.rating)}
                        </div>
                      </div>
                    </div>
                  )}
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