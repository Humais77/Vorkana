// config/cookies.js
const crypto = require('crypto');

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const isHTTPS = process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === 'true';

console.log('🔧 Cookie Configuration:', {
  isProduction,
  isHTTPS,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN
});

// Production cookie configuration
const getCookieConfig = () => {
  const baseConfig = {
    path: '/',
    domain: process.env.COOKIE_DOMAIN || (isProduction ? '.yourdomain.com' : undefined),
    secure: isHTTPS, // Force HTTPS in production
    sameSite: isProduction ? 'strict' : 'lax', // Explicitly set
    httpOnly: true
  };

  return {
    // Access token (7 days)
    accessToken: {
      ...baseConfig,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      name: 'access_token'
    },
    
    // Refresh token (30 days, restricted path)
    refreshToken: {
      ...baseConfig,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
      name: 'refresh_token'
    },
    
    // CSRF token (24 hours, not HttpOnly)
    csrfToken: {
      ...baseConfig,
      httpOnly: false, // JavaScript needs access
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: isProduction ? 'strict' : 'lax',
      name: 'XSRF-TOKEN'
    },
    
    // OAuth state
    oauthState: {
      ...baseConfig,
      maxAge: 10 * 60 * 1000, // 10 minutes
      signed: true,
      name: 'oauth_state'
    }
  };
};

// Helper function to set cookies with proper configuration
const setCookie = (res, name, value, options = {}) => {
  const config = getCookieConfig();
  const cookieConfig = config[name] || config.accessToken;
  
  const finalOptions = {
    ...cookieConfig,
    ...options,
    // Override with environment variables if set
    secure: process.env.COOKIE_SECURE === 'true' ? true : cookieConfig.secure,
    sameSite: process.env.COOKIE_SAMESITE || cookieConfig.sameSite
  };
  
  // Remove undefined values
  Object.keys(finalOptions).forEach(key => {
    if (finalOptions[key] === undefined) {
      delete finalOptions[key];
    }
  });
  
  console.log(`🍪 Setting cookie ${name}:`, finalOptions);
  return res.cookie(name, value, finalOptions);
};

// Helper to clear cookies
const clearCookie = (res, name) => {
  const config = getCookieConfig();
  const cookieConfig = config[name] || config.accessToken;
  
  res.clearCookie(name, {
    path: cookieConfig.path,
    domain: cookieConfig.domain,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    httpOnly: cookieConfig.httpOnly
  });
};

module.exports = {
  getCookieConfig,
  setCookie,
  clearCookie,
  isProduction,
  isHTTPS
};