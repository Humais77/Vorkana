// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   googleId: {
//     type: String,
//     // keep model field if you use OAuth later; if not using, set unique:false or remove later
//     unique: true,
//     sparse: true,
//     index: true
//   },
//   name: {
//     type: String,
//     trim: true
//   },
//   password:{
//         type:String,
//         required:true,
//         select:false,
//     },
//   email: {
//     type: String,
//     index: true,
//     sparse: true,
//     lowercase: true,
//     trim: true
//   },
//   picture: String,
//   role: {
//     type: String,
//     enum: ['user', 'admin'],
//     default: 'user'
//   }
// }, { timestamps: true });

// const User = mongoose.model('User', userSchema);
// module.exports = User;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,     // allows multiple nulls + unique constraint only when value exists
      index: true
    },
    name: {
      type: String,
      trim: true,
      required: [true, 'Name is required'],
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    password: {
      type: String,
      select: false, // never return password by default
      minlength: [6, 'Password must be at least 6 characters'],
      // Required only if not using Google login
      required: function () {
        return !this.googleId;
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
          return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: 'Please enter a valid email address'
      }
    },
    picture: {
      type: String,
      default: null
    },
    role: {
      type: String,
      enum: ['user', 'seller', 'admin'],
      default: 'user',
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    verificationToken: {
      type: String,
      select: false
    },
    verificationTokenExpires: {
      type: Date,
      select: false
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
    loginAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    lockUntil: {
      type: Date,
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
        delete ret.verificationToken;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.verificationTokenExpires;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Indexes
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isVerified: 1 });

// FIXED: Modern async pre-save (Mongoose 6+/7+ style) – NO next() call!
userSchema.pre('save', async function () {
  // Only hash password if it's modified and exists
  if (!this.isModified('password') || !this.password) return;

  try {
    const salt = await bcrypt.genSalt(12); // increased from 10 → stronger
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error; // let Mongoose handle the error
  }
});

// Instance method: Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method: Check if account is locked
userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Instance method: Increment login attempts + lock if needed
userSchema.methods.incrementLoginAttempts = async function () {
  // If previous lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.loginAttempts += 1;
  }

  // Lock account after 5 failed attempts for 15 minutes
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
  }

  await this.save({ validateBeforeSave: false });
};

// Static method: Find user by reset token
userSchema.statics.findByResetToken = function (token) {
  return this.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  }).select('+password');
};

// Virtual: Check if user can login (active + verified + not locked)
userSchema.virtual('canLogin').get(function () {
  return this.isActive && this.isVerified && !this.isLocked();
});

// Post-save: Optional logging or side effects (safe)
userSchema.post('save', function (doc) {
  if (doc.isNew) {
    console.log(`New user registered: ${doc.email} (${doc.role})`);
  }
});

// Query helper
userSchema.query.active = function () {
  return this.where({ isActive: true });
};

userSchema.query.verified = function () {
  return this.where({ isVerified: true });
};

const User = mongoose.model('User', userSchema);

module.exports = User;