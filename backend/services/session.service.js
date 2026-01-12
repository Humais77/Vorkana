// services/session.service.js
const Session = require('../models/session.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

class SessionService {
  constructor() {
    this.idleTimeout = 15 * 60 * 1000; // 15 minutes
    this.sessionDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.tokenDuration = 60 * 60 * 1000; // 1 hour for access token
    this.maxSessionsPerUser = 10;
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
      const { token, refreshToken } = this.generateTokens(userId);
      
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
        idleTimeout: this.idleTimeout
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
      // First, try to find session by access token
      let session = await Session.findOne({
        token,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      // If not found by token but we have refreshToken, try that
      if (!session && refreshToken) {
        session = await Session.findOne({
          refreshToken,
          isActive: true,
          expiresAt: { $gt: new Date() }
        });
      }

      if (!session) {
        return { valid: false, error: 'Session not found' };
      }

      // Check if session is idle
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
          console.log('🔄 Access token expired, attempting refresh...');
          const newTokens = this.generateTokens(session.userId);
          
          session.token = newTokens.token;
          session.refreshToken = newTokens.refreshToken;
          session.lastActivity = new Date();
          session.expiresAt = new Date(Date.now() + this.sessionDuration);
          await session.save();
          
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
      session.lastActivity = new Date();
      await session.save({ validateBeforeSave: false });

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

  // FIXED: Proper logoutSession method
  async logoutSession(sessionId, userId, reason = 'manual') {
    try {
      const session = await Session.findOne({
        _id: sessionId,
        userId,
        isActive: true
      });

      if (session) {
        session.isActive = false;
        session.logoutReason = reason;
        session.logoutAt = new Date();
        await session.save({ validateBeforeSave: false });
        console.log(`✅ Session logged out: ${sessionId} - ${reason}`);
        return true;
      }

      console.log(`❌ Session not found or already inactive: ${sessionId}`);
      return false;
    } catch (error) {
      console.error('Logout session error:', error);
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
      const result = await Session.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { 
            isActive: false,
            logoutAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        ]
      });
      
      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} expired sessions`);
      }
      
      return result.deletedCount;
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