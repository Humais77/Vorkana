const mongoose = require('mongoose');
const crypto = require('crypto');

const orderSchema = new mongoose.Schema({
  // Basic Information
  orderNumber: {
    type: String,
    unique: true,
    index: true,
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service is required'],
    index: true,
    validate: {
      validator: async function(v) {
        const Service = mongoose.model('Service');
        const service = await Service.findById(v);
        return service && service.isActive && service.status === 'active';
      },
      message: 'Invalid or inactive service'
    }
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer is required'],
    index: true,
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        const user = await User.findById(v);
        return user && user.isActive;
      },
      message: 'Invalid or inactive buyer'
    }
  },

  // Order Details
  package: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service.packages',
    validate: {
      validator: async function(v) {
        if (!v) return true; // Package is optional
        
        const Service = mongoose.model('Service');
        const service = await Service.findById(this.service);
        
        if (!service || !service.packages) return false;
        
        return service.packages.some(pkg => 
          pkg._id.toString() === v.toString() || 
          (pkg._id && pkg._id.equals ? pkg._id.equals(v) : false)
        );
      },
      message: 'Invalid package for this service'
    }
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1'],
    max: [99, 'Maximum quantity is 99']
  },
  requirements: [{
    question: String,
    answer: String,
    fileUrl: String,
    files: [String],
    type: {
      type: String,
      enum: ['text', 'file', 'choice', 'multiple']
    },
    options: [String],
    required: Boolean
  }],

  // Pricing
  basePrice: {
    type: Number,
    required: true,
    min: [0.01, 'Price must be greater than 0']
  },
  packagePrice: {
    type: Number,
    min: [0, 'Package price cannot be negative']
  },
  extras: [{
    title: String,
    description: String,
    price: Number,
    quantity: Number
  }],
  discount: {
    code: String,
    amount: Number,
    percentage: Number,
    type: {
      type: String,
      enum: ['amount', 'percentage']
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: [0.01, 'Subtotal must be greater than 0']
  },
  serviceFee: {
    type: Number,
    default: 0,
    min: [0, 'Service fee cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0.01, 'Total amount must be greater than 0']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR'],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['wallet', 'credit_card', 'bank_transfer', 'paypal', 'crypto', 'cash'],
    default: 'wallet'
  },

  // Delivery
  deliveryTime: {
    type: Number,
    required: true,
    min: [1, 'Delivery time must be at least 1']
  },
  deliveryTimeUnit: {
    type: String,
    enum: ['hours', 'days', 'weeks'],
    default: 'days'
  },
  revisions: {
    type: Number,
    default: 0,
    min: [0, 'Revisions cannot be negative']
  },
  expectedDelivery: {
    type: Date,
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Expected delivery must be in the future'
    }
  },
  deliveredAt: {
    type: Date
  },

  // Status Tracking
  status: {
    type: String,
    enum: [
      'pending',       // Order created
      'in_progress',   // Service provider started working
      'delivered',     // Work delivered
      'revision',      // Buyer requested revision
      'completed',     // Order completed successfully
      'cancelled',     // Order cancelled
    ],
    default: 'pending',
    index: true
  },
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    notes: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Buyer Verification
  buyerVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  paymentVerified: {
    type: Boolean,
    default: true,
    index: true
  },
  deliveryVerified: {
    type: Boolean,
    default: false
  },

  // Communication
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters']
    },
    attachments: [{
      type: String,
      validate: {
        validator: function(v) {
          return /^\/uploads\/[a-f0-9-]{20,64}\.(jpg|jpeg|png|webp|gif|pdf|doc|docx|txt|zip|rar)$/i.test(v);
        },
        message: 'Invalid attachment URL'
      }
    }],
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: Date
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Files & Deliverables
  deliverables: [{
    title: String,
    description: String,
    files: [{
      type: String,
      validate: {
        validator: function(v) {
          return /^\/uploads\/[a-f0-9-]{20,64}\.[a-z0-9]{2,5}$/i.test(v);
        },
        message: 'Invalid file URL'
      }
    }],
    deliveredAt: Date,
    accepted: {
      type: Boolean,
      default: false
    },
    acceptedAt: Date,
    revisionRequested: Boolean,
    revisionNotes: String
  }],

  // Reviews
  serviceReview: {
    rating: {
      type: Number,
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5']
    },
    comment: {
      type: String,
      maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    createdAt: Date
  },
  buyerReview: {
    rating: {
      type: Number,
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5']
    },
    comment: {
      type: String,
      maxlength: [1000, 'Review cannot exceed 1000 characters']
    },
    createdAt: Date
  },

  // Security & Audit
  ipAddress: {
    type: String,
    required: false,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^(?:(?:[0-9]{1,3}\.){3}[0-9]{1,3}|::1|([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})$/.test(v);
      },
      message: 'Invalid IP address'
    }
  },
  userAgent: String,
  deviceInfo: {
    type: String,
    maxlength: [500, 'Device info too long']
  },
  securityToken: {
    type: String,
    unique: true,
    sparse: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },

  // Timestamps
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  deadlineAt: {
    type: Date,
    index: true,
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Deadline must be in the future'
    }
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.securityToken;
      delete ret.ipAddress;
      delete ret.userAgent;
      delete ret.deviceInfo;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.securityToken;
      delete ret.ipAddress;
      delete ret.userAgent;
      delete ret.deviceInfo;
      return ret;
    }
  }
});

