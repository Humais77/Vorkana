// utils/imageUtils.js - UPDATED
export const updateImageWithCacheBusting = (imageElement, newUrl) => {
  if (!imageElement || !newUrl) return;
  
  // Create cache busting URL
  const cacheBustingUrl = `${newUrl.split('?')[0]}?t=${Date.now()}`;
  
  return new Promise((resolve, reject) => {
    const preloadImage = new Image();
    
    preloadImage.onload = () => {
      // Force image reload by setting src to empty first
      imageElement.src = '';
      setTimeout(() => {
        imageElement.src = cacheBustingUrl;
        imageElement.style.opacity = '0.9';
        
        // Force browser to re-render
        void imageElement.offsetWidth;
        
        setTimeout(() => {
          imageElement.style.opacity = '1';
          resolve(cacheBustingUrl);
        }, 100);
      }, 50);
    };
    
    preloadImage.onerror = () => {
      console.error('Failed to preload image');
      // Try without cache busting as fallback
      imageElement.src = newUrl;
      reject(new Error('Failed to load image'));
    };
    
    preloadImage.src = cacheBustingUrl;
  });
};

export const createImagePreview = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    
    reader.onerror = (e) => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

// New function to force image reload
export const forceImageReload = (imageElement) => {
  if (!imageElement || !imageElement.src) return;
  
  const originalSrc = imageElement.src;
  imageElement.src = '';
  
  setTimeout(() => {
    // Add cache busting parameter
    const separator = originalSrc.includes('?') ? '&' : '?';
    imageElement.src = `${originalSrc}${separator}t=${Date.now()}`;
    
    // Force browser to fetch fresh image
    imageElement.style.display = 'none';
    void imageElement.offsetWidth; // Trigger reflow
    imageElement.style.display = '';
  }, 50);
};