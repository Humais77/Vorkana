const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceInfo: {
    userAgent: String,
    ip: String,
    browser: String,
    os: String,
    device: String,
    location: {
      country: String,
      region: String,
      city: String,
      lat: Number,
      lon: Number
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
    expires: 0 // Auto-delete after expiration
  },
  loginAt: {
    type: Date,
    default: Date.now
  },
  logoutAt: {
    type: Date
  },
  logoutReason: {
    type: String,
    enum: ['manual', 'inactive', 'security', 'system', 'multiple_login']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1, isActive: 1 });
sessionSchema.index({ lastActivity: 1 });
sessionSchema.index({ 'deviceInfo.ip': 1, userId: 1 });
sessionSchema.index({ userId: 1, isActive: 1, expiresAt: 1 });
sessionSchema.index({ token: 1, refreshToken: 1 });

// Virtuals
sessionSchema.virtual('duration').get(function() {
  const logoutTime = this.logoutAt || new Date();
  return logoutTime - this.loginAt;
});

sessionSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

sessionSchema.virtual('isIdle').get(function() {
  const idleTimeout = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
  return (Date.now() - this.lastActivity) > idleTimeout;
});

// Instance Methods
sessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  // Extend expiration when activity is updated
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return this.save();
};

sessionSchema.statics.refreshTokens = async function (sessionId, newToken, newRefreshToken) {
  const session = await this.findById(sessionId);
  if (!session) throw new Error('Session not found');
  
  session.token = newToken;
  session.refreshToken = newRefreshToken;
  session.lastActivity = new Date();
  session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  await session.save();
  return session;
};

// Add this instance method
sessionSchema.methods.refreshTokensInstance = async function (newToken, newRefreshToken) {
  this.token = newToken;
  this.refreshToken = newRefreshToken;
  this.lastActivity = new Date();
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  await this.save();
  return this;
};

sessionSchema.methods.logout = async function (reason = 'manual') {
  this.isActive = false;
  this.logoutAt = new Date();
  this.logoutReason = reason;
  
  await this.save();
  return true;
};
// Static Methods
sessionSchema.statics.cleanupExpired = async function() {
  const now = new Date();
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: now } },
      { 
        lastActivity: { 
          $lt: new Date(now.getTime() - (3 * 60 * 60 * 1000)) // 3 hours idle
        },
        isActive: true
      }
    ]
  });
};

sessionSchema.statics.deactivateUserSessions = async function(userId, excludeSessionId = null) {
  const query = { userId, isActive: true };
  
  if (excludeSessionId) {
    query._id = { $ne: excludeSessionId };
  }
  
  return this.updateMany(query, {
    $set: {
      isActive: false,
      logoutAt: new Date(),
      logoutReason: excludeSessionId ? 'multiple_login' : 'system'
    }
  });
};

sessionSchema.statics.getActiveSessions = function(userId) {
  const now = new Date();
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: now },
    lastActivity: { 
      $gt: new Date(now.getTime() - (3 * 60 * 60 * 1000)) // Not idle for 3 hours
    }
  }).sort({ lastActivity: -1 });
};

sessionSchema.statics.findByRefreshToken = function(refreshToken) {
  console.log('🔍 Searching for session by refresh token:', {
    refreshTokenLength: refreshToken?.length,
    refreshTokenStart: refreshToken?.substring(0, 20) + '...'
  });
  
  return this.findOne({
    refreshToken,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;