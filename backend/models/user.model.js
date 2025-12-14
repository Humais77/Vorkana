const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    name: {
      type: String,
      trim: true,
      required: [true, 'Name is required'],
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    // In user.model.js - Update the password validation:

    password: {
      type: String,
      select: false,
      minlength: [8, 'Password must be at least 8 characters'],
      required: function () {
        return !this.googleId;
      },
      validate: {
        validator: function (v) {
          // Skip validation if password is already hashed (starts with $2)
          if (v.startsWith('$2a$') || v.startsWith('$2b$')) {
            return true;
          }

          // Only validate raw passwords
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
    picture: {
      type: String,
      default: null,
      validate: {
        validator: function (v) {
          return v === null || validator.isURL(v, { protocols: ['http', 'https'] });
        },
        message: 'Please enter a valid URL for the picture'
      }
    },
    role: {
      type: String,
      enum: ['user', 'seller', 'admin'],
      default: 'user',
      index: true
    },
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      select: false
    },
    lastLoginAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
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
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      select: false
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      select: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.twoFactorSecret;
        delete ret.emailVerificationToken;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.twoFactorSecret;
        delete ret.emailVerificationToken;
        return ret;
      }
    }
  }
);

// // ========== INDEXES ==========
// // userSchema.index({ email: 1 }, { unique: true });
// userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });

// ========== VIRTUALS ==========
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('accountAge').get(function () {
  return Date.now() - this.createdAt.getTime();
});

// ========== MIDDLEWARE ==========

// Password hashing middleware
// Password hashing middleware
userSchema.pre('save', async function () {
  // Only hash the password if it has been modified (or is new) and exists
  if (!this.isModified('password') || !this.password) return;

  // Prevent double-hashing (e.g., when Google users somehow have a password)
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    // No need to call next() — Mongoose handles it
  } catch (error) {
    // In async pre-save middleware, you should throw the error
    // so Mongoose can reject the save operation properly
    throw error;
  }
});

// Update timestamps on certain updates
userSchema.pre('findOneAndUpdate', function () {
  this.set({ updatedAt: new Date() });
  next();
});

// ========== INSTANCE METHODS ==========

// Compare password with timing attack protection
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;

  try {
    // Constant-time comparison to prevent timing attacks
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    // Always return false in case of error to prevent information leakage
    return false;
  }
};

// Increment failed login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  // Otherwise increment
  const updates = { $inc: { failedLoginAttempts: 1 } };

  // Lock the account if we've reached max attempts
  if (this.failedLoginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 minutes
  }

  return await this.updateOne(updates);
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $set: { lastLoginAt: new Date() },
    $unset: {
      failedLoginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

  return resetToken;
};

// Generate email verification token
userSchema.methods.createEmailVerificationToken = function () {
  const crypto = require('crypto');
  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  return verificationToken;
};

// ========== STATIC METHODS ==========

// Find user by reset token
userSchema.statics.findByResetToken = function (token) {
  const crypto = require('crypto');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  }).select('+password');
};

// Find user by email verification token
userSchema.statics.findByVerificationToken = function (token) {
  const crypto = require('crypto');
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return this.findOne({
    emailVerificationToken: hashedToken
  });
};

// Audit logging
userSchema.post('save', function (doc) {
  if (doc.isNew) {
    console.log(`✅ New user registered: ${doc.email} (${doc.role})`);
  }
});

userSchema.post('findOneAndUpdate', function (doc) {
  if (doc) {
    console.log(`📝 User updated: ${doc.email}`);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;