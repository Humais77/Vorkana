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
  ExternalLink,
  Layers,
  RefreshCw,
  Settings,
  Tag,
  BarChart,
  ThumbsUp,
  ShieldCheck,
  Timer,
  X,
  Image as ImageIcon,
  Grid3x3,
  MessageCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import Zustand stores and TanStack Query hooks
import { useAuthStore } from '../../store/useAuthStore';
import { useService } from '../../hooks/useServices';

const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Zustand store
  const { user, isAuthenticated } = useAuthStore();
  
  // TanStack Query hook for service data
  const { 
    data: service, 
    isLoading: loading, 
    error, 
    refetch 
  } = useService(id);

  // Local state
  const [isLiked, setIsLiked] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [imageViewMode, setImageViewMode] = useState('thumbnail'); // 'thumbnail' or 'gallery'

  // Update view count when service loads
  useEffect(() => {
    if (service) {
      // Simulate view count (in real app, call increment views API)
      setViewCount(Math.floor(Math.random() * 500) + 100);
      
      // Set first package as default selection
      if (service.packages && service.packages.length > 0) {
        setSelectedPackage(service.packages[0]);
      }
    }
  }, [service]);



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
    toast.success('Refreshing service details...');
  };

  const formatPrice = (price, currency = 'USD') => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderStars = (rating) => {
    if (!rating) rating = 0;
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
        <span className="ml-2 font-semibold">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paused': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'denied': return 'bg-red-100 text-red-800 border-red-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateTimeAgo = (date) => {
    if (!date) return 'N/A';
    try {
      const now = new Date();
      const past = new Date(date);
      const diffInHours = Math.floor((now - past) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
      return `${Math.floor(diffInHours / 168)}w ago`;
    } catch (error) {
      return 'N/A';
    }
  };

  // Calculate account age
  const calculateAccountAge = (createdAt) => {
    if (!createdAt) return '';
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const diffYears = now.getFullYear() - created.getFullYear();
      return `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
    } catch (error) {
      return '';
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    try {
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      return null;
    }
  };

  // Check if user is online
  const isUserOnline = (lastSeenAt) => {
    if (!lastSeenAt) return false;
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return new Date(lastSeenAt) > fiveMinutesAgo;
    } catch (error) {
      return false;
    }
  };

  // Get thumbnail image (prioritized)
  const getThumbnailImage = () => {
    if (service?.thumbnail?.url) {
      return {
        url: service.thumbnail.url,
        public_id: service.thumbnail.public_id,
        type: 'thumbnail',
        width: service.thumbnail.width,
        height: service.thumbnail.height,
        size: service.thumbnail.size,
        format: service.thumbnail.format
      };
    }
    
    // If no thumbnail, use first image
    if (service?.images && service.images.length > 0 && service.images[0]?.url) {
      return {
        url: service.images[0].url,
        public_id: service.images[0].public_id,
        type: 'image',
        width: service.images[0].width,
        height: service.images[0].height,
        size: service.images[0].size,
        format: service.images[0].format
      };
    }
    
    // Fallback to default image
    return {
      url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      type: 'default'
    };
  };

  // Get gallery images (excluding thumbnail)
  const getGalleryImages = () => {
    const images = [];
    
    if (service?.images && service.images.length > 0) {
      service.images.forEach((img, index) => {
        if (img?.url) {
          // Skip if this is the first image and we have a separate thumbnail
          if (index === 0 && service.thumbnail?.url) {
            return;
          }
          images.push({
            url: img.url,
            public_id: img.public_id,
            type: 'image',
            width: img.width,
            height: img.height,
            size: img.size,
            format: img.format
          });
        }
      });
    }
    
    return images;
  };

  // Get all images including thumbnail
  const getAllImages = () => {
    const thumbnail = getThumbnailImage();
    const galleryImages = getGalleryImages();
    
    // Combine thumbnail with gallery images
    return [thumbnail, ...galleryImages];
  };

  // Get category name safely
  const getCategoryName = () => {
    if (!service) return 'Category';
    
    // Check if category is an object with name property
    if (service.categoryDetails && typeof service.categoryDetails === 'object' && service.categoryDetails.name) {
      return service.categoryDetails.name;
    }
    
    // Check if category is a string
    if (typeof service.category === 'string') {
      return service.category;
    }
    
    // Fallback
    return 'Category';
  };

  // Get subcategory name safely
  const getSubcategoryName = () => {
    if (!service) return null;
    
    // Check if subcategory is an object
    if (service.subcategory && typeof service.subcategory === 'object') {
      return service.subcategory.name || null;
    }
    
    // Check if subcategory is a string
    if (typeof service.subcategory === 'string') {
      return service.subcategory;
    }
    
    return null;
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

  if (error || !service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {error?.response?.status === 404 ? 'Service Not Found' : 'Error Loading Service'}
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {error?.response?.data?.message || 
             error?.message || 
             "The service you're looking for doesn't exist or has been removed."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/services')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-colors font-semibold shadow-lg hover:shadow-xl"
            >
              Browse Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  const thumbnailImage = getThumbnailImage();
  const galleryImages = getGalleryImages();
  const allImages = getAllImages();
  const serviceUser = service.createdBy || service.creatorDetails;
  const userAge = calculateAge(serviceUser?.dateOfBirth);
  const accountAge = calculateAccountAge(serviceUser?.createdAt);
  const isOnline = isUserOnline(serviceUser?.lastSeenAt);
  const timeAgo = calculateTimeAgo(service.createdAt);
  
  // Safely get category and subcategory names
  const categoryName = getCategoryName();
  const subcategoryName = getSubcategoryName();

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
                onClick={() => navigate('/services')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Services
              </button>
              {categoryName && (
                <>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">
                    {categoryName}
                  </span>
                </>
              )}
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-emerald-600 font-medium truncate max-w-xs">
                {service.title}
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
          {/* Left Column - Service Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title and Actions */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 pr-4 mb-2">
                    {service.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(service.status)}`}>
                      {service.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                    {service.isFeatured && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        <Award className="inline h-4 w-4 mr-1" />
                        FEATURED
                      </span>
                    )}
                    {service.isPopular && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
                        <TrendingUp className="inline h-4 w-4 mr-1" />
                        POPULAR
                      </span>
                    )}
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

              {/* Enhanced User Info */}
              {serviceUser && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <Link 
                    to={`/profile/${serviceUser._id}`}
                    className="flex items-center space-x-4 group cursor-pointer flex-1"
                  >
                    <div className="relative">
                      <img
                        src={serviceUser.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                        alt={serviceUser.name}
                        className="w-16 h-16 rounded-full border-4 border-white shadow-lg group-hover:ring-2 group-hover:ring-emerald-500 transition-all"
                      />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                      {serviceUser.emailVerified && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <CheckCircle className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-bold text-gray-900 text-lg group-hover:text-emerald-700 transition-colors">
                          {serviceUser.name || 'User'}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {serviceUser.role === 'admin' ? 'Admin' : 'Provider'}
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
                        {serviceUser.occupation && (
                          <span className="flex items-center">
                            <Briefcase className="h-4 w-4 mr-1" />
                            {serviceUser.occupation}
                          </span>
                        )}
                        
                        {serviceUser.country && (
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {serviceUser.city ? `${serviceUser.city}, ${serviceUser.country}` : serviceUser.country}
                          </span>
                        )}
                        
                        {serviceUser.rating && (
                          <span className="flex items-center">
                            {renderStars(serviceUser.rating)}
                            <span className="ml-1">({serviceUser.totalReviews || 0})</span>
                          </span>
                        )}
                        
                        {serviceUser.education && (
                          <span className="flex items-center">
                            <GraduationCap className="h-4 w-4 mr-1" />
                            {serviceUser.education}
                          </span>
                        )}
                        
                        {serviceUser.languages && serviceUser.languages.length > 0 && (
                          <span className="flex items-center">
                            <Languages className="h-4 w-4 mr-1" />
                            {serviceUser.languages.length} language{serviceUser.languages.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        
                        {serviceUser.createdAt && (
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Member for {accountAge}
                          </span>
                        )}
                      </div>
                      
                      {/* User Stats */}
                      <div className="flex flex-wrap gap-4 mt-3">
                        {serviceUser.completedOrders !== undefined && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {serviceUser.completedOrders} completed order{serviceUser.completedOrders !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        
                        {serviceUser.responseRate && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {serviceUser.responseRate}% response rate
                            </span>
                          </div>
                        )}
                        
                        {serviceUser.responseTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Avg. response: {serviceUser.responseTime}h
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
              )}

              {/* Service Images Section */}
              <div className="mb-8">
                {/* View Mode Toggle */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <ImageIcon className="h-6 w-6 text-emerald-600" />
                    Service Images
                  </h2>
                  {galleryImages.length > 0 && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setImageViewMode('thumbnail')}
                        className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                          imageViewMode === 'thumbnail'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Thumbnail
                      </button>
                      <button
                        onClick={() => setImageViewMode('gallery')}
                        className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                          imageViewMode === 'gallery'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Grid3x3 className="h-4 w-4" />
                        Gallery ({galleryImages.length})
                      </button>
                    </div>
                  )}
                </div>

                {/* Thumbnail Section */}
                {imageViewMode === 'thumbnail' && (
                  <div className="mb-8">
                    <div className="relative h-96 rounded-2xl overflow-hidden mb-4">
                      <img
                        src={thumbnailImage.url}
                        alt={service.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-full">
                          <CheckCircle className="inline h-3 w-3 mr-1" />
                          Thumbnail
                        </span>
                      </div>
                      {thumbnailImage.width && thumbnailImage.height && (
                        <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {thumbnailImage.width} × {thumbnailImage.height}
                          {thumbnailImage.size && ` • ${Math.round(thumbnailImage.size / 1024)}KB`}
                          {thumbnailImage.format && ` • ${thumbnailImage.format.toUpperCase()}`}
                        </div>
                      )}
                    </div>
                    
                    {/* Thumbnail Info */}
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-emerald-900">Featured Thumbnail</h4>
                          <p className="text-sm text-emerald-700">
                            This image is prominently displayed as the service thumbnail
                          </p>
                        </div>
                        <div className="text-sm text-gray-600">
                          {thumbnailImage.uploadedAt && (
                            <span>Uploaded: {new Date(thumbnailImage.uploadedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gallery Images Section */}
                {imageViewMode === 'gallery' && galleryImages.length > 0 && (
                  <div className="mb-8">
                    {/* Gallery Info */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">Service Gallery</h4>
                          <p className="text-sm text-gray-600">
                            {galleryImages.length} additional image{galleryImages.length !== 1 ? 's' : ''} showcasing this service
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          <Grid3x3 className="inline h-4 w-4 mr-1" />
                          {galleryImages.length} images
                        </span>
                      </div>
                    </div>

                    {/* Gallery Navigation */}
                    {galleryImages.length > 1 && (
                      <div className="flex justify-between items-center mb-4">
                        <button
                          onClick={() => setActiveImage(prev => prev === 0 ? galleryImages.length - 1 : prev - 1)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>
                        <span className="text-sm text-gray-600">
                          {activeImage + 1} of {galleryImages.length}
                        </span>
                        <button
                          onClick={() => setActiveImage(prev => prev === galleryImages.length - 1 ? 0 : prev + 1)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Gallery Image Display */}
                    {galleryImages.length > 0 && (
                      <>
                        <div className="relative h-96 rounded-2xl overflow-hidden mb-6">
                          <img
                            src={galleryImages[activeImage]?.url}
                            alt={`${service.title} - Gallery Image ${activeImage + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                            }}
                          />
                          {galleryImages[activeImage]?.width && galleryImages[activeImage]?.height && (
                            <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {galleryImages[activeImage].width} × {galleryImages[activeImage].height}
                              {galleryImages[activeImage].size && ` • ${Math.round(galleryImages[activeImage].size / 1024)}KB`}
                              {galleryImages[activeImage].format && ` • ${galleryImages[activeImage].format.toUpperCase()}`}
                            </div>
                          )}
                        </div>

                        {/* Gallery Thumbnails */}
                        <div className="flex space-x-3 overflow-x-auto pb-3">
                          {galleryImages.map((image, index) => (
                            <button
                              key={index}
                              onClick={() => setActiveImage(index)}
                              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                                activeImage === index
                                  ? 'border-emerald-500'
                                  : 'border-transparent hover:border-gray-300'
                              }`}
                            >
                              <img
                                src={image.url}
                                alt={`Gallery ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* No Gallery Images Message */}
                {imageViewMode === 'gallery' && galleryImages.length === 0 && (
                  <div className="text-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Gallery Images</h3>
                    <p className="text-gray-600 mb-4">
                      This service doesn't have additional gallery images yet.
                    </p>
                    <button
                      onClick={() => setImageViewMode('thumbnail')}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      View Thumbnail
                    </button>
                  </div>
                )}
              </div>

              {/* Price & Delivery Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                      Starting From
                    </h3>
                    {service.currency && (
                      <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                        {service.currency}
                      </span>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-bold text-emerald-600 mb-1">
                      {formatPrice(service.price, service.currency)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Base price for this service
                    </p>
                    {service.packages && service.packages.length > 0 && (
                      <div className="mt-3 text-xs text-gray-600">
                        <span className="inline-block px-2 py-1 bg-white rounded border">
                          {service.packages.length} packages available
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Delivery Time
                    </h3>
                    <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                      {service.deliveryTimeUnit || 'days'}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {service.deliveryTime} {service.deliveryTimeUnit}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      Average delivery time
                    </p>
                    {service.revisions && (
                      <div className="text-xs text-gray-600">
                        {service.revisions} revision{service.revisions !== 1 ? 's' : ''} included
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-emerald-600" />
                  Service Description
                </h2>
                <div className="prose max-w-none">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                      {service.description}
                    </p>
                    {service.shortDescription && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-600 italic">{service.shortDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Features */}
              {service.features && service.features.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Target className="h-6 w-6 text-emerald-600" />
                    What's Included
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-start p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-200 transition-colors">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-1 ${
                          feature.included ? 'bg-emerald-100' : 'bg-gray-100'
                        }`}>
                          {feature.included ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <X className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{feature.title}</h4>
                          {feature.description && (
                            <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {service.requirements && service.requirements.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Settings className="h-6 w-6 text-emerald-600" />
                    Service Requirements
                  </h2>
                  <div className="space-y-4">
                    {service.requirements.map((req, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-gray-400 mr-3" />
                            <h3 className="font-semibold text-gray-900">{req.question}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              req.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {req.required ? 'Required' : 'Optional'}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {req.type}
                            </span>
                          </div>
                        </div>
                        {req.options && req.options.length > 0 && (
                          <div className="mt-3 pl-8">
                            <p className="text-sm text-gray-600 mb-2">Options:</p>
                            <div className="flex flex-wrap gap-2">
                              {req.options.map((option, optIndex) => (
                                <span key={optIndex} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm">
                                  {option}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQs */}
              {service.faqs && service.faqs.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <MessageCircle className="h-6 w-6 text-emerald-600" />
                    Frequently Asked Questions
                  </h2>
                  <div className="space-y-4">
                    {service.faqs.map((faq, index) => (
                      <div key={index} className="p-4 bg-white border border-gray-200 rounded-xl">
                        <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                        <p className="text-gray-600">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {service.tags && service.tags.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Tag className="h-6 w-6 text-emerald-600" />
                    Service Tags
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {service.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Updated */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      Posted {timeAgo} • Last updated: {new Date(service.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Service ID: {service._id}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <span className="flex items-center mr-4">
                      <Package className="h-4 w-4 mr-1" />
                      {categoryName}
                    </span>
                    {subcategoryName && (
                      <span className="flex items-center">
                        <ChevronRight className="h-4 w-4 mr-1" />
                        {subcategoryName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Service Info & Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-8">

              {/* Service Quick Stats */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Service Stats</h3>
                <div className="space-y-5">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                      {service.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Rating</span>
                    <div className="flex items-center gap-2">
                      {renderStars(service.rating || 0)}
                      <span className="text-gray-900 font-medium">({service.reviewsCount || 0})</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Views</span>
                    <span className="font-semibold text-blue-600">{viewCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Likes</span>
                    <span className="font-semibold text-pink-600">{service.likes || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Posted</span>
                    <span className="font-semibold text-gray-900">{timeAgo}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Delivery Time</span>
                    <span className="font-semibold text-gray-900">
                      {service.deliveryTime} {service.deliveryTimeUnit}
                    </span>
                  </div>
                  {service.revisions !== undefined && (
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Revisions</span>
                      <span className="font-semibold text-gray-900">{service.revisions}</span>
                    </div>
                  )}
                  {service.images && (
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Images</span>
                      <span className="font-semibold text-purple-600">
                        {service.images.length + (service.thumbnail?.url ? 1 : 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Delivery Card */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Price & Delivery</h3>
                
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-emerald-900">Starting Price</h4>
                      <span className="text-2xl font-bold text-emerald-600">
                        {formatPrice(service.price, service.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Currency: {service.currency}</span>
                    </div>
                  </div>
                  
                  {service.packages && service.packages.length > 0 ? (
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-gray-600 mb-2">
                        <Package className="inline h-4 w-4 mr-1" />
                        {service.packages.length} packages available
                      </p>
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                        View Packages
                      </button>
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-600">No packages available</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Delivery Time</span>
                      <span className="font-semibold">{service.deliveryTime} {service.deliveryTimeUnit}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Revisions</span>
                      <span className="font-semibold">{service.revisions || 0} included</span>
                    </div>
                    {service.deliveryTime && (
                      <div className="text-xs text-gray-500 mt-2">
                        Estimated completion time based on average delivery
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category & Tags */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Category & Tags</h3>
                <div className="space-y-4">
                  {categoryName && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Main Category</h4>
                      <div className="flex items-center p-3 bg-emerald-50 rounded-lg">
                        <Package className="h-5 w-5 text-emerald-600 mr-3" />
                        <div>
                          <span className="font-semibold text-gray-900 block">{categoryName}</span>
                          {service.categoryDetails?.description && (
                            <p className="text-xs text-gray-500 mt-1">{service.categoryDetails.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {subcategoryName && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Subcategory</h4>
                      <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                        <Layers className="h-5 w-5 text-blue-600 mr-3" />
                        <span className="font-semibold text-gray-900">{subcategoryName}</span>
                      </div>
                    </div>
                  )}

                  {service.tags && service.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Service Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {service.tags.slice(0, 6).map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {service.searchKeywords && service.searchKeywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Search Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {service.searchKeywords.slice(0, 5).map((keyword, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enhanced User Information Card */}
              {serviceUser && (
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Provider Profile</h3>
                  <div className="space-y-4">
                    <Link 
                      to={`/profile/${serviceUser._id}`}
                      className="flex items-center space-x-3 group cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="relative">
                        <img
                          src={serviceUser.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                          alt={serviceUser.name}
                          className="w-12 h-12 rounded-full border-2 border-white group-hover:border-emerald-100 transition-colors"
                        />
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {serviceUser.name}
                        </h4>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          View Profile
                          <ExternalLink className="h-3 w-3" />
                        </p>
                      </div>
                    </Link>

                    {/* User Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {serviceUser.country && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <MapPin className="h-4 w-4 text-gray-600 mr-2" />
                          <div className="truncate">
                            <h4 className="text-xs text-gray-500">Location</h4>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {serviceUser.country}
                            </p>
                          </div>
                        </div>
                      )}

                      {serviceUser.occupation && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <Briefcase className="h-4 w-4 text-gray-600 mr-2" />
                          <div className="truncate">
                            <h4 className="text-xs text-gray-500">Occupation</h4>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {serviceUser.occupation}
                            </p>
                          </div>
                        </div>
                      )}

                      {serviceUser.rating && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-gray-600 mr-2" />
                          <div>
                            <h4 className="text-xs text-gray-500">Rating</h4>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-sm font-medium text-gray-900 ml-1">
                                {serviceUser.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {serviceUser.completedOrders !== undefined && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <Activity className="h-4 w-4 text-gray-600 mr-2" />
                          <div>
                            <h4 className="text-xs text-gray-500">Completed</h4>
                            <p className="text-sm font-medium text-gray-900">
                              {serviceUser.completedOrders}
                            </p>
                          </div>
                        </div>
                      )}

                      {serviceUser.accountType && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <Award className="h-4 w-4 text-gray-600 mr-2" />
                          <div>
                            <h4 className="text-xs text-gray-500">Account Type</h4>
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {serviceUser.accountType}
                            </p>
                          </div>
                        </div>
                      )}

                      {serviceUser.languages && serviceUser.languages.length > 0 && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <Languages className="h-4 w-4 text-gray-600 mr-2" />
                          <div>
                            <h4 className="text-xs text-gray-500">Languages</h4>
                            <p className="text-sm font-medium text-gray-900">
                              {serviceUser.languages.length}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Contact Provider Button */}
                    <button
                      onClick={() => setShowMessaging(true)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Contact Provider
                    </button>
                  </div>
                </div>
              )}

              {/* Safety & Trust */}
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  Safety & Trust
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Secure Payments</h4>
                      <p className="text-xs text-gray-600">Your payment is protected</p>
                    </div>
                  </div>
                  <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                      <ThumbsUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Satisfaction Guarantee</h4>
                      <p className="text-xs text-gray-600">{service.revisions || 0} revisions included</p>
                    </div>
                  </div>
                  <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                      <Timer className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">On-time Delivery</h4>
                      <p className="text-xs text-gray-600">{service.deliveryTime}-day delivery guarantee</p>
                    </div>
                  </div>
                  <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Verified Provider</h4>
                      <p className="text-xs text-gray-600">Identity verified</p>
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

export default ServiceDetails;