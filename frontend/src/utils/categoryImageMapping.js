// utils/categoryImageMapping.js
import { buildImageUrl } from './cloudinaryFrontend';

// Simple mapping of category slugs to Cloudinary public IDs
// Just add new key-value pairs here as needed
export const CATEGORY_IMAGE_MAP = {
  // Web Development & Tech
  'web-development': 'website-development',
  'website-design': 'website-design',
  'web-design': 'website-design',
  'ecommerce-development': 'ecommerce',
  'ecommerce': 'ecommerce',
  'mobile-app-development': 'mobile-app',
  'mobile-app': 'mobile-app',
  'mobile-application': 'mobile-app',
  'wordpress-development': 'wordpress',
  'wordpress': 'wordpress',
  'shopify-development': 'shopify-store',
  'shopify': 'shopify-store',
  'web-hosting': 'web-hosting',
  'hosting': 'web-hosting',
  'seo': 'seo-search-engine-optimization',
  'search-engine-optimization': 'seo-search-engine-optimization',
  
  // Design & Creative
  'graphic-design': 'graphic-design',
  'logo-design': 'logo-design',
  'brand-identity': 'branding',
  'branding': 'branding',
  'ui-ux-design': 'ui-ux-design',
  'ui-design': 'ui-ux-design',
  'ux-design': 'ui-ux-design',
  'illustration': 'illustration',
  'digital-art': 'illustration',
  'animation': 'animation',
  'video-editing': 'video-editing',
  'video-production': 'video-editing',
  
  // Writing & Content
  'content-writing': 'content-writing',
  'copywriting': 'copywriting',
  'technical-writing': 'technical-writing',
  'blog-writing': 'blog-writing',
  'article-writing': 'article-writing',
  'proofreading': 'proofreading',
  'editing': 'proofreading',
  'translation': 'translation',
  
  // Marketing
  'digital-marketing': 'digital-marketing',
  'social-media-marketing': 'social-media-marketing',
  'social-media': 'social-media-marketing',
  'email-marketing': 'email-marketing',
  'influencer-marketing': 'influencer-marketing',
  'video-marketing': 'video-marketing',
  
  // Business & Services
  'virtual-assistant': 'virtual-assistant',
  'business-consulting': 'business-consulting',
  'consulting': 'business-consulting',
  'financial-consulting': 'financial-consulting',
  'accounting': 'financial-consulting',
  'legal-consulting': 'legal-consulting',
  'legal-services': 'legal-consulting',
  
  // Programming & IT
  'programming': 'code-development',
  'software-development': 'code-development',
  'website-development': 'website-development',
  'app-development': 'mobile-app',
  'data-science': 'data-analytics',
  'data-analytics': 'data-analytics',
  'cybersecurity': 'security',
  'it-support': 'it-support',
  
  // Add more mappings for popular categories from your CategoriesGrid.jsx
  'tech': 'code-development',
  'artificial-intelligence': 'ai',
  'ai': 'ai',
  'machine-learning': 'ai',
  'finance': 'financial-consulting',
  'photography': 'photography',
  'music': 'music-production',
  'audio': 'music-production',
  'gaming': 'gaming',
  'health': 'health-wellness',
  'wellness': 'health-wellness',
  'lifestyle': 'lifestyle',
  'energy': 'sustainability',
  'support': 'customer-support',
  'customer-support': 'customer-support',
  
  // Add fallback mappings for common category names
  'development': 'code-development',
  'design': 'graphic-design',
  'marketing': 'digital-marketing',
  'business': 'business-consulting',
  'technology': 'code-development',
  'creative': 'graphic-design',
  'writing': 'content-writing',
  'video': 'video-editing',
  
  // Default fallback (don't change this)
  'default': 'generic-service'
};

/**
 * Get optimized image URL for a category
 * @param {string} slug - Category slug
 * @param {object} options - Image optimization options
 * @returns {string} Cloudinary image URL
 */
export const getCategoryImage = (slug, options = {}) => {
  const {
    width = 400,
    height = 300,
    format = 'webp',
    quality = 85,
    crop = 'fill',
    gravity = 'auto'
  } = options;
  
  // Normalize slug
  const normalizedSlug = (slug || '').toLowerCase().trim();
  
  // Try to find a matching public ID
  let publicId;
  
  // First, try exact match
  if (CATEGORY_IMAGE_MAP[normalizedSlug]) {
    publicId = CATEGORY_IMAGE_MAP[normalizedSlug];
  } else {
    // Try to find partial matches for better coverage
    publicId = findBestMatch(normalizedSlug);
  }
  
  // Build Cloudinary URL
  return buildImageUrl({
    publicId: `services/${publicId}`,
    width,
    height,
    format,
    quality,
    crop,
    gravity
  });
};

