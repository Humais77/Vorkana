// services/session.service.js
const Session = require('../models/session.model');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
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
  
  // Use server time consistently
  const currentTime = Date.now();
  const currentTimestamp = Math.floor(currentTime / 1000);
  
  // Access token: 3 hours for users, 1 hour for admins
  const accessTokenExpiresIn = role === 'admin' ? 3600 : 10800;
  const accessTokenExpiresAt = currentTimestamp + accessTokenExpiresIn;
  
  // Refresh token: 30 days for users, 7 days for admins
  const refreshTokenExpiresIn = role === 'admin' ? 
    7 * 24 * 60 * 60 :  // 7 days
    30 * 24 * 60 * 60;  // 30 days
  const refreshTokenExpiresAt = currentTimestamp + refreshTokenExpiresIn;
  
  console.log('🕒 Token timing (server time):', {
    currentTime: new Date(currentTime).toISOString(),
    accessToken: {
      expiresIn: accessTokenExpiresIn,
      expiresAt: new Date(accessTokenExpiresAt * 1000).toISOString()
    },
    refreshToken: {
      expiresIn: refreshTokenExpiresIn,
      expiresAt: new Date(refreshTokenExpiresAt * 1000).toISOString()
    }
  });

  // Generate access token
  const token = jwt.sign(
    {
      id: userId,
      type: 'access',
      role: role,
      iat: currentTimestamp,
      exp: accessTokenExpiresAt
    },
    process.env.JWT_SECRET,
    { 
      issuer: 'Vorkanna',
      audience: 'Vorkanna-web'
    }
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      id: userId,
      type: 'refresh',
      role: role,
      iat: currentTimestamp,
      exp: refreshTokenExpiresAt
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      issuer: 'Vorkanna',
      audience: 'Vorkanna-web'
    }
  );

  return { token, refreshToken };
}
  async createSession(userId, req, metadata = {}) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // IMPORTANT: Use current time for everything
    const currentTime = new Date();
    
    // Generate tokens with proper expiration
    const { token, refreshToken } = this.generateTokens(userId, user.role);
    
    // Get device info
    const parser = new UAParser(req.headers['user-agent']);
    const uaResult = parser.getResult();
    const ip = this.getClientIp(req);
    
    // Calculate expiration (30 days from now)
    const refreshDuration =
  String(user.role || "user").toLowerCase() === "admin"
    ? 7 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;

