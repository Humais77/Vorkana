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

  }

 generateTokens(userId, role = 'user') {
  console.log('🔐 Generating tokens for:', { userId, role });
  
  try {
    // Generate access token
    const token = jwt.sign(
      { 
        id: userId, 
        type: 'access',
        role: role
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: role === 'admin' ? '1h' : '3h',
        issuer: 'Vorkanna',
        audience: 'Vorkanna-web'
      }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        id: userId,
        type: 'refresh',
        role: role
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      {
        expiresIn: role === 'admin' ? '7d' : '30d',
        issuer: 'Vorkanna',
        audience: 'Vorkanna-web'
      }
    );

    // Verify tokens were created
    const decodedToken = jwt.decode(token);
    const decodedRefresh = jwt.decode(refreshToken);
    
    console.log('✅ Tokens generated successfully:', {
      accessToken: {
        expiresAt: decodedToken.exp ? new Date(decodedToken.exp * 1000).toISOString() : null,
        expiresInMinutes: decodedToken.exp ? Math.round((decodedToken.exp * 1000 - Date.now()) / 1000 / 60) : null
      },
      refreshToken: {
        expiresAt: decodedRefresh.exp ? new Date(decodedRefresh.exp * 1000).toISOString() : null,
        expiresInDays: decodedRefresh.exp ? Math.round((decodedRefresh.exp * 1000 - Date.now()) / 1000 / 60 / 60 / 24) : null
      }
    });

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
      
      // Clean up old sessions
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await Session.deleteMany({
        userId,
        isActive: false,
        logoutAt: { $lt: oneDayAgo }
      });

      // Check active sessions count
      const activeSessions = await Session.countDocuments({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      // Enforce maximum sessions
      if (activeSessions >= this.maxSessionsPerUser) {
        const oldestSession = await Session.findOne({
          userId,
          isActive: true
        }).sort({ lastActivity: 1 });

        if (oldestSession) {
          await oldestSession.logout('multiple_login');
        }
      }

      // Get device info
      const parser = new UAParser(req.headers['user-agent']);
      const uaResult = parser.getResult();
      const ip = this.getClientIp(req);
      const geo = geoip.lookup(ip) || {};

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
        expiresAt: new Date(Date.now() + this.sessionDuration),
        metadata
      };

      const session = new Session(sessionData);
      await session.save();

      console.log('✅ Session created:', {
        sessionId: session._id,
        userId: session.userId,
        expiresAt: session.expiresAt
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
    
    // FIX: Find session with proper criteria
    const session = await Session.findOne({
      userId: decoded.id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    
    if (!session) {
      console.log('📝 Session not found in database');
      if (refreshToken) {
        return await this.refreshSession(refreshToken);
      }
      return { valid: false, error: 'Session not found' };
    }
    
    // FIX: Calculate idle time correctly (3 hours for users, 1 hour for admins)
    const isAdmin = decoded.role === 'admin';
    const idleTimeout = isAdmin ? this.adminIdleTimeout : this.idleTimeout;
    const idleTime = Date.now() - session.lastActivity.getTime();
    
    console.log(`⏱️ Idle check: ${Math.round(idleTime/1000/60)}min / ${Math.round(idleTimeout/1000/60)}min timeout`);
    
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
    
    console.log('✅ Session validated successfully');
    
    return {
      valid: true,
      userId: session.userId,
      sessionId: session._id,
      token: token, // Return original token
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