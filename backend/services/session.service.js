// services/session.service.js
const Session = require('../models/session.model');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const mongoose = require('mongoose');
class SessionService {
  constructor() {
        this.idleTimeout = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    this.adminIdleTimeout = 1 * 60 * 60 * 1000; // 1 hour for admins
    this.sessionDuration = 30 * 24 * 60 * 60 * 1000; // 30 days for refresh tokens
    this.tokenDuration = 3 * 60 * 60 * 1000; // 3 hours for access token
    this.maxSessionsPerUser = 10;
 
  console.log('⏰ Session service initialized:', {
    sessionDuration: this.sessionDuration + 'ms',
    sessionDurationDays: this.sessionDuration / (24 * 60 * 60 * 1000),
    idleTimeout: this.idleTimeout + 'ms',
    idleTimeoutHours: this.idleTimeout / (60 * 60 * 1000)
  });
  }

 generateTokens(userId, role = 'user') {
  console.log('🔐 Generating production tokens for:', { userId, role });
  console.log('🔐 Token generation debug:', {
    currentTime: new Date().toISOString(),
    currentTimestamp: Math.floor(Date.now() / 1000)
  });
  
  try {
    // Define expiration in seconds (NOT milliseconds)
    const accessTokenExpiresIn = role === 'admin' ? 3600 : 10800; // 1h or 3h
    const refreshTokenExpiresIn = role === 'admin' ? 
      7 * 24 * 60 * 60 :  // 7 days
      30 * 24 * 60 * 60;  // 30 days
    
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    // Access token payload
    const accessTokenPayload = {
      id: userId,
      type: 'access',
      role: role,
      iat: currentTimestamp,
      exp: currentTimestamp + accessTokenExpiresIn
    };
    
    // Refresh token payload
    const refreshTokenPayload = {
      id: userId,
      type: 'refresh',
      role: role,
      iat: currentTimestamp,
      exp: currentTimestamp + refreshTokenExpiresIn
    };
    
    console.log('📊 Token payloads:', {
      accessToken: {
        expiresInSeconds: accessTokenExpiresIn,
        expiresAtTimestamp: accessTokenPayload.exp,
        expiresAtISO: new Date(accessTokenPayload.exp * 1000).toISOString()
      },
      refreshToken: {
        expiresInSeconds: refreshTokenExpiresIn,
        expiresAtTimestamp: refreshTokenPayload.exp,
        expiresAtISO: new Date(refreshTokenPayload.exp * 1000).toISOString()
      }
    });
console.log('📊 Token timing:', {
    accessTokenExpiresAt: new Date((currentTimestamp + accessTokenExpiresIn) * 1000).toISOString(),
    refreshTokenExpiresAt: new Date((currentTimestamp + refreshTokenExpiresIn) * 1000).toISOString(),
    currentTime: new Date().toISOString()
  });

    // Generate tokens
    const token = jwt.sign(
      accessTokenPayload,
      process.env.JWT_SECRET,
      { 
        issuer: 'Vorkanna',
        audience: 'Vorkanna-web'
      }
    );

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      {
        issuer: 'Vorkanna',
        audience: 'Vorkanna-web'
      }
    );

    return { token, refreshToken };
  } catch (error) {
    console.error('❌ Token generation failed:', error);
    throw new Error(`Failed to generate tokens: ${error.message}`);
  }
}
  async createSession(userId, req, metadata = {}) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const { token, refreshToken } = this.generateTokens(userId, user.role);
    
    // Get device info
    const parser = new UAParser(req.headers['user-agent']);
    const uaResult = parser.getResult();
    const ip = this.getClientIp(req);
    const geo = geoip.lookup(ip) || {};
    
    // Get CURRENT TIME for everything
    const currentTime = new Date();
    
    // CRITICAL: Logout old sessions with same device/ip to prevent conflicts
    await Session.updateMany(
      {
        userId,
        isActive: true,
        'deviceInfo.ip': ip,
        'deviceInfo.userAgent': req.headers['user-agent']
      },
      {
        isActive: false,
        logoutReason: 'new_login_same_device',
        logoutAt: currentTime
      }
    );
    
    // Calculate session expiration (30 days from NOW)
    const expiresAt = new Date(currentTime.getTime() + this.sessionDuration);
    
    // Create session object
    const sessionData = {
      userId,
      token,
      refreshToken,
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ip,
        browser: uaResult.browser.name || 'Unknown',
        os: uaResult.os.name || 'Unknown',
        device: uaResult.device.type || 'Desktop',
        location: {
          country: geo.country || 'Unknown',
          region: geo.region || 'Unknown',
          city: geo.city || 'Unknown'
        }
      },
      expiresAt: expiresAt,
      lastActivity: currentTime,
      loginAt: currentTime,
      metadata
    };

    const session = new Session(sessionData);
    await session.save();

    console.log('✅ New session created, old sessions logged out:', {
      sessionId: session._id,
      loginAt: session.loginAt.toISOString(),
      tokenPreview: token.substring(0, 20) + '...'
    });

    return {
      sessionId: session._id,
      token,
      refreshToken,
      expiresAt: session.expiresAt,
      idleTimeout: this.idleTimeout,
      userRole: user.role
    };

  } catch (error) {
    console.error('❌ Session creation error:', error);
    throw new Error(`Failed to create session: ${error.message}`);
  }
}

  async refreshSession(refreshToken) {
    try {
      console.log('🔄 Attempting to refresh session...');
      
      // Find active session by refreshToken
      const session = await Session.findOne({
        refreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (!session) {
        console.log('❌ No active session found with this refresh token');
        throw new Error('Invalid refresh token');
      }

      // Check if session is idle
      const idleTime = Date.now() - session.lastActivity.getTime();
      if (idleTime > this.idleTimeout) {
        console.log('⏰ Session idle, logging out');
        await session.logout('inactive');
        throw new Error('Session idle timeout');
      }

      // Generate new tokens
      const { token: newToken, refreshToken: newRefreshToken } = this.generateTokens(session.userId);

      // Update session with new tokens
      session.token = newToken;
      session.refreshToken = newRefreshToken;
      session.lastActivity = new Date();
      session.expiresAt = new Date(Date.now() + this.sessionDuration);
      await session.save();
      
      console.log('✅ Session refreshed successfully');

      return {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresAt: session.expiresAt,
        sessionId: session._id,
        userId: session.userId
      };
    } catch (error) {
      console.error('❌ Session refresh error:', error.message);
      throw error;
    }
  }
validateSession = async (token, refreshToken) => {
    try {
      // 1. Check if token exists
      if (!token && !refreshToken) {
        return { valid: false, reason: 'NO_TOKENS' };
      }
      
      // 2. Try to decode and validate access token
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          // Check expiration
          if (decoded.exp * 1000 < Date.now()) {
            return { valid: false, reason: 'TOKEN_EXPIRED' };
          }
          
          // Check session in database
          const session = await Session.findOne({
            token,
            isActive: true,
            expiresAt: { $gt: new Date() }
          });
          
          if (!session) {
            return { valid: false, reason: 'SESSION_NOT_FOUND' };
          }
          
          // Check idle timeout (3 hours for users, 1 hour for admins)
          const isAdmin = decoded.role === 'admin';
          const idleTimeout = isAdmin ? 3600000 : 10800000; // 1h or 3h
          
          if (Date.now() - session.lastActivity.getTime() > idleTimeout) {
            // Mark session as inactive
            await session.logout('idle_timeout');
            return { valid: false, reason: 'SESSION_IDLE' };
          }
          
          // Update activity
          session.lastActivity = new Date();
          await session.save({ validateBeforeSave: false });
          
          return { 
            valid: true, 
            userId: session.userId, 
            sessionId: session._id 
          };
        } catch (verifyError) {
          // Token invalid or expired
        }
      }
      
      // 3. Try to refresh using refresh token
      if (refreshToken) {
        try {
          return await this.refreshSession(refreshToken);
        } catch (refreshError) {
          return { valid: false, reason: 'REFRESH_FAILED' };
        }
      }
      
      return { valid: false, reason: 'INVALID_TOKENS' };
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false, reason: 'VALIDATION_ERROR' };
    }
  };

  async updateActivity(sessionId) {
    try {
      const session = await Session.findById(sessionId);
      if (!session || !session.isActive) {
        return null;
      }
      
      // Update last activity
      session.lastActivity = new Date();
      await session.save({ validateBeforeSave: false });
      return session;
    } catch (error) {
      console.error('Update activity error:', error);
      return null;
    }
  }

  async logoutSession(sessionId, userId, reason = 'manual') {
  try {
    // Check if sessionId is valid ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(sessionId);
    
    let session;
    
    if (isValidObjectId) {
      // Find session by ID
      session = await Session.findOne({
        _id: sessionId,
        userId,
        isActive: true
      });
    } else if (sessionId && sessionId !== 'unknown') {
      // Try to find by token or refreshToken
      session = await Session.findOne({
        $or: [
          { token: sessionId },
          { refreshToken: sessionId }
        ],
        userId,
        isActive: true
      });
    }
    
    if (session) {
      session.isActive = false;
      session.logoutReason = reason;
      session.logoutAt = new Date();
      await session.save({ validateBeforeSave: false });
      console.log(`✅ Session logged out: ${session._id} - ${reason}`);
      return true;
    }

    console.log(`ℹ️ Session not found or already inactive: ${sessionId}`);
    return false;
  } catch (error) {
    console.error('Logout session error:', error.message);
    return false;
  }
}

  // Logout all user sessions
  async logoutAllUserSessions(userId, excludeSessionId = null) {
    try {
      const query = {
        userId,
        isActive: true
      };
      
      if (excludeSessionId) {
        query._id = { $ne: excludeSessionId };
      }

      await Session.updateMany(query, {
        isActive: false,
        logoutReason: 'multiple_login',
        logoutAt: new Date()
      });

      console.log(`✅ All other sessions logged out for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Logout all sessions error:', error);
      return false;
    }
  }

  // Get user's active sessions
  async getUserSessions(userId) {
    try {
      const sessions = await Session.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).sort({ lastActivity: -1 });
      
      return sessions.map(session => ({
        id: session._id,
        deviceInfo: session.deviceInfo,
        loginAt: session.loginAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt
      }));
    } catch (error) {
      console.error('Get user sessions error:', error);
      return [];
    }
  }

  async cleanupExpired() {
  try {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    
    // Find sessions to delete
    const sessionsToDelete = await Session.find({
      $or: [
        { expiresAt: { $lt: now } },
        { 
          lastActivity: { $lt: threeHoursAgo },
          isActive: true
        }
      ]
    });
    
    // Delete them
    const deleteResult = await Session.deleteMany({
      $or: [
        { expiresAt: { $lt: now } },
        { 
          lastActivity: { $lt: threeHoursAgo },
          isActive: true
        }
      ]
    });
    
    console.log(`🧹 Service cleanup deleted ${deleteResult.deletedCount} sessions`);
    
    return deleteResult.deletedCount;
  } catch (error) {
    console.error('Service cleanup error:', error);
    return 0;
  }
}

  // Check session status
  async getSessionStatus(sessionId) {
    try {
      const session = await Session.findById(sessionId);
      
      if (!session) {
        return { exists: false };
      }

      const idleTime = Date.now() - session.lastActivity.getTime();
      
      return {
        exists: true,
        isActive: session.isActive,
        isExpired: session.expiresAt < new Date(),
        isIdle: idleTime > this.idleTimeout,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        logoutReason: session.logoutReason
      };
    } catch (error) {
      console.error('Get session status error:', error);
      return { exists: false };
    }
  }

  // Utility: Get client IP
  getClientIp(req) {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           '0.0.0.0';
  }

  // Start cleanup cron job
  startCleanupJob() {
    // Clean up expired sessions every hour
    setInterval(async () => {
      try {
        await this.cleanupExpired();
      } catch (error) {
        console.error('Cleanup job error:', error);
      }
    }, 60 * 60 * 1000); // Every hour
    
    console.log('✅ Session cleanup job started');
  }
}

module.exports = new SessionService();