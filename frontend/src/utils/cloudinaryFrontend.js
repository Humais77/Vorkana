// cloudinaryFrontend.js (FIXED VERSION)
export const buildImageUrl = ({ 
  publicId, 
  width, 
  height, 
  format = 'webp',
  quality = 80,
  crop = 'fill',
  gravity = 'auto'
}) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  let url = `https://res.cloudinary.com/${cloudName}/image/upload`;
  const transformations = [];
  
  if (crop) transformations.push(`c_${crop}`);
  if (gravity) transformations.push(`g_${gravity}`);
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  
  transformations.push(`f_${format}`, `q_${quality}`);
  
  if (format === 'webp') {
    transformations.push('fl_immutable_cache');
  }
  
  if (transformations.length > 0) {
    url += `/${transformations.join(',')}`;
  }
  
  url += `/${publicId}`;
  return url;
};

export const getHeroVideoAssets = (videoPublicId, posterPublicId = null) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  const baseUrl = `https://res.cloudinary.com/${cloudName}/video/upload`;
  
  const mp4Transformations = [
    'f_mp4',
    'q_70',
    'ac_none',
    'vc_h264',
    'fl_sanitize',
    'fl_streaming_attachment'
  ];
  
  const webmTransformations = [
    'f_webm',
    'q_60',
    'vc_vp9',
    'ac_none',
    'fl_sanitize'
  ];
  
  const lowQualityTransformations = [
    'f_mp4',
    'q_40',
    'ac_none',
    'w_640',
    'fl_sanitize'
  ];
  
  let posterUrl;
  if (posterPublicId) {
    posterUrl = buildImageUrl({
      publicId: posterPublicId,
      width: 1280,
      height: 720,
      format: 'webp',
      quality: 85,
      crop: 'fill',
      gravity: 'auto'
    });
  } else {
    posterUrl = `${baseUrl}/f_jpg,q_85,so_0.5,w_1280,h_720,c_fill,g_auto,fl_immutable_cache/${videoPublicId}`;
  }
  
  return { 
    videoUrl: `${baseUrl}/${mp4Transformations.join(',')}/${videoPublicId}`,
    webmUrl: `${baseUrl}/${webmTransformations.join(',')}/${videoPublicId}`,
    lowQualityVideoUrl: `${baseUrl}/${lowQualityTransformations.join(',')}/${videoPublicId}`,
    posterUrl
  };
};

// FIXED: Remove invalid preload function
export const preloadVideo = (url) => {
  if (typeof window === 'undefined' || !url) return;
  
  try {
    // Use fetch API to warm up cache instead of invalid link preload
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    fetch(url, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal,
      headers: {
        'Range': 'bytes=0-524288' 
      }
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });
    
  } catch (error) {
    console.warn('Video preload failed:', error);
  }
};

// FIXED: Updated preload function
export const preloadVideoWithFallbacks = (assets) => {
  if (typeof window === 'undefined') return;
  
  // Only preload on desktop (where video is actually shown)
  if (window.innerWidth < 768) return;
  
  // Preload WebM first
  if (assets.webmUrl) {
    preloadVideo(assets.webmUrl);
  }
  
  // Then preload MP4
  if (assets.videoUrl) {
    preloadVideo(assets.videoUrl);
  }
  
  // Preload poster image
  if (assets.posterUrl) {
    const img = new Image();
    img.src = assets.posterUrl;
    img.loading = 'eager';
    img.decode().catch(() => {
      // Ignore decode errors
    });
  }
};

// FIXED: Remove or silence CDN performance check in production
export const checkVideoCDNPerformance = async (videoUrl) => {
  // Only run in development mode
  if (!import.meta.env.DEV) return { latency: 0, healthy: true };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const startTime = performance.now();
    
    const response = await fetch(videoUrl, { 
      method: 'HEAD',
      mode: 'cors',
      signal: controller.signal
    });
    
    const endTime = performance.now();
    clearTimeout(timeoutId);
    
    const latency = endTime - startTime;
    
    // Check various possible cache headers
    const cacheHeader = response.headers.get('x-cache') || 
                       response.headers.get('cf-cache-status') ||
                       response.headers.get('x-amz-cf-pop') || 
                       null;
    
    return {
      latency,
      cacheStatus: cacheHeader,
      healthy: latency < 500
    };
    
  } catch (error) {
    // Silent fail - don't show errors in console
    return { 
      latency: 0,
      cacheStatus: null,
      healthy: true 
    };
  }
};