const expiresAt = new Date(currentTime.getTime() + refreshDuration);
    
    console.log('📅 Session timing:', {
      currentTime: currentTime.toISOString(),
      expiresAt: expiresAt.toISOString(),
      sessionDuration: this.sessionDuration,
      sessionDurationDays: this.sessionDuration / (24 * 60 * 60 * 1000)
    });
    
    // Create session document
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
      },
      expiresAt: expiresAt,
      lastActivity: currentTime,
      loginAt: currentTime,
      isActive: true,
      metadata: {
        ...metadata,
        loginMethod: 'google_oauth'
      }
    };

    const session = new Session(sessionData);
    await session.save();

    console.log('✅ Session created:', {
      sessionId: session._id,
      userId: userId,
      expiresAt: session.expiresAt.toISOString(),
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
    console.log("🔄 Attempting to refresh session...");

    if (!refreshToken) {
      throw new Error("Missing refresh token");
    }

    // Find the active session associated with this refresh token.
    const session = await Session.findOne({
      refreshToken,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      console.log("❌ No active session found with this refresh token");
      throw new Error("Invalid refresh token");
    }

    // Always read the current role from the database.
    const user = await User.findById(session.userId).select("role isActive");

    if (!user || user.isActive === false) {
      session.isActive = false;
      session.logoutReason = "account_unavailable";
      session.logoutAt = new Date();
      await session.save({ validateBeforeSave: false });

      throw new Error("Account unavailable");
    }

    const role =
      String(user.role || "user").toLowerCase() === "admin"
        ? "admin"
        : "user";

    // Apply the appropriate idle timeout.
    const idleTimeout =
      role === "admin" ? this.adminIdleTimeout : this.idleTimeout;

    const idleTime = Date.now() - session.lastActivity.getTime();

    if (idleTime > idleTimeout) {
      await session.logoutAt("inactive");
      throw new Error("Session idle timeout");
    }

    // Generate tokens using the real database role.
    const {
      token: newToken,
      refreshToken: newRefreshToken,
    } = this.generateTokens(session.userId, role);

    // Keep the database session expiry aligned with the refresh-token lifetime.
    const refreshDuration =
      role === "admin"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;

    session.token = newToken;
    session.refreshToken = newRefreshToken;
    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + refreshDuration);

    await session.save();

    console.log("✅ Session refreshed successfully:", {
      sessionId: String(session._id),
      userId: String(session.userId),
      role,
      expiresAt: session.expiresAt.toISOString(),
    });

    return {
      valid: true,
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt: session.expiresAt,
      sessionId: session._id,
      userId: session.userId,
      role,
      isAdmin: role === "admin",
    };
  } catch (error) {
    console.error("❌ Session refresh error:", error.message);
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
            await session.logoutAt('idle_timeout');
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
    console.log(`🔐 Attempting to logout session: ${sessionId} for user: ${userId}, reason: ${reason}`);
    
    let session = null;
    
    // TRY MULTIPLE WAYS TO FIND THE SESSION
    
    // 1. Try by session ID (MongoDB ObjectId)
    if (mongoose.Types.ObjectId.isValid(sessionId)) {
      session = await Session.findOne({
        _id: sessionId,
        isActive: true
      });
    }
    
    // 2. Try by token
    if (!session && sessionId && sessionId.length > 100) {
      session = await Session.findOne({
        token: sessionId,
        isActive: true
      });
    }
    
    // 3. Try by refresh token
    if (!session && sessionId && sessionId.length > 100) {
      session = await Session.findOne({
        refreshToken: sessionId,
        isActive: true
      });
    }
    
    // 4. Try by user ID and any matching identifier
    if (!session && userId) {
      session = await Session.findOne({
        userId,
        isActive: true,
        $or: [
          { token: sessionId },
          { refreshToken: sessionId },
          { _id: mongoose.Types.ObjectId.isValid(sessionId) ? sessionId : null }
        ].filter(Boolean)
      });
    }
    
    if (session) {
      console.log(`✅ Found session to logout: ${session._id}`);
      
      // COMPLETELY INVALIDATE THE SESSION
      session.isActive = false;
      session.logoutReason = reason;
      session.logoutAt = new Date();
      session.token = `invalidated_${Date.now()}`;
      session.refreshToken = `invalidated_${Date.now()}`;
      session.lastActivity = new Date(); // Set to now to prevent reuse
      
      await session.save({ validateBeforeSave: false });
      
      console.log(`✅ Session logged out: ${session._id} - ${reason}`);
      return true;
    } else {
      console.log(`ℹ️ No active session found for: ${sessionId}`);
      
      // Even if not found, try to mark any session with this user as inactive
      if (userId) {
        const result = await Session.updateMany(
          {
            userId: userId,
            isActive: true,
            $or: [
              { token: sessionId },
              { refreshToken: sessionId }
            ]
          },
          {
            $set: {
              isActive: false,
              logoutReason: `${reason}_not_found`,
              logoutAt: new Date()
            }
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`✅ Marked ${result.modifiedCount} sessions as inactive`);
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ Logout session error:', error.message);
    
    // Try a direct database update as fallback
    try {
      if (userId) {
        await Session.updateMany(
          { userId: userId, isActive: true },
          {
            $set: {
              isActive: false,
              logoutReason: 'error_fallback',
              logoutAt: new Date()
            }
          }
        );
      }
    } catch (fallbackError) {
      console.error('Fallback logout also failed:', fallbackError.message);
    }
    
    return false;
  }
}

  // services/session.service.js - COMPLETE FIX
async logoutAllUserSessions(userId, excludeSessionId = null) {
  try {
    console.log(`🧹 LOGOUT ALL: Terminating ALL sessions for user: ${userId}`);
    
    // DON'T SET TOKEN TO UNIQUE VALUES - IT'S ALREADY A UNIQUE INDEX
    // Just mark as inactive without changing the token (which causes duplicate key error)
    
    const query = {
      userId: userId,
      isActive: true
    };

    // ONLY UPDATE isActive status, don't touch tokens
    const result = await Session.updateMany(query, {
      $set: {
        isActive: false,
        logoutReason: 'logout_all',
        logoutAt: new Date(),
        lastActivity: new Date()
      }
    });

    console.log(`✅ LOGOUT ALL: Marked ${result.modifiedCount} sessions as inactive for user: ${userId}`);
    
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Logout all sessions error:', error);
    return 0;
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