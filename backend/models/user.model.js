const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    // ========== AUTHENTICATION & SECURITY FIELDS ==========
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    name: {
      type: String,
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
      default: '' // Make not required for pending registrations
    },
    password: {
      type: String,
      select: false,
      minlength: [8, 'Password must be at least 8 characters'],
      required: function () {
        return !this.googleId && this.registrationStatus === 'verified';
      },
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow empty for pending registrations
          if (v.startsWith('$2a$') || v.startsWith('$2b$')) {
            return true;
          }
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(v);
        },
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character (@$!%*?&)'
      }
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function (v) {
          return validator.isEmail(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    
    // ========== REGISTRATION VERIFICATION FIELDS ==========
    registrationStatus: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'cancelled'],
      default: 'pending',
    },
    registrationData: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
      default: null
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false
    },
    registrationExpiresAt: {
      type: Date,
      select: false
    },
    
    // ========== PROFILE INFORMATION (Visible to other users) ==========
    picture: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          return v === null || validator.isURL(v, { 
            protocols: ['http', 'https'],
            require_protocol: true 
          });
        },
        message: 'Please enter a valid URL for the picture'
      }
    },
    pictureHistory: [{
      url: String,
      public_id: String,
      uploadedAt: Date,
      _id: false
    }],
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: ''
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (v) {
          if (!v || v.trim() === '') return true; // optional
          
          const phoneStr = v.toString().trim();
          
          // Basic validation - accept any format that starts with + and has digits
          const phoneRegex = /^\+[\d\s\-\(\)\.]+$/;
          const cleanPhone = phoneStr.replace(/[\s\-\(\)\.]/g, '');
          
          // Check if it starts with + and has reasonable length
          return phoneRegex.test(phoneStr) && 
                 cleanPhone.length >= 8 && 
                 cleanPhone.length <= 16;
        },
        message: 'Phone number should start with + and have 7-15 digits (e.g., +15551234567)'
      }
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer-not-to-say', ''],
      default: ''
    },
    dateOfBirth: {
      type: Date,
      default: null,
      validate: {
        validator: function (v) {
          if (!v) return true;
          const dob = new Date(v);
          const today = new Date();
          const age = today.getFullYear() - dob.getFullYear();
          return age >= 13 && age <= 120;
        },
        message: 'You must be at least 13 years old and not older than 120 years'
      }
    },
    country: {
      type: String,
      trim: true,
      maxlength: [100, 'Country name too long'],
      default: ''
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'City name too long'],
      default: ''
    },
    languages: [{
      type: String,
      trim: true,
      maxlength: [50, 'Language name too long']
    }],
    occupation: {
      type: String,
      trim: true,
      maxlength: [100, 'Occupation too long'],
      default: ''
    },
    education: {
      type: String,
      trim: true,
      maxlength: [200, 'Education field too long'],
      default: ''
    },
    
    // ========== ACCOUNT & SYSTEM FIELDS ==========
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true
    },
    isActive: {
      type: Boolean,
      default: function() {
        // Only active if verified
        return this.registrationStatus === 'verified';
      },
      index: true
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    
    // ========== SECURITY & PRIVACY FIELDS ==========
    privacySettings: {
      type: {
        profileVisibility: {
          type: String,
          enum: ['public', 'registered', 'private'],
          default: 'public'
        },
        showEmail: {
          type: Boolean,
          default: false
        },
        showPhone: {
          type: Boolean,
          default: false
        },
        showLocation: {
          type: Boolean,
          default: true
        },
        showLastSeen: {
          type: Boolean,
          default: true
        }
      },
      default: () => ({
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showLocation: true,
        showLastSeen: true
      })
    },
    
    // ========== ACCOUNT METADATA ==========
    accountType: {
      type: String,
      enum: ['basic', 'premium', 'business'],
      default: 'basic'
    },
    subscriptionExpiresAt: {
      type: Date
    },
    
    // ========== SECURITY FIELDS (Hidden from public) ==========
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      select: false
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lockUntil: {
      type: Date,
      select: false
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      select: false
    },
    lastPasswordChangeAt: {
      type: Date,
      default: Date.now,
      select: false
    },
    passwordHistory: [{
      password: String,
      changedAt: Date,
      _id: false
    }],
    deviceTokens: [{
      token: String,
      deviceType: String,
      lastUsed: Date,
      _id: false
    }],
    loginHistory: [{
      ip: String,
      userAgent: String,
      timestamp: Date,
      success: Boolean,
      _id: false
    }],
    suspiciousActivityDetected: {
      type: Boolean,
      default: false,
      select: false
    },
    
    // ========== PLATFORM SPECIFIC FIELDS ==========
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    completedOrders: {
      type: Number,
      default: 0
    },
    responseRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    responseTime: {
      type: Number, // in hours
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Remove sensitive fields
        delete ret.__v;
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.twoFactorSecret;
        delete ret.verificationToken;
        delete ret.verificationTokenExpires;
        delete ret.registrationData;
        delete ret.registrationExpiresAt;
        delete ret.passwordHistory;
        delete ret.deviceTokens;
        delete ret.loginHistory;
        delete ret.suspiciousActivityDetected;
        
        // Apply privacy settings
        if (ret.privacySettings) {
          if (!ret.privacySettings.showEmail && ret.hasOwnProperty('email')) {
            delete ret.email;
          }
          
          if (!ret.privacySettings.showPhone && ret.hasOwnProperty('phoneNumber')) {
            delete ret.phoneNumber;
          }
          
          if (!ret.privacySettings.showLocation) {
            if (ret.hasOwnProperty('country')) delete ret.country;
            if (ret.hasOwnProperty('city')) delete ret.city;
          }
          
          if (!ret.privacySettings.showLastSeen && ret.hasOwnProperty('lastSeenAt')) {
            delete ret.lastSeenAt;
          }
        } else {
          if (ret.hasOwnProperty('email')) delete ret.email;
          if (ret.hasOwnProperty('phoneNumber')) delete ret.phoneNumber;
        }
        
        // Format dates
        if (ret.dateOfBirth) {
          ret.dateOfBirth = ret.dateOfBirth.toISOString().split('T')[0];
        }
        
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        // Apply same transformations as toJSON
        delete ret.__v;
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.twoFactorSecret;
        delete ret.verificationToken;
        delete ret.verificationTokenExpires;
        delete ret.registrationData;
        delete ret.registrationExpiresAt;
        delete ret.passwordHistory;
        delete ret.deviceTokens;
        delete ret.loginHistory;
        delete ret.suspiciousActivityDetected;
        
        return ret;
      }
    }
  }
);

