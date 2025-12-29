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
  Image as ImageIcon,
  Grid3x3,
  MessageCircle,
  Building,
  Tag,
  BadgeCheck,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import Zustand stores and TanStack Query hooks
import { useAuthStore } from '../../store/useAuthStore';
import { useGigStore } from '../../store/useGigStore';
import { useGig } from '../../hooks/useGigs';
import { SeoWrapper } from '../../components/SeoWrapper'; // Assuming you have this component

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
  const [imageViewMode, setImageViewMode] = useState('thumbnail');

  // Structured Data for SEO (Schema.org)
  const generateStructuredData = () => {
    if (!gig) return null;

    const gigUser = gig.createdBy;
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": gig.title,
      "description": gig.description?.substring(0, 200) + (gig.description?.length > 200 ? '...' : ''),
      "url": typeof window !== 'undefined' ? `${window.location.origin}/gig/${id}` : `/gig/${id}`,
      "provider": {
        "@type": "Person",
        "name": gigUser?.name || "Freelancer",
        "url": gigUser?._id ? `${window.location.origin}/profile/${gigUser._id}` : undefined,
        "image": gigUser?.picture,
        "address": gigUser?.city && gigUser?.country ? {
          "@type": "PostalAddress",
          "addressLocality": gigUser.city,
          "addressCountry": gigUser.country
        } : undefined,
        "jobTitle": gigUser?.occupation
      },
      "offers": {
        "@type": "Offer",
        "price": gig.budget,
        "priceCurrency": gig.currency || "USD",
        "availability": gig.status === "open" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "validThrough": gig.deadline ? new Date(gig.deadline).toISOString().split('T')[0] : undefined
      },
      "areaServed": {
        "@type": "Country",
        "name": gigUser?.country || "Worldwide"
      },
      "serviceType": gig.projectCategory?.name,
      "skills": gig.skillsRequired || [],
      "estimatedDuration": gig.timeline,
      "datePosted": gig.createdAt ? new Date(gig.createdAt).toISOString() : undefined,
      "dateModified": gig.updatedAt ? new Date(gig.updatedAt).toISOString() : undefined
    };

    // Add images if available
    if (gig.images && gig.images.length > 0) {
      structuredData.image = gig.images.slice(0, 5).map(img => img.url);
    }

    // Add breadcrumb
    const breadcrumbList = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": typeof window !== 'undefined' ? window.location.origin : '/'
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Gigs",
          "item": typeof window !== 'undefined' ? `${window.location.origin}/gigs` : '/gigs'
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": gig.projectCategory?.name || "Category",
          "item": gig.projectCategory?._id ? 
            `${window.location.origin}/categories/${gig.projectCategory._id}` : 
            typeof window !== 'undefined' ? `${window.location.origin}/categories` : '/categories'
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": gig.title?.substring(0, 50) + (gig.title?.length > 50 ? '...' : ''),
          "item": typeof window !== 'undefined' ? `${window.location.origin}/gig/${id}` : `/gig/${id}`
        }
      ]
    };

    return [structuredData, breadcrumbList];
  };

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

  // Handle share with enhanced sharing
  const handleShare = async () => {
    const url = window.location.href;
    const title = gig?.title || "Check out this gig on Vorkana";
    const text = gig?.description?.substring(0, 150) || "Great opportunity on Vorkana marketplace";
    
    if (navigator.share && navigator.canShare) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          fallbackCopy(url);
        }
      }
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Link copied to clipboard!');
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

  const getThumbnailImage = () => {
    if (gig?.thumbnail?.url) {
      return {
        url: gig.thumbnail.url,
        public_id: gig.thumbnail.public_id,
        type: 'thumbnail',
        width: gig.thumbnail.width,
        height: gig.thumbnail.height,
        size: gig.thumbnail.size,
        format: gig.thumbnail.format,
        uploadedAt: gig.thumbnail.uploadedAt
      };
    }
    
    // If no thumbnail, use first image
    if (gig?.images && gig.images.length > 0 && gig.images[0]?.url) {
      return {
        url: gig.images[0].url,
        public_id: gig.images[0].public_id,
        type: 'image',
        width: gig.images[0].width,
        height: gig.images[0].height,
        size: gig.images[0].size,
        format: gig.images[0].format,
        uploadedAt: gig.images[0].uploadedAt
      };
    }
    
    // Fallback to default image
    return {
      url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      type: 'default'
    };
  };

  // Get gallery images (excluding thumbnail if it's the first image)
  const getGalleryImages = () => {
    const images = [];
    
    if (gig?.images && gig.images.length > 0) {
      gig.images.forEach((img, index) => {
        if (img?.url) {
          // Skip if this is the thumbnail
          if (gig.thumbnail?.url && gig.thumbnail.url === img.url) {
            return;
          }
          images.push({
            url: img.url,
            public_id: img.public_id,
            type: 'image',
            width: img.width,
            height: img.height,
            size: img.size,
            format: img.format,
            uploadedAt: img.uploadedAt
          });
        }
      });
    }
    
    return images;
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

  const thumbnailImage = getThumbnailImage();
  const galleryImages = getGalleryImages();
  const allImages = [thumbnailImage, ...galleryImages];

  // Calculate derived values
  const timeAgo = calculateTimeAgo(gig.createdAt);
  const deadlineDate = gig.deadline ? new Date(gig.deadline) : null;
  const daysUntilDeadline = deadlineDate ? 
    Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

  // Extract user details from gig
  const gigUser = gig.createdBy;
  const accountAge = calculateAccountAge(gigUser?.createdAt);
  const isOnline = isUserOnline(gigUser?.lastSeenAt);

  // Generate structured data
  const structuredData = generateStructuredData();
  
  // SEO meta data
  const seoMetaData = {
    title: `${gig.title} | ${gig.projectCategory?.name || 'Service'} on Vorkana`,
    description: gig.description?.substring(0, 160) || `Find ${gig.title} services on Vorkana. Budget: ${formatPrice(gig.budget)}, Timeline: ${gig.timeline}.`,
    keywords: `${gig.title}, ${gig.projectCategory?.name || ''}, freelance, gig, service, hire, ${gig.skillsRequired?.join(', ') || ''}`,
    canonical: typeof window !== 'undefined' ? `${window.location.origin}/gig/${id}` : `/gig/${id}`,
    openGraph: {
      title: gig.title,
      description: gig.description?.substring(0, 200),
      type: 'website',
      url: typeof window !== 'undefined' ? `${window.location.origin}/gig/${id}` : `/gig/${id}`,
      image: thumbnailImage.url,
      site_name: 'Vorkana'
    },
    twitter: {
      card: 'summary_large_image',
      title: gig.title,
      description: gig.description?.substring(0, 200),
      image: thumbnailImage.url
    }
  };

  return (
    <SeoWrapper
      title={seoMetaData.title}
      description={seoMetaData.description}
      keywords={seoMetaData.keywords}
      canonical={seoMetaData.canonical}
      structuredData={structuredData}
    >
      {/* Additional JSON-LD for Breadcrumbs */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData[1])}
        </script>
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
                <button
                  onClick={() => navigate('/')}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Go to homepage"
                >
                  Home
                </button>
                <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <button
                  onClick={() => navigate('/gigs')}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Browse all gigs"
                >
                  Gigs
                </button>
                {gig.projectCategory && (
                  <>
                    <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    <button
                      onClick={() => navigate(`/categories/${gig.projectCategory._id}`)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label={`Browse ${gig.projectCategory.name} category`}
                    >
                      {gig.projectCategory.name}
                    </button>
                  </>
                )}
                <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <span className="text-emerald-600 font-medium truncate max-w-xs" aria-current="page">
                  {gig.title}
                </span>
              </nav>
              
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                aria-label="Refresh gig details"
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
              <article className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100" itemScope itemType="https://schema.org/Service">
                <meta itemProp="url" content={`${window.location.origin}/gig/${id}`} />
                <meta itemProp="image" content={thumbnailImage.url} />
                
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 pr-4 mb-2" itemProp="name">
                      {gig.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(gig.status)}`} itemProp="availability">
                        {gig.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(gig.urgency)}`}>
                        {gig.urgency.toUpperCase()} PRIORITY
                      </span>
                      
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
                      aria-label={isLiked ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        className={`h-6 w-6 ${
                          isLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
                      aria-label="Share this gig"
                    >
                      <Share2 className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    </button>
                    <button
                      onClick={handleReport}
                      className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
                      aria-label="Report this gig"
                    >
                      <Flag className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Enhanced User Info - Now Clickable */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <Link 
                    to={`/profile/${gigUser?._id}`}
                    className="flex items-center space-x-4 group cursor-pointer flex-1"
                    aria-label={`View ${gigUser?.name || 'Client'}'s profile`}
                    itemProp="provider"
                    itemScope
                    itemType="https://schema.org/Person"
                  >
                    <meta itemProp="url" content={`${window.location.origin}/profile/${gigUser?._id}`} />
                    <div className="relative">
                      <img
                        src={gigUser?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                        alt={gigUser?.name || 'Client'}
                        className="w-16 h-16 rounded-full border-4 border-white shadow-lg group-hover:ring-2 group-hover:ring-emerald-500 transition-all"
                        itemProp="image"
                      />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" aria-label="User is online"></div>
                      )}
                      {gigUser?.isVerified && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <BadgeCheck className="h-3 w-3 text-white" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-bold text-gray-900 text-lg group-hover:text-emerald-700 transition-colors" itemProp="name">
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
                          <span className="flex items-center" itemProp="jobTitle">
                            <Briefcase className="h-4 w-4 mr-1" aria-hidden="true" />
                            {gigUser.occupation}
                          </span>
                        )}
                        
                        {gigUser?.country && (
                          <span className="flex items-center" itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                            <MapPin className="h-4 w-4 mr-1" aria-hidden="true" />
                            {gigUser.city ? (
                              <>
                                <meta itemProp="addressLocality" content={gigUser.city} />
                                <meta itemProp="addressCountry" content={gigUser.country} />
                                {gigUser.city}, {gigUser.country}
                              </>
                            ) : (
                              <meta itemProp="addressCountry" content={gigUser.country} />
                            )}
                          </span>
                        )}
                        
                        {gigUser?.rating && (
                          <span className="flex items-center" itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
                            <meta itemProp="ratingValue" content={gigUser.rating.toString()} />
                            <meta itemProp="reviewCount" content={(gigUser.totalReviews || 0).toString()} />
                            {renderStars(gigUser.rating)}
                            <span className="ml-1">({gigUser.totalReviews || 0})</span>
                          </span>
                        )}
                        
                        {gigUser?.education && (
                          <span className="flex items-center">
                            <GraduationCap className="h-4 w-4 mr-1" aria-hidden="true" />
                            {gigUser.education}
                          </span>
                        )}
                        
                        {gigUser?.languages && gigUser.languages.length > 0 && (
                          <span className="flex items-center">
                            <Languages className="h-4 w-4 mr-1" aria-hidden="true" />
                            {gigUser.languages.length} language{gigUser.languages.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        
                        
                      </div>
                      
                      {/* User Stats */}
                      <div className="flex flex-wrap gap-4 mt-3">
                        {gigUser?.completedOrders !== undefined && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span className="text-sm text-gray-600">
                              {gigUser.completedOrders} completed order{gigUser.completedOrders !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        
                        {gigUser?.responseRate && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span className="text-sm text-gray-600">
                              {gigUser.responseRate}% response rate
                            </span>
                          </div>
                        )}
                        
                        {gigUser?.responseTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
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
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Budget & Deadline Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                        Project Budget
                      </h3>
                      <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                        Fixed Price
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="text-3xl font-bold text-emerald-600 mb-1" itemProp="price" content={gig.budget}>
                        {formatPrice(gig.budget)}
                      </div>
                      <p className="text-sm text-gray-500" itemProp="priceCurrency" content={gig.currency || "USD"}>
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
                        <Clock className="h-5 w-5 text-blue-600" aria-hidden="true" />
                        Project Timeline
                      </h3>
                      {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
                        <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                          {daysUntilDeadline} days left
                        </span>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-bold text-blue-600 mb-1" itemProp="estimatedDuration">
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
                <div className="mb-8">
                  {/* View Mode Toggle */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <ImageIcon className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                      Project Images
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
                          aria-label="Switch to thumbnail view"
                          aria-pressed={imageViewMode === 'thumbnail'}
                        >
                          <ImageIcon className="h-4 w-4" aria-hidden="true" />
                          Thumbnail
                        </button>
                        <button
                          onClick={() => setImageViewMode('gallery')}
                          className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                            imageViewMode === 'gallery'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          aria-label="Switch to gallery view"
                          aria-pressed={imageViewMode === 'gallery'}
                        >
                          <Grid3x3 className="h-4 w-4" aria-hidden="true" />
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
                          alt={`${gig.title} - Featured thumbnail`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-full">
                            <CheckCircle className="inline h-3 w-3 mr-1" aria-hidden="true" />
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
                              This image is prominently displayed as the gig thumbnail
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
                            <h4 className="font-semibold text-gray-900">Project Gallery</h4>
                            <p className="text-sm text-gray-600">
                              {galleryImages.length} additional image{galleryImages.length !== 1 ? 's' : ''} showcasing this project
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                            <Grid3x3 className="inline h-4 w-4 mr-1" aria-hidden="true" />
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
                            aria-label="View previous gallery image"
                          >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                            Previous
                          </button>
                          <span className="text-sm text-gray-600">
                            Image <span aria-live="polite">{activeImage + 1}</span> of {galleryImages.length}
                          </span>
                          <button
                            onClick={() => setActiveImage(prev => prev === galleryImages.length - 1 ? 0 : prev + 1)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
                            aria-label="View next gallery image"
                          >
                            Next
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      )}

                      {/* Gallery Image Display */}
                      {galleryImages.length > 0 && (
                        <>
                          <div className="relative h-96 rounded-2xl overflow-hidden mb-6">
                            <img
                              src={galleryImages[activeImage]?.url}
                              alt={`${gig.title} - Gallery Image ${activeImage + 1}`}
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
                          <div className="flex space-x-3 overflow-x-auto pb-3" role="list" aria-label="Gallery thumbnails">
                            {galleryImages.map((image, index) => (
                              <button
                                key={index}
                                onClick={() => setActiveImage(index)}
                                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                                  activeImage === index
                                    ? 'border-emerald-500'
                                    : 'border-transparent hover:border-gray-300'
                                }`}
                                aria-label={`View gallery image ${index + 1}`}
                                aria-pressed={activeImage === index}
                                role="listitem"
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
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">No Gallery Images</h3>
                      <p className="text-gray-600 mb-4">
                        This gig doesn't have additional gallery images yet.
                      </p>
                      <button
                        onClick={() => setImageViewMode('thumbnail')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        aria-label="Switch to thumbnail view"
                      >
                        View Thumbnail
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                    Project Description
                  </h2>
                  <div className="prose max-w-none">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed" itemProp="description">
                        {gig.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enhanced Gig Details */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                    Project Details
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Project Requirements */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-emerald-600" aria-hidden="true" />
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
                              aria-label="Download requirements document"
                              download
                            >
                              <Download className="h-3 w-3" aria-hidden="true" />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Project Timeline Details */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                        Timeline Details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                          <span className="text-gray-600">Created</span>
                          <time className="font-semibold text-gray-900" dateTime={gig.createdAt}>
                            {timeAgo}
                          </time>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                          <span className="text-gray-600">Last Updated</span>
                          <time className="font-semibold text-gray-900" dateTime={gig.updatedAt}>
                            {calculateTimeAgo(gig.updatedAt)}
                          </time>
                        </div>
                        {gig.deadline && (
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                            <span className="text-gray-600">Deadline</span>
                            <time className="font-semibold text-gray-900" dateTime={gig.deadline}>
                              {new Date(gig.deadline).toLocaleDateString()}
                            </time>
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
                      <Target className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                      Required Skills
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {gig.skillsRequired.map((skill, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-medium flex items-center gap-2"
                          itemProp="skills"
                        >
                          <CheckCircle className="h-4 w-4" aria-hidden="true" />
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
                      <FileCheck className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                      Expected Deliverables
                    </h2>
                    <div className="space-y-3" role="list">
                      {gig.deliverables.map((deliverable, index) => (
                        <div key={index} className="flex items-start bg-gray-50 p-4 rounded-xl" role="listitem">
                          <div className="flex-shrink-0 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center mr-3 mt-1">
                            <CheckCircle className="h-3 w-3 text-white" aria-hidden="true" />
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
                      <Package className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                      Project Milestones
                    </h2>
                    <div className="space-y-4" role="list">
                      {gig.milestones.map((milestone, index) => (
                        <div key={index} className="bg-gray-50 p-6 rounded-xl border border-gray-100" role="listitem">
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
                              <time dateTime={milestone.dueDate}>
                                Due: {new Date(milestone.dueDate).toLocaleDateString()}
                              </time>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last Updated */}
                <footer className="pt-6 border-t border-gray-200">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        <time dateTime={gig.createdAt}>
                          Posted {timeAgo}
                        </time> • 
                        <time dateTime={gig.updatedAt}>
                          Last updated: {new Date(gig.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </time>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Gig ID: <code>{gig._id}</code>
                      </p>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="flex items-center mr-4">
                        <Package className="h-4 w-4 mr-1" aria-hidden="true" />
                        {gig.projectCategory?.name}
                      </span>
                      {gig.subcategory && (
                        <span className="flex items-center">
                          <ChevronRight className="h-4 w-4 mr-1" aria-hidden="true" />
                          {gig.subcategory.name}
                        </span>
                      )}
                    </div>
                  </div>
                </footer>
              </article>
            </div>

            {/* Right Column - Gig Info & Actions */}
            <aside className="lg:col-span-1">
              <div className=" top-8 space-y-8">

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
                          <Package className="h-5 w-5 text-emerald-600 mr-3" aria-hidden="true" />
                          <div>
                            <span className="font-semibold text-gray-900 block" itemProp="serviceType">{gig.projectCategory.name}</span>
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
                          <ChevronRight className="h-5 w-5 text-blue-600 mr-3" aria-hidden="true" />
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
                              itemProp="skills"
                            >
                              <Tag className="inline h-3 w-3 mr-1" aria-hidden="true" />
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
                      aria-label={`View ${gigUser?.name || 'Client'}'s profile`}
                    >
                      <div className="relative">
                        <img
                          src={gigUser?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                          alt={gigUser?.name || 'Client'}
                          className="w-12 h-12 rounded-full border-2 border-white group-hover:border-emerald-100 transition-colors"
                        />
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white" aria-label="User is online"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {gigUser?.name}
                        </h4>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          View Profile
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </p>
                      </div>
                    </Link>

                    {/* User Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {gigUser?.country && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <MapPin className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
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
                          <Briefcase className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
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
                          <TrendingUp className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
                          <div>
                            <h4 className="text-xs text-gray-500">Rating</h4>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" aria-hidden="true" />
                              <span className="text-sm font-medium text-gray-900 ml-1">
                                {gigUser.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {gigUser?.completedOrders !== undefined && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <Activity className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
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
                          <Award className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
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
                          <Languages className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
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
                      aria-label="View client's full profile"
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      View Full Profile
                    </Link>
                  </div>
                </div>

                {/* Safety Tips */}
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                    Safety Tips
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                        <CheckCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Secure Communication</h4>
                        <p className="text-xs text-gray-600">Keep all communication on the platform</p>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                        <Award className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Verified Identity</h4>
                        <p className="text-xs text-gray-600">Client identity is verified</p>
                      </div>
                    </div>
                    <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                        <Zap className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Fast Response</h4>
                        <p className="text-xs text-gray-600">Client typically responds within 24 hours</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default GigDetails;