// utils/imageUtils.js
export const updateImageWithCacheBusting = (imageElement, newUrl) => {
  if (!imageElement || !newUrl) return;
  
  // Add cache busting parameter
  const cacheBustingUrl = `${newUrl}?t=${Date.now()}`;
  
  // Create a new image to preload
  const preloadImage = new Image();
  
  preloadImage.onload = () => {
    // Once loaded, update the main image
    imageElement.src = cacheBustingUrl;
    imageElement.style.opacity = '1';
  };
  
  preloadImage.onerror = () => {
    console.error('Failed to preload image');
    // Fallback to original URL without cache busting
    imageElement.src = newUrl;
  };
  
  // Start preloading
  preloadImage.src = cacheBustingUrl;
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