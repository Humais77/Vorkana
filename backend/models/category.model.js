const mongoose = require('mongoose');
const slugify = require('slugify');
const Service = require('./services.model');
const Gig = require('./gig.model');
const { v4: uuidv4 } = require('uuid');
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
      // Strict XSS prevention patterns
      const criticalPatterns = [
        /<script/i,
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /on\w+\s*=/i,
        /expression\s*\(/i,
        /url\s*\(/i,
        /@import/i,
        /alert\s*\(/i,
        /confirm\s*\(/i,
        /prompt\s*\(/i,
        /eval\s*\(/i,
        /document\./i,
        /window\./i,
        /\$where/i,
        /\$ne/i,
        /\$regex/i,
        /union.*select/i,
        /select.*from/i,
        /insert.*into/i,
        /'|"|`|--|;|\/\*|\*\//,
        /\x00|\x1a|\x0d|\x0c|\x0b/
      ];
      
      return !criticalPatterns.some(pattern => pattern.test(v));
    },
    message: 'Category name contains dangerous content'
  }
},
  description: {
  type: String,
  default: '',
  trim: true,
  maxlength: [1000, 'Description cannot exceed 1000 characters'],
  validate: {
    validator: function(v) {
      if (!v) return true;
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /on\w+\s*=/i,
        /alert\s*\(/i,
        /confirm\s*\(/i,
        /prompt\s*\(/i
      ];
      return !dangerousPatterns.some(pattern => pattern.test(v));
    },
    message: 'Description contains dangerous content'
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
  allowSubcategories: {
    type: Boolean,
    default: false,
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
    maxlength: [100, 'Meta title cannot exceed 60 characters'],
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
  set: function(v) {
    return Math.max(0, v);
  }
},
gigsCount: {
  type: Number,
  default: 0,
  min: [0, 'Gigs count cannot be negative'],
  set: function(v) {
    return Math.max(0, v);
  }
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
      // Prevent self-reference
      if (this._id && this.parentCategory.equals(this._id)) {
        throw new Error('Category cannot be its own parent');
      }

      // Check parent exists and is not a subcategory
      const parent = await this.constructor.findById(this.parentCategory);
      if (!parent) {
        throw new Error('Parent category not found');
      }
    
      
      // Check for circular reference using graph lookup
      const visited = new Set();
      let currentId = this.parentCategory;
      let iterationCount = 0;
      const MAX_HIERARCHY_DEPTH = 10;

      while (currentId && iterationCount < MAX_HIERARCHY_DEPTH) {
        iterationCount++;
        const idStr = currentId.toString();
        
        if (visited.has(idStr)) {
          throw new Error(`Circular reference detected in category hierarchy`);
        }
        
        visited.add(idStr);
        
        const cat = await this.constructor.findById(currentId).select('parentCategory');
        if (!cat || !cat.parentCategory) break;
        
        // Check if we're trying to create a loop back to this category
        if (this._id && cat.parentCategory.equals(this._id)) {
          throw new Error('Circular reference detected: category would be parent of its own parent');
        }
        
        currentId = cat.parentCategory;
      }
      
      if (iterationCount >= MAX_HIERARCHY_DEPTH) {
        throw new Error('Category hierarchy too deep');
      }
      
      // Set level based on parent
      const parentLevel = parent.level || 0;
      this.level = parentLevel + 1;
     
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
  'name': 1, 
  'slug': 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    isActive: true,
    deletedAt: null 
  }
});
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
categorySchema.statics.updateServicesCount = async function(categoryId, change = 1, session = null) {
  const options = session ? { session, new: true } : { new: true };
  
  if (change === 0) return this.findById(categoryId);
  
  const updateOperation = change > 0 
    ? { $inc: { servicesCount: 1 } }
    : { $inc: { servicesCount: -1 } };
  
  return this.findByIdAndUpdate(
    categoryId,
    {
      ...updateOperation,
      $set: { lastUpdatedAt: new Date() }
    },
    options
  );
};

categorySchema.statics.updateGigsCount = async function(categoryId, change = 1, session = null) {
  const options = session ? { session, new: true } : { new: true };
  
  if (change === 0) return this.findById(categoryId);
  
  const updateOperation = change > 0 
    ? { $inc: { gigsCount: 1 } }
    : { $inc: { gigsCount: -1 } };
  
  return this.findByIdAndUpdate(
    categoryId,
    {
      ...updateOperation,
      $set: { lastUpdatedAt: new Date() }
    },
    options
  );
};
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
  // Use atomic operation to ensure count doesn't go below 0
  const result = await this.findByIdAndUpdate(
    categoryId,
    [
      {
        $set: {
          servicesCount: {
            $cond: {
              if: { $gt: ["$servicesCount", 0] },
              then: { $subtract: ["$servicesCount", 1] },
              else: 0
            }
          },
          lastUpdatedAt: new Date()
        }
      }
    ],
    { 
      new: true,
      runValidators: false 
    }
  );
  
  return result;
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
  // Use atomic operation with conditional update
  const result = await this.findOneAndUpdate(
    { 
      _id: categoryId,
      gigsCount: { $gt: 0 } // Only decrement if > 0
    },
    { 
      $inc: { gigsCount: -1 },
      $set: { lastUpdatedAt: new Date() }
    },
    { 
      new: true,
      runValidators: true 
    }
  );
  
  // If not found or count was 0, log but don't throw
  if (!result) {
    console.warn(`Category ${categoryId} gig count already at 0, skipping decrement`);
  }
  
  return result;
};

// Add a method to get accurate counts directly from services/gigs
categorySchema.statics.getAccurateCounts = async function(categoryId) {
  const [servicesCount, gigsCount] = await Promise.all([
    mongoose.model('Service').countDocuments({
      category: categoryId,
      status: 'active',
      isActive: true,
      deletedAt: null
    }),
    mongoose.model('Gig').countDocuments({
      projectCategory: categoryId,
      status: 'open',
      isActive: true,
      deletedAt: null
    })
  ]);
  
  return { servicesCount, gigsCount };
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
categorySchema.statics.repairCategoryCounts = async function() {
  try {
    console.log('Starting category count repair...');
    
    const categories = await this.find({});
    let repairedCount = 0;
    const results = [];
    
    for (const category of categories) {
      try {
        const { servicesCount, gigsCount } = await this.getAccurateCounts(category._id);
        
        // Log the current state for debugging
        console.log(`Category: ${category.name}`, {
          currentServices: category.servicesCount,
          actualServices: servicesCount,
          currentGigs: category.gigsCount,
          actualGigs: gigsCount
        });
        
        // Only update if counts are different
        if (category.servicesCount !== servicesCount || category.gigsCount !== gigsCount) {
          await this.findByIdAndUpdate(category._id, {
            servicesCount: Math.max(0, servicesCount), // Ensure non-negative
            gigsCount: Math.max(0, gigsCount),         // Ensure non-negative
            lastUpdatedAt: new Date()
          });
          
          repairedCount++;
          results.push({
            categoryId: category._id,
            name: category.name,
            oldServicesCount: category.servicesCount,
            newServicesCount: servicesCount,
            oldGigsCount: category.gigsCount,
            newGigsCount: gigsCount,
            repaired: true
          });
          
          console.log(`✅ Repaired category "${category.name}": services ${category.servicesCount} → ${servicesCount}, gigs ${category.gigsCount} → ${gigsCount}`);
        } else {
          results.push({
            categoryId: category._id,
            name: category.name,
            status: 'already_correct',
            servicesCount: servicesCount,
            gigsCount: gigsCount
          });
          console.log(`✅ Category "${category.name}" already has correct counts`);
        }
      } catch (error) {
        console.error(`❌ Failed to repair category ${category._id}:`, error);
        results.push({
          categoryId: category._id,
          name: category.name,
          error: error.message,
          repaired: false
        });
      }
    }
    
    console.log(`📊 Category count repair completed. Repaired ${repairedCount} out of ${categories.length} categories.`);
    return { 
      repairedCount, 
      totalCategories: categories.length,
      failedCount: categories.length - repairedCount,
      details: results 
    };
  } catch (error) {
    console.error('❌ Error repairing category counts:', error);
    throw error;
  }
};
const Category = mongoose.model('Category', categorySchema);

module.exports = Category;