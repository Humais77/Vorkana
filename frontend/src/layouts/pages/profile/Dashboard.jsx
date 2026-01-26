import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
  useMyGigs, 
  useDeleteMultipleGigs, 
  useUpdateMultipleGigsStatus,
  extractGigsFromResponse,
  gigKeys
} from '../../../hooks/useGigs';
import { useMyServices, useDeleteService, serviceKeys, extractServicesFromResponse } from '../../../hooks/useServices';
import { useGetProfile } from '../../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { isProfileCompleteEnough, calculateProfileCompletion, getProfileSuggestions } from '../../../utils/profileUtils';
import {
  Plus,
  Sparkles,
  Zap,
  Target,
  Rocket,
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
  Info,
  HelpCircle,
  Image,
  Eye,
  Clock,
  MapPin
} from 'lucide-react';
import { useServiceToast } from '../../../hooks/useServiceToast';
import { useGigToast } from '../../../hooks/useGigToast';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SeoWrapper } from '../../../components/SeoWrapper'; // Add this import

// ImageWithFallback component
const ImageWithFallback = memo(({ src, alt, className, fallback = null, type, itemId, forceRefresh }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imgSrc, setImgSrc] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  const validateUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return null;
    
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return null;
    
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('/')) {
      if (trimmedUrl === 'http://' || trimmedUrl === 'https://' || trimmedUrl === '/') {
        return null;
      }
      return trimmedUrl;
    }
    
    if (trimmedUrl.startsWith('data:')) {
      return trimmedUrl;
    }
    
    return null;
  }, []);

  const getCacheBustedUrl = useCallback((url) => {
    const validUrl = validateUrl(url);
    if (!validUrl) return null;
    
    try {
      if (validUrl.startsWith('data:')) {
        return validUrl;
      }
      
      const urlObj = new URL(validUrl, window.location.origin);
      const cleanUrl = urlObj.origin + urlObj.pathname;
      const separator = urlObj.search ? '&' : '?';
      
      const params = new URLSearchParams(urlObj.search);
      params.set('_t', Date.now().toString());
      params.set('v', forceRefresh || Date.now());
      params.set('rc', retryCount.toString());
      params.set('type', type || 'item');
      
      if (itemId) {
        params.set('id', itemId.slice(-8));
      }
      
      return `${cleanUrl}${separator}${params.toString()}`;
    } catch (error) {
      console.warn('Error processing URL:', validUrl, error);
      return validUrl;
    }
  }, [validateUrl, type, itemId, forceRefresh, retryCount]);

  const loadImage = useCallback(() => {
    const validUrl = validateUrl(src);
    if (!validUrl) {
      setError(true);
      setLoading(false);
      setImgSrc(null);
      return;
    }

    const finalSrc = getCacheBustedUrl(validUrl);
    if (!finalSrc) {
      setError(true);
      setLoading(false);
      setImgSrc(null);
      return;
    }

    setLoading(true);
    setError(false);
    setImgSrc(finalSrc);
  }, [src, getCacheBustedUrl, validateUrl]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setTimeout(() => loadImage(), 500 * (retryCount + 1));
    } else {
      setError(true);
      setLoading(false);
    }
  }, [retryCount, loadImage]);

  useEffect(() => {
    if (forceRefresh) {
      setRetryCount(0);
      loadImage();
    }
  }, [forceRefresh, loadImage]);

  if (!src || !validateUrl(src)) {
    return fallback || (
      <div className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <span className="text-xs text-gray-500 font-medium">
            {type === 'service' ? 'Service' : 'Gig'} Image
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return fallback || (
      <div className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <span className="text-xs text-gray-500 font-medium">
            Image failed to load
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className={`absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse ${className}`} />
      )}
      
      {imgSrc && (
        <img
          src={imgSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          key={`${itemId}-${forceRefresh || Date.now()}`}
        />
      )}
    </div>
  );
});
ImageWithFallback.displayName = 'ImageWithFallback';