// Virtuals
orderSchema.virtual('serviceDetails', {
  ref: 'Service',
  localField: 'service',
  foreignField: '_id',
  justOne: true
});

orderSchema.virtual('buyerDetails', {
  ref: 'User',
  localField: 'buyer',
  foreignField: '_id',
  justOne: true
});

orderSchema.virtual('isExpired').get(function() {
  if (!this.deadlineAt) return false;
  return new Date() > this.deadlineAt;
});

orderSchema.virtual('timeRemaining').get(function() {
  if (!this.deadlineAt) return null;
  const now = new Date();
  const deadline = new Date(this.deadlineAt);
  return Math.max(0, deadline - now);
});

orderSchema.virtual('progressPercentage').get(function() {
  const statusWeights = {
    'pending': 0,
    'in_progress': 50,
    'delivered': 75,
    'completed': 100,
    'revision': 60,
    'cancelled': 0,
  };
  return statusWeights[this.status] || 0;
});

// Pre-save middleware
orderSchema.pre('save', async function() {
  try {
    // Security: Validate service availability
    const Service = mongoose.model('Service');
    const service = await Service.findById(this.service);
    
    if (!service || !service.isActive || service.status !== 'active') {
      throw new Error('Service is not available for ordering');
    }

    // Security: Validate buyer is active and email verified
    const User = mongoose.model('User');
    const buyer = await User.findById(this.buyer);
    if (!buyer || !buyer.isActive) {
      throw new Error('Buyer account is not active');
    }

    if (!buyer.emailVerified && process.env.NODE_ENV === 'production') {
      throw new Error('Please verify your email before placing orders');
    }

    // Security: Validate payment method
    if (this.paymentMethod === 'wallet') {
      if (!buyer.wallet || buyer.wallet.balance < this.totalAmount) {
        throw new Error('Insufficient wallet balance');
      }
    }

    // Set deadline based on delivery time
    if (!this.deadlineAt && this.deliveryTime && this.deliveryTimeUnit) {
      const now = new Date();
      let deadline = new Date(now);
      
      switch(this.deliveryTimeUnit) {
        case 'hours':
          deadline.setHours(deadline.getHours() + this.deliveryTime);
          break;
        case 'days':
          deadline.setDate(deadline.getDate() + this.deliveryTime);
          break;
        case 'weeks':
          deadline.setDate(deadline.getDate() + (this.deliveryTime * 7));
          break;
      }
      
      this.deadlineAt = deadline;
    }

  } catch (error) {
    throw error;
  }
});

// Static methods for role-based filtering
orderSchema.statics.findSecure = function(userId, userRole, filter = {}) {
  const baseFilter = { isActive: true };
  
  // Apply role-based filtering
  if (userRole === 'admin') {
    // Admin can see all orders
  } else {
    // Regular users can only see their own orders as buyer
    baseFilter.buyer = userId;
  }

  return this.find({ ...baseFilter, ...filter });
};

// Add method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  const cancellableStatuses = ['pending', 'in_progress'];
  return cancellableStatuses.includes(this.status) && 
         new Date() < new Date(this.createdAt.getTime() + 24 * 60 * 60 * 1000); // Within 24 hours
};

// Indexes
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ service: 1, status: 1 });
orderSchema.index({ orderNumber: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ deadlineAt: 1, status: 1 });
orderSchema.index({ totalAmount: 1, status: 1 });

// Query helpers
orderSchema.query.active = function() {
  return this.where({ isActive: true });
};

orderSchema.query.byBuyer = function(buyerId) {
  return this.where({ buyer: buyerId });
};

orderSchema.query.byStatus = function(status) {
  return this.where({ status: status });
};

orderSchema.query.recent = function(limit = 10) {
  return this.sort({ createdAt: -1 }).limit(limit);
};

// Static methods
orderSchema.statics.generateOrderNumber = function() {
  const timestamp = Date.now().toString().slice(-6);
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;