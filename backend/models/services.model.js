const mongoose = require('mongoose');
const slugify = require('slugify');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [50, 'Description must be at least 50 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [250, 'Short description cannot exceed 250 characters'],
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required'],
    index: true,
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller is required'],
    index: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Minimum price is $1'],
    max: [100000, 'Maximum price is $100,000'],
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'PKR'],
  },
  deliveryTime: {
    type: Number,
    required: [true, 'Delivery time is required'],
    min: [1, 'Minimum delivery time is 1 day'],
    max: [365, 'Maximum delivery time is 365 days'],
  },
  deliveryTimeUnit: {
    type: String,
    default: 'days',
    enum: ['hours', 'days', 'weeks'],
  },
  revisions: {
    type: Number,
    default: 1,
    min: [0, 'Revisions cannot be negative'],
    max: [99, 'Maximum revisions is 99'],
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|webp|gif|svg)$/i.test(v);
      },
      message: 'Invalid image URL format',
    },
  }],
  thumbnail: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|webp|gif|svg)$/i.test(v);
      },
      message: 'Invalid thumbnail URL format',
    },
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
  }],
  features: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Feature title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Feature description cannot exceed 200 characters'],
    },
    included: {
      type: Boolean,
      default: true,
    },
  }],
  requirements: [{
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Requirement question cannot exceed 200 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'file', 'choice', 'multiple'],
      default: 'text',
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: [String],
  }],
  faqs: [{
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'FAQ question cannot exceed 200 characters'],
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'FAQ answer cannot exceed 500 characters'],
    },
  }],
  packages: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Package name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Package description cannot exceed 500 characters'],
    },
    price: {
      type: Number,
      required: true,
      min: [1, 'Minimum package price is $1'],
    },
    deliveryTime: {
      type: Number,
      required: true,
      min: [1, 'Minimum delivery time is 1 day'],
    },
    revisions: {
      type: Number,
      default: 0,
    },
    features: [{
      type: String,
      trim: true,
      maxlength: [100, 'Package feature cannot exceed 100 characters'],
    }],
    popular: {
      type: Boolean,
      default: false,
    },
  }],
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot exceed 5'],
  },
  reviewsCount: {
    type: Number,
    default: 0,
    min: [0, 'Reviews count cannot be negative'],
  },
  ordersCount: {
    type: Number,
    default: 0,
    min: [0, 'Orders count cannot be negative'],
  },
  views: {
    type: Number,
    default: 0,
    min: [0, 'Views cannot be negative'],
  },
  likes: {
    type: Number,
    default: 0,
    min: [0, 'Likes cannot be negative'],
  },
  sellerLevel: {
    type: String,
    enum: ['new', 'level1', 'level2', 'toprated'],
    default: 'new',
  },
  gigType: {
    type: String,
    enum: ['basic', 'standard', 'premium', 'custom'],
    default: 'basic',
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'paused', 'denied', 'suspended'],
    default: 'draft',
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
  isRecommended: {
    type: Boolean,
    default: false,
    index: true,
  },
  isPopular: {
    type: Boolean,
    default: false,
    index: true,
  },
  searchKeywords: [{
    type: String,
    trim: true,
    maxlength: [30, 'Keyword cannot exceed 30 characters'],
  }],
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters'],
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters'],
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
  publishedAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for reviews
serviceSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'service',
});

// Virtual for orders
serviceSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'service',
});

// Pre-save middleware - FIXED
// serviceSchema.pre('save', function(next) {
//   // Generate slug
//   if (this.isModified('title')) {
//     this.slug = slugify(this.title, { 
//       lower: true, 
//       strict: true,
//       locale: 'en',
//       trim: true
//     }) + '-' + Date.now().toString().slice(-6);
//   }
  
//   // Set published date when status becomes active
//   if (this.isModified('status') && this.status === 'active' && !this.publishedAt) {
//     this.publishedAt = new Date();
//   }
  
//   // Set expiration date (30 days from publication)
//   if (this.isModified('publishedAt') && this.publishedAt && !this.expiresAt) {
//     this.expiresAt = new Date(this.publishedAt);
//     this.expiresAt.setDate(this.expiresAt.getDate() + 30);
//   }
  
//   next();
// });

// Update category service count - FIXED
serviceSchema.post('save', async function(doc) {
  try {
    if (doc.status === 'active') {
      await mongoose.model('Category').incrementServicesCount(doc.category);
    }
  } catch (error) {
    console.error('Error updating category service count:', error);
  }
});

// Update category service count on delete - FIXED
serviceSchema.post('findOneAndDelete', async function(doc) {
  try {
    if (doc && doc.status === 'active') {
      await mongoose.model('Category').decrementServicesCount(doc.category);
    }
  } catch (error) {
    console.error('Error decrementing category service count:', error);
  }
});

// Indexes
serviceSchema.index({ slug: 1 });
serviceSchema.index({ category: 1, status: 1 });
serviceSchema.index({ seller: 1, status: 1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ rating: -1 });
serviceSchema.index({ ordersCount: -1 });
serviceSchema.index({ views: -1 });
serviceSchema.index({ isFeatured: 1, status: 1 });
serviceSchema.index({ isRecommended: 1, status: 1 });
serviceSchema.index({ isPopular: 1, status: 1 });
serviceSchema.index({ status: 1, publishedAt: -1 });
serviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
serviceSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text', 
  searchKeywords: 'text',
  shortDescription: 'text'
});

// Static methods
serviceSchema.statics.incrementOrdersCount = async function(serviceId) {
  return this.findByIdAndUpdate(
    serviceId,
    { $inc: { ordersCount: 1 } },
    { new: true }
  );
};

serviceSchema.statics.incrementViews = async function(serviceId) {
  return this.findByIdAndUpdate(
    serviceId,
    { $inc: { views: 1 } },
    { new: true }
  );
};

serviceSchema.statics.incrementLikes = async function(serviceId) {
  return this.findByIdAndUpdate(
    serviceId,
    { $inc: { likes: 1 } },
    { new: true }
  );
};

serviceSchema.statics.decrementLikes = async function(serviceId) {
  return this.findByIdAndUpdate(
    serviceId,
    { $inc: { likes: -1 } },
    { new: true }
  );
};

serviceSchema.statics.updateRating = async function(serviceId) {
  const reviews = await mongoose.model('Review').find({ service: serviceId });
  
  if (reviews.length === 0) {
    return this.findByIdAndUpdate(
      serviceId,
      { rating: 0, reviewsCount: 0 },
      { new: true }
    );
  }
  
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = totalRating / reviews.length;
  
  return this.findByIdAndUpdate(
    serviceId,
    { 
      rating: parseFloat(averageRating.toFixed(1)),
      reviewsCount: reviews.length 
    },
    { new: true }
  );
};

// Query helpers
serviceSchema.query.active = function() {
  return this.where({ 
    status: 'active',
    isActive: true 
  });
};

serviceSchema.query.bySeller = function(sellerId) {
  return this.where({ seller: sellerId });
};

serviceSchema.query.byCategory = function(categoryId) {
  return this.where({ category: categoryId });
};

serviceSchema.query.featured = function() {
  return this.where({ isFeatured: true });
};

serviceSchema.query.recommended = function() {
  return this.where({ isRecommended: true });
};

serviceSchema.query.popular = function() {
  return this.where({ isPopular: true });
};

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;