// StatsCard component
const StatsCard = memo(({ title, value, subValue, icon: Icon, colorClass, onClick }) => (
  <motion.div 
    whileHover={{ y: -4, scale: 1.02 }}
    className={`bg-white rounded-2xl border border-gray-200 p-6 ${onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-md transition-all duration-300' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <Icon className={`w-5 h-5 ${colorClass.includes('blue') ? 'text-blue-600' : colorClass.includes('green') ? 'text-green-600' : 'text-gray-600'} mr-2`} />
        <span className="text-sm font-medium text-gray-900">{title}</span>
      </div>
      {onClick && (
        <ArrowRight className="w-4 h-4 text-gray-400" />
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    <div className="flex items-center mt-1">
      <span className={`text-xs ${colorClass.includes('blue') ? 'text-blue-600' : colorClass.includes('green') ? 'text-green-600' : 'text-gray-600'}`}>
        {subValue}
      </span>
    </div>
  </motion.div>
));
StatsCard.displayName = 'StatsCard';

// Helper functions
const getThumbnailUrl = (item, type) => {
  if (!item) return null;
  
  const extractUrl = (value) => {
    if (!value) return null;
    
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/') || trimmed.startsWith('data:'))) {
        if (trimmed === 'http://' || trimmed === 'https://' || trimmed === '/') {
          return null;
        }
        return trimmed;
      }
      return null;
    }
    
    if (value && typeof value === 'object' && value.url) {
      return extractUrl(value.url);
    }
    
    return null;
  };
  
  if (item.thumbnail) {
    const url = extractUrl(item.thumbnail);
    if (url) return url;
  }
  
  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    const thumbnailImage = item.images.find(img => img.isThumbnail === true);
    if (thumbnailImage) {
      const url = extractUrl(thumbnailImage);
      if (url) return url;
    }
    
    const firstImage = item.images[0];
    const url = extractUrl(firstImage);
    if (url) return url;
  }
  
  if (item.data?.thumbnail) {
    const url = extractUrl(item.data.thumbnail);
    if (url) return url;
  }
  
  if (item.data?.images?.[0]) {
    const url = extractUrl(item.data.images[0]);
    if (url) return url;
  }
  
  if (item.service?.thumbnail) {
    const url = extractUrl(item.service.thumbnail);
    if (url) return url;
  }
  
  if (item.gig?.thumbnail) {
    const url = extractUrl(item.gig.thumbnail);
    if (url) return url;
  }
  
  if (item.image) {
    const url = extractUrl(item.image);
    if (url) return url;
  }
  
  if (type === 'gig') {
    if (item.gigImages?.[0]) {
      const url = extractUrl(item.gigImages[0]);
      if (url) return url;
    }
  }
  
  if (type === 'service') {
    if (item.serviceImages?.[0]) {
      const url = extractUrl(item.serviceImages[0]);
      if (url) return url;
    }
  }
  
  return null;
};

const getDurationInfo = (item, type) => {
  if (!item) return null;
  
  if (type === 'service') {
    return item.deliveryTime || item.duration || item.estimatedTime || 'Not specified';
  } else {
    return item.duration || item.timeline || item.estimatedDuration || 'Not specified';
  }
};

const getPriceInfo = (item, type) => {
  if (!item) return 0;
  
  if (type === 'service') {
    return item.price || item.startingPrice || item.basePrice || 0;
  } else {
    return item.budget || item.price || item.estimatedBudget || 0;
  }
};

const getRatingInfo = (item) => {
  if (!item) return null;
  
  const rating = item.rating || item.averageRating || item.avgRating || 
                item.reviewRating || item.overallRating || 
                item.data?.rating || item.data?.averageRating;
  
  if (rating !== undefined && rating !== null) {
    const numRating = parseFloat(rating);
    return isNaN(numRating) ? null : numRating;
  }
  
  return null;
};

const getReviewsCount = (item) => {
  if (!item) return 0;
  
  const count = item.reviewsCount || item.totalReviews || item.reviews || 
                item.data?.reviewsCount || item.data?.totalReviews;
  
  return parseInt(count) || 0;
};

const getCategoryName = (item) => {
  if (!item) return 'Uncategorized';
  
  if (item.category?.name) return item.category.name;
  if (item.category && typeof item.category === 'string') return item.category;
  
  if (item.subcategory?.name) return item.subcategory.name;
  if (item.subcategory && typeof item.subcategory === 'string') return item.subcategory;
  
  if (item.projectCategory?.name) return item.projectCategory.name;
  
  if (item.data?.category?.name) return item.data.category.name;
  if (item.data?.subcategory?.name) return item.data.subcategory.name;
  
  return 'Uncategorized';
};

const getViewsCount = (item) => {
  if (!item) return 0;
  
  return item.views || item.impressions || item.viewCount || 
         item.data?.views || item.data?.viewCount || 0;
};

const getDescription = (item) => {
  if (!item) return 'No description available';
  
  return item.shortDescription || item.description || item.overview || 
         item.summary || item.data?.description || 'No description available';
};

const getTitle = (item, type) => {
  if (!item) return `Untitled ${type === 'service' ? 'Service' : 'Gig'}`;
  
  return item.title || item.name || item.data?.title || 
         item.data?.name || `Untitled ${type === 'service' ? 'Service' : 'Gig'}`;
};

// DeleteConfirmationDialog component
const DeleteConfirmationDialog = memo(({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  count,
  isLoading,
  itemName,
  isDeleting
}) => {
  const [confirmText, setConfirmText] = useState('');
  const requiresTyping = count >= 3;

  const isGig = itemType === 'gig';
  const itemLabel = isGig ? 'gig' : 'service';
  const pluralItemLabel = `${itemLabel}${count > 1 ? 's' : ''}`;
  
  const handleConfirm = () => {
    if (requiresTyping) {
      const expectedText = count > 1 ? `delete ${count} ${itemLabel}s` : `delete ${itemLabel}`;
      if (confirmText.toLowerCase() !== expectedText.toLowerCase()) {
        toast.error(`Please type "${expectedText}" to confirm`);
        return;
      }
    }
    onConfirm();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={isLoading || isDeleting ? () => {} : onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-bold text-gray-900 flex items-center gap-2"
                >
                  <Trash2 className={`w-5 h-5 ${isGig ? 'text-red-500' : 'text-red-500'}`} />
                  Delete {count > 1 ? `${count} ${pluralItemLabel}` : itemLabel}
                </Dialog.Title>
                
                <div className="mt-4">
                  <p className="text-gray-700 mb-4">
                    {count > 1 ? (
                      <>
                        You are about to delete <span className="font-bold text-red-600">{count} ${pluralItemLabel}</span>.
                        This action cannot be undone.
                      </>
                    ) : (
                      <>
                        You are about to delete {itemName ? (
                          <span className="font-bold text-gray-900">"{itemName}"</span>
                        ) : (
                          <span className="font-bold text-red-600">this ${itemLabel}</span>
                        )}.
                        This action cannot be undone.
                      </>
                    )}
                  </p>
                  
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-700">
                        If an item was already deleted by another user, it will be skipped automatically.
                      </p>
                    </div>
                  </div>
                  
                  {requiresTyping && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type <span className="font-mono text-red-600">delete ${count > 1 ? `${count} ${itemLabel}s` : itemLabel}</span> to confirm:
                      </label>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Type the confirmation text..."
                        autoComplete="off"
                        disabled={isLoading || isDeleting}
                      />
                    </div>
                  )}
                  
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Warning: This action is permanent</p>
                        <p className="text-sm text-red-700 mt-1">
                          All associated data, images, and history will be permanently removed.
                          {count > 1 && ' This may affect your account statistics and visibility.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading || isDeleting}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading || isDeleting || (requiresTyping && confirmText.toLowerCase() !== `delete ${count > 1 ? `${count} ${itemLabel}s` : itemLabel}`.toLowerCase())}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
                  >
                    {(isLoading || isDeleting) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete {count > 1 ? `All (${count})` : 'Permanently'}
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});
DeleteConfirmationDialog.displayName = 'DeleteConfirmationDialog';

// ItemCard component
const ItemCard = memo(({ 
  item, 
  type, 
  isSelected, 
  onSelect, 
  onClick, 
  getStatusColor, 
  getStatusIcon,
  imageRefreshKey,
  onDelete 
}) => {
  const isService = type === 'services';
  const primaryColor = isService ? 'blue' : 'green';
  const itemType = isService ? 'service' : 'gig';
  
  const thumbnailUrl = getThumbnailUrl(item, itemType);
  const duration = getDurationInfo(item, itemType);
  const price = getPriceInfo(item, itemType);
  const rating = getRatingInfo(item);
  const reviewsCount = getReviewsCount(item);
  const category = getCategoryName(item);
  const views = getViewsCount(item);
  const description = getDescription(item);
  const title = getTitle(item, itemType);
  const createdDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col h-full"
    >
      <div 
        className="relative h-48 bg-gray-100 cursor-pointer overflow-hidden"
        onClick={() => onClick(item._id || item.id)}
      >
        <ImageWithFallback
          src={thumbnailUrl} 
          alt={title}
          className="w-full h-full"
          type={itemType}
          itemId={item._id || item.id}
          forceRefresh={imageRefreshKey}
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <div className="text-center p-4">
                <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <span className="text-sm text-gray-500 font-medium">
                  {isService ? 'Service' : 'Gig'} Image
                </span>
              </div>
            </div>
          }
        />
        
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
            {getStatusIcon(item.status)}
            <span className="ml-1">
              {item.status ? 
                item.status.charAt(0).toUpperCase() + item.status.slice(1) 
                : 'Draft'
              }
            </span>
          </span>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item._id || item.id);
          }}
          className="absolute top-3 right-12 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md hover:shadow-lg transition-shadow z-10"
        >
          {isSelected ? (
            <CheckSquare className={`w-5 h-5 text-${primaryColor}-600`} />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item._id || item.id, title);
          }}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md hover:shadow-lg hover:bg-red-50 hover:text-red-600 transition-all z-10 group/delete"
          title={`Delete ${itemType}`}
        >
          <Trash2 className="w-5 h-5 text-gray-500 group-hover/delete:text-red-600 transition-colors" />
        </button>
        
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center">
            <Eye className="w-4 h-4 text-gray-700 mr-2" />
            <span className="text-sm font-medium text-gray-900">View Details</span>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-3 flex-shrink-0">
          <div 
            className="flex items-start justify-between mb-1 cursor-pointer"
            onClick={() => onClick(item._id || item.id)}
          >
            <h4 className={`font-bold text-gray-900 hover:text-${primaryColor}-600 transition-colors line-clamp-2 flex-1 pr-2 text-base`}>
              {title}
            </h4>
            <ExternalLink className={`w-4 h-4 text-gray-400 hover:text-${primaryColor}-600 transition-colors flex-shrink-0 mt-1`} />
          </div>
          
          <div className="flex items-center min-w-0">
            <Tag className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">
              {category}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-shrink-0 min-h-[2.5rem]">
          {description}
        </p>

        <div className="space-y-2 mb-4 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 text-gray-600 mr-1 flex-shrink-0" />
              <span className="text-xs text-gray-700">Price</span>
            </div>
            <span className="font-bold text-gray-900">
              ${typeof price === 'number' ? price.toLocaleString() : price}
            </span>
          </div>

          {rating !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-500 mr-1 flex-shrink-0" />
                <span className="text-xs text-gray-700">Rating</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium text-gray-900 mr-1">{rating.toFixed(1)}</span>
                <span className="text-xs text-gray-500">
                  ({reviewsCount} reviews)
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-gray-600 mr-1 flex-shrink-0" />
              <span className="text-xs text-gray-700">{isService ? 'Delivery' : 'Duration'}</span>
            </div>
            <span className="text-xs font-medium text-gray-900 truncate max-w-[120px]">
              {duration}
            </span>
          </div>
        </div>

        {views > 0 && (
          <div className="flex items-center text-xs text-gray-500 mb-3 flex-shrink-0">
            <Eye className="w-3 h-3 mr-1" />
            <span>{views.toLocaleString()} views</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto flex-shrink-0">
          <div className="flex items-center">
            <span className="text-xs text-gray-500">
              Created {createdDate}
            </span>
          </div>
          <button
            onClick={() => onClick(item._id || item.id)}
            className={`inline-flex items-center px-3 py-1.5 text-sm bg-${primaryColor}-50 text-${primaryColor}-700 rounded-lg font-medium hover:bg-${primaryColor}-100 transition-colors flex-shrink-0`}
          >
            View Details
          </button>
        </div>
      </div>
    </motion.div>
  );
});
ItemCard.displayName = 'ItemCard';

// NoActiveGigs component
const NoActiveGigs = memo(({ onCreateGig, canCreateContent }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="bg-white rounded-2xl border border-gray-200 p-8 text-center mb-8"
  >
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <FileText className="w-8 h-8 text-gray-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Gigs Yet</h3>
    <p className="text-gray-600 mb-6 max-w-md mx-auto">
      Active gigs are those with "open" or "active" status. Start creating gigs to attract clients and grow your business.
    </p>
    <button
      onClick={onCreateGig}
      disabled={!canCreateContent}
      className={`inline-flex items-center px-5 py-3 rounded-lg font-medium ${
        canCreateContent 
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:opacity-90'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      } transition-opacity`}
      title={!canCreateContent ? "Complete your profile to create gigs" : ""}
    >
      <Plus className="w-5 h-5 mr-2" />
      Create Your First Gig
    </button>
  </motion.div>
));
NoActiveGigs.displayName = 'NoActiveGigs';

// ProfileWarningBanner component
const ProfileWarningBanner = memo(({ profileCompletion, profileSuggestions, onCompleteProfile, isLoading }) => {
  if (isLoading) return null;
  if (profileCompletion >= 70) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-gray-100 p-3 rounded-full">
            <Shield className="w-8 h-8 text-gray-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Complete Your Profile to Start Creating
            </h3>
            <p className="text-gray-700 mb-3">
              Your profile is {profileCompletion}% complete. You need at least 70% completion to create gigs and services.
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                  <span>Profile Progress</span>
                  <span className="font-bold">{profileCompletion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-gray-900 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
              {profileSuggestions.length > 0 && (
                <div>
                  <p className="text-sm text-gray-700 font-medium mb-1">Suggested improvements:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {profileSuggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-center">
                        <ArrowRight className="w-3 h-3 text-gray-500 mr-2 flex-shrink-0" />
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
          className="px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition-colors whitespace-nowrap flex-shrink-0"
        >
          Complete Profile Now
        </button>
      </div>
    </motion.div>
  );
});
ProfileWarningBanner.displayName = 'ProfileWarningBanner';

// ProfileInfoBar component
const ProfileInfoBar = memo(({ profileCompletion, canCreateContent, onImproveProfile, isLoading }) => {
  if (isLoading) return null;

  const statusColor = useMemo(() => {
    if (profileCompletion >= 80) return 'bg-green-100 text-green-800';
    if (profileCompletion >= 70) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  }, [profileCompletion]);

  const statusIcon = useMemo(() => 
    canCreateContent ? CheckCircle : AlertCircle
  , [canCreateContent]);

  const statusText = useMemo(() => 
    canCreateContent ? 'Ready to Create Content' : 'Complete Profile Required'
  , [canCreateContent]);

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-4">
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
                  className="bg-gray-900 h-2 rounded-full transition-all duration-500"
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
        {!canCreateContent && (
          <button
            onClick={onImproveProfile}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-black transition-colors flex-shrink-0"
          >
            Improve Profile
          </button>
        )}
      </div>
    </div>
  );
});
ProfileInfoBar.displayName = 'ProfileInfoBar';

// DashboardSkeleton component
const DashboardSkeleton = memo(() => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your services, gigs, and track your performance</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6 animate-pulse"></div>
        <div className="h-12 bg-gray-200 rounded w-full mb-6 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-200 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
));
DashboardSkeleton.displayName = 'DashboardSkeleton';

// BulkActionsBar component
const BulkActionsBar = memo(({ 
  activeTab, 
  selectedCount, 
  onUpdateStatus, 
  onDelete,
  isUpdating,
  isDeleting
}) => {
  if (!selectedCount) return null;

  const isGigs = activeTab === 'gigs';
  const primaryColor = isGigs ? 'green' : 'blue';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={`bg-${primaryColor}-50 rounded-xl border border-${primaryColor}-200 p-4 mb-6`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <CheckSquare className={`w-5 h-5 text-${primaryColor}-600 mr-2 flex-shrink-0`} />
          <span className={`font-medium text-${primaryColor}-900`}>
            {selectedCount} ${activeTab === 'services' ? 'service(s)' : 'gig(s)'} selected
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onUpdateStatus('active')}
            disabled={isUpdating || isDeleting}
            className={`px-4 py-2 bg-${primaryColor}-600 text-white rounded-lg font-medium hover:bg-${primaryColor}-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
          >
            {isUpdating ? 'Updating...' : 'Make Active'}
          </button>
          <button
            onClick={() => onUpdateStatus('paused')}
            disabled={isUpdating || isDeleting}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isUpdating ? 'Updating...' : 'Pause'}
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting || isUpdating}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2 flex-shrink-0" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
});
BulkActionsBar.displayName = 'BulkActionsBar';

// EmptyState component
const EmptyState = memo(({ 
  type, 
  filter, 
  onCreate, 
  icon: Icon, 
  createButtonText,
  primaryColor
}) => {
  const getTitle = useCallback(() => {
    if (filter === 'all') return `No ${type} found`;
    return `No ${type} with status "${filter}" found`;
  }, [type, filter]);

  const getDescription = useCallback(() => {
    if (filter === 'all') return `You haven't created any ${type} yet`;
    return `You don't have any ${type} with this status`;
  }, [type, filter]);

  const colorClass = primaryColor === 'blue' 
    ? 'from-blue-600 to-blue-700' 
    : 'from-green-600 to-emerald-600';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
    >
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{getTitle()}</h3>
        <p className="text-gray-600 mb-6">{getDescription()}</p>
        <button
          onClick={onCreate}
          className={`inline-flex items-center px-5 py-3 bg-gradient-to-r ${colorClass} text-white rounded-lg font-medium hover:opacity-90 transition-opacity`}
        >
          <Plus className="w-5 h-5 mr-2" />
          {createButtonText}
        </button>
      </div>
    </motion.div>
  );
});
EmptyState.displayName = 'EmptyState';

// ListView component
const ListView = memo(({ 
  items, 
  type, 
  selectedIds, 
  onSelect, 
  onClick, 
  getStatusColor, 
  getStatusIcon, 
  imageRefreshKey,
  onDelete
}) => {
  const isService = type === 'services';
  const primaryColor = isService ? 'blue' : 'green';
  const itemType = isService ? 'service' : 'gig';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-4 px-6 text-left w-12">
                <span className="sr-only">Select</span>
              </th>
              <th className="py-4 px-6 text-left w-16">
                <span className="sr-only">Image</span>
              </th>
              <th className="py-4 px-6 text-left min-w-[200px]">
                <span className="text-sm font-semibold text-gray-700">{type === 'services' ? 'Service' : 'Gig'}</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700">Status</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700">{type === 'services' ? 'Price' : 'Budget'}</span>
              </th>
              <th className="py-4 px-6 text-left">
                <span className="text-sm font-semibold text-gray-700">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => {
              const thumbnailUrl = getThumbnailUrl(item, itemType);
              const views = getViewsCount(item);
              const price = getPriceInfo(item, itemType);
              const title = getTitle(item, itemType);
              const category = getCategoryName(item);
              const description = getDescription(item);
              
              return (
                <motion.tr
                  key={item._id || item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ backgroundColor: 'rgba(243, 244, 246, 0.5)' }}
                  className="transition-colors"
                >
                  <td className="py-4 px-6">
                    <button
                      onClick={() => onSelect(item._id || item.id)}
                      className="flex-shrink-0"
                    >
                      {selectedIds.includes(item._id || item.id) ? (
                        <CheckSquare className={`w-5 h-5 text-${primaryColor}-600`} />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <div 
                      className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer bg-gray-100"
                      onClick={() => onClick(item._id || item.id)}
                    >
                      <ImageWithFallback
                        src={thumbnailUrl}
                        alt={title}
                        className="w-full h-full"
                        type={itemType}
                        itemId={item._id || item.id}
                        forceRefresh={imageRefreshKey}
                        fallback={
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-gray-400" />
                          </div>
                        }
                      />
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div 
                      className="cursor-pointer min-w-0"
                      onClick={() => onClick(item._id || item.id)}
                    >
                      <h4 className={`font-medium text-gray-900 hover:text-${primaryColor}-600 truncate max-w-[200px]`}>
                        {title}
                      </h4>
                      <div className="flex items-center mt-1">
                        <Tag className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate max-w-[180px]">
                          {category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-[200px]">
                        {description}
                      </p>
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
                      <span className="font-medium text-gray-900">
                        ${typeof price === 'number' ? price.toLocaleString() : price}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onClick(item._id || item.id)}
                        className={`p-2 text-gray-600 hover:text-${primaryColor}-600 hover:bg-${primaryColor}-50 rounded-lg transition-colors`}
                        title="View Details"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <Link
                        to={isService ? `/services/edit/${item._id || item.id}` : `/gig/edit/${item._id || item.id}`}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => onDelete(item._id || item.id, title)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors group/delete"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 group-hover/delete:text-red-600" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
});
ListView.displayName = 'ListView';

// Main Dashboard Component
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const prevStatsRef = useRef(null);
  const lastActionRef = useRef(null);
  
  const { 
    showServiceDeleteSuccess, 
    showServiceDeleteError,
    showServiceLoading,
    dismissServiceToast,
    showServiceInfo
  } = useServiceToast();
  
  const { 
    showGigDeleteSuccess, 
    showGigDeleteError,
    showGigLoading,
    dismissGigToast,
    showGigSuccess,
    showGigError
  } = useGigToast();
  
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    type: null,
    ids: [],
    itemName: '',
    isLoading: false
  });
  const [immediateUpdates, setImmediateUpdates] = useState({
    services: { created: [], deleted: [], updated: [] },
    gigs: { created: [], deleted: [], updated: [] }
  });
  const { 
    data: profileResponse, 
    isLoading: isProfileLoading,
    refetch: refetchProfile,
    isError: profileError 
  } = useGetProfile();
  
  const user = useMemo(() => {
    return profileResponse?.user || authUser;
  }, [profileResponse, authUser]);

  const [selectedGigs, setSelectedGigs] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [allServicesSelected, setAllServicesSelected] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('services');
  const [viewMode, setViewMode] = useState('grid');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());
  const [forceRefreshTrigger, setForceRefreshTrigger] = useState(0);

  // Profile calculations
  const profileCompletion = useMemo(() => {
    if (!user || isProfileLoading) return 0;
    return calculateProfileCompletion(user);
  }, [user, isProfileLoading]);

  const canCreateContent = useMemo(() => {
    if (!user || isProfileLoading) return false;
    return isProfileCompleteEnough(user, 70);
  }, [user, isProfileLoading]);

  const profileSuggestions = useMemo(() => {
    if (!user || isProfileLoading) return [];
    return getProfileSuggestions(user);
  }, [user, isProfileLoading]);

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

  const gigs = useMemo(() => 
    extractGigsFromResponse(gigsResponse) || [], 
    [gigsResponse]
  );

  // Mutations
  const deleteMultipleGigsMutation = useDeleteMultipleGigs();
  const updateMultipleGigsStatusMutation = useUpdateMultipleGigsStatus();
  const deleteServiceMutation = useDeleteService();

  useEffect(() => {
    if (services && gigs && (immediateUpdates.services.deleted.length > 0 || immediateUpdates.gigs.deleted.length > 0)) {
      // After successful refetch, clear the immediate updates
      setImmediateUpdates({
        services: { created: [], deleted: [], updated: [] },
        gigs: { created: [], deleted: [], updated: [] }
      });
    }
  }, [services, gigs]);

  const stats = useMemo(() => {
    if (servicesLoading || gigsLoading) {
      return prevStatsRef.current || {
        totalGigs: 0,
        activeGigs: 0,
        totalServices: 0,
        activeServices: 0,
      };
    }
    
    // Filter out immediately deleted items
    const filteredServices = services.filter(service => 
      !immediateUpdates.services.deleted.includes(service._id)
    );
    const filteredGigs = gigs.filter(gig => 
      !immediateUpdates.gigs.deleted.includes(gig._id)
    );
    
    // Add immediately created items
    const allServices = [...filteredServices, ...immediateUpdates.services.created];
    const allGigs = [...filteredGigs, ...immediateUpdates.gigs.created];
    
    const activeServices = allServices.filter(s => s.status === 'active').length;
    const activeGigs = allGigs.filter(g => g.status === 'active' || g.status === 'open').length;
    
    const newStats = {
      totalGigs: allGigs.length,
      activeGigs: activeGigs,
      totalServices: allServices.length,
      activeServices: activeServices,
    };
    
    prevStatsRef.current = newStats;
    
    return newStats;
  }, [gigs, services, servicesLoading, gigsLoading, immediateUpdates]);

  const performOptimisticDelete = useCallback((ids, type) => {
    const itemType = type === 'gig' ? 'gigs' : 'services';
    const currentItems = itemType === 'gigs' ? gigs : services;
    
    if (!currentItems) return;
    
    // Add to immediate deletions
    setImmediateUpdates(prev => ({
      ...prev,
      [itemType]: {
        ...prev[itemType],
        deleted: [...prev[itemType].deleted, ...ids]
      }
    }));
    
    // Update the cache immediately
    const queryKey = itemType === 'gigs' ? gigKeys.myGigs() : serviceKeys.myServices();
    
    queryClient.setQueryData(queryKey, (old) => {
      if (!old) return old;
      
      const oldItems = extractItemsFromResponse(old, itemType);
      const filteredItems = oldItems.filter(item => !ids.includes(item._id || item.id));
      
      return {
        ...old,
        data: filteredItems,
        [itemType]: filteredItems,
        success: old.success !== undefined ? old.success : true
      };
    });
    
    // Also update the filtered lists
    if (itemType === 'gigs') {
      setSelectedGigs(prev => prev.filter(id => !ids.includes(id)));
      setAllSelected(false);
    } else {
      setSelectedServices(prev => prev.filter(id => !ids.includes(id)));
      setAllServicesSelected(false);
    }
    
    lastActionRef.current = {
      action: 'delete',
      type: itemType,
      ids,
      timestamp: Date.now()
    };
  }, [gigs, services, queryClient]);
  
  // Optimistic creation function
  const performOptimisticCreate = useCallback((item, type) => {
    const itemType = type === 'gig' ? 'gigs' : 'services';
    
    // Add to immediate creations
    setImmediateUpdates(prev => ({
      ...prev,
      [itemType]: {
        ...prev[itemType],
        created: [...prev[itemType].created, item]
      }
    }));
    
    // Update the cache immediately
    const queryKey = itemType === 'gigs' ? gigKeys.myGigs() : serviceKeys.myServices();
    
    queryClient.setQueryData(queryKey, (old) => {
      const oldItems = extractItemsFromResponse(old, itemType);
      const newItems = [item, ...oldItems];
      
      return {
        ...old,
        data: newItems,
        [itemType]: newItems,
        success: old.success !== undefined ? old.success : true
      };
    });
    
    lastActionRef.current = {
      action: 'create',
      type: itemType,
      id: item._id,
      timestamp: Date.now()
    };
  }, [queryClient]);
  
  // Helper function to extract items from response
  const extractItemsFromResponse = (response, type) => {
    if (!response) return [];
    
    if (type === 'gigs') {
      return extractGigsFromResponse(response);
    } else {
      return extractServicesFromResponse(response);
    }
  };
  
  // Reset selection
  const resetSelection = useCallback(() => {
    setSelectedGigs([]);
    setSelectedServices([]);
    setAllSelected(false);
    setAllServicesSelected(false);
  }, []);

  useEffect(() => {
    if (!isProfileLoading && user) {
      setInitialLoadComplete(true);
    }
  }, [isProfileLoading, user]);

  useEffect(() => {
    resetSelection();
  }, [gigs, services, resetSelection]);

  useEffect(() => {
    console.log('Current active tab:', activeTab);
    console.log('Selected gigs:', selectedGigs);
    console.log('Selected services:', selectedServices);
    console.log('Delete dialog:', deleteDialog);
  }, [activeTab, selectedGigs, selectedServices, deleteDialog]);

  const handleCreateService = useCallback(() => {
    if (!canCreateContent) {
      toast.error('Complete your profile to create services');
      return;
    }
    
    sessionStorage.setItem('preCreateStats', JSON.stringify(stats));
    navigate('/services/create');
  }, [canCreateContent, navigate, stats]);

  const handleCreateGig = useCallback(() => {
    if (!canCreateContent) {
      toast.error('Complete your profile to create gigs');
      return;
    }
    
    sessionStorage.setItem('preCreateStats', JSON.stringify(stats));
    navigate('/gig/create', { state: { from: 'dashboard' } });
  }, [canCreateContent, navigate, stats]);

  const handleCompleteProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

  const handleServiceClick = useCallback((serviceId) => {
    navigate(`/services/${serviceId}`, { state: { from: 'dashboard' } });
  }, [navigate]);

  const handleGigClick = useCallback((gigId) => {
    navigate(`/gig/${gigId}`, { state: { from: 'dashboard' } });
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

  const handleSingleDelete = useCallback((id, name, type) => {
    console.log('Single delete called:', { id, name, type, activeTab });
    
    let deleteType = type;
    if (!deleteType) {
      deleteType = activeTab === 'gigs' ? 'gig' : 'service';
    }
    
    console.log('Determined delete type:', deleteType, 'for item:', name);
    
    setDeleteDialog({
      isOpen: true,
      type: deleteType,
      ids: [id],
      itemName: name,
      isLoading: false
    });
  }, [activeTab]);

  const handleBulkDelete = useCallback(() => {
    const ids = activeTab === 'services' ? selectedServices : selectedGigs;
    if (ids.length === 0) return;
    
    console.log('Bulk delete called:', { 
      activeTab, 
      ids, 
      selectedServicesCount: selectedServices.length,
      selectedGigsCount: selectedGigs.length 
    });
    
    // FIXED: Always use activeTab to determine type
    const deleteType = activeTab === 'services' ? 'service' : 'gig';
    
    console.log('Setting delete dialog type to:', deleteType);
    
    setDeleteDialog({
      isOpen: true,
      type: deleteType,
      ids,
      itemName: '',
      isLoading: false
    });
  }, [activeTab, selectedServices, selectedGigs]);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      const isGig = deleteDialog.type === 'gig';
      const count = deleteDialog.ids.length;
      
      console.log(`Deleting ${count} ${isGig ? 'gig(s)' : 'service(s)'} with IDs:`, deleteDialog.ids);
      
      // Perform optimistic update immediately
      performOptimisticDelete(deleteDialog.ids, deleteDialog.type);
      
      if (isGig) {
        showGigLoading(`Deleting ${count} gig${count > 1 ? 's' : ''}...`);
        
        await deleteMultipleGigsMutation.mutateAsync(deleteDialog.ids);
        
        showGigDeleteSuccess(count, {
          onClose: () => {
            setImageRefreshKey(Date.now());
          }
        });
      } else {
        showServiceLoading(`Deleting ${count} service${count > 1 ? 's' : ''}...`);
        
        const results = [];
        for (const id of deleteDialog.ids) {
          try {
            const result = await deleteServiceMutation.mutateAsync({ id });
            results.push({ id, success: true, result });
          } catch (error) {
            if (error.response?.status === 404) {
              console.log(`Service ${id} not found, skipping...`);
              continue;
            }
            throw error;
          }
        }
        
        const successCount = results.length;
        if (successCount > 0) {
          showServiceDeleteSuccess(successCount, {
            onClose: () => {
              setImageRefreshKey(Date.now());
            }
          });
        }
      }
      
      // Close dialog immediately (don't wait for refetch)
      setDeleteDialog({
        isOpen: false,
        type: null,
        ids: [],
        itemName: '',
        isLoading: false
      });
      
      // Queue refetch for background (non-blocking)
      setTimeout(() => {
        if (isGig) {
          refetchGigs();
        } else {
          refetchServices();
        }
      }, 100);
      
    } catch (error) {
      console.error('Delete error:', error);
      
      // Rollback optimistic update on error
      const itemType = deleteDialog.type === 'gig' ? 'gigs' : 'services';
      setImmediateUpdates(prev => ({
        ...prev,
        [itemType]: {
          ...prev[itemType],
          deleted: prev[itemType].deleted.filter(id => !deleteDialog.ids.includes(id))
        }
      }));
      
      // Invalidate queries to restore original data
      if (deleteDialog.type === 'gig') {
        queryClient.invalidateQueries({ queryKey: gigKeys.myGigs() });
        showGigDeleteError(error.message || 'Failed to delete gigs');
      } else {
        queryClient.invalidateQueries({ queryKey: serviceKeys.myServices() });
        showServiceDeleteError(error.message || 'Failed to delete services');
      }
      
      setDeleteDialog(prev => ({ ...prev, isLoading: false }));
    } finally {
      if (deleteDialog.type === 'gig') {
        dismissGigToast();
      } else {
        dismissServiceToast();
      }
    }
  }, [
    deleteDialog.ids, 
    deleteDialog.type, 
    deleteMultipleGigsMutation, 
    deleteServiceMutation,
    performOptimisticDelete,
    queryClient,
    refetchServices,
    refetchGigs,
    showGigLoading,
    showServiceLoading,
    showGigDeleteSuccess,
    showServiceDeleteSuccess,
    showGigDeleteError,
    showServiceDeleteError,
    dismissGigToast,
    dismissServiceToast
  ]);

  const handleDeleteGigs = useCallback(() => {
    if (selectedGigs.length === 0) {
      toast.error('Please select gigs to delete');
      return;
    }
    handleBulkDelete();
  }, [selectedGigs, handleBulkDelete]);

  const handleActiveGigsClick = useCallback(() => {
    setActiveTab('gigs');
    setStatusFilter('active');
  }, []);

  const handleDeleteServices = useCallback(() => {
    if (selectedServices.length === 0) {
      toast.error('Please select services to delete');
      return;
    }
    handleBulkDelete();
  }, [selectedServices, handleBulkDelete]);

  const handleUpdateGigStatus = useCallback(async (status) => {
    if (selectedGigs.length === 0) {
      toast.error('Please select gigs to update');
      return;
    }

    try {
      const loadingToastId = showGigLoading(`Updating ${selectedGigs.length} gig${selectedGigs.length > 1 ? 's' : ''}...`);
      
      await updateMultipleGigsStatusMutation.mutateAsync({
        ids: selectedGigs,
        status
      });
      resetSelection();
      
      showGigSuccess(`${selectedGigs.length} gig${selectedGigs.length > 1 ? 's' : ''} marked as ${status}`, {
        onClose: () => {
          setImageRefreshKey(Date.now());
        }
      });
      
    } catch (error) {
      if (!error.message.includes('already active')) {
        showGigError(error.message || 'Failed to update gigs');
      }
    } finally {
      dismissGigToast();
    }
  }, [selectedGigs, updateMultipleGigsStatusMutation, resetSelection, showGigLoading, showGigSuccess, showGigError, dismissGigToast]);

  const handleUpdateServiceStatus = useCallback(async (status) => {
    if (selectedServices.length === 0) {
      toast.error('Please select services to update');
      return;
    }

    showServiceInfo('Service status update feature coming soon');
  }, [showServiceInfo]);

  const filterGigs = useCallback((gigsToFilter) => {
    let filtered = gigsToFilter;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(gig => gig.status === statusFilter);
    }
    // Remove immediately deleted gigs
    filtered = filtered.filter(gig => 
      !immediateUpdates.gigs.deleted.includes(gig._id)
    );
    // Add immediately created gigs that match the filter
    const createdGigs = immediateUpdates.gigs.created.filter(gig => 
      statusFilter === 'all' || gig.status === statusFilter
    );
    return [...createdGigs, ...filtered];
  }, [statusFilter, immediateUpdates.gigs]);
  
  const filterServices = useCallback((servicesToFilter) => {
    let filtered = servicesToFilter;
    if (serviceStatusFilter !== 'all') {
      filtered = filtered.filter(service => service.status === serviceStatusFilter);
    }
    // Remove immediately deleted services
    filtered = filtered.filter(service => 
      !immediateUpdates.services.deleted.includes(service._id)
    );
    // Add immediately created services that match the filter
    const createdServices = immediateUpdates.services.created.filter(service => 
      serviceStatusFilter === 'all' || service.status === serviceStatusFilter
    );
    return [...createdServices, ...filtered];
  }, [serviceStatusFilter, immediateUpdates.services]);

  useEffect(() => {
    const handlePageShow = async (event) => {
      if (event.persisted) {
        // Page was restored from bfcache
        console.log('Page restored from cache, refreshing data...');
        await Promise.all([
          refetchProfile(),
          refetchServices(),
          refetchGigs()
        ]);
        setImageRefreshKey(Date.now());
      }
    };
    
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [refetchProfile, refetchServices, refetchGigs]);

  useEffect(() => {
    let pollInterval;
    
    if (lastActionRef.current && Date.now() - lastActionRef.current.timestamp < 5000) {
      // Poll for updates for 5 seconds after an action
      pollInterval = setInterval(() => {
        if (lastActionRef.current?.type === 'gigs') {
          refetchGigs();
        } else if (lastActionRef.current?.type === 'services') {
          refetchServices();
        }
      }, 1000);
      
      // Clear after 5 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
        lastActionRef.current = null;
      }, 5000);
    }
    
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [lastActionRef.current, refetchGigs, refetchServices]);
  
  // Listen for custom events from create pages
  useEffect(() => {
    const handleItemCreated = (event) => {
      const { type, item } = event.detail;
      performOptimisticCreate(item, type);
      
      // Show success message
      if (type === 'gig') {
        showGigSuccess('Gig created successfully!');
      } else {
        toast.success('Service created successfully!');
      }
      
      // Background refetch
      setTimeout(() => {
        if (type === 'gig') {
          refetchGigs();
        } else {
          refetchServices();
        }
      }, 100);
    };
    
    const handleItemUpdated = (event) => {
      const { type, item } = event.detail;
      
      // Update immediate updates
      setImmediateUpdates(prev => ({
        ...prev,
        [type === 'gig' ? 'gigs' : 'services']: {
          ...prev[type === 'gig' ? 'gigs' : 'services'],
          updated: [...prev[type === 'gig' ? 'gigs' : 'services'].updated, item._id]
        }
      }));
      
      // Invalidate cache for the item
      if (type === 'gig') {
        queryClient.invalidateQueries({ queryKey: gigKeys.detail(item._id) });
      } else {
        queryClient.invalidateQueries({ queryKey: serviceKeys.detail(item._id) });
      }
    };
    
    window.addEventListener('item-created', handleItemCreated);
    window.addEventListener('item-updated', handleItemUpdated);
    
    return () => {
      window.removeEventListener('item-created', handleItemCreated);
      window.removeEventListener('item-updated', handleItemUpdated);
    };
  }, [performOptimisticCreate, queryClient, refetchGigs, refetchServices, showGigSuccess]);

  const filteredGigs = useMemo(() => filterGigs(gigs), [gigs, filterGigs, forceRefreshTrigger]);
  const filteredServices = useMemo(() => filterServices(services), [services, filterServices, forceRefreshTrigger]);

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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      refetchProfile();
    }
  }, [isAuthenticated, refetchProfile]);

  useEffect(() => {
    // Check if we just created something and need to refresh
    const refreshNeeded = sessionStorage.getItem('refreshDashboard');
    const preCreateStats = sessionStorage.getItem('preCreateStats');
    
    if (refreshNeeded === 'true') {
      refetchProfile();
      refetchServices();
      refetchGigs();
      setImageRefreshKey(Date.now());
      sessionStorage.removeItem('refreshDashboard');
      sessionStorage.removeItem('preCreateStats');
    }
    
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('refresh') === 'true') {
      refetchServices();
      refetchGigs();
      setImageRefreshKey(Date.now());
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refetchProfile, refetchServices, refetchGigs]);

  // Force image refresh
  useEffect(() => {
    if (initialLoadComplete) {
      const timer = setTimeout(() => {
        setImageRefreshKey(Date.now());
        setForceRefreshTrigger(prev => prev + 1);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialLoadComplete, activeTab, statusFilter, serviceStatusFilter]);

  // Force refresh when returning from details page
  useEffect(() => {
    if (location.state?.from === 'details' || location.state?.from === 'edit') {
      setImageRefreshKey(Date.now());
      setForceRefreshTrigger(prev => prev + 1);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  if (isProfileLoading || !initialLoadComplete) {
    return <DashboardSkeleton />;
  }

  if (profileError && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error loading profile</h2>
          <p className="text-gray-600 mb-6">There was an issue loading your profile data.</p>
          <button
            onClick={() => refetchProfile()}
            className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-black transition-colors"
          >
            <Loader2 className="w-5 h-5 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isLoading = activeTab === 'services' ? servicesLoading : gigsLoading;
  const selectedCount = activeTab === 'services' 
    ? selectedServices.length 
    : selectedGigs.length;
  const items = activeTab === 'services' ? filteredServices : filteredGigs;

  // Generate SEO structured data
  const websiteUrl = window.location.origin;
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Dashboard', url: '/dashboard' }
  ];

  return (
    <SeoWrapper
      title="Dashboard | Manage Your Freelance Services & Gigs | Vorkanna"
      description={`Manage your freelance services and gigs on Vorkanna. ${stats.totalServices} services, ${stats.totalGigs} gigs, ${profileCompletion}% profile completion. Track performance and grow your business.`}
      canonical="/dashboard"
      keywords="freelance dashboard, manage gigs, manage services, freelancer profile, freelance analytics, Vorkanna"
      ogTitle="Freelance Dashboard | Vorkanna"
      ogDescription="Manage your freelance services, gigs, and track your performance on Vorkanna"
      ogImage={`${websiteUrl}/images/dashboard-og.jpg`}
      ogType="website"
      ogUrl={`${websiteUrl}/dashboard`}
      twitterCard="summary_large_image"
      twitterSite="@Vorkanna"
      robots="index, follow"
      lang="en"
      breadcrumb={breadcrumbItems}
      structuredData={[
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "Freelancer Dashboard | Vorkanna",
          "description": "Dashboard for managing freelance services and gigs on Vorkanna marketplace",
          "url": `${websiteUrl}/dashboard`,
          "mainEntity": {
            "@type": "Service",
            "name": "Freelance Management Dashboard",
            "description": "Dashboard for freelancers to manage their services, gigs, and track performance",
            "provider": {
              "@type": "Person",
              "name": user?.name || "Freelancer"
            }
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbItems.map((item, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "name": item.name,
              "item": `${websiteUrl}${item.url}`
            }))
          }
        },
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Freelancer Dashboard Statistics",
          "description": "Performance metrics and statistics for freelancers",
          "url": `${websiteUrl}/dashboard`,
          "numberOfItems": stats.totalServices + stats.totalGigs,
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Services",
              "description": `Total: ${stats.totalServices}, Active: ${stats.activeServices}`,
              "item": `${websiteUrl}/dashboard?tab=services`
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Gigs",
              "description": `Total: ${stats.totalGigs}, Active: ${stats.activeGigs}`,
              "item": `${websiteUrl}/dashboard?tab=gigs`
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "Profile Completion",
              "description": `${profileCompletion}% complete`,
              "item": `${websiteUrl}/profile`
            }
          ]
        }
      ]}
    >
      <div className="min-h-screen bg-gray-50">
        <DeleteConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={() => !deleteDialog.isLoading && setDeleteDialog(prev => ({ ...prev, isOpen: false }))}
          onConfirm={handleDeleteConfirm}
          itemType={deleteDialog.type}
          count={deleteDialog.ids.length}
          isLoading={deleteDialog.isLoading}
          itemName={deleteDialog.itemName}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-2">
                  Manage your services and gigs, track your performance, and grow your freelance business.
                  {!canCreateContent && " Complete your profile to unlock all features!"}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Sections */}
          <ProfileWarningBanner
            profileCompletion={profileCompletion}
            profileSuggestions={profileSuggestions}
            onCompleteProfile={handleCompleteProfile}
            isLoading={isProfileLoading}
          />

          <ProfileInfoBar
            profileCompletion={profileCompletion}
            canCreateContent={canCreateContent}
            onImproveProfile={handleCompleteProfile}
            isLoading={isProfileLoading}
          />

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Services"
              value={stats.totalServices}
              subValue={`(${stats.activeServices} active)`}
              icon={Package}
              colorClass="blue"
              onClick={() => {
                setActiveTab('services');
                setServiceStatusFilter('all');
              }}
            />
            <StatsCard
              title="Active Services"
              value={stats.activeServices}
              subValue={`of ${stats.totalServices} total`}
              icon={CheckCircle}
              colorClass="blue"
              onClick={() => {
                setActiveTab('services');
                setServiceStatusFilter('active');
              }}
            />
            <StatsCard
              title="Total Gigs"
              value={stats.totalGigs}
              subValue={`(${stats.activeGigs} active)`}
              icon={FileText}
              colorClass="green"
              onClick={() => {
                setActiveTab('gigs');
                setStatusFilter('all');
              }}
            />
            <StatsCard
              title="Active Gigs"
              value={stats.activeGigs}
              subValue={`of ${stats.totalGigs} total`}
              icon={TrendingUp}
              colorClass="green"
              onClick={handleActiveGigsClick}
            />
          </div>

          {/* Quick Info Buttons */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              to="/what-are-services"
              className="inline-flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Briefcase className="w-5 h-5 mr-2" />
              What are Services?
              <HelpCircle className="w-5 h-5 ml-2 opacity-80" />
            </Link>
            <Link
              to="/what-are-gigs"
              className="inline-flex items-center px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <FileText className="w-5 h-5 mr-2" />
              What are Gigs?
              <HelpCircle className="w-5 h-5 ml-2 opacity-80" />
            </Link>
          </div>

          {/* Main Content Area */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center">
                  <h2 className="text-xl font-bold text-gray-900 mr-4">Manage Your Work</h2>
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {stats.totalServices} Services
                    </span>
                    <span className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-full">
                      {stats.totalGigs} Gigs
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 mt-1">
                  {activeTab === 'services' 
                    ? 'Manage your pre-defined service offerings'
                    : 'Manage your project-based gigs and applications'}
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleCreateGig}
                  disabled={!canCreateContent || isLoading}
                  className={`flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    canCreateContent 
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed relative group'
                  } disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
                  title={!canCreateContent ? "Complete your profile to create gigs" : ""}
                >
                  <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                  Create Gig
                  {!canCreateContent && (
                    <div className="absolute invisible group-hover:visible bottom-full mb-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg z-50">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Profile Incomplete</span>
                      </div>
                      <p>Your profile is {profileCompletion}% complete. You need at least 70% completion to create gigs.</p>
                      <button
                        onClick={handleCompleteProfile}
                        className="mt-2 w-full bg-white text-gray-900 py-1.5 rounded text-sm font-medium hover:bg-gray-100"
                      >
                        Complete Profile Now
                      </button>
                    </div>
                  )}
                </button>
                <button
                  onClick={handleCreateService}
                  disabled={!canCreateContent || isLoading}
                  className={`flex items-center px-4 py-2.5 rounded-lg font-medium transition-colors ${
                    canCreateContent 
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed relative group'
                  } disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
                  title={!canCreateContent ? "Complete your profile to create services" : ""}
                >
                  <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
                  Create Service
                  {!canCreateContent && (
                    <div className="absolute invisible group-hover:visible bottom-full mb-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg z-50">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Profile Incomplete</span>
                      </div>
                      <p>Your profile is {profileCompletion}% complete. You need at least 70% completion to create services.</p>
                      <button
                        onClick={handleCompleteProfile}
                        className="mt-2 w-full bg-white text-gray-900 py-1.5 rounded text-sm font-medium hover:bg-gray-100"
                      >
                        Complete Profile Now
                      </button>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Info message */}
            {!canCreateContent && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <p className="text-gray-700 text-sm">
                    Complete your profile to unlock the ability to create gigs and services. 
                    A complete profile helps build trust with clients and increases your chances of success.
                  </p>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-gray-50 rounded-lg p-1 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('services')}
                    className={`px-5 py-2.5 font-medium transition-colors flex-shrink-0 rounded-l-lg ${
                      activeTab === 'services'
                        ? 'bg-blue-600 text-white'
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
                    className={`px-5 py-2.5 font-medium transition-colors flex-shrink-0 rounded-r-lg ${
                      activeTab === 'gigs'
                        ? 'bg-green-600 text-white'
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
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
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
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
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
                          ? <CheckSquare className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          : <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        : allSelected
                          ? <CheckSquare className="w-5 h-5 text-green-600 flex-shrink-0" />
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
                    onChange={(e) => {
                      if (activeTab === 'services') {
                        setServiceStatusFilter(e.target.value);
                      } else {
                        setStatusFilter(e.target.value);
                      }
                      setImageRefreshKey(Date.now());
                    }}
                    disabled={isLoading}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 min-w-[150px]"
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
                key={`${activeTab}-${viewMode}-${imageRefreshKey}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {isLoading ? (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto mb-4" />
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
                    primaryColor={activeTab === 'services' ? 'blue' : 'green'}
                  />
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => (
                      <ItemCard
                        key={`${item._id || item.id}-${imageRefreshKey}`}
                        item={item}
                        type={activeTab} // This should be 'gigs' or 'services'
                        isSelected={activeTab === 'services' 
                          ? selectedServices.includes(item._id || item.id)
                          : selectedGigs.includes(item._id || item.id)
                        }
                        onSelect={activeTab === 'services' ? handleSelectService : handleSelectGig}
                        onClick={activeTab === 'services' ? handleServiceClick : handleGigClick}
                        getStatusColor={getStatusColor}
                        getStatusIcon={getStatusIcon}
                        imageRefreshKey={imageRefreshKey}
                        onDelete={(id, name) => handleSingleDelete(id, name, activeTab === 'services' ? 'service' : 'gig')} // FIX THIS LINE
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
                    imageRefreshKey={imageRefreshKey}
                    onDelete={(id, name) => handleSingleDelete(id, name, activeTab === 'services' ? 'service' : 'gig')}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default Dashboard;