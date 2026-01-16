const mongoose = require('mongoose');
const slugify = require('slugify');
const { sanitizeHtml, sanitizeText } = require('../utils/sanitize.js');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true,
    validate: {
      validator: function(v) {
        const injectionPatterns = [
          /\$where/i,
          /\$ne/i,
          /\$nin/i,
          /\$regex/i,
          /select.*from/i,
          /insert.*into/i,
          /update.*set/i,
          /delete.*from/i,
          /union.*select/i,
          /or.*=.*or/i,
          /'|"|`/,
          /--/,
          /;/,
          /\/\*.*\*\//,
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/
        ];
        return !injectionPatterns.some(pattern => pattern.test(v));
      },
      message: 'Title contains invalid characters'
    }
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
    validate: {
      validator: async function(v) {
        const Category = mongoose.model('Category');
        const category = await Category.findById(v);
        return category && category.isActive;
      },
      message: 'Invalid or inactive category'
    }
  },
  // In service.model.js - Update the subcategory field
subcategory: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Subcategory',
  index: true,
  validate: {
    validator: async function(v) {
      if (!v) return true;
      
      try {
        const Subcategory = mongoose.model('Subcategory');
        const subcategory = await Subcategory.findOne({
          _id: v,
          isActive: true
        });
        
        if (!subcategory) return false;
        
        // Check if subcategory belongs to the same category
        if (this.category && !subcategory.category.equals(this.category)) {
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('Subcategory validation error:', error);
        return false;
      }
    },
    message: props => {
      if (!props.value) return 'Subcategory is required';
      return 'Invalid or inactive subcategory, or does not belong to the selected category';
    }
  }
},

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
    index: true,
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        const user = await User.findById(v);
        return user && user.isActive;
      },
      message: 'Invalid or inactive user'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Minimum price is $1'],
    max: [100000, 'Maximum price is $100,000'],
    index: true,
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
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\//.test(v);
      },
      message: 'Image must be a valid URL'
    }
  },
  public_id: {
    type: String,
    required: true
  },
  width: Number,
  height: Number,
  size: Number,
  format: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}],

thumbnail: {
  url: {
    type: String,
    required: [true, 'Thumbnail URL is required'],
    validate: {
      validator: function(v) {
        return /^https?:\/\//.test(v);
      },
      message: 'Thumbnail must be a valid URL'
    }
  },
  public_id: {
    type: String,
    required: true
  },
  width: Number,
  height: Number,
  size: Number,
  format: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
},

  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
    index: true,
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
    index: true,
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
    validate: {
      validator: async function(v) {
        if (!v) return true;
        const User = mongoose.model('User');
        const user = await User.findById(v);
        return user && user.isActive;
      },
      message: 'Invalid or inactive user'
    }
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
    index: true,
    validate: {
      validator: function(v) {
        return !v || v > Date.now();
      },
      message: 'Expiry date must be in the future'
    }
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.deletedAt;
      delete ret.deletedBy;
      delete ret.version;
      return ret;
    }
  },
  toObject: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      delete ret.deletedAt;
      delete ret.deletedBy;
      delete ret.version;
      return ret;
    }
  }
});

// Virtuals
serviceSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'service',
  match: { isActive: true }
});


serviceSchema.virtual('categoryDetails', {
  ref: 'Category',
  localField: 'category',
  foreignField: '_id',
  justOne: true
});

