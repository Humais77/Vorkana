const mongoose = require('mongoose');
const slugify = require('slugify');
const Service = require('./services.model');
const Gig = require('./gig.model');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [50, 'Category name cannot exceed 50 characters'],
    index: true, // Added for faster name lookups
    validate: {
      validator: function(v) {
        // Additional security validation
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
      message: 'Category name contains invalid characters'
    }
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon cannot exceed 50 characters'],
    default: 'fa-folder',
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-zA-Z0-9\-_]+$/.test(v);
      },
      message: 'Icon can only contain letters, numbers, hyphens and underscores'
    }
  },
  image: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // Validate path and prevent traversal
        const validPattern = /^\/uploads\/[a-f0-9-]{20,64}\.(jpg|jpeg|png|webp|gif|svg)$/i;
        return validPattern.test(v) && !v.includes('..') && !v.includes('//');
      },
      message: 'Invalid image URL format or path traversal detected',
    },
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
    index: true,
    validate: {
      validator: async function(v) {
        if (!v) return true;
        // Prevent circular reference
        if (this._id && v.equals(this._id)) {
          return false;
        }
        // Check if parent exists
        const parent = await mongoose.model('Category').findById(v);
        return !!parent;
      },
      message: 'Invalid parent category or circular reference detected'
    }
  },
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  popular: {
    type: Boolean,
    default: false,
    index: true,
  },
  order: {
    type: Number,
    default: 0,
    min: [0, 'Order cannot be negative'],
    max: [1000, 'Order cannot exceed 1000'],
    index: true,
  },
  level: {
    type: Number,
    default: 0,
    min: [0, 'Level cannot be negative'],
    max: [10, 'Level cannot exceed 10'],
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    validate: {
      validator: async function(v) {
        const User = mongoose.model('User');
        return await User.exists({ _id: v, isActive: true });
      },
      message: 'User does not exist or is not active'
    }
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
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
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(v) {
        if (!v) return true;
        const User = mongoose.model('User');
        return await User.exists({ _id: v, isActive: true });
      },
      message: 'User does not exist or is not active'
    }
  },
  version: {
    type: Number,
    default: 1,
  }
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

categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory',
  match: { isActive: true, deletedAt: null }
});

categorySchema.virtual('parent', {
  ref: 'Category',
  localField: 'parentCategory',
  foreignField: '_id',
  justOne: true
});

categorySchema.virtual('isDeleted').get(function() {
  return !!this.deletedAt;
});

categorySchema.pre('save', async function () {
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

  if (this.isModified('name') || this.isNew) {
    let baseSlug = slugify(this.name, { lower: true, strict: true, locale: 'en', trim: true });
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.constructor.findOne({
        slug,
        _id: { $ne: this._id }
      });

      if (!existing) break;

      slug = `${baseSlug}-${counter++}`;
      if (counter > 100) throw new Error('Could not generate unique slug');
    }

    this.slug = slug;
  }

  if (this.isModified('parentCategory') || this.isNew) {
    if (this.parentCategory) {
      const parent = await this.constructor.findById(this.parentCategory);
      this.level = parent ? parent.level + 1 : 1;
      if (this.level > 10) throw new Error('Category nesting too deep (max 10 levels)');
    } else {
      this.level = 0;
    }
  }

  if (this.parentCategory) {
    const visited = new Set();
    let currentId = this.parentCategory;

    while (currentId) {
      const idStr = currentId.toString();
      if (visited.has(idStr)) throw new Error('Circular reference detected in category hierarchy');
      visited.add(idStr);

      const cat = await this.constructor.findById(currentId).select('parentCategory');
      if (!cat || !cat.parentCategory) break;
      if (this._id && cat.parentCategory.equals(this._id)) {
        throw new Error('Circular reference detected in category hierarchy');
      }
      currentId = cat.parentCategory;
    }
  }

  if (!this.isNew && this.isModified()) {
    this.version += 1;
  }

});

categorySchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();

  // Only run checks when soft-deleting
  if (update.deletedAt !== undefined && update.deletedAt !== null) {
    const categoryId = this.getQuery()._id;

    if (!categoryId) return; // safety

    // Check for active subcategories
    const activeSubcategories = await this.model.countDocuments({
      parentCategory: categoryId,
      isActive: true,
      deletedAt: null
    });

    if (activeSubcategories > 0) {
      throw new Error('Cannot delete category with active subcategories');
    }

    // Check for active services
    const activeServices = await Service.countDocuments({
      category: categoryId,
      isActive: true,
      deletedAt: null  // assuming services also have soft delete
    });

    // Check for active gigs
    const activeGigs = await Gig.countDocuments({
      category: categoryId,
      isActive: true,
      deletedAt: null
    });

    if (activeServices > 0 || activeGigs > 0) {
      throw new Error('Cannot delete category with active services or gigs');
    }
  }

  // No next() call!
});

// Define compound indexes only (single indexes are defined at field level)
categorySchema.index({ 
  isActive: 1, 
  featured: 1, 
  popular: 1 
}, { name: 'active_featured_popular_idx' });

categorySchema.index({ 
  order: 1, 
  level: 1 
}, { name: 'order_level_idx' });

categorySchema.index({ 
  createdAt: -1 
}, { name: 'created_at_desc_idx' });

categorySchema.index({ 
  updatedAt: -1 
}, { name: 'updated_at_desc_idx' });

// Text index for search
categorySchema.index({ 
  name: 'text', 
  description: 'text', 
  metaKeywords: 'text',
  metaTitle: 'text',
  metaDescription: 'text'
}, {
  name: 'category_search_idx',
  weights: {
    name: 10,
    metaTitle: 8,
    metaKeywords: 5,
    description: 3,
    metaDescription: 2
  }
});

// Other useful compound indexes
categorySchema.index({ 
  isActive: 1, 
  parentCategory: 1 
}, { name: 'active_parent_idx' });

categorySchema.index({ 
  isActive: 1, 
  level: 1 
}, { name: 'active_level_idx' });

categorySchema.index({ 
  isActive: 1, 
  order: 1 
}, { name: 'active_order_idx' });

// Static methods
categorySchema.statics.incrementServicesCount = async function(categoryId) {
  return this.findByIdAndUpdate(
    categoryId,
    { 
      $inc: { servicesCount: 1 },
      $set: { lastUpdatedAt: new Date() }
    },
    { new: true }
  );
};

categorySchema.statics.decrementServicesCount = async function(categoryId) {
  return this.findByIdAndUpdate(
    categoryId,
    { 
      $inc: { servicesCount: -1 },
      $set: { lastUpdatedAt: new Date() }
    },
    { 
      new: true,
      runValidators: false 
    }
  );
};

categorySchema.statics.incrementGigsCount = async function(categoryId) {
  return this.findByIdAndUpdate(
    categoryId,
    { 
      $inc: { gigsCount: 1 },
      $set: { lastUpdatedAt: new Date() }
    },
    { new: true }
  );
};

categorySchema.statics.decrementGigsCount = async function(categoryId) {
  return this.findByIdAndUpdate(
    categoryId,
    { 
      $inc: { gigsCount: -1 },
      $set: { lastUpdatedAt: new Date() }
    },
    { 
      new: true,
      runValidators: false 
    }
  );
};

categorySchema.statics.getHierarchy = async function(categoryId, depth = 3) {
  const buildTree = async (parentId, currentDepth) => {
    if (currentDepth >= depth) return [];
    
    const categories = await this.find({
      parentCategory: parentId,
      isActive: true,
      deletedAt: null
    }).sort({ order: 1, name: 1 });
    
    const result = [];
    
    for (const category of categories) {
      const children = await buildTree(category._id, currentDepth + 1);
      result.push({
        ...category.toObject(),
        children
      });
    }
    
    return result;
  };
  
  return buildTree(categoryId, 0);
};

// Instance methods
categorySchema.methods.getFullPath = async function() {
  const path = [];
  let current = this;
  
  while (current) {
    path.unshift(current.name);
    if (current.parentCategory) {
      current = await this.constructor.findById(current.parentCategory);
    } else {
      current = null;
    }
  }
  
  return path.join(' > ');
};

categorySchema.methods.softDelete = async function(userId) {
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.isActive = false;
  return this.save();
};

categorySchema.methods.restore = async function() {
  this.deletedAt = null;
  this.deletedBy = null;
  this.isActive = true;
  return this.save();
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;