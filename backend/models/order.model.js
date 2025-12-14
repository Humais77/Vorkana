const mongoose = require('mongoose');
const crypto = require('crypto');

const orderSchema = new mongoose.Schema({
  // Basic Information
  orderNumber: {
    type: String,
    unique: true,
    // required: true,
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
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller is required'],
    index: true,
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        const user = await User.findById(v);
        return user && user.isActive && (user.role === 'seller' || user.role === 'admin');
      },
      message: 'Invalid or inactive seller'
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

  // Status Tracking - Simplified for your use case
  status: {
    type: String,
    enum: [
      'pending',       // Order created, awaiting seller acceptance
      'accepted',      // Seller accepted the order
      'in_progress',   // Seller started working
      'delivered',     // Seller delivered work
      'revision',      // Buyer requested revision
      'completed',     // Order completed successfully
      'cancelled',     // Order cancelled
      'expired'        // Order expired (seller didn't accept in time)
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

  // Buyer Verification - Updated for your user model
  buyerVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  paymentVerified: {
    type: Boolean,
    default: true, // Set to true since you're not using payment gateway
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
  sellerReview: {
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
      // Supports IPv4, ::1, and valid IPv6
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
  acceptedAt: Date,
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  expiredAt: Date,
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

orderSchema.virtual('sellerDetails', {
  ref: 'User',
  localField: 'seller',
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
    'accepted': 25,
    'in_progress': 50,
    'delivered': 75,
    'completed': 100,
    'revision': 60,
    'cancelled': 0,
    'expired': 0
  };
  return statusWeights[this.status] || 0;
});

// Pre-save middleware
orderSchema.pre('save', async function() {
  try {
    // Security: Validate that buyer is not ordering their own service
    const Service = mongoose.model('Service');
    const service = await Service.findById(this.service);
    
    if (service && service.seller.toString() === this.buyer.toString()) {
      throw new Error('You cannot order your own service');
    }

    // Security: Validate service availability
    if (!service || !service.isActive || service.status !== 'active') {
      throw new Error('Service is not available for ordering');
    }

    // Security: Validate seller is active
    const User = mongoose.model('User');
    const seller = await User.findById(this.seller);
    if (!seller || !seller.isActive) {
      throw new Error('Seller account is not active');
    }

    // Security: Validate buyer is active and email verified
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

    // Existing code continues...
  } catch (error) {
    throw error;
  }
});

// Post-save middleware to update service orders count
orderSchema.post('save', async function(doc) {
  try {
    const Service = mongoose.model('Service');
    
    if (doc.isNew && doc.status === 'accepted') {
      await Service.incrementOrdersCount(doc.service);
    } else if (doc.isModified('status')) {
      const wasAccepted = this._originalStatus === 'accepted';
      const isNowAccepted = doc.status === 'accepted';
      
      if (wasAccepted && !isNowAccepted) {
        await Service.decrementOrdersCount(doc.service);
      } else if (!wasAccepted && isNowAccepted) {
        await Service.incrementOrdersCount(doc.service);
      }
    }
  } catch (error) {
    console.error('Error updating service orders count:', error);
  }
});
orderSchema.statics.findSecure = function(userId, userRole, filter = {}) {
  const baseFilter = { isActive: true };
  
  // Apply role-based filtering
  if (userRole === 'admin') {
    // Admin can see all orders
  } else if (userRole === 'seller') {
    baseFilter.seller = userId;
  } else if (userRole === 'user') {
    baseFilter.buyer = userId;
  } else {
    // Default to both buyer and seller if user has multiple roles
    baseFilter.$or = [
      { seller: userId },
      { buyer: userId }
    ];
  }

  return this.find({ ...baseFilter, ...filter });
};

// Add method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  const cancellableStatuses = ['pending', 'accepted', 'in_progress'];
  return cancellableStatuses.includes(this.status) && 
         new Date() < new Date(this.createdAt.getTime() + 24 * 60 * 60 * 1000); // Within 24 hours
};

// Indexes
orderSchema.index({ seller: 1, status: 1 });
orderSchema.index({ buyer: 1, status: 1 });
orderSchema.index({ service: 1, status: 1 });
orderSchema.index({ orderNumber: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ deadlineAt: 1, status: 1 });
orderSchema.index({ buyerVerified: 1 });
orderSchema.index({ totalAmount: 1, status: 1 });

// Query helpers
orderSchema.query.active = function() {
  return this.where({ isActive: true });
};

orderSchema.query.bySeller = function(sellerId) {
  return this.where({ seller: sellerId });
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

orderSchema.statics.findExpiringOrders = function() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  return this.find({
    status: 'pending',
    deadlineAt: { $lte: oneHourFromNow, $gt: now },
    isActive: true
  });
};

orderSchema.statics.expireOrders = async function() {
  const expiringOrders = await this.findExpiringOrders();
  const results = [];
  
  for (const order of expiringOrders) {
    if (new Date() > order.deadlineAt) {
      order.status = 'expired';
      order.expiredAt = new Date();
      order.statusHistory.push({
        status: 'expired',
        changedBy: order.seller,
        reason: 'Auto-expired: Seller did not accept in time',
        timestamp: new Date()
      });
      
      await order.save();
      results.push(order._id);
    }
  }
  
  return results;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;