serviceSchema.virtual('creatorDetails', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

serviceSchema.virtual('isDeleted').get(function() {
  return !!this.deletedAt;
});

// Pre-save middleware
serviceSchema.pre('save', async function () {
  if (this.isNew) this._originalStatus = null;
  if (!this._originalStatus) this._originalStatus = this.status;

  const fieldsToSanitize = ['title', 'description', 'shortDescription', 'metaTitle', 'metaDescription'];
  fieldsToSanitize.forEach(field => {
    if (this[field] && typeof this[field] === 'string') {
      this[field] = sanitizeText(this[field]);
    }
  });

  ['tags', 'searchKeywords'].forEach(arr => {
    if (Array.isArray(this[arr])) {
      this[arr] = this[arr].map(sanitizeText);
    }
  });

  if (Array.isArray(this.features)) {
    this.features = this.features.map(f => ({
      ...f,
      title: sanitizeText(f.title || ''),
      description: sanitizeText(f.description || '')
    }));
  }

  if (Array.isArray(this.faqs)) {
    this.faqs = this.faqs.map(f => ({
      ...f,
      question: sanitizeText(f.question || ''),
      answer: sanitizeText(f.answer || '')
    }));
  }

  if (Array.isArray(this.requirements)) {
    this.requirements = this.requirements.map(r => ({
      ...r,
      question: sanitizeText(r.question || ''),
      options: r.options ? r.options.map(sanitizeText) : []
    }));
  }


  if (this.isModified('title') || this.isNew) {
    let baseSlug = slugify(this.title, { lower: true, strict: true, locale: 'en', trim: true });
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.constructor.findOne({ slug, _id: { $ne: this._id } });
      if (!existing) break;
      slug = `${baseSlug}-${Date.now().toString().slice(-6)}-${counter++}`;
      if (counter > 10) throw new Error('Could not generate unique slug');
    }
    this.slug = slug;
  }

  if (this.isModified('status') && this.status === 'active' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  if (this.isModified('publishedAt') && this.publishedAt && !this.expiresAt) {
    const expiry = new Date(this.publishedAt);
    expiry.setDate(expiry.getDate() + 30);
    this.expiresAt = expiry;
  }

  if (this.isModified('status') && this.status !== 'active') {
    this.expiresAt = null;
  }

  if (!this.isNew && this.isModified()) {
    this.version += 1;
  }
});

serviceSchema.pre('save', async function() {
  // Validate category-subcategory relationship if subcategory exists
  if (this.subcategory && this.category) {
    try {
      const Subcategory = mongoose.model('Subcategory');
      const subcategory = await Subcategory.findOne({
        _id: this.subcategory,
        category: this.category,
        isActive: true
      });
     
      if (!subcategory) {
        const error = new Error('Subcategory does not belong to the selected category');
        error.name = 'ValidationError';
        throw error;  // Throw instead of calling next(error)
      }
    } catch (error) {
      throw error;  // Re-throw any DB errors or the validation error
    }
  }
  // No need to call next() in async middleware without parameter
});

serviceSchema.post('findOneAndDelete', async function (doc) {
  if (doc && doc.status === 'active') {
    try {
      await mongoose.model('Category').decrementServicesCount(doc.category);
    } catch (error) {
      console.error('Error decrementing service count on delete:', error);
    }
  }
});

// Indexes
serviceSchema.index({ category: 1, status: 1 }, { name: 'category_status_idx' });
serviceSchema.index({ createdBy: 1, status: 1 }, { name: 'creator_status_idx' });
serviceSchema.index({ status: 1, publishedAt: -1 }, { name: 'status_published_desc_idx' });
serviceSchema.index({ isFeatured: 1, status: 1 }, { name: 'featured_status_idx' });
serviceSchema.index({ isRecommended: 1, status: 1 }, { name: 'recommended_status_idx' });
serviceSchema.index({ isPopular: 1, status: 1 }, { name: 'popular_status_idx' });
serviceSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text', 
  searchKeywords: 'text',
  shortDescription: 'text'
}, {
  name: 'service_search_idx',
  weights: {
    title: 10,
    searchKeywords: 5,
    tags: 3,
    description: 2,
    shortDescription: 1
  }
});

serviceSchema.index({ isActive: 1, status: 1 }, { name: 'active_status_idx' });
serviceSchema.index({ price: 1, status: 1 }, { name: 'price_status_idx' });
serviceSchema.index({ deliveryTime: 1, status: 1 }, { name: 'delivery_status_idx' });
serviceSchema.index({ views: -1, status: 1 }, { name: 'views_status_desc_idx' });

// Query helpers
serviceSchema.query.active = function() {
  return this.where({ isActive: true, deletedAt: null });
};

serviceSchema.query.public = function() {
  return this.where({ 
    status: 'active', 
    isActive: true,
    deletedAt: null 
  });
};

serviceSchema.query.byCreator = function(userId) {
  return this.where({ createdBy: userId });
};

serviceSchema.query.byCategory = function(categoryId) {
  return this.where({ category: categoryId });
};

serviceSchema.query.featured = function() {
  return this.where({ 
    isFeatured: true,
    status: 'active',
    isActive: true,
    deletedAt: null 
  });
};


serviceSchema.statics.findExpired = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    expiresAt: { $lt: now },
    isActive: true
  });
};

serviceSchema.statics.closeExpired = async function() {
  const expiredServices = await this.findExpired();
  const results = [];
  
  for (const service of expiredServices) {
    service.status = 'paused';
    service.lastUpdatedBy = service.createdBy;
    await service.save();
    
    await mongoose.model('Category').decrementServicesCount(service.category);
    
    results.push(service._id);
  }
  
  return results;
};

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;