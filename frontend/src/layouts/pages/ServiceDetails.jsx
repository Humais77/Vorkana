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
  FileText,
  User,
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  DollarSign,
  Target,
  TrendingUp,
  Award,
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
  Download,
  BookOpen,
  Layers,
  AlertTriangle,
  FileWarning,
  ShieldCheck,
  Timer,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import Zustand stores and TanStack Query hooks
import { useAuthStore } from '../../store/useAuthStore';
import { useService ,useDeleteService } from '../../hooks/useServices';
import { SeoWrapper } from '../../components/SeoWrapper';

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
        "bestRating": 5,
        "worstRating": 1
      } : undefined
    } : undefined,
    "aggregateRating": service.rating ? {
      "@type": "AggregateRating",
      "ratingValue": service.rating,
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

// Safety items for the sidebar
const SAFETY_ITEMS = [
  { icon: ShieldCheck, title: "Secure Payments", description: "Your payment is protected" },
  { icon: CheckCircle, title: "Satisfaction Guarantee", description: "Revisions included" },
  { icon: Timer, title: "On-time Delivery", description: "Delivery guarantee" },
  { icon: Award, title: "Verified Provider", description: "Identity verified" }
];

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
  const [imageViewMode, setImageViewMode] = useState('thumbnail');
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [deleteStatus, setDeleteStatus] = useState(null);
const deleteServiceMutation = useDeleteService();
  

  // Helper functions
  const handleShare = async () => {
    const url = window.location.href;
    const title = service?.title || "Check out this service on Vorkanna";
    const text = service?.description?.substring(0, 150) || "Professional service on Vorkanna marketplace";
    
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
const handleDeleteClick = () => {
  setShowDeleteModal(true);
};
const isOwner = () => {
  if (!service || !user) return false;
  
  // If createdBy is populated as an object
  if (service.createdBy?._id) {
    return service.createdBy._id.toString() === user._id.toString();
  }
  
  // If createdBy is just a string ID
  if (typeof service.createdBy === 'string') {
    return service.createdBy === user._id;
  }
  
  // Check other possible fields
  if (service.creatorDetails?._id) {
    return service.creatorDetails._id.toString() === user._id.toString();
  }
  
  return false;
};
const handleConfirmDelete = async () => {
  if (!service || !user) {
    toast.error('You must be logged in to delete services');
    return;
  }

  // Check if user is owner or admin
   const isOwnerCheck = isOwner();
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    toast.error('You can only delete your own services');
    return;
  }

  setIsDeleting(true);
  
  try {
    await deleteServiceMutation.mutateAsync({
      id: service._id,
      options: {
        permanent: false // Soft delete by default
      }
    });

    setDeleteStatus('success');
    toast.success('Service deleted successfully');
    
    // Redirect after delay
    setTimeout(() => {
      navigate('/profile?tab=services');
    }, 2000);
  } catch (error) {
    setDeleteStatus('error');
    toast.error(error.message || 'Failed to delete service');
    setIsDeleting(false);
  }
};

const handlePermanentDelete = async () => {
  if (!user || user.role !== 'admin') {
    toast.error('Only admins can permanently delete services');
    return;
  }

  if (!confirm('Warning: This will permanently delete the service. This action cannot be undone. Are you sure?')) {
    return;
  }

  setIsDeleting(true);
  
  try {
    await deleteServiceMutation.mutateAsync({
      id: service._id,
      options: {
        permanent: true,
        force: true
      }
    });

    toast.success('Service permanently deleted');
    navigate('/admin/services');
  } catch (error) {
    toast.error(error.message || 'Failed to permanently delete service');
    setIsDeleting(false);
  }
};

const handleRestoreService = async () => {
  try {
    // You'll need to add a restore API endpoint
    const response = await servicesAPI.restore(service._id);
    if (response.success) {
      toast.success('Service restored successfully');
      refetch();
      setDeleteStatus(null);
    }
  } catch (error) {
    toast.error('Failed to restore service');
  }
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
const formatRevisions = (revisions) => {
  if (revisions === 0) return 'No revisions';
  if (revisions === 1) return '1 revision';
  return `${revisions} revisions`;
};

const getDeliverySpeed = (deliveryTime, unit) => {
  const days = unit === 'hours' ? deliveryTime / 24 : unit === 'weeks' ? deliveryTime * 7 : deliveryTime;
  if (days < 1) return 'Express (Under 1 day)';
  if (days <= 3) return 'Fast (1-3 days)';
  if (days <= 7) return 'Standard (3-7 days)';
  return 'Extended (Over 7 days)';
};

const calculateCompletionRate = (completedOrders, totalOrders) => {
  if (!totalOrders || totalOrders === 0) return 'N/A';
  const rate = (completedOrders / totalOrders) * 100;
  return `${Math.round(rate)}%`;
};
  const getStatusColor = (status) => {
    const STATUS_COLORS = {
      active: 'bg-green-100 text-green-800 border-green-200',
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending: 'bg-blue-100 text-blue-800 border-blue-200',
      paused: 'bg-orange-100 text-orange-800 border-orange-200',
      denied: 'bg-red-100 text-red-800 border-red-200',
      suspended: 'bg-red-100 text-red-800 border-red-200'
    };
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-200';
    return STATUS_COLORS[status.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
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

  const isUserOnline = (lastSeenAt) => {
    if (!lastSeenAt) return false;
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return new Date(lastSeenAt) > fiveMinutesAgo;
    } catch (error) {
      return false;
    }
  };

  const getThumbnailImage = (service) => {
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
  };

  const getGalleryImages = (service) => {
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
  };

  const getCategoryName = (service) => {
    if (!service) return 'Category';
    
    if (service.categoryDetails && typeof service.categoryDetails === 'object' && service.categoryDetails.name) {
      return service.categoryDetails.name;
    }
    
    if (typeof service.category === 'string') {
      return service.category;
    }
    
    return 'Category';
  };

  const getSubcategoryName = (service) => {
    if (!service) return null;
    
    if (service.subcategory && typeof service.subcategory === 'object') {
      return service.subcategory.name || null;
    }
    
    if (typeof service.subcategory === 'string') {
      return service.subcategory;
    }
    
    return null;
  };

  // Generate structured data for SEO
  const generateStructuredData = () => {
    if (!service) return null;

    const serviceUser = service.createdBy || service.creatorDetails;
    const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    const serviceStructuredData = generateServiceStructuredData(service, serviceUser, websiteUrl);
    const breadcrumbStructuredData = generateBreadcrumbStructuredData([
      { name: "Home", url: "/" },
      { name: "Services", url: "/services" },
      { name: getCategoryName(service), url: `/services?category=${service.category}` },
      { name: service.title, url: `/services/${service._id}` }
    ], websiteUrl);
    
    return [serviceStructuredData, breadcrumbStructuredData].filter(Boolean);
  };

  // Calculate derived values
  const thumbnailImage = service ? getThumbnailImage(service) : null;
  const galleryImages = service ? getGalleryImages(service) : [];
  const allImages = thumbnailImage ? [thumbnailImage, ...galleryImages] : [];
  const timeAgo = service ? calculateTimeAgo(service.createdAt) : 'N/A';
  const serviceUser = service?.createdBy || service?.creatorDetails;
  const accountAge = calculateAccountAge(serviceUser?.createdAt);
  const isOnline = isUserOnline(serviceUser?.lastSeenAt);
  const categoryName = service ? getCategoryName(service) : 'Category';
  const subcategoryName = service ? getSubcategoryName(service) : null;
  const structuredData = generateStructuredData();

  // SEO meta data
  const seoMetaData = {
    title: `${service?.title || 'Service'} | ${categoryName} on Vorkanna`,
    description: service?.description?.substring(0, 160) || `Professional ${categoryName} service on Vorkanna. Starting at ${formatPrice(service?.price, service?.currency)}, Delivery: ${service?.deliveryTime} ${service?.deliveryTimeUnit}.`,
    keywords: `${service?.title || ''}, ${categoryName}, freelance, service, ${service?.tags?.join(', ') || ''}`,
    canonical: typeof window !== 'undefined' ? `${window.location.origin}/services/${id}` : `/services/${id}`,
    openGraph: {
      title: service?.title,
      description: service?.description?.substring(0, 200),
      type: 'website',
      url: typeof window !== 'undefined' ? `${window.location.origin}/services/${id}` : `/services/${id}`,
      image: thumbnailImage?.url,
      site_name: 'Vorkanna'
    },
    twitter: {
      card: 'summary_large_image',
      title: service?.title,
      description: service?.description?.substring(0, 200),
      image: thumbnailImage?.url
    }
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
          <h3 className="text-2xl font-bold text-red-500 mb-4">
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
                  onClick={() => navigate('/services')}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Browse all services"
                >
                  Services
                </button>
                {categoryName && (
                  <>
                    <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    <button
                      onClick={() => navigate(`/services?category=${service.category}`)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label={`Browse ${categoryName} category`}
                    >
                      {categoryName}
                    </button>
                  </>
                )}
                <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <span className="text-emerald-600 font-medium truncate max-w-xs" aria-current="page">
                  {service.title}
                </span>
              </nav>
              
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
                aria-label="Refresh service details"
              >
                Refresh Page
              </button>
            </div>
          </div>
          {showDeleteModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl max-w-md w-full p-6">
      <div className="text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Service</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{service.title}"? 
          {user?.role === 'admin' ? (
            <span className="block mt-2 text-sm text-red-600">
              Admin: You can choose between soft delete (reversible) or permanent delete.
            </span>
          ) : (
            <span className="block mt-2 text-sm text-gray-500">
              This will deactivate your service but you can restore it later.
            </span>
          )}
        </p>
        
        <div className="flex flex-col gap-3">
          {deleteStatus === 'success' ? (
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-green-600 font-medium">Service deleted successfully!</p>
              <p className="text-gray-500 text-sm mt-2">Redirecting to your services...</p>
            </div>
          ) : (
            <>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {isDeleting ? 'Deleting...' : 'Delete Service'}
              </button>
              
              {user?.role === 'admin' && (
                <button
                  onClick={handlePermanentDelete}
                  disabled={isDeleting}
                  className="w-full px-4 py-3 bg-red-800 text-white rounded-lg hover:bg-red-900 disabled:opacity-50 font-medium text-sm"
                >
                  {isDeleting ? 'Deleting...' : 'Permanent Delete (Admin Only)'}
                </button>
              )}
              
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
)}

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Service Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title and Actions */}
              <article className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100" itemScope itemType="https://schema.org/Service">
                <meta itemProp="url" content={`${window.location.origin}/services/${id}`} />
                <meta itemProp="image" content={thumbnailImage?.url} />
                
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 pr-4 mb-2" itemProp="name">
                      {service.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(service.status)}`} itemProp="availability">
                        {service.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                      {service.isFeatured && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          <Award className="inline h-4 w-4 mr-1" aria-hidden="true" />
                          FEATURED
                        </span>
                      )}
                     
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
                      aria-label="Share this service"
                    >
                      <Share2 className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    </button>
                    <button
                      onClick={handleReport}
                      className="p-3 hover:bg-gray-50 rounded-xl transition-colors"
                      aria-label="Report this service"
                    >
                      <Flag className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    </button>
                    {(user?.role === 'admin' || isOwner()) &&(
    <>
      <Link
        to={`/edit-service/${service._id}`}
                 className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2"
        aria-label="Edit service"
      >
        <Edit className="h-6 w-6" />
        Edit
      </Link>
      <button
        onClick={handleDeleteClick}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
        aria-label="Delete service"
      >
        <Trash2 className="h-6 w-6" />
        Delete
      </button>
    </>
  )}
                  </div>
                </div>

                {/* Enhanced User Info - Now Clickable */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <Link 
                    to={`/profile/${serviceUser?._id}`}
                    className="flex items-center space-x-4 group cursor-pointer flex-1"
                    aria-label={`View ${serviceUser?.name || 'Provider'}'s profile`}
                    itemProp="provider"
                    itemScope
                    itemType="https://schema.org/Person"
                  >
                    <meta itemProp="url" content={`${window.location.origin}/profile/${serviceUser?._id}`} />
                    <div className="relative">
                      <img
                        src={serviceUser?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                        alt={serviceUser?.name || 'Provider'}
                        className="w-16 h-16 rounded-full border-4 border-white shadow-lg group-hover:ring-2 group-hover:ring-emerald-500 transition-all"
                        itemProp="image"
                      />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" aria-label="User is online"></div>
                      )}
                      {serviceUser?.emailVerified && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <BadgeCheck className="h-3 w-3 text-white" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-bold text-gray-900 text-lg group-hover:text-emerald-700 transition-colors" itemProp="name">
                          {serviceUser?.name}
                        </span>
                         
                      </div>
                      
                      {/* Enhanced User Details */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-gray-600">
                        {serviceUser?.occupation && (
                          <span className="flex items-center" itemProp="jobTitle">
                            <Briefcase className="h-4 w-4 mr-1" aria-hidden="true" />
                            {serviceUser.occupation}
                          </span>
                        )}
                        
                        {serviceUser?.country && (
                          <span className="flex items-center" itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                            <MapPin className="h-4 w-4 mr-1" aria-hidden="true" />
                            {serviceUser.city ? (
                              <>
                                <meta itemProp="addressLocality" content={serviceUser.city} />
                                <meta itemProp="addressCountry" content={serviceUser.country} />
                                {serviceUser.city}, {serviceUser.country}
                              </>
                            ) : (
                              <meta itemProp="addressCountry" content={serviceUser.country} />
                            )}
                          </span>
                        )}
                        
                        
                        {serviceUser?.education && (
                          <span className="flex items-center">
                            <GraduationCap className="h-4 w-4 mr-1" aria-hidden="true" />
                            {serviceUser.education}
                          </span>
                        )}
                        
                        {serviceUser?.languages && serviceUser.languages.length > 0 && (
                          <span className="flex items-center">
                            <Languages className="h-4 w-4 mr-1" aria-hidden="true" />
                            {serviceUser.languages.length} language{serviceUser.languages.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        
                        {serviceUser?.createdAt && (
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" aria-hidden="true" />
                            Member for {accountAge}
                          </span>
                        )}
                      </div>
                      
                      {/* User Stats */}
                      <div className="flex flex-wrap gap-4 mt-3">
                        {serviceUser?.completedOrders !== undefined && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span className="text-sm text-gray-600">
                              {serviceUser.completedOrders} completed order{serviceUser.completedOrders !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        
                        {serviceUser?.responseRate && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            <span className="text-sm text-gray-600">
                              {serviceUser.responseRate}% response rate
                            </span>
                          </div>
                        )}
                        
                        {serviceUser?.responseTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
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
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
                

                {/* Price & Delivery Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-100" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                        Starting Price
                      </h3>
                      <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                        {service.currency || 'USD'}
                      </span>
                    </div>
                    <div className="text-left">
                      <div className="text-3xl font-bold text-emerald-600 mb-1" itemProp="price" content={service.price}>
                        {formatPrice(service.price, service.currency)}
                      </div>
                      <p className="text-sm text-gray-500" itemProp="priceCurrency" content={service.currency || "USD"}>
                        Base price for this service
                      </p>
                      
                    </div>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" aria-hidden="true" />
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

                {/* Image Gallery */}
                <div className="mb-8">
                  {/* View Mode Toggle */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <ImageIcon className="h-6 w-6 text-emerald-600" aria-hidden="true" />
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
                          src={thumbnailImage?.url}
                          alt={`${service.title} - Featured thumbnail`}
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
                        {thumbnailImage?.width && thumbnailImage?.height && (
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
                            {thumbnailImage?.uploadedAt && (
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
                        This service doesn't have additional gallery images yet.
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
                    Service Description
                  </h2>
                  <div className="prose max-w-none">
                    <div className="bg-gray-50 rounded-xl p-6">
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed" itemProp="description">
                        {service.description}
                      </p>
                      {service.shortDescription && (
                        <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            <h3 className="font-medium text-gray-900">Short Description</h3>
                          </div>
                          <p className="text-gray-600">{service.shortDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Service Details */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                    Service Details
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Service Requirements */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                        Service Details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                          <span className="text-gray-600">Category</span>
                          <span className="font-semibold text-gray-900">{categoryName}</span>
                        </div>
                        {subcategoryName && (
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                            <span className="text-gray-600">Subcategory</span>
                            <span className="font-semibold text-gray-900">{subcategoryName}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                          <span className="text-gray-600">Revisions Included</span>
                          <span className="font-semibold text-gray-900">{service.revisions || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Service Timeline Details */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                        Timeline Details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                          <span className="text-gray-600">Created</span>
                          <time className="font-semibold text-gray-900" dateTime={service.createdAt}>
                            {timeAgo}
                          </time>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                          <span className="text-gray-600">Last Updated</span>
                          <time className="font-semibold text-gray-900" dateTime={service.updatedAt}>
                            {calculateTimeAgo(service.updatedAt)}
                          </time>
                        </div>
                        {service.expiresAt && (
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                            <span className="text-gray-600">Expires</span>
                            <time className="font-semibold text-gray-900" dateTime={service.expiresAt}>
                              {new Date(service.expiresAt).toLocaleDateString()}
                            </time>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                {service.features && service.features.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <CheckCircle className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                      What's Included
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="list">
                      {service.features.slice(0, 6).map((feature, index) => (
                        <div key={index} className="flex items-start bg-gray-50 p-4 rounded-xl" role="listitem">
                          <div className="flex-shrink-0 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center mr-3 mt-1">
                            <CheckCircle className="h-3 w-3 text-white" aria-hidden="true" />
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
                    {service.features.length > 6 && (
                      <div className="text-center mt-4">
                        <button className="text-emerald-600 hover:text-emerald-700 font-medium">
                          + {service.features.length - 6} more features
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {service.tags && service.tags.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Tag className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                      Service Tags
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {service.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
<div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
    <FileText className="h-5 w-5 text-gray-600" />
    Service Metadata
  </h4>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    {service.metaTitle && (
      <div>
        <span className="text-gray-500">Meta Title:</span>
        <p className="text-gray-800 font-medium">{service.metaTitle}</p>
      </div>
    )}
    {service.metaDescription && (
      <div>
        <span className="text-gray-500">Meta Description:</span>
        <p className="text-gray-800">{service.metaDescription}</p>
      </div>
    )}
    {service.searchKeywords && service.searchKeywords.length > 0 && (
      <div className="md:col-span-2">
        <span className="text-gray-500">Search Keywords:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {service.searchKeywords.map((keyword, index) => (
            <span key={index} className="px-2 py-1 bg-white text-gray-700 text-xs rounded border">
              {keyword}
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
</div>
                {/* Last Updated */}
                <footer className="pt-6 border-t border-gray-200">
                  <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        <time dateTime={service.createdAt}>
                          Posted {timeAgo}
                        </time> • 
                        <time dateTime={service.updatedAt}>
                          Last updated: {new Date(service.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </time>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Service ID: <code>{service._id}</code>
                      </p>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      {subcategoryName && (
                        <span className="flex items-center">
                          <ChevronRight className="h-4 w-4 mr-1" aria-hidden="true" />
                          {subcategoryName}
                        </span>
                      )}
                    </div>
                  </div>
                </footer>
              </article>
            </div>

            {/* Right Column - Service Info & Actions */}
            <aside className="lg:col-span-1">
              <div className=" top-8 space-y-8">

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
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
  <h3 className="text-xl font-bold text-gray-900 mb-6">Additional Details</h3>
  <div className="space-y-5">
    {/* Delivery Speed */}
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
      <span className="text-gray-600">Delivery Speed</span>
      <span className="font-semibold text-gray-900">
        {getDeliverySpeed(service.deliveryTime, service.deliveryTimeUnit)}
      </span>
    </div>
    
    {/* Revisions Details */}
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
      <span className="text-gray-600">Revisions Policy</span>
      <span className="font-semibold text-gray-900">
        {formatRevisions(service.revisions)}
      </span>
    </div>
    
    {/* Service Rating */}
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
      <span className="text-gray-600">Service Rating</span>
      <div className="flex items-center">
        {renderStars(service.rating || 0)}
        {service.reviewsCount > 0 && (
          <span className="ml-2 text-sm text-gray-500">
            ({service.reviewsCount})
          </span>
        )}
      </div>
    </div>
    
    {/* Views */}
    {service.views !== undefined && (
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span className="text-gray-600 flex items-center">
          <Eye className="h-4 w-4 mr-2" />
          Views
        </span>
        <span className="font-semibold text-gray-900">
          {service.views.toLocaleString()}
        </span>
      </div>
    )}
    
    {/* Likes */}
    {service.likes !== undefined && (
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span className="text-gray-600 flex items-center">
          <Heart className="h-4 w-4 mr-2" />
          Likes
        </span>
        <span className="font-semibold text-gray-900">
          {service.likes.toLocaleString()}
        </span>
      </div>
    )}
    
    {/* Version */}
    {service.version !== undefined && (
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span className="text-gray-600">Version</span>
        <span className="font-semibold text-gray-900">v{service.version}</span>
      </div>
    )}
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
                          <div>
                            <span className="font-semibold text-gray-900 block" itemProp="serviceType">{categoryName}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {subcategoryName && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Subcategory</h4>
                        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                          <Layers className="h-5 w-5 text-blue-600 mr-3" aria-hidden="true" />
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
                              <Tag className="inline h-3 w-3 mr-1" aria-hidden="true" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced User Information Card */}
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Provider Profile</h3>
                  <div className="space-y-4">
                    <Link 
                      to={`/profile/${serviceUser?._id}`}
                      className="flex items-center space-x-3 group cursor-pointer p-3 hover:bg-gray-50 rounded-lg transition-colors"
                      aria-label={`View ${serviceUser?.name || 'Provider'}'s profile`}
                    >
                      <div className="relative">
                        <img
                          src={serviceUser?.picture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'}
                          alt={serviceUser?.name || 'Provider'}
                          className="w-12 h-12 rounded-full border-2 border-white group-hover:border-emerald-100 transition-colors"
                        />
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white" aria-label="User is online"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {serviceUser?.name}
                        </h4>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          View Profile
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </p>
                      </div>
                    </Link>

                    {/* User Details Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {serviceUser?.country && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <MapPin className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
                          <div className="truncate">
                            <h4 className="text-xs text-gray-500">Location</h4>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {serviceUser.country}
                            </p>
                          </div>
                        </div>
                      )}

                      {serviceUser?.occupation && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <Briefcase className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
                          <div className="truncate">
                            <h4 className="text-xs text-gray-500">Occupation</h4>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {serviceUser.occupation}
                            </p>
                          </div>
                        </div>
                      )}

                      {serviceUser?.rating && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
                          <div>
                            <h4 className="text-xs text-gray-500">Rating</h4>
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" aria-hidden="true" />
                              <span className="text-sm font-medium text-gray-900 ml-1">
                                {serviceUser.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {serviceUser?.completedOrders !== undefined && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <Activity className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
                          <div>
                            <h4 className="text-xs text-gray-500">Completed</h4>
                            <p className="text-sm font-medium text-gray-900">
                              {serviceUser.completedOrders}
                            </p>
                          </div>
                        </div>
                      )}

                      {serviceUser?.accountType && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <Award className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
                          <div>
                            <h4 className="text-xs text-gray-500">Account Type</h4>
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {serviceUser.accountType}
                            </p>
                          </div>
                        </div>
                      )}

                      {serviceUser?.languages && serviceUser.languages.length > 0 && (
                        <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <Languages className="h-4 w-4 text-gray-600 mr-2" aria-hidden="true" />
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
                    <button className="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-colors font-medium flex items-center justify-center gap-2">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      Contact Provider
                    </button>
                  </div>
                </div>

                {/* Safety Tips */}
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                    Safety & Trust
                  </h3>
                  <div className="space-y-4">
                    {SAFETY_ITEMS.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3">
                            <Icon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
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
            </aside>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default ServiceDetails;