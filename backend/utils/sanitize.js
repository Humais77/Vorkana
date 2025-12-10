const xss = require('xss');

/**
 * Sanitize HTML string
 * @param {string} str - Input string to sanitize
 * @param {Object} options - XSS options
 * @returns {string} Sanitized string
 */
const sanitizeHtml = (str, options = {}) => {
  if (typeof str !== 'string') return str;
  
  const defaultOptions = {
    whiteList: options.allowedTags || {},          // Allow specified tags or none
    stripIgnoreTag: true,                          // Remove <script>, <iframe>, etc.
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed', 'applet'],
    allowCommentTag: false,
    css: false,
    ...options
  };

  return xss(str, defaultOptions).trim();
};

/**
 * Sanitize text (basic sanitization without HTML)
 * @param {string} str - Input string to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeText = (str) => {
  if (typeof str !== 'string') return str;
  
  // Remove all HTML tags and trim
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, '') // Remove HTML entities
    .trim();
};

/**
 * Check if object has property (safe for all object types)
 * @param {Object} obj - Object to check
 * @param {string} key - Property key
 * @returns {boolean} True if object has property
 */
const hasProperty = (obj, key) => {
  // Handle null/undefined
  if (obj == null) return false;
  
  // Handle FormData and other special objects
  if (obj instanceof FormData) {
    return obj.has(key);
  }
  
  // Handle regular objects
  return Object.prototype.hasOwnProperty.call(obj, key);
};

/**
 * Safely iterate over object properties
 * @param {Object} obj - Object to iterate
 * @param {Function} callback - Callback function (key, value)
 */
const forEachProperty = (obj, callback) => {
  if (!obj || typeof obj !== 'object') return;
  
  // Handle FormData
  if (obj instanceof FormData) {
    // FormData doesn't have direct iteration, but we can handle it differently
    return;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach((value, index) => callback(index.toString(), value));
    return;
  }
  
  // Handle regular objects
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      callback(key, obj[key]);
    }
  }
};

/**
 * Sanitize an entire object recursively
 * @param {Object} obj - Object to sanitize
 * @param {Array} skipKeys - Keys to skip sanitization for
 * @param {Object} options - XSS options
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj, skipKeys = [], options = {}) => {
  // Handle FormData - return as is since it's already being processed
  if (obj instanceof FormData) {
    return obj;
  }
  
  // Handle non-objects
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  // Use safe iteration
  forEachProperty(obj, (key, value) => {
    // Skip specified keys (like IDs, references, etc.)
    if (skipKeys.includes(key)) {
      sanitized[key] = value;
      return;
    }
    
    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof File)) {
      sanitized[key] = sanitizeObject(value, skipKeys, options);
    } 
    // Sanitize strings
    else if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value, options);
    }
    // Keep other types as is (including File objects)
    else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
};

/**
 * Deep sanitize an object with specific field rules
 * @param {Object} data - Data object to sanitize
 * @param {Object} fieldRules - Rules for specific fields
 * @returns {Object} Sanitized object
 */
const deepSanitize = (data, fieldRules = {}) => {
  // Handle FormData - return as is
  if (data instanceof FormData) {
    return data;
  }
  
  // Handle non-objects
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = Array.isArray(data) ? [] : {};
  
  forEachProperty(data, (key, value) => {
    const rules = fieldRules[key] || {};
    
    // Handle nested objects/arrays recursively
    if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof File)) {
      sanitized[key] = deepSanitize(value, rules.nested || {});
    }
    // Handle strings based on rules
    else if (typeof value === 'string') {
      if (rules.allowHtml) {
        sanitized[key] = sanitizeHtml(value, { 
          allowedTags: rules.allowedTags || [] 
        });
      } else if (rules.preventInjection) {
        // Additional injection prevention
        const sanitizedValue = sanitizeHtml(value);
        // Check for common injection patterns
        const injectionPatterns = [
          /\$where/i,
          /\$ne/i,
          /\$nin/i,
          /\$regex/i,
          /select.*from/i,
          /insert.*into/i,
          /update.*set/i,
          /delete.*from/i,
          /union.*select/i,
          /or.*=.*or/i,
          /'|"|`/,
          /--/,
          /;/,
          /\/\*.*\*\//,
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/
        ];
        
        if (injectionPatterns.some(pattern => pattern.test(sanitizedValue))) {
          throw new Error(`Field "${key}" contains potentially dangerous content`);
        }
        
        sanitized[key] = sanitizedValue;
      } else {
        sanitized[key] = sanitizeText(value);
      }
    }
    // Keep other types as is (including File objects)
    else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
};

