/**
 * International phone number validation utility
 * Supports validation for all countries
 * Phone number is REQUIRED
 */

// Common country codes and patterns
export const countryCodes = [
  { code: '+1', country: 'United States/Canada', example: '+1 (123) 456-7890' },
  { code: '+44', country: 'United Kingdom', example: '+44 20 1234 5678' },
  { code: '+91', country: 'India', example: '+91 9876543210' },
  { code: '+61', country: 'Australia', example: '+61 412 345 678' },
  { code: '+49', country: 'Germany', example: '+49 151 12345678' },
  { code: '+33', country: 'France', example: '+33 6 12 34 56 78' },
  { code: '+81', country: 'Japan', example: '+81 90-1234-5678' },
  { code: '+86', country: 'China', example: '+86 138 0013 8000' },
  { code: '+7', country: 'Russia', example: '+7 912 345-67-89' },
  { code: '+55', country: 'Brazil', example: '+55 11 91234-5678' },
  { code: '+234', country: 'Nigeria', example: '+234 801 234 5678' },
  { code: '+27', country: 'South Africa', example: '+27 82 123 4567' },
  { code: '+971', country: 'UAE', example: '+971 50 123 4567' },
  { code: '+966', country: 'Saudi Arabia', example: '+966 55 123 4567' },
  { code: '+92', country: 'Pakistan', example: '+92 300 1234567' },
  { code: '+880', country: 'Bangladesh', example: '+880 1712 345678' },
  { code: '+62', country: 'Indonesia', example: '+62 812-3456-7890' },
  { code: '+60', country: 'Malaysia', example: '+60 12-345 6789' },
  { code: '+63', country: 'Philippines', example: '+63 917 123 4567' },
  { code: '+65', country: 'Singapore', example: '+65 8123 4567' },
  { code: '+66', country: 'Thailand', example: '+66 81 234 5678' },
  { code: '+84', country: 'Vietnam', example: '+84 912 345 678' },
  { code: '+90', country: 'Turkey', example: '+90 532 123 4567' },
  { code: '+20', country: 'Egypt', example: '+20 100 123 4567' },
  { code: '+254', country: 'Kenya', example: '+254 712 345678' },
  { code: '+256', country: 'Uganda', example: '+256 712 345678' }
];

/**
 * Validate phone number for any country (REQUIRED)
 * @param {string} phone - Phone number to validate
 * @returns {Object} - Validation result
 */
export const validatePhoneNumber = (phone) => {
  if (!phone || phone.trim() === '') {
    return { 
      valid: false, 
      message: 'Phone number is required',
      formatted: '',
      example: '+1234567890'
    };
  }

  const cleanedPhone = phone.trim();
  
  // Remove all non-digit characters except plus sign
  const digitsOnly = cleanedPhone.replace(/[^\d+]/g, '');
  
  // Check if it starts with + (international format) - REQUIRED
  if (!digitsOnly.startsWith('+')) {
    return { 
      valid: false, 
      message: 'Phone number must include country code starting with +',
      formatted: '',
      example: '+1234567890'
    };
  }
  
  // Check minimum length (country code + number)
  if (digitsOnly.length < 8) {
    return { 
      valid: false, 
      message: 'Phone number is too short',
      formatted: '',
      example: '+1234567890'
    };
  }
  
  // Check maximum length
  if (digitsOnly.length > 16) {
    return { 
      valid: false, 
      message: 'Phone number is too long',
      formatted: '',
      example: '+1234567890'
    };
  }
  
  // Validate country code (should be 1-4 digits after +)
  const countryCodeMatch = digitsOnly.match(/^\+\d{1,4}/);
  if (!countryCodeMatch) {
    return { 
      valid: false, 
      message: 'Invalid country code',
      formatted: '',
      example: '+1234567890'
    };
  }
  
  const countryCode = countryCodeMatch[0];
  const numberPart = digitsOnly.substring(countryCode.length);
  
  // Ensure number part has at least 4 digits
  if (numberPart.length < 4) {
    return { 
      valid: false, 
      message: 'Phone number is incomplete',
      formatted: '',
      example: '+1234567890'
    };
  }
  
  // Format the phone number nicely for display
  const formatted = formatPhoneNumber(cleanedPhone);
  
  // Get example for this country code
  const country = countryCodes.find(c => c.code === countryCode);
  const example = country ? country.example : '+1234567890';
  
  return { 
    valid: true, 
    message: 'Valid phone number',
    formatted,
    countryCode,
    example
  };
};

/**
 * Format phone number for display
 * @param {string} phone - Raw phone number
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (!cleaned.startsWith('+')) {
    return cleaned;
  }
  
  const countryCodeMatch = cleaned.match(/^(\+\d{1,4})/);
  if (!countryCodeMatch) return cleaned;
  
  const countryCode = countryCodeMatch[1];
  const numberPart = cleaned.substring(countryCode.length);
  
  // Format based on country code
  switch(countryCode) {
    case '+1': // US/Canada
      if (numberPart.length === 10) {
        return `+1 (${numberPart.substring(0, 3)}) ${numberPart.substring(3, 6)}-${numberPart.substring(6)}`;
      }
      break;
    case '+44': // UK
      if (numberPart.length === 10) {
        return `+44 ${numberPart.substring(0, 4)} ${numberPart.substring(4)}`;
      }
      break;
    case '+91': // India
      if (numberPart.length === 10) {
        return `+91 ${numberPart.substring(0, 5)} ${numberPart.substring(5)}`;
      }
      break;
    default:
      // Generic formatting: +XXX XXX XXX XXX
      let formatted = countryCode + ' ';
      for (let i = 0; i < numberPart.length; i += 3) {
        formatted += numberPart.substring(i, i + 3) + ' ';
      }
      return formatted.trim();
  }
  
  return cleaned;
};

/**
 * Get country name from phone number
 * @param {string} phone - Phone number
 * @returns {Object} - Country info or null
 */
export const getCountryInfoFromPhone = (phone) => {
  if (!phone || !phone.startsWith('+')) return null;
  
  const match = phone.match(/^\+\d{1,4}/);
  if (!match) return null;
  
  const countryCode = match[0];
  return countryCodes.find(c => c.code === countryCode) || null;
};

/**
 * Phone input mask for better UX
 * @param {string} value - Current input value
 * @returns {string} - Masked value
 */
export const phoneInputMask = (value) => {
  if (!value) return '+';
  
  // Ensure it starts with +
  if (!value.startsWith('+')) {
    return '+' + value.replace(/[^\d]/g, '');
  }
  
  // Keep only digits and +
  let cleaned = value.replace(/[^\d+]/g, '');
  
  // Ensure only one +
  if ((cleaned.match(/\+/g) || []).length > 1) {
    cleaned = '+' + cleaned.replace(/\+/g, '');
  }
  
  return cleaned;
};

/**
 * Generate example phone numbers for common countries
 * @returns {Array} - Array of example phone numbers
 */
export const getPhoneExamples = () => {
  return countryCodes.map(country => ({
    code: country.code,
    country: country.country,
    example: country.example
  }));
};