/**
 * Helper function to find best matching image based on category name
 */
const findBestMatch = (slug) => {
  const slugParts = slug.split('-');
  
  // Check for common keywords in the slug
  const keywords = [
    'web', 'design', 'development', 'marketing', 'business',
    'digital', 'graphic', 'logo', 'brand', 'app', 'mobile',
    'video', 'photo', 'music', 'writing', 'content', 'seo',
    'social', 'email', 'virtual', 'consulting', 'data',
    'tech', 'programming', 'it', 'ai', 'finance', 'legal',
    'health', 'lifestyle', 'gaming', 'support', 'ecommerce'
  ];
  
  for (const keyword of keywords) {
    if (slug.includes(keyword)) {
      // Look for exact keyword in mappings
      if (CATEGORY_IMAGE_MAP[keyword]) {
        return CATEGORY_IMAGE_MAP[keyword];
      }
    }
  }
  
  // Return default if no match found
  return CATEGORY_IMAGE_MAP.default;
};

/**
 * Get generic service image URL
 * Useful for fallbacks or default images
 */
export const getGenericServiceImage = (options = {}) => {
  return buildImageUrl({
    publicId: `services/${CATEGORY_IMAGE_MAP.default}`,
    width: options.width || 400,
    height: options.height || 300,
    format: options.format || 'webp',
    quality: options.quality || 80,
    crop: options.crop || 'fill',
    gravity: options.gravity || 'auto'
  });
};

/**
 * Add a new category image mapping
 * Use this if you need to add mappings dynamically
 */
export const addCategoryImageMapping = (slug, publicId) => {
  CATEGORY_IMAGE_MAP[slug.toLowerCase()] = publicId;
};

/**
 * Check if a category has a custom image
 */
export const hasCustomCategoryImage = (slug) => {
  const normalizedSlug = (slug || '').toLowerCase();
  return normalizedSlug in CATEGORY_IMAGE_MAP && CATEGORY_IMAGE_MAP[normalizedSlug] !== CATEGORY_IMAGE_MAP.default;
};

/**
 * Get all mapped categories (for debugging or listing)
 */
export const getMappedCategories = () => {
  return Object.keys(CATEGORY_IMAGE_MAP).filter(key => key !== 'default');
};

/**
 * Extract keywords from category name for better image matching
 */
export const extractKeywords = (categoryName) => {
  if (!categoryName) return [];
  
  const name = categoryName.toLowerCase();
  const keywords = [];
  
  // Common category keywords to look for
  const keywordList = [
    'web', 'website', 'development', 'design', 'graphic', 'logo',
    'brand', 'marketing', 'digital', 'social', 'media', 'seo',
    'content', 'writing', 'copy', 'video', 'editing', 'animation',
    'mobile', 'app', 'application', 'ecommerce', 'shopify', 'wordpress',
    'hosting', 'programming', 'tech', 'technology', 'ai', 'artificial',
    'intelligence', 'data', 'analytics', 'business', 'consulting',
    'virtual', 'assistant', 'finance', 'legal', 'health', 'wellness',
    'lifestyle', 'photography', 'music', 'audio', 'gaming', 'support'
  ];
  
  keywordList.forEach(keyword => {
    if (name.includes(keyword)) {
      keywords.push(keyword);
    }
  });
  
  return keywords;
};

/**
 * Get image for category based on its name (alternative to slug-based)
 */
export const getCategoryImageByName = (categoryName, options = {}) => {
  if (!categoryName) return getGenericServiceImage(options);
  
  const name = categoryName.toLowerCase().trim();
  
  // Try direct match with common variations
  if (CATEGORY_IMAGE_MAP[name.replace(/ /g, '-')]) {
    return getCategoryImage(name.replace(/ /g, '-'), options);
  }
  
  // Extract keywords and try to find best match
  const keywords = extractKeywords(name);
  
  for (const keyword of keywords) {
    if (CATEGORY_IMAGE_MAP[keyword]) {
      return getCategoryImage(keyword, options);
    }
  }
  
  // Return generic image as last resort
  return getGenericServiceImage(options);
};