/**
 * Validate and sanitize URLs
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or empty string
 */
const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';
  
  const sanitized = sanitizeHtml(url);
  
  // Basic URL validation
  if (sanitized.startsWith('/uploads/') || 
      sanitized.startsWith('/public/') || 
      sanitized.startsWith('http://') || 
      sanitized.startsWith('https://')) {
    
    // Prevent path traversal
    if (sanitized.includes('..') || sanitized.includes('//')) {
      return '';
    }
    
    return sanitized;
  }
  
  return '';
};

/**
 * Sanitize array of strings
 * @param {Array} arr - Array of strings to sanitize
 * @param {Object} options - XSS options
 * @returns {Array} Sanitized array
 */
const sanitizeArray = (arr, options = {}) => {
  if (!Array.isArray(arr)) return [];
  
  return arr.map(item => {
    if (typeof item === 'string') {
      return sanitizeHtml(item, options);
    }
    if (typeof item === 'object' && item !== null && !(item instanceof File)) {
      return sanitizeObject(item, [], options);
    }
    return item;
  });
};

/**
 * Sanitize MongoDB query parameters
 * @param {Object} query - Query object
 * @returns {Object} Sanitized query
 */
const sanitizeQuery = (query) => {
  if (!query || typeof query !== 'object') return {};
  
  const sanitized = {};
  const skipKeys = ['$and', '$or', '$in', '$nin', '$gt', '$gte', '$lt', '$lte', '$ne', '$regex'];
  
  forEachProperty(query, (key, value) => {
    // Skip MongoDB operators
    if (skipKeys.includes(key) || key.startsWith('$')) {
      sanitized[key] = value;
    }
    // Recursively sanitize nested queries
    else if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof File)) {
      sanitized[key] = sanitizeQuery(value);
    }
    // Sanitize string values in queries
    else if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    }
    // Keep other types as is
    else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
};

/**
 * Sanitize user input for database operations
 * @param {any} input - Input to sanitize
 * @param {string} type - Type of sanitization ('text', 'html', 'url', 'query')
 * @returns {any} Sanitized input
 */
const sanitize = (input, type = 'text') => {
  // Handle FormData - return as is
  if (input instanceof FormData) {
    return input;
  }
  
  switch (type) {
    case 'html':
      return typeof input === 'string' ? sanitizeHtml(input) : input;
    case 'text':
      return typeof input === 'string' ? sanitizeText(input) : input;
    case 'url':
      return typeof input === 'string' ? sanitizeUrl(input) : '';
    case 'query':
      return typeof input === 'object' ? sanitizeQuery(input) : input;
    case 'array':
      return Array.isArray(input) ? sanitizeArray(input) : [];
    case 'object':
      return typeof input === 'object' ? sanitizeObject(input) : input;
    default:
      return input;
  }
};

/**
 * Safe sanitize for gig creation (handles FormData)
 * @param {any} data - Input data to sanitize
 * @returns {any} Sanitized data
 */
const safeSanitizeGigInput = (data) => {
  // If it's FormData, we need to handle it differently
  if (data instanceof FormData) {
    // For FormData, we should process it in the controller, not here
    return data;
  }
  
  // For regular objects, use normal sanitization
  if (data && typeof data === 'object') {
    const skipKeys = ['projectCategory', 'subcategory', 'assignedTo', 'selectedProposal', 
                     'createdBy', 'lastUpdatedBy', 'budget', 'price', 'amount', 
                     'paymentAmount', 'depositPaid', 'rating', 'deliveryTime', 'version'];
    return sanitizeObject(data, skipKeys);
  }
  
  return data;
};

module.exports = {
  sanitizeHtml,
  sanitizeText,
  sanitizeObject,
  deepSanitize,
  sanitizeUrl,
  sanitizeArray,
  sanitizeQuery,
  sanitize,
  hasProperty,
  forEachProperty,
  safeSanitizeGigInput
};