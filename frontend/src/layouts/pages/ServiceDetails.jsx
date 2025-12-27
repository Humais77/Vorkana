import { useState, useEffect, useMemo, useCallback } from 'react';
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
  MessageCircle,
  Info,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Hash,
  Clock3,
  DollarSign as DollarSignIcon,
  Target as TargetIcon,
  FileQuestion,
  CheckSquare,
  Search,
  Crown,
  TrendingUp as TrendingUpIcon,
  FileWarning,
  ShieldOff,
  Clock8,
  Calendar as CalendarIcon,
  Hash as HashIcon,
  TrendingDown,
  EyeOff,
  Zap as ZapIcon,
  CalendarCheck,
  CalendarX
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import Zustand stores and TanStack Query hooks
import { useAuthStore } from '../../store/useAuthStore';
import { useService } from '../../hooks/useServices';
import { SeoWrapper } from '../../components/SeoWrapper';

// Static data
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 border-green-200',
  draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  pending: 'bg-blue-100 text-blue-800 border-blue-200',
  paused: 'bg-orange-100 text-orange-800 border-orange-200',
  denied: 'bg-red-100 text-red-800 border-red-200',
  suspended: 'bg-red-100 text-red-800 border-red-200'
};

const SAFETY_ITEMS = [
  { icon: ShieldCheck, title: "Secure Payments", description: "Your payment is protected" },
  { icon: ThumbsUp, title: "Satisfaction Guarantee", description: "Revisions included" },
  { icon: Timer, title: "On-time Delivery", description: "Delivery guarantee" },
  { icon: CheckCircle, title: "Verified Provider", description: "Identity verified" }
];

// Helper functions
const generateServiceStructuredData = (service, serviceUser, websiteUrl) => {
  if (!service || !websiteUrl) return null;

  const serviceUrl = `${websiteUrl}/services/${service._id}`;
  const provider = serviceUser || service.createdBy || service.creatorDetails;
  
  const formatStructuredPrice = (price, currency) => {
    return {
      "@type": "PriceSpecification",
      "price": parseFloat(price) || 0,
      "priceCurrency": currency || "USD"
    };
  };

  const offers = [];
  offers.push({
    "@type": "Offer",
    ...formatStructuredPrice(service.price, service.currency),
    "availability": service.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    "itemOffered": {
      "@type": "Service",
      "name": service.title,
      "description": service.shortDescription || service.description?.substring(0, 200),
      "serviceType": service.category || "Freelance Service",
      "provider": provider ? {
        "@type": "Person",
        "name": provider.name,
        "url": `${websiteUrl}/profile/${provider._id}`,
        "image": provider.picture
      } : undefined,
      "areaServed": {
        "@type": "Country",
        "name": "Worldwide"
      }
    },
    "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  if (service.packages && service.packages.length > 0) {
    service.packages.forEach((pkg) => {
      offers.push({
        "@type": "Offer",
        ...formatStructuredPrice(pkg.price, service.currency),
        "name": pkg.name,
        "description": pkg.description || `Package: ${pkg.name}`,
        "availability": service.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": service.title,
    "description": service.description?.substring(0, 300) || service.shortDescription,
    "url": serviceUrl,
    "image": service.thumbnail?.url || (service.images?.[0]?.url) || `${websiteUrl}/default-service.jpg`,
    "offers": offers,
    "provider": provider ? {
      "@type": provider.role === 'business' ? "Organization" : "Person",
      "name": provider.name,
      "description": provider.bio?.substring(0, 200),
      "url": `${websiteUrl}/profile/${provider._id}`,
      "image": provider.picture,
      "telephone": provider.phone,
      "email": provider.email,
      "address": {
        "@type": "PostalAddress",
        "addressCountry": provider.country,
        "addressLocality": provider.city
      },
      "aggregateRating": provider.rating ? {
        "@type": "AggregateRating",
        "ratingValue": provider.rating,
        "ratingCount": provider.totalReviews || 0,
        "bestRating": 5,
        "worstRating": 1
      } : undefined
    } : undefined,
    "aggregateRating": service.rating ? {
      "@type": "AggregateRating",
      "ratingValue": service.rating,
      "ratingCount": service.reviewsCount || 0,
      "bestRating": 5,
      "worstRating": 1
    } : undefined,
    "areaServed": {
      "@type": "Country",
      "name": "Worldwide"
    },
    "serviceType": service.category,
    "category": service.category,
    "keywords": service.tags?.join(', '),
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": serviceUrl
    },
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "deliveryTime",
        "value": `${service.deliveryTime} ${service.deliveryTimeUnit}`
      },
      {
        "@type": "PropertyValue",
        "name": "revisions",
        "value": service.revisions || 0
      },
      {
        "@type": "PropertyValue",
        "name": "status",
        "value": service.status || 'active'
      }
    ]
  };
};

const generateBreadcrumbStructuredData = (breadcrumbItems, websiteUrl) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith('http') ? item.url : `${websiteUrl}${item.url}`
    }))
  };
};

