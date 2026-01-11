class CookieUtils {
  static getOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const baseOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' : 'lax', // 'lax' works better than 'strict' for most cases
      path: '/'
    };
    
    // Add domain in production if specified
    if (isProduction && process.env.COOKIE_DOMAIN) {
      baseOptions.domain = process.env.COOKIE_DOMAIN;
    }
    
    return baseOptions;
  }

  static setAuthCookies(res, token, refreshToken, userData = null) {
    const options = this.getOptions();
    
    // Access token - 1 hour
    res.cookie('token', token, {
      ...options,
      maxAge: 60 * 60 * 1000
    });
    
    // Refresh token - 7 days (on specific path)
    res.cookie('refreshToken', refreshToken, {
      ...options,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh'
    });
    
    // Non-HTTPOnly cookies for frontend
    res.cookie('isAuthenticated', 'true', {
      ...options,
      httpOnly: false,
      maxAge: 60 * 60 * 1000
    });
    
    if (userData) {
      res.cookie('userInfo', JSON.stringify({
        id: userData._id,
        name: userData.name,
        email: userData.email,
        role: userData.role
      }), {
        ...options,
        httpOnly: false,
        maxAge: 60 * 60 * 1000
      });
    }
  }

  static clearAuthCookies(res) {
    const options = this.getOptions();
    
    // Clear current cookies
    res.clearCookie('token', options);
    res.clearCookie('refreshToken', { ...options, path: '/api/auth/refresh' });
    res.clearCookie('isAuthenticated', { ...options, httpOnly: false });
    res.clearCookie('userInfo', { ...options, httpOnly: false });
    
    // Clear all possible variations
    ['adminAccessToken', 'adminRefreshToken', 'access_token', 'refresh_token'].forEach(cookie => {
      res.clearCookie(cookie, options);
      res.clearCookie(cookie, { ...options, path: '/' });
      res.clearCookie(cookie, { ...options, path: '/api' });
    });
  }

  static parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        cookies[key] = decodeURIComponent(value);
      }
    });
    
    return cookies;
  }
}

module.exports = CookieUtils;