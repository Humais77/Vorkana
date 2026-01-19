// utils/cloudinaryFrontend.js - PRODUCTION OPTIMIZED

// Main image URL builder
export const buildImageUrl = ({ 
  publicId, 
  width, 
  height, 
  format = 'webp', // WebP for modern browsers
  quality = 80,    // Fixed quality for consistency
  crop = 'fill',
  gravity = 'auto'
}) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.error('VITE_CLOUDINARY_CLOUD_NAME is not set in environment variables');
    return '';
  }
  
  let url = `https://res.cloudinary.com/${cloudName}/image/upload`;
  const transformations = [];
  
  if (crop) transformations.push(`c_${crop}`);
  if (gravity) transformations.push(`g_${gravity}`);
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  
  // Force WebP with fallback format
  transformations.push(`f_${format}`, `q_${quality}`);
  
  if (transformations.length > 0) {
    url += `/${transformations.join(',')}`;
  }
  
  url += `/${publicId}`;
  return url;
};

// PRODUCTION: Get hero video assets with optimized settings
export const getHeroVideoAssets = (videoPublicId, posterPublicId = null) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    console.error('VITE_CLOUDINARY_CLOUD_NAME is not set in environment variables');
    return { videoUrl: '', posterUrl: '' };
  }
  
  // === CRITICAL: Use SIMPLE transformations for production ===
  // Remove vp9 codec and complex parameters that slow processing
  const videoTransformations = [
    'f_mp4',           // Force MP4 for universal compatibility
    'q_70',            // Fixed 70% quality (fastest processing)
    'ac_none',         // Remove audio
  ];
  
  // Only add bitrate if absolutely necessary
  // 'br_500k'          // Optional: limit bitrate for faster streaming
  
  const videoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${videoTransformations.join(',')}/${videoPublicId}`;
  
  // Use existing poster image or create simple one
  let posterUrl;
  if (posterPublicId) {
    posterUrl = buildImageUrl({
      publicId: posterPublicId,
      width: 800,      // Smaller for faster load
      height: 450,
      format: 'webp',
      quality: 75
    });
  } else {
    // Generate from video at 1 second mark (faster than 2 seconds)
    posterUrl = `https://res.cloudinary.com/${cloudName}/video/upload/f_jpg,q_60,so_1,w_800,h_450,c_fill/${videoPublicId}`;
  }
  
  return { 
    videoUrl, 
    posterUrl,
    // Fallback for slow connections
    lowQualityVideoUrl: `https://res.cloudinary.com/${cloudName}/video/upload/f_mp4,q_50/${videoPublicId}`
  };
};

// Video optimization helper
export const preloadVideo = (url) => {
  if (typeof window === 'undefined') return;
  
  try {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = url;
    link.setAttribute('fetchpriority', 'high');
    link.setAttribute('crossorigin', 'anonymous');
    document.head.appendChild(link);
    
    // Remove after a delay
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    }, 5000);
  } catch (error) {
    console.warn('Video preload failed:', error);
  }
};