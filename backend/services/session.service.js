const Session = require('../models/session.model');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const mongoose = require('mongoose');

class SessionService {
  constructor() {
    this.idleTimeout = 3 * 60 * 60 * 1000; // 3 hours
    this.sessionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.maxSessionsPerUser = 5; // Maximum active sessions per user
  }

  // Generate tokens
  generateTokens(userId) {
    const token = jwt.sign(
      { 
        id: userId, 
        type: 'access',
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');

    return { token, refreshToken };
  }

 async createSession(userId, req, metadata = {}) {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected during session creation!');
      throw new Error('DB not ready');
    }
    const { token, refreshToken } = this.generateTokens(userId);
    
    // Parse user agent
    const parser = new UAParser(req.headers['user-agent']);
    const uaResult = parser.getResult();
    
    // Get location from IP
    const ip = this.getClientIp(req);
    const geo = geoip.lookup(ip) || {};
    
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

    // Clean up old sessions
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await Session.deleteMany({
      userId,
      isActive: false,
      logoutAt: { $lt: thirtyDaysAgo }
    });

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

    // Save session with error handling
    const session = new Session(sessionData);
    try {
      await session.save({ w: 1 }); // wait for write confirmation
      console.log('Session saved with _id:', session._id);
    } catch (saveErr) {
      console.error('CRITICAL: Session save failed!', saveErr);
      throw saveErr;
    }
    
    // DEBUG: Log session creation
    console.log('🎯 Session created successfully:', {
      sessionId: session._id,
      userId: session.userId,
      tokenLength: session.token?.length,
      refreshTokenLength: session.refreshToken?.length,
      refreshTokenStart: session.refreshToken?.substring(0, 20) + '...'
    });

 const justSaved = await Session.findById(session._id);
    if (!justSaved) {
      throw new Error('Session disappeared right after save!');
    }

    return {
      sessionId: session._id,
      token,
      refreshToken,
      expiresAt: session.expiresAt,
      idleTimeout: this.idleTimeout
    };

  } catch (error) {
    console.error('❌ Session creation error:', error);
    throw new Error(`Failed to create session: ${error.message}`);
  }
}
async refreshSession(refreshToken) {
  try {
    console.log('🔄 Refresh session attempt:', {
      refreshTokenLength: refreshToken?.length,
      refreshTokenStart: refreshToken?.substring(0, 20) + '...'
    });
const session = await Session.findOne({
    refreshToken: refreshToken, // exact string match
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
  

    console.log('🔍 Session search result:', {
      found: !!session,
      sessionId: session?._id,
      isActive: session?.isActive,
      expiresAt: session?.expiresAt,
      now: new Date()
    });
if (!session) {
    // Debug: search any similar token
    const similar = await Session.findOne({
      refreshToken: { $regex: refreshToken.substring(0, 20) }
    });
    console.log('No exact match, but similar found?', !!similar);
    throw new Error('Invalid refresh token - not found in DB');
  }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      console.log('⏰ Session expired, logging out');
      await Session.logoutSession(session._id, 'expired');
      throw new Error('Session expired');
    }

    // Check idle timeout
    if (session.isIdle) {
      console.log('💤 Session idle, logging out');
      await Session.logoutSession(session._id, 'expired');
      throw new Error('Session idle timeout');
    }

    // Generate new tokens
    const { token: newToken, refreshToken: newRefreshToken } = this.generateTokens(session.userId);

     session.token = newToken;
    session.refreshToken = newRefreshToken;
    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await session.save(); 
    console.log('✅ Session refreshed successfully:', {
      sessionId: session._id,
      newTokenLength: newToken?.length,
      newRefreshTokenLength: newRefreshToken?.length
    });

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt: session.expiresAt,
      sessionId: session._id
    };
  } catch (error) {
    console.error('❌ Session refresh error:', error.message, error.stack);
    throw error;
  }
}
  async validateSession(token, refreshToken) {
    try {
      // Find active session
      const session = await Session.findOne({
        token,
        refreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (!session) {
        return { valid: false, error: 'Session not found' };
      }

      // Check idle timeout
      const idleTime = Date.now() - session.lastActivity.getTime();
      if (idleTime > this.idleTimeout) {
        await session.logout('inactive');
        return { valid: false, error: 'Session idle timeout' };
      }

      // Verify JWT token
      try {
        jwt.verify(token, process.env.JWT_SECRET);
      } catch (jwtError) {
        // Token expired, try to refresh
        if (jwtError.name === 'TokenExpiredError') {
          const newTokens = this.generateTokens(session.userId);
          await session.refreshTokens(newTokens.token, newTokens.refreshToken);
          
          return {
            valid: true,
            userId: session.userId,
            token: newTokens.token,
            refreshToken: newTokens.refreshToken,
            sessionId: session._id,
            lastActivity: session.lastActivity,
            refreshed: true
          };
        }
        throw jwtError;
      }

      // Update last activity
      await session.updateActivity();

      return {
        valid: true,
        userId: session.userId,
        token: session.token,
        refreshToken: session.refreshToken,
        sessionId: session._id,
        lastActivity: session.lastActivity,
        refreshed: false
      };
    } catch (error) {
      console.error('Session validation error:', error.message);
      return { valid: false, error: error.message };
    }
  }

  async updateActivity(sessionId) {
    try {
      const session = await Session.findById(sessionId);
      if (!session || !session.isActive) {
        return null;
      }
      
      // Check if session is idle
      if (session.isIdle) {
        await session.logout('inactive');
        return null;
      }
      
      // Use the instance method
      await session.updateActivity();
      return session;
    } catch (error) {
      console.error('Update activity error:', error);
      return null;
    }
  }


 async logoutSession(sessionId, userId, reason = 'manual') {
  const session = await Session.findOne({
    _id: sessionId,
    userId,
    isActive: true
  });

  if (session) {
    // FIX: Call the instance method
    await session.logout(reason);
    return true;
  }

  return false;
}

  // Logout all user sessions
  async logoutAllUserSessions(userId, excludeSessionId = null) {
    await Session.deactivateUserSessions(userId, excludeSessionId);
    return true;
  }

  // Get user's active sessions
  async getUserSessions(userId) {
    const sessions = await Session.getActiveSessions(userId);
    
    return sessions.map(session => ({
      id: session._id,
      deviceInfo: session.deviceInfo,
      loginAt: session.loginAt,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      isCurrent: false // This will be set by the middleware
    }));
  }

  // Cleanup expired sessions (cron job)
  async cleanup() {
    try {
      const result = await Session.cleanupExpired();
      console.log(`Cleaned up ${result.deletedCount} expired sessions`);
      return result.deletedCount;
    } catch (error) {
      console.error('Session cleanup error:', error);
      return 0;
    }
  }

  // Check session status
  async getSessionStatus(sessionId) {
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return { exists: false };
    }

    return {
      exists: true,
      isActive: session.isActive,
      isExpired: session.isExpired,
      isIdle: session.isIdle,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      logoutReason: session.logoutReason
    };
  }

  // Get session by ID
  async getSessionById(sessionId) {
    return Session.findById(sessionId);
  }

  // Utility: Get client IP
  getClientIp(req) {
    return req.ip || 
           req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           '0.0.0.0';
  }

  // Utility: Parse user agent
  parseUserAgent(userAgent) {
    const parser = new UAParser(userAgent);
    return parser.getResult();
  }
}

module.exports = new SessionService();