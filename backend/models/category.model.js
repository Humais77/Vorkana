const mongoose = require('mongoose');
const slugify = require('slugify');
const Service = require('./services.model');
const Gig = require('./gig.model');
const { validateImagePath } = require('../middleware/validators/category.validator');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [50, 'Category name cannot exceed 50 characters'],
    index: true,
    validate: {
      validator: function(v) {
        const criticalPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i
        ];
        return !criticalPatterns.some(pattern => pattern.test(v));
      },
      message: 'Category name contains dangerous HTML/JavaScript code'
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
    
    // Basic pattern check
    const validPattern = /^\/uploads\/[a-f0-9-]{20,64}\.(jpg|jpeg|png|webp|gif|svg)$/i;
    if (!validPattern.test(v)) return false;
    
    // Advanced path traversal check
    return validateImagePath(v);
  },
  message: 'Invalid image path - security violation detected'
}
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
    let baseSlug = slugify(this.name, { 
      lower: true, 
      strict: true, 
      locale: 'en', 
      trim: true 
    });
    
    let slug = baseSlug;
    let counter = 1;
    let isUnique = false;
    
    // Try up to 100 times to find a unique slug
    while (!isUnique && counter <= 100) {
      try {
        // Check if slug exists (excluding current document)
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
        console.error('Error checking slug uniqueness:', error);
        // Fallback: add timestamp to ensure uniqueness
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }
    
    if (!isUnique) {
      // Last resort: use UUID for uniqueness
      const { v4: uuidv4 } = await import('uuid');
      slug = `${baseSlug}-${uuidv4().slice(0, 8)}`;
    }
    
    this.slug = slug;
  }

  // Remove the temporary slugReserved cleanup since we're not using it anymore
  if (this.slugReserved) {
    delete this.slugReserved;
  }

  if (this.isModified('parentCategory') || this.isNew) {
    if (this.parentCategory) {
  const visited = new Set();
  let currentId = this.parentCategory;
  let iterationCount = 0;
  const MAX_HIERARCHY_DEPTH = 100; // Safety limit

  while (currentId && iterationCount < MAX_HIERARCHY_DEPTH) {
    iterationCount++;
    const idStr = currentId.toString();
    
    if (visited.has(idStr)) {
      throw new Error(`Circular reference detected in category hierarchy at depth ${iterationCount}`);
    }
    
    visited.add(idStr);

    const cat = await this.constructor.findById(currentId).select('parentCategory');
    if (!cat) {
      throw new Error(`Parent category ${currentId} not found`);
    }
    
    if (!cat.parentCategory) break;
    
    if (this._id && cat.parentCategory.equals(this._id)) {
      throw new Error('Circular reference detected: category would be parent of its own parent');
    }
    
    currentId = cat.parentCategory;
  }
  
  if (iterationCount >= MAX_HIERARCHY_DEPTH) {
    throw new Error('Category hierarchy too deep or circular reference suspected');
  }
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
// Add to category.model.js:
categorySchema.index({ 
  name: 1, 
  parentCategory: 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    isActive: true,
    deletedAt: null 
  },
  name: 'unique_name_parent_idx'
});
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
// Add to category.model.js:
categorySchema.index({ 
  parentCategory: 1, 
  isActive: 1, 
  order: 1 
}, { name: 'hierarchy_sort_idx' });

categorySchema.index({ 
  slug: 1, 
  isActive: 1 
}, { name: 'slug_lookup_idx', unique: true });

// For soft delete queries:
categorySchema.index({ 
  deletedAt: 1, 
  isActive: 1 
}, { name: 'soft_delete_idx' });
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
categorySchema.statics.incrementServicesCount = async function(categoryId, session = null) {
  const options = session ? { session, new: true } : { new: true };
  
  return this.findByIdAndUpdate(
    categoryId,
    { 
      $inc: { servicesCount: 1 },
      $set: { lastUpdatedAt: new Date() }
    },
    options
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
  const ancestors = await this.constructor.aggregate([
    { $match: { _id: this._id } },
    {
      $graphLookup: {
        from: 'categories',
        startWith: '$parentCategory',
        connectFromField: 'parentCategory',
        connectToField: '_id',
        as: 'ancestors',
        depthField: 'depth'
      }
    },
    { $unwind: { path: '$ancestors', preserveNullAndEmptyArrays: true } },
    { $sort: { 'ancestors.depth': -1 } },
    { $group: { 
      _id: '$_id',
      name: { $first: '$name' },
      ancestors: { $push: '$ancestors.name' }
    }}
  ]);
  
  const result = ancestors[0];
  const path = [...(result.ancestors || []), result.name];
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