const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user, isAuthenticated } = useAuthStore();
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
  const [imageViewMode, setImageViewMode] = useState('thumbnail');
  const [showMessaging, setShowMessaging] = useState(false);
  const [expandedSection, setExpandedSection] = useState({
    meta: false,
    packages: false,
    features: false,
    requirements: false,
    faqs: false
  });

  // Update view count when service loads
  useEffect(() => {
    if (service) {
      setViewCount(service.views || Math.floor(Math.random() * 500) + 100);
      if (service.packages && service.packages.length > 0) {
        setSelectedPackage(service.packages[0]);
      }
    }
  }, [service]);

  // Memoized handlers
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleReport = useCallback(() => {
    toast.info('Report feature coming soon');
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Refreshing service details...');
  }, [refetch]);

  const formatPrice = useCallback((price, currency = 'USD') => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  }, []);

  const renderStars = useCallback((rating) => {
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
  }, []);

  const getStatusColor = useCallback((status) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    return STATUS_COLORS[status.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  }, []);

  const calculateTimeAgo = useCallback((date) => {
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
  }, []);

  const calculateAccountAge = useCallback((createdAt) => {
    if (!createdAt) return '';
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const diffYears = now.getFullYear() - created.getFullYear();
      return `${diffYears} year${diffYears !== 1 ? 's' : ''}`;
    } catch (error) {
      return '';
    }
  }, []);

  const calculateAge = useCallback((dateOfBirth) => {
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
  }, []);

  const isUserOnline = useCallback((lastSeenAt) => {
    if (!lastSeenAt) return false;
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return new Date(lastSeenAt) > fiveMinutesAgo;
    } catch (error) {
      return false;
    }
  }, []);

  const getThumbnailImage = useCallback((service) => {
    if (service?.thumbnail?.url) {
      return {
        url: service.thumbnail.url,
        public_id: service.thumbnail.public_id,
        type: 'thumbnail',
        width: service.thumbnail.width,
        height: service.thumbnail.height,
        size: service.thumbnail.size,
        format: service.thumbnail.format,
        uploadedAt: service.thumbnail.uploadedAt
      };
    }
    
    if (service?.images && service.images.length > 0 && service.images[0]?.url) {
      return {
        url: service.images[0].url,
        public_id: service.images[0].public_id,
        type: 'image',
        width: service.images[0].width,
        height: service.images[0].height,
        size: service.images[0].size,
        format: service.images[0].format,
        uploadedAt: service.images[0].uploadedAt
      };
    }
    
    return {
      url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      type: 'default'
    };
  }, []);

  const getGalleryImages = useCallback((service) => {
    const images = [];
    
    if (service?.images && service.images.length > 0) {
      service.images.forEach((img, index) => {
        if (img?.url) {
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
            format: img.format,
            uploadedAt: img.uploadedAt
          });
        }
      });
    }
    
    return images;
  }, []);

  const getCategoryName = useCallback((service) => {
    if (!service) return 'Category';
    
    if (service.categoryDetails && typeof service.categoryDetails === 'object' && service.categoryDetails.name) {
      return service.categoryDetails.name;
    }
    
    if (typeof service.category === 'string') {
      return service.category;
    }
    
    return 'Category';
  }, []);

  const getSubcategoryName = useCallback((service) => {
    if (!service) return null;
    
    if (service.subcategory && typeof service.subcategory === 'object') {
      return service.subcategory.name || null;
    }
    
    if (typeof service.subcategory === 'string') {
      return service.subcategory;
    }
    
    return null;
  }, []);

  const toggleSection = useCallback((section) => {
    setExpandedSection(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const formatDate = useCallback((date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const isExpired = useCallback((service) => {
    if (!service.expiresAt) return false;
    return new Date(service.expiresAt) < new Date();
  }, []);

  const isRecommended = useCallback((service) => {
    return service?.isRecommended || false;
  }, []);

  const isPopular = useCallback((service) => {
    return service?.isPopular || false;
  }, []);

  // Memoized data
  const thumbnailImage = useMemo(() => getThumbnailImage(service), [service, getThumbnailImage]);
  const galleryImages = useMemo(() => getGalleryImages(service), [service, getGalleryImages]);
  const categoryName = useMemo(() => getCategoryName(service), [service, getCategoryName]);
  const subcategoryName = useMemo(() => getSubcategoryName(service), [service, getSubcategoryName]);
  const serviceUser = useMemo(() => service?.createdBy || service?.creatorDetails, [service]);
  const userAge = useMemo(() => calculateAge(serviceUser?.dateOfBirth), [serviceUser, calculateAge]);
  const accountAge = useMemo(() => calculateAccountAge(serviceUser?.createdAt), [serviceUser, calculateAccountAge]);
  const isOnline = useMemo(() => isUserOnline(serviceUser?.lastSeenAt), [serviceUser, isUserOnline]);
  const timeAgo = useMemo(() => calculateTimeAgo(service?.createdAt), [service, calculateTimeAgo]);

  // Memoized structured data
  const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const structuredData = useMemo(() => {
    if (!service || !websiteUrl) return [];
    
    const serviceStructuredData = generateServiceStructuredData(service, serviceUser, websiteUrl);
    const breadcrumbStructuredData = generateBreadcrumbStructuredData([
      { name: "Home", url: "/" },
      { name: "Services", url: "/services" },
      { name: categoryName, url: `/services?category=${service.category}` },
      { name: service.title, url: `/services/${service._id}` }
    ], websiteUrl);
    
    return [serviceStructuredData, breadcrumbStructuredData].filter(Boolean);
  }, [service, serviceUser, websiteUrl, categoryName]);

  // Loading state
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

  // Error state
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

  return (
    <SeoWrapper 
      title={`${service.title} - Professional ${categoryName} Service | Vorkana`}
      description={`${service.shortDescription || service.description?.substring(0, 155)}... Starting at ${formatPrice(service.price, service.currency)}. ${service.deliveryTime}-day delivery.`}
      keywords={`${service.tags?.join(', ')}, ${categoryName}, ${subcategoryName}, freelance service, online service, ${serviceUser?.occupation || 'professional'}`}
      canonical={`/services/${service._id}`}
      ogTitle={service.title}
      ogDescription={service.shortDescription || service.description?.substring(0, 200)}
      ogImage={service.thumbnail?.url || service.images?.[0]?.url}
      ogType="article"
      ogArticle={{
        publishedTime: service.createdAt,
        modifiedTime: service.updatedAt,
        author: serviceUser?.name,
        section: categoryName
      }}
      twitterCard="summary_large_image"
      twitterSite="@vorkana"
      twitterCreator={serviceUser?.twitter || '@vorkana'}
      robots={service.status === 'active' ? 'index, follow' : 'noindex, nofollow'}
      lang="en"
      breadcrumb={[
        { name: "Home", url: "/" },
        { name: "Services", url: "/services" },
        { name: categoryName, url: `/services?category=${service.category}` },
        { name: service.title, url: `/services/${service._id}` }
      ]}
      structuredData={structuredData}
    >
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
              <div 
                className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100" 
                itemScope
                itemType="https://schema.org/Service"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                  <div>
                    <h1 
                      className="text-3xl lg:text-4xl font-bold text-gray-900 pr-4 mb-2" 
                      itemProp="name"
                    >
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
                      {isRecommended(service) && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          <Crown className="inline h-4 w-4 mr-1" />
                          RECOMMENDED
                        </span>
                      )}
                      {isPopular(service) && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
                          <TrendingUpIcon className="inline h-4 w-4 mr-1" />
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
                        {thumbnailImage.uploadedAt && (
                          <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Uploaded: {new Date(thumbnailImage.uploadedAt).toLocaleDateString()}
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
                            {thumbnailImage.public_id && (
                              <span>ID: {thumbnailImage.public_id.substring(0, 20)}...</span>
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
                            {galleryImages[activeImage]?.uploadedAt && (
                              <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                Uploaded: {new Date(galleryImages[activeImage].uploadedAt).toLocaleDateString()}
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

                {/* Essential Service Information Card */}
                <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TargetIcon className="h-6 w-6 text-blue-600" />
                    Essential Service Information
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Category & Subcategory */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Category</h3>
                          <div className="text-sm text-gray-600">Service classification</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Main Category:</span>
                          <span className="font-medium text-gray-900">{categoryName || 'Not set'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Subcategory:</span>
                          <span className="font-medium text-gray-900">{subcategoryName || 'Not set'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Information */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSignIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Pricing</h3>
                          <div className="text-sm text-gray-600">Service cost details</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Base Price:</span>
                          <span className="font-medium text-emerald-600">
                            {formatPrice(service.price, service.currency)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Currency:</span>
                          <span className="font-medium text-gray-900">{service.currency || 'USD'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Revisions:</span>
                          <span className="font-medium text-gray-900">{service.revisions || 0} included</span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Information */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Clock3 className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Delivery</h3>
                          <div className="text-sm text-gray-600">Timeline details</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Delivery Time:</span>
                          <span className="font-medium text-gray-900">
                            {service.deliveryTime} {service.deliveryTimeUnit || 'days'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Unit:</span>
                          <span className="font-medium text-gray-900">{service.deliveryTimeUnit || 'days'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
                      <div 
                        className="text-3xl font-bold text-emerald-600 mb-1" 
                        itemProp="offers" 
                        itemScope 
                        itemType="https://schema.org/Offer"
                      >
                        <span itemProp="price" content={service.price}>{formatPrice(service.price, service.currency)}</span>
                        <meta itemProp="priceCurrency" content={service.currency || 'USD'} />
                        <meta itemProp="availability" content={service.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'} />
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

                {/* Description Section */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-emerald-600" />
                    Service Description
                  </h2>
                  <div className="prose max-w-none" itemProp="description">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                        {service.description}
                      </p>
                      {service.shortDescription && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <h3 className="font-medium text-gray-900">Short Description</h3>
                          </div>
                          <p className="text-gray-600">{service.shortDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Packages Section */}
                {service.packages && service.packages.length > 0 && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package className="h-6 w-6 text-emerald-600" />
                        Service Packages
                      </h2>
                      <button
                        onClick={() => toggleSection('packages')}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        {expandedSection.packages ? 'Show Less' : 'Show All'}
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(expandedSection.packages ? service.packages : service.packages.slice(0, 3)).map((pkg, index) => (
                        <div key={index} className={`p-6 bg-white border rounded-xl transition-all hover:border-emerald-200 ${
                          pkg.popular ? 'border-2 border-emerald-300 bg-emerald-50' : 'border-gray-200'
                        }`}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
                                {pkg.popular && (
                                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full font-medium">
                                    Most Popular
                                  </span>
                                )}
                              </div>
                              {pkg.description && (
                                <p className="text-gray-600">{pkg.description}</p>
                              )}
                            </div>
                            <div className="mt-2 md:mt-0 text-right">
                              <div className="text-2xl font-bold text-emerald-600">
                                {formatPrice(pkg.price, service.currency)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Delivery: {pkg.deliveryTime} {service.deliveryTimeUnit}
                              </div>
                            </div>
                          </div>
                          
                          {pkg.features && pkg.features.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-900 mb-2">Package Includes:</h4>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {pkg.features.map((feature, featureIndex) => (
                                  <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                                    <CheckCircle className="h-4 w-4 text-emerald-500 mr-2" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                              {pkg.revisions > 0 ? `${pkg.revisions} revision${pkg.revisions !== 1 ? 's' : ''} included` : 'No revisions included'}
                            </div>
                            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                              Select Package
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {service.packages.length > 3 && !expandedSection.packages && (
                        <div className="text-center">
                          <button
                            onClick={() => toggleSection('packages')}
                            className="text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            + {service.packages.length - 3} more packages
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Features Section */}
                {service.features && service.features.length > 0 && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CheckSquare className="h-6 w-6 text-emerald-600" />
                        What's Included
                      </h2>
                      <button
                        onClick={() => toggleSection('features')}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        {expandedSection.features ? 'Show Less' : 'Show All'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(expandedSection.features ? service.features : service.features.slice(0, 6)).map((feature, index) => (
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
                    {service.features.length > 6 && !expandedSection.features && (
                      <div className="text-center mt-4">
                        <button
                          onClick={() => toggleSection('features')}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          + {service.features.length - 6} more features
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Requirements Section */}
                {service.requirements && service.requirements.length > 0 && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileQuestion className="h-6 w-6 text-emerald-600" />
                        Client Requirements
                      </h2>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {service.requirements.filter(req => req.required).length} required field(s)
                        </span>
                        <button
                          onClick={() => toggleSection('requirements')}
                          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          {expandedSection.requirements ? 'Show Less' : 'Show All'}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {(expandedSection.requirements ? service.requirements : service.requirements.slice(0, 3)).map((req, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 text-gray-400 mr-3" />
                              <div>
                                <h3 className="font-semibold text-gray-900">{req.question}</h3>
                                {req.required && (
                                  <span className="text-xs text-red-600 font-medium mt-1">
                                    Required field
                                  </span>
                                )}
                              </div>
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
                    {service.requirements.length > 3 && !expandedSection.requirements && (
                      <div className="text-center mt-4">
                        <button
                          onClick={() => toggleSection('requirements')}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          + {service.requirements.length - 3} more requirements
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* FAQs Section */}
                {service.faqs && service.faqs.length > 0 && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageCircle className="h-6 w-6 text-emerald-600" />
                        Frequently Asked Questions
                      </h2>
                      <button
                        onClick={() => toggleSection('faqs')}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        {expandedSection.faqs ? 'Show Less' : 'Show All'}
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(expandedSection.faqs ? service.faqs : service.faqs.slice(0, 3)).map((faq, index) => (
                        <div key={index} className="p-4 bg-white border border-gray-200 rounded-xl">
                          <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                          <p className="text-gray-600">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                    {service.faqs.length > 3 && !expandedSection.faqs && (
                      <div className="text-center mt-4">
                        <button
                          onClick={() => toggleSection('faqs')}
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          + {service.faqs.length - 3} more FAQs
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags Section */}
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

                {/* Search Keywords */}
                {service.searchKeywords && service.searchKeywords.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Search className="h-6 w-6 text-emerald-600" />
                      Search Keywords
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {service.searchKeywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta Information (Collapsible) */}
                <div className="mb-8">
                  <button
                    onClick={() => toggleSection('meta')}
                    className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-gray-600" />
                      <h2 className="text-xl font-bold text-gray-900">
                        Service Meta Information
                      </h2>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-gray-600 transition-transform ${expandedSection.meta ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {expandedSection.meta && (
                    <div className="mt-4 p-6 bg-white border border-gray-200 rounded-xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Meta Titles & Descriptions */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">SEO Information</h3>
                          <div className="space-y-3">
                            {service.metaTitle && (
                              <div>
                                <h4 className="text-sm text-gray-600 mb-1">Meta Title</h4>
                                <p className="text-gray-900">{service.metaTitle}</p>
                              </div>
                            )}
                            {service.metaDescription && (
                              <div>
                                <h4 className="text-sm text-gray-600 mb-1">Meta Description</h4>
                                <p className="text-gray-900">{service.metaDescription}</p>
                              </div>
                            )}
                            {service.slug && (
                              <div>
                                <h4 className="text-sm text-gray-600 mb-1">URL Slug</h4>
                                <p className="text-gray-900 font-mono">{service.slug}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Technical Information */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Technical Details</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Service ID:</span>
                              <span className="font-mono text-gray-900">{service._id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Version:</span>
                              <span className="text-gray-900">{service.version || 1}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Active Status:</span>
                              <span className={`font-medium ${service.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                {service.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            {service.isDeleted && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Deleted:</span>
                                <span className="text-red-600 font-medium">Yes</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dates Information */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Dates</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Created:</span>
                              <span className="text-gray-900">{formatDate(service.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Updated:</span>
                              <span className="text-gray-900">{formatDate(service.updatedAt)}</span>
                            </div>
                            {service.publishedAt && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Published:</span>
                                <span className="text-gray-900">{formatDate(service.publishedAt)}</span>
                              </div>
                            )}
                            {service.expiresAt && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Expires:</span>
                                <span className={`font-medium ${isExpired(service) ? 'text-red-600' : 'text-gray-900'}`}>
                                  {formatDate(service.expiresAt)}
                                  {isExpired(service) && ' (Expired)'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Last Updated Information */}
                        {service.lastUpdatedBy && (
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Last Updated By</h3>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-600" />
                                <span className="text-gray-900">User ID: {service.lastUpdatedBy}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Deletion Information */}
                        {(service.deletedAt || service.deletedBy) && (
                          <div className="md:col-span-2 p-4 bg-red-50 rounded-lg border border-red-200">
                            <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5" />
                              Deletion Information
                            </h3>
                            <div className="space-y-2">
                              {service.deletedAt && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-red-700">Deleted At:</span>
                                  <span className="text-red-900">{formatDate(service.deletedAt)}</span>
                                </div>
                              )}
                              {service.deletedBy && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-red-700">Deleted By:</span>
                                  <span className="text-red-900">User ID: {service.deletedBy}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Last Updated */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        Posted {timeAgo} • Last updated: {formatDate(service.updatedAt)}
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
                        <button 
                          onClick={() => {
                            const packagesSection = document.querySelector('[data-section="packages"]');
                            packagesSection?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
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
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-600">Main Category</h4>
                        </div>
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
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-600">Subcategory</h4>
                        </div>
                        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                          <Layers className="h-5 w-5 text-blue-600 mr-3" />
                          <div>
                            <span className="font-semibold text-gray-900">{subcategoryName}</span>
                          </div>
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
                    {SAFETY_ITEMS.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                            <Icon className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{item.title}</h4>
                            <p className="text-xs text-gray-600">{item.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default ServiceDetails;