
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
  
  if (!cloudName) {
    return '';
  }
  
  let url = `https://res.cloudinary.com/${cloudName}/image/upload`;
  const transformations = [];
  
  if (crop) transformations.push(`c_${crop}`);
  if (gravity) transformations.push(`g_${gravity}`);
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  
  transformations.push(`f_${format}`, `q_${quality}`);
  
  if (transformations.length > 0) {
    url += `/${transformations.join(',')}`;
  }
  
  url += `/${publicId}`;
  return url;
};

export const getHeroVideoAssets = (videoPublicId, posterPublicId = null) => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    return { videoUrl: '', posterUrl: '' };
  }
  
  const videoTransformations = [
    'f_mp4',
    'q_70',
    'ac_none',
  ];
  
  const videoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/${videoTransformations.join(',')}/${videoPublicId}`;
  
  let posterUrl;
  if (posterPublicId) {
    posterUrl = buildImageUrl({
      publicId: posterPublicId,
      width: 800,
      height: 450,
      format: 'webp',
      quality: 75
    });
  } else {
    posterUrl = `https://res.cloudinary.com/${cloudName}/video/upload/f_jpg,q_60,so_1,w_800,h_450,c_fill/${videoPublicId}`;
  }
  
  return { 
    videoUrl, 
    posterUrl,
    lowQualityVideoUrl: `https://res.cloudinary.com/${cloudName}/video/upload/f_mp4,q_50/${videoPublicId}`
  };
};

export const preloadVideo = (url) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Option 1: Use fetch API to preload (better for videos)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
 
    
    // Option 2: Create video element to preload (most reliable)
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = url;
    video.style.display = 'none';
    document.body.appendChild(video);
    
    // Remove after metadata loads
    video.addEventListener('loadedmetadata', () => {
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    });
    
    // Clean up after timeout
    setTimeout(() => {
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      controller.abort();
    }, 5000);
    
  } catch (error) {
    console.warn('Video preload failed:', error);
  }
};