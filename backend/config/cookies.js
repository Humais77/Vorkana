// config/cookies.js - FIXED VERSION
const isProduction = process.env.NODE_ENV === 'production';
const isHTTPS = process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === 'true';

const getCookieConfig = (type = 'access') => {
  const baseConfig = {
    path: '/',
    domain: process.env.COOKIE_DOMAIN || (isProduction ? '.yourdomain.com' : undefined),
    secure: isHTTPS,
    sameSite: isProduction ? 'strict' : 'lax',
    httpOnly: type === 'csrf' ? false : true
  };

  switch (type) {
    case 'access':
      return {
        ...baseConfig,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        name: 'access_token'
      };
    case 'refresh':
      return {
        ...baseConfig,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/api/auth/refresh',
        name: 'refresh_token'
      };
    case 'csrf':
      return {
        ...baseConfig,
        httpOnly: false, // JS needs access
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProduction ? 'strict' : 'lax', // Important for CSRF
        name: 'XSRF-TOKEN'
      };
    default:
      return baseConfig;
  }
};

const setCookie = (res, name, value, type = 'access') => {
  const config = getCookieConfig(type);
  res.cookie(name, value, config);
  return value;
};

const clearCookie = (res, name, type = 'access') => {
  const config = getCookieConfig(type);
  res.clearCookie(name, config);
};

module.exports = {
  getCookieConfig,
  setCookie,
  clearCookie,
  isProduction,
  isHTTPS
};