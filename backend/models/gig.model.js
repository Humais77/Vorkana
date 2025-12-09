const mongoose = require('mongoose');
const slugify = require('slugify');
const { sanitizeHtml } = require('../utils/sanitize.js');

const gigSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    set: sanitizeHtml,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [3, 'Full name must be at least 3 characters'],
    maxlength: [60, 'Full name cannot exceed 60 characters'],
    set: sanitizeHtml,
  },
  oauthEmail: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    maxlength: [100, 'Email cannot exceed 100 characters'],
    index: true,
    set: sanitizeHtml,
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [80, 'Country cannot exceed 80 characters'],
    set: sanitizeHtml,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: [20, 'Phone cannot exceed 20 characters'],
    set: sanitizeHtml,
  },
  projectCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Project category is required'],
    index: true,
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
    set: sanitizeHtml,
  },
  budget: {
    type: Number,
    required: [true, 'Budget is required'],
    min: [5, 'Minimum budget is $5'],
    max: [100000, 'Maximum budget is $100,000'],
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR'],
  },
  timeline: {
    type: String,
    required: [true, 'Timeline is required'],
    trim: true,
    maxlength: [100, 'Timeline cannot exceed 100 characters'],
    set: sanitizeHtml,
  },
  timelineUnit: {
    type: String,
    enum: ['days', 'weeks', 'months'],
    default: 'days',
  },
  communication: {
    type: String,
    enum: ['Email', 'Phone', 'Video Call', 'Any'],
    default: 'Email',
  },
  attachments: [{
    type: String,
    trim: true,
    validate: {
      validator: (v) => /^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|pdf|doc|docx|zip|rar)$/i.test(v),
      message: 'Invalid attachment filename',
    },
  }],
  status: {
    type: String,
    enum: ['open', 'in_progress', 'assigned', 'completed', 'cancelled', 'closed'],
    default: 'open',
    index: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  proposals: [{
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    proposal: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'Proposal cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: true,
      min: [5, 'Minimum proposal price is $5'],
    },
    deliveryTime: {
      type: Number,
      required: true,
      min: [1, 'Minimum delivery time is 1 day'],
    },
    deliveryTimeUnit: {
      type: String,
      enum: ['hours', 'days', 'weeks'],
      default: 'days',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  selectedProposal: {
    type: mongoose.Schema.Types.ObjectId,
  },
  milestones: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Milestone title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Milestone description cannot exceed 500 characters'],
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Minimum milestone amount is $1'],
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'paid'],
      default: 'pending',
    },
    completedAt: {
      type: Date,
    },
  }],
  deliverables: [{
    type: String,
    trim: true,
    maxlength: [200, 'Deliverable cannot exceed 200 characters'],
  }],
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'refunded', 'disputed'],
    default: 'pending',
  },
  paymentAmount: {
    type: Number,
    min: [0, 'Payment amount cannot be negative'],
  },
  depositPaid: {
    type: Number,
    default: 0,
    min: [0, 'Deposit cannot be negative'],
  },
  deadline: {
    type: Date,
  },
  completionDate: {
    type: Date,
  },
  rating: {
    type: Number,
    min: [1, 'Minimum rating is 1'],
    max: [5, 'Maximum rating is 5'],
  },
  clientReview: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review cannot exceed 1000 characters'],
    set: sanitizeHtml,
  },
  sellerReview: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review cannot exceed 1000 characters'],
    set: sanitizeHtml,
  },
  disputeReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Dispute reason cannot exceed 500 characters'],
    set: sanitizeHtml,
  },
  disputeStatus: {
    type: String,
    enum: ['none', 'open', 'resolved', 'escalated'],
    default: 'none',
  },
  communicationHistory: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      set: sanitizeHtml,
    },
    attachment: {
      type: String,
      validate: {
        validator: (v) => /^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|pdf|doc|docx|zip|rar)$/i.test(v),
        message: 'Invalid attachment filename',
      },
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  }],
  files: [{
    type: String,
    validate: {
      validator: (v) => /^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|pdf|doc|docx|zip|rar)$/i.test(v),
      message: 'Invalid file filename',
    },
  }],
  requirementsDocument: {
    type: String,
    validate: {
      validator: (v) => /^\/uploads\/[a-f0-9]{20,64}\.(pdf|doc|docx)$/i.test(v),
      message: 'Invalid requirements document filename',
    },
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite_only'],
    default: 'public',
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  skillsRequired: [{
    type: String,
    trim: true,
    maxlength: [50, 'Skill cannot exceed 50 characters'],
    set: sanitizeHtml,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  version: {
    type: Number,
    default: 1,
  },
  expiresAt: {
    type: Date,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

gigSchema.virtual('category', {
  ref: 'Category',
  localField: 'projectCategory',
  foreignField: '_id',
  justOne: true,
});

gigSchema.virtual('seller', {
  ref: 'User',
  localField: 'assignedTo',
  foreignField: '_id',
  justOne: true,
});

gigSchema.virtual('client', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true,
});

// gigSchema.pre('save', function(next) {
//   if (this.isModified('title')) {
//     this.slug = slugify(this.title, {
//       lower: true,
//       strict: true,
//       locale: 'en',
//       trim: true
//     }) + '-' + Date.now().toString().slice(-6);
//   }
  
//   if (this.isModified('status') && this.status === 'open' && !this.expiresAt) {
//     const expiryDate = new Date();
//     expiryDate.setDate(expiryDate.getDate() + 30);
//     this.expiresAt = expiryDate;
//   }
  
//   next();
// });

gigSchema.post('save', async function(doc) {
  if (doc.status === 'open') {
    await mongoose.model('Category').incrementGigsCount(doc.projectCategory);
  }
});

gigSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.status === 'open') {
    await mongoose.model('Category').decrementGigsCount(doc.projectCategory);
  }
});

gigSchema.index({ slug: 1 });
gigSchema.index({ projectCategory: 1, status: 1 });
gigSchema.index({ createdBy: 1, status: 1 });
gigSchema.index({ assignedTo: 1, status: 1 });
gigSchema.index({ status: 1, createdAt: -1 });
gigSchema.index({ budget: 1 });
gigSchema.index({ urgency: 1, status: 1 });
gigSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
gigSchema.index({
  title: 'text',
  description: 'text',
  skillsRequired: 'text',
  deliverables: 'text'
});

gigSchema.query.active = function() {
  return this.where({ isActive: true });
};

gigSchema.query.open = function() {
  return this.where({ status: 'open' });
};

gigSchema.query.byClient = function(clientId) {
  return this.where({ createdBy: clientId });
};

gigSchema.query.bySeller = function(sellerId) {
  return this.where({ assignedTo: sellerId });
};

gigSchema.query.byCategory = function(categoryId) {
  return this.where({ projectCategory: categoryId });
};

const Gig = mongoose.model('Gig', gigSchema);

module.exports = Gig;