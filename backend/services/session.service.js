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
async validateSession(token, refreshToken) {
  try {
    console.log('🔍 Session validation started');
    
    if (!token) {
      console.log('❌ No token provided');
      return { valid: false, error: 'No token provided' };
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified successfully:', {
        id: decoded.id,
        role: decoded.role,
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        expiresIn: Math.round((decoded.exp * 1000 - Date.now()) / 1000 / 60) + ' minutes'
      });
    } catch (verifyError) {
      if (verifyError.name === 'TokenExpiredError') {
        console.log('⏰ Token expired, attempting refresh...');
        if (refreshToken) {
          return await this.refreshSession(refreshToken);
        }
        return { valid: false, error: 'Token expired, no refresh token' };
      }
      console.log('❌ Token verification failed:', verifyError.message);
      return { valid: false, error: 'Invalid token' };
    }
    
    // CRITICAL FIX: Find session by token (not just userId)
    const session = await Session.findOne({
      token: token,  // Match the exact token
      userId: decoded.id,
      isActive: true
    });
    
    if (!session) {
      console.log('📝 Session not found in database for this token');
      
      // Try to find by refresh token
      const refreshSession = await Session.findOne({
        refreshToken: refreshToken,
        userId: decoded.id,
        isActive: true
      });
      
      if (refreshSession) {
        console.log('🔄 Found session by refresh token');
        return {
          valid: true,
          userId: refreshSession.userId,
          sessionId: refreshSession._id,
          token: refreshSession.token,
          refreshToken: refreshSession.refreshToken,
          lastActivity: refreshSession.lastActivity,
          isAdmin: decoded.role === 'admin'
        };
      }
      
      if (refreshToken) {
        return await this.refreshSession(refreshToken);
      }
      return { valid: false, error: 'Session not found' };
    }
    
    // Check if session is expired (by expiresAt field)
    if (session.expiresAt < new Date()) {
      console.log('⏰ Session expired in database');
      await this.logoutSession(session._id, session.userId, 'expired');
      if (refreshToken) {
        return await this.refreshSession(refreshToken);
      }
      return { valid: false, error: 'Session expired' };
    }
    
    // Calculate idle time correctly
    const isAdmin = decoded.role === 'admin';
    const idleTimeout = isAdmin ? this.adminIdleTimeout : this.idleTimeout;
    const idleTime = Date.now() - session.lastActivity.getTime();
    
    console.log(`⏱️ Idle check: ${Math.round(idleTime/1000/60)}min / ${Math.round(idleTimeout/1000/60)}min timeout`);
    console.log('⏱️ Detailed idle check:', {
      idleTimeMs: idleTime,
      idleTimeMinutes: Math.round(idleTime / 1000 / 60),
      idleTimeoutMs: idleTimeout,
      idleTimeoutMinutes: Math.round(idleTimeout / 1000 / 60),
      lastActivity: session.lastActivity,
      currentTime: new Date(),
      sessionId: session._id,
      tokenMatches: session.token === token,
      expiresAt: session.expiresAt
    });
    
    // Only timeout if idle for too long
    if (idleTime > idleTimeout) {
      console.log(`⏰ Session idle timeout reached (${isAdmin ? 'admin' : 'user'})`);
      await this.logoutSession(session._id, session.userId, 'timeout');
      return { 
        valid: false, 
        error: isAdmin ? 'Admin session timeout (1 hour)' : 'Session timeout (3 hours)',
        reason: 'timeout'
      };
    }
    
    // Update activity only if not idle
    session.lastActivity = new Date();
    await session.save({ validateBeforeSave: false });
    
    console.log('✅ Session validated successfully:', {
      sessionId: session._id,
      lastActivityUpdated: session.lastActivity.toISOString()
    });
    
    return {
      valid: true,
      userId: session.userId,
      sessionId: session._id,
      token: session.token,
      refreshToken: session.refreshToken,
      lastActivity: session.lastActivity,
      isAdmin,
      idleTimeout,
      timeLeft: idleTimeout - idleTime
    };
  } catch (error) {
    console.error('❌ Session validation error:', error.message);
    return { valid: false, error: error.message };
  }
}

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

  // Cleanup expired sessions
  async cleanupExpired() {
  try {
    const now = new Date();
    
    // Find and logout expired sessions
    const expiredSessions = await Session.find({
      expiresAt: { $lt: now },
      isActive: true
    });
    
    // Logout each expired session
    for (const session of expiredSessions) {
      await session.logout('expired');
    }
    
    // Delete very old inactive sessions (older than 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oldSessions = await Session.deleteMany({
      isActive: false,
      logoutAt: { $lt: sevenDaysAgo }
    });
    
    if (expiredSessions.length > 0 || oldSessions.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions, ${oldSessions.deletedCount} old sessions`);
    }
    
    return expiredSessions.length + oldSessions.deletedCount;
  } catch (error) {
    console.error('Session cleanup error:', error);
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