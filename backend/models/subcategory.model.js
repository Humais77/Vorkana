const mongoose = require('mongoose');
const slugify = require('slugify');
const Service = require('./services.model');
const Gig = require('./gig.model');

const subcategorySchema = new mongoose.Schema({
  // Required fields
  name: {
    type: String,
    required: [true, 'Subcategory name is required'],
    trim: true,
    minlength: [2, 'Subcategory name must be at least 2 characters'],
    maxlength: [50, 'Subcategory name cannot exceed 50 characters'],
    index: true,
    validate: {
      validator: function(v) {
        const criticalPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/
        ];
        return !criticalPatterns.some(pattern => pattern.test(v));
      },
      message: 'Subcategory name contains dangerous HTML/JavaScript code'
    }
  },
  
  // Reference to parent category (REQUIRED)
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Parent category is required'],
    index: true,
    validate: {
      validator: async function(v) {
        const Category = mongoose.model('Category');
        const category = await Category.findById(v);
        return category && category.isActive;
      },
      message: 'Invalid or inactive parent category'
    }
  },
  
  // Description
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  
  // SEO fields
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  
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
  
  metaKeywords: [{
    type: String,
    trim: true,
    maxlength: [30, 'Keyword cannot exceed 30 characters'],
  }],
  
  // Statistics
  servicesCount: {
    type: Number,
    default: 0,
    min: [0, 'Services count cannot be negative'],
  },
  
  gigsCount: {
    type: Number,
    default: 0,
    min: [0, 'Gigs count cannot be negative'],
  },
  
  // Display properties
  order: {
    type: Number,
    default: 0,
    min: [0, 'Order cannot be negative'],
    max: [1000, 'Order cannot exceed 1000'],
    index: true,
  },
  
  icon: {
    type: String,
    default: '📁',
  },
  
  image: {
    url: String,
    public_id: String,
    width: Number,
    height: Number,
    size: Number,
    format: String,
  },
  
  // Status & audit
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
subcategorySchema.virtual('categoryDetails', {
  ref: 'Category',
  localField: 'category',
  foreignField: '_id',
  justOne: true
});

subcategorySchema.virtual('isDeleted').get(function() {
  return !!this.deletedAt;
});

// Unique compound index: name + category combination must be unique for active items
subcategorySchema.index({ 
  name: 1, 
  category: 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    isActive: true,
    deletedAt: null 
  },
  name: 'unique_name_category_idx'
});

// Index for slug lookup
subcategorySchema.index({ 
  slug: 1, 
  isActive: 1 
}, { 
  name: 'slug_lookup_idx',
  unique: true 
});

// Index for category-based queries
subcategorySchema.index({ 
  category: 1, 
  isActive: 1, 
  order: 1 
}, { name: 'category_active_order_idx' });

// Text index for search
subcategorySchema.index({ 
  name: 'text', 
  description: 'text', 
  metaKeywords: 'text'
}, {
  name: 'subcategory_search_idx',
  weights: {
    name: 10,
    metaKeywords: 5,
    description: 3
  }
});

// Pre-save middleware
subcategorySchema.pre('save', async function () {
  // Sanitize fields
  const fieldsToSanitize = ['name', 'description', 'metaTitle', 'metaDescription'];
  fieldsToSanitize.forEach(field => {
    if (this[field] && typeof this[field] === 'string') {
      this[field] = this[field]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
  });

  // Generate unique slug
  if (this.isModified('name') || this.isNew) {
    let baseSlug = slugify(this.name, { 
      lower: true, 
      strict: true, 
      locale: 'en', 
      trim: true 
    });
    
    let slug = baseSlug;
    let counter = 1;
    let isUnique = false;
    
    while (!isUnique && counter <= 100) {
      try {
        const existing = await this.constructor.findOne({
          slug: slug,
          _id: { $ne: this._id }
        });

        if (!existing) {
          isUnique = true;
        } else {
          slug = `${baseSlug}-${counter++}`;
        }
      } catch (error) {
        // Fallback to timestamp for uniqueness
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }
    
    if (!isUnique) {
      const { v4: uuidv4 } = await import('uuid');
      slug = `${baseSlug}-${uuidv4().slice(0, 8)}`;
    }
    
    this.slug = slug;
  }

  // Increment version on updates
  if (!this.isNew && this.isModified()) {
    this.version += 1;
  }
});

// Post-save middleware: Update category stats
subcategorySchema.post('save', async function (doc) {
  try {
    const Category = mongoose.model('Category');
    
    if (this.isNew && doc.isActive) {
      // Get all active subcategories count for this category
      const activeSubcategories = await mongoose.model('Subcategory').countDocuments({
        category: doc.category,
        isActive: true,
        deletedAt: null
      });
      
      // Update category's subcategoriesCount if you add that field
      // Or you can maintain separate statistics
    }
  } catch (error) {
    console.error('Error updating category stats:', error);
  }
});

// Pre-delete middleware
subcategorySchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();

  // Check when soft-deleting
  if (update.deletedAt !== undefined && update.deletedAt !== null) {
    const subcategoryId = this.getQuery()._id;

    // Check for active services
    const activeServices = await Service.countDocuments({
      subcategory: subcategoryId,
      isActive: true,
      deletedAt: null
    });

    // Check for active gigs
    const activeGigs = await Gig.countDocuments({
      subcategory: subcategoryId,
      isActive: true,
      deletedAt: null
    });

    if (activeServices > 0 || activeGigs > 0) {
      throw new Error('Cannot delete subcategory with active services or gigs');
    }
  }
});

// Static methods
subcategorySchema.statics.incrementServicesCount = async function(subcategoryId) {
  return this.findByIdAndUpdate(
    subcategoryId,
    { 
      $inc: { servicesCount: 1 },
      $set: { lastUpdatedAt: new Date() }
    },
    { new: true }
  );
};

subcategorySchema.statics.decrementServicesCount = async function(subcategoryId) {
  return this.findByIdAndUpdate(
    subcategoryId,
    { 
      $inc: { servicesCount: -1 },
      $set: { lastUpdatedAt: new Date() }
    },
    { new: true }
  );
};

subcategorySchema.statics.incrementGigsCount = async function(subcategoryId) {
  return this.findByIdAndUpdate(
    subcategoryId,
    { 
      $inc: { gigsCount: 1 },
      $set: { lastUpdatedAt: new Date() }
    },
    { new: true }
  );
};

subcategorySchema.statics.decrementGigsCount = async function(subcategoryId) {
  return this.findByIdAndUpdate(
    subcategoryId,
    { 
      $inc: { gigsCount: -1 },
      $set: { lastUpdatedAt: new Date() }
    },
    { new: true }
  );
};

// Query helpers
subcategorySchema.query.active = function() {
  return this.where({ isActive: true, deletedAt: null });
};

subcategorySchema.query.byCategory = function(categoryId) {
  return this.where({ category: categoryId });
};

const Subcategory = mongoose.model('Subcategory', subcategorySchema);

module.exports = Subcategory;