// ========== INDEXES ==========
userSchema.index({ createdAt: -1 });
userSchema.index({ 'privacySettings.profileVisibility': 1 });
userSchema.index({ rating: -1 });
userSchema.index({ country: 1, city: 1 });
userSchema.index({ occupation: 1 });
userSchema.index({ languages: 1 });
userSchema.index({ registrationStatus: 1 });
userSchema.index({ verificationToken: 1 });

// ========== VIRTUALS ==========
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('accountAge').get(function () {
  if (!this.createdAt) return null;
  return Date.now() - this.createdAt.getTime();
});

userSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

userSchema.virtual('isOnline').get(function () {
  if (!this.lastSeenAt) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastSeenAt > fiveMinutesAgo;
});

userSchema.virtual('fullLocation').get(function () {
  const parts = [];
  if (this.city) parts.push(this.city);
  if (this.country) parts.push(this.country);
  return parts.length > 0 ? parts.join(', ') : null;
});

// ========== MIDDLEWARE ==========
userSchema.pre('save', async function () {
  // Don't hash password for pending registrations
  if (this.registrationStatus === 'pending') {
    return;
  }

  if (!this.isModified('password') || !this.password) return;

  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// ========== INSTANCE METHODS ==========
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;

  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

userSchema.methods.generateVerificationToken = function () {
  const crypto = require('crypto');
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  this.registrationExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return verificationToken;
};

userSchema.methods.verifyAndCompleteRegistration = async function () {
  // Move registration data to actual user fields
  if (this.registrationData) {
    const { password, ...restData } = this.registrationData;
    
    // Update user fields with registration data
    for (const [key, value] of Object.entries(restData)) {
      if (key !== 'password' && value !== undefined && value !== '') {
        this[key] = value;
      }
    }
    
    // Hash and set the password
    if (password) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(password, salt);
    }
    
    // Clear temporary data
    this.registrationData = undefined;
    this.verificationToken = undefined;
    this.verificationTokenExpires = undefined;
    this.registrationExpiresAt = undefined;
    
    // Update status
    this.registrationStatus = 'verified';
    this.emailVerified = true;
    this.isActive = true;
    
    // Set default privacy settings if not provided
    if (!this.privacySettings) {
      this.privacySettings = {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showLocation: true,
        showLastSeen: true
      };
    }
  }
  
  return this;
};

userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { failedLoginAttempts: 1 } };

  if (this.failedLoginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
    updates.$set.suspiciousActivityDetected = true;
  }

  return await this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $set: { 
      lastLoginAt: new Date(),
      lastSeenAt: new Date(),
      suspiciousActivityDetected: false 
    },
    $unset: {
      failedLoginAttempts: 1,
      lockUntil: 1
    }
  });
};

userSchema.methods.createPasswordResetToken = function () {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

userSchema.methods.addLoginHistory = async function (ip, userAgent, success) {
  const loginEntry = {
    ip,
    userAgent,
    timestamp: new Date(),
    success
  };

  if (this.loginHistory.length >= 50) {
    this.loginHistory.shift();
  }
  
  this.loginHistory.push(loginEntry);
  return await this.save();
};

// ========== STATIC METHODS ==========
userSchema.statics.findByVerificationToken = function (token) {
  const crypto = require('crypto');
  
  if (!token || token.length !== 64 || !/^[0-9a-fA-F]+$/.test(token)) {
    return null;
  }
  
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    return this.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() },
      registrationStatus: 'pending',
      emailVerified: false
    }).select('+verificationToken +verificationTokenExpires +registrationData');
  } catch (error) {
    console.error('Error in findByVerificationToken:', error);
    return null;
  }
};
// user.model.js - Add this static method in the STATIC METHODS section
userSchema.statics.findByResetToken = function (token) {
  const crypto = require('crypto');
  
  if (!token || token.length !== 64) {
    return null;
  }
  
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    return this.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+password +resetPasswordToken +resetPasswordExpires +passwordHistory');
  } catch (error) {
    console.error('Error in findByResetToken:', error);
    return null;
  }
};
// Add a new method to find by token hash (even if expired/cleared)
userSchema.statics.findByTokenHash = function (tokenHash) {
  return this.findOne({
    $or: [
      { verificationToken: tokenHash },
      { resetPasswordToken: tokenHash }
    ]
  });
};

userSchema.statics.findPendingByEmail = function (email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    registrationStatus: 'pending',
    emailVerified: false
  });
};

userSchema.statics.cleanupExpiredRegistrations = async function () {
  const expiredCutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
  
  return this.deleteMany({
    registrationStatus: 'pending',
    emailVerified: false,
    registrationExpiresAt: { $lt: expiredCutoff }
  });
};

userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findPublicProfiles = function (filter = {}) {
  return this.find({
    ...filter,
    'privacySettings.profileVisibility': 'public',
    isActive: true,
    registrationStatus: 'verified'
  }).select('-email -phoneNumber -privacySettings -loginHistory -deviceTokens -passwordHistory');
};

// ========== HOOKS ==========
userSchema.post('save', function (doc) {
  if (doc.isNew) {
    console.log(`✅ User document created: ${doc.email} (${doc.registrationStatus})`);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;