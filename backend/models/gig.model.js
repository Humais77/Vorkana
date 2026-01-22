const mongoose = require('mongoose');
const slugify = require('slugify');
const { sanitizeHtml, sanitizeText } = require('../utils/sanitize.js');

const gigSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: true,
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
  },
  oauthEmail: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    maxlength: [100, 'Email cannot exceed 100 characters'],
    index: true,
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [80, 'Country cannot exceed 80 characters'],
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: [20, 'Phone cannot exceed 20 characters'],
  },
  projectCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Project category is required'],
    index: true,
    validate: {
      validator: async function(v) {
        const Category = mongoose.model('Category');
        const category = await Category.findOne({ 
          _id: v, 
          isActive: true,
          isSubcategory: false // Must be main category, not a subcategory
        });
        return category;
      },
      message: 'Invalid or inactive category'
    }
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subcategory', // Updated reference
    index: true,
    validate: {
      validator: async function(v) {
        if (!v) return false;
        const Subcategory = mongoose.model('Subcategory');
        const subcategory = await Subcategory.findOne({ 
          _id: v, 
          isActive: true 
        });
        
        if (!subcategory) return false;
        
        // Verify subcategory belongs to the selected category
        if (this.projectCategory && subcategory.category.toString() !== this.projectCategory.toString()) {
          return false;
        }
        
        return true;
      },
      message: 'Invalid or inactive subcategory, or does not belong to the selected category'
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },
  budget: {
    type: Number,
    required: [true, 'Budget is required'],
    min: [5, 'Minimum budget is $5'],
    max: [100000, 'Maximum budget is $100,000'],
    index: true,
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
  
  // Images section
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
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^https?:\/\//.test(v);
        },
        message: 'Thumbnail must be a valid URL'
      }
    },
    public_id: String,
    width: Number,
    height: Number,
    size: Number,
    format: String,
    uploadedAt: Date
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'assigned', 'completed', 'cancelled', 'closed'],
    default: 'open',
    index: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
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
      validate: {
        validator: function(v) {
          return !v || v > Date.now();
        },
        message: 'Due date must be in the future'
      }
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
    index: true,
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
  },
  disputeReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Dispute reason cannot exceed 500 characters'],
  },
  disputeStatus: {
    type: String,
    enum: ['none', 'open', 'resolved', 'escalated'],
    default: 'none',
    index: true,
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'invite_only'],
    default: 'public',
    index: true,
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true,
  },
  skillsRequired: [{
    type: String,
    trim: true,
    maxlength: [50, 'Skill cannot exceed 50 characters'],
    index: true,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
gigSchema.virtual('category', {
  ref: 'Category',
  localField: 'projectCategory',
  foreignField: '_id',
  justOne: true,
});

// Updated: Use Subcategory model for subcategoryDetails
gigSchema.virtual('subcategoryDetails', {
  ref: 'Subcategory',
  localField: 'subcategory',
  foreignField: '_id',
  justOne: true,
});

gigSchema.virtual('assignedUser', {
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

gigSchema.virtual('isDeleted').get(function() {
  return !!this.deletedAt;
});

// Pre-save middleware
gigSchema.pre('save', async function () {
  if (this.isNew) this._originalStatus = null;
  if (!this._originalStatus) this._originalStatus = this.status;

  // Sanitize text fields
  const fieldsToSanitize = ['title', 'fullName', 'oauthEmail', 'country', 'phone', 
                           'description', 'timeline', 'clientReview','disputeReason'];
  fieldsToSanitize.forEach(field => {
    if (this[field] && typeof this[field] === 'string') {
      this[field] = sanitizeText(this[field]);
    }
  });

  if (Array.isArray(this.skillsRequired)) {
    this.skillsRequired = this.skillsRequired.map(sanitizeText);
  }
  if (Array.isArray(this.deliverables)) {
    this.deliverables = this.deliverables.map(sanitizeText);
  }

  // Generate unique slug
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

  // Validate subcategory belongs to category if both are being set
  if (this.isModified('projectCategory') || this.isModified('subcategory')) {
    if (this.subcategory && this.projectCategory) {
      const Subcategory = mongoose.model('Subcategory');
      const subcategory = await Subcategory.findById(this.subcategory);
      
      if (!subcategory) {
        throw new Error('Subcategory not found');
      }
      
      // Check if subcategory belongs to the selected category
      if (subcategory.category.toString() !== this.projectCategory.toString()) {
        throw new Error('Subcategory does not belong to the selected category');
      }
    }
  }

  // Expiry logic
  if (this.isModified('status') && this.status === 'open' && !this.expiresAt) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    this.expiresAt = expiry;
  }
  if (this.isModified('status') && this.status !== 'open') {
    this.expiresAt = null;
  }

  // Set thumbnail if not set but images exist
  if (this.images && this.images.length > 0 && (!this.thumbnail || !this.thumbnail.url)) {
    const firstImage = this.images[0];
    this.thumbnail = {
      url: firstImage.url,
      public_id: firstImage.public_id,
      width: firstImage.width,
      height: firstImage.height,
      size: firstImage.size,
      format: firstImage.format,
      uploadedAt: firstImage.uploadedAt || new Date()
    };
  }

  // Version increment
  if (!this.isNew && this.isModified()) {
    this.version += 1;
  }
});

gigSchema.pre('save', async function() {
  // Store the original status for comparison
  if (this.isModified('status')) {
    this._originalStatus = this._originalStatus || this.status;
  }
});
gigSchema.pre('save',async function() {
  // Additional security checks
  if (this.title && this.title.length > 200) {
    return next(new Error('Title exceeds maximum length'));
  }
  
  // Prevent NoSQL injection
  const dangerousChars = /[$]|\.\./;
  Object.keys(this.toObject()).forEach(key => {
    if (typeof this[key] === 'string' && dangerousChars.test(this[key])) {
       throw new Error(`Potentially dangerous characters in ${key}`);
    }
  });
});

// Update post-save middleware
gigSchema.post('save', async function(doc) {
  try {
    // Only update counts if status changed
    if (doc._originalStatus !== undefined && doc._originalStatus !== doc.status) {
      await updateGigCounts(doc, doc._originalStatus);
      // Clear the stored status
      delete doc._originalStatus;
    }
    
    // Handle new gig creation
    if (this.isNew && doc.status === 'open') {
      await updateGigCounts(doc, null);
    }
  } catch (error) {
    console.error('Error in gig post-save middleware:', error);
  }
});
gigSchema.post('findOneAndUpdate', async function(doc) {
  // This runs when soft deleting (setting deletedAt)
  try {
    const update = this.getUpdate();
    
    // Check if this is a soft delete operation
    if (update.deletedAt !== undefined && update.deletedAt !== null && doc) {
      const Category = mongoose.model('Category');
      const Subcategory = mongoose.model('Subcategory');
      
      // If the gig was open, decrement counts
      if (doc.status === 'open' && doc.isActive !== false) {
        // Decrement category count safely
        const category = await Category.findById(doc.projectCategory);
        if (category && category.gigsCount > 0) {
          await Category.findByIdAndUpdate(
            doc.projectCategory,
            { 
              $inc: { gigsCount: -1 },
              ...(category.gigsCount - 1 < 0 ? { gigsCount: 0 } : {})
            },
            { new: true }
          );
          console.log(`Decremented category ${doc.projectCategory} gig count on SOFT delete`);
        }
        
        // Decrement subcategory count if exists
        if (doc.subcategory) {
          const subcategory = await Subcategory.findById(doc.subcategory);
          if (subcategory && subcategory.gigsCount > 0) {
            await Subcategory.findByIdAndUpdate(
              doc.subcategory,
              { 
                $inc: { gigsCount: -1 },
                ...(subcategory.gigsCount - 1 < 0 ? { gigsCount: 0 } : {})
              },
              { new: true }
            );
            console.log(`Decremented subcategory ${doc.subcategory} gig count on SOFT delete`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in soft delete post middleware:', error);
  }
});
gigSchema.post('findOneAndUpdate', async function(doc) {
  // This also runs when restoring (clearing deletedAt)
  try {
    const update = this.getUpdate();
    
    // Check if this is a restore operation (deletedAt being set to null)
    if (update.deletedAt === null && doc && doc.deletedAt !== null) {
      const Category = mongoose.model('Category');
      const Subcategory = mongoose.model('Subcategory');
      
      // If the gig is open, increment counts
      if (doc.status === 'open') {
        // Increment category count
        await Category.findByIdAndUpdate(
          doc.projectCategory,
          { $inc: { gigsCount: 1 } },
          { new: true }
        );
        console.log(`Incremented category ${doc.projectCategory} gig count on RESTORE`);
        
        // Increment subcategory count if exists
        if (doc.subcategory) {
          await Subcategory.findByIdAndUpdate(
            doc.subcategory,
            { $inc: { gigsCount: 1 } },
            { new: true }
          );
          console.log(`Incremented subcategory ${doc.subcategory} gig count on RESTORE`);
        }
      }
    }
  } catch (error) {
    console.error('Error in restore post middleware:', error);
  }
});
gigSchema.post('findOneAndDelete', async function(doc) {
  // Only run this for HARD deletes (when document is physically removed from database)
  // NOT for soft deletes (when deletedAt is set)
  if (doc && doc.status === 'open') {
    try {
      const Category = mongoose.model('Category');
      const Subcategory = mongoose.model('Subcategory');
      
      // Use safe decrement to prevent negative counts
      const category = await Category.findById(doc.projectCategory);
      if (category && category.gigsCount > 0) {
        await Category.findByIdAndUpdate(
          doc.projectCategory,
          { 
            $inc: { gigsCount: -1 },
            // Ensure it doesn't go below 0
            ...(category.gigsCount - 1 < 0 ? { gigsCount: 0 } : {})
          }
        );
        console.log(`Decremented category ${doc.projectCategory} gig count on HARD delete`);
      }
      
      // Decrement subcategory count if exists
      if (doc.subcategory) {
        const subcategory = await Subcategory.findById(doc.subcategory);
        if (subcategory && subcategory.gigsCount > 0) {
          await Subcategory.findByIdAndUpdate(
            doc.subcategory,
            { 
              $inc: { gigsCount: -1 },
              ...(subcategory.gigsCount - 1 < 0 ? { gigsCount: 0 } : {})
            }
          );
          console.log(`Decremented subcategory ${doc.subcategory} gig count on HARD delete`);
        }
      }
    } catch (error) {
      console.error('Error decrementing gig count on HARD delete:', error);
    }
  }
});

// Indexes
gigSchema.index({ projectCategory: 1, status: 1 }, { name: 'category_status_idx' });
gigSchema.index({ subcategory: 1, status: 1 }, { name: 'subcategory_status_idx' }); // New index
gigSchema.index({ createdBy: 1, status: 1 }, { name: 'creator_status_idx' });
gigSchema.index({ assignedTo: 1, status: 1 }, { name: 'assignee_status_idx' });
gigSchema.index({ status: 1, createdAt: -1 }, { name: 'status_created_desc_idx' });
gigSchema.index({ urgency: 1, status: 1 }, { name: 'urgency_status_idx' });
gigSchema.index({ 
  title: 'text',
  description: 'text',
  skillsRequired: 'text',
  deliverables: 'text'
}, {
  name: 'gig_search_idx',
  weights: {
    title: 10,
    description: 5,
    skillsRequired: 3,
    deliverables: 2
  }
});

gigSchema.index({ isActive: 1, status: 1 }, { name: 'active_status_idx' });
gigSchema.index({ visibility: 1, status: 1 }, { name: 'visibility_status_idx' });
gigSchema.index({ budget: 1, status: 1 }, { name: 'budget_status_idx' });

// Query helpers
gigSchema.query.active = function() {
  return this.where({ isActive: true, deletedAt: null });
};

gigSchema.query.open = function() {
  return this.where({ status: 'open', isActive: true, deletedAt: null });
};

gigSchema.query.byCreator = function(clientId) {
  return this.where({ createdBy: clientId });
};

gigSchema.query.byAssignee = function(userId) {
  return this.where({ assignedTo: userId });
};

gigSchema.query.byCategory = function(categoryId) {
  return this.where({ projectCategory: categoryId });
};

gigSchema.query.bySubcategory = function(subcategoryId) {
  return this.where({ subcategory: subcategoryId });
};

gigSchema.query.publicOnly = function() {
  return this.where({ visibility: 'public', isActive: true, deletedAt: null });
};

// Static methods
gigSchema.statics.findExpired = function() {
  const now = new Date();
  return this.find({
    status: 'open',
    expiresAt: { $lt: now },
    isActive: true
  });
};

gigSchema.statics.closeExpired = async function() {
  const expiredGigs = await this.findExpired();
  const results = [];
  
  for (const gig of expiredGigs) {
    gig.status = 'closed';
    gig.lastUpdatedBy = gig.createdBy;
    await gig.save();
    
    // Decrement category count
    await mongoose.model('Category').decrementGigsCount(gig.projectCategory);
    
    // Decrement subcategory count if exists
    if (gig.subcategory) {
      await mongoose.model('Subcategory').decrementGigsCount(gig.subcategory);
    }
    
    results.push(gig._id);
  }
  
  return results;
};

// Static methods for images (optional)
gigSchema.statics.incrementLikes = async function(gigId) {
  return this.findByIdAndUpdate(
    gigId,
    { $inc: { likes: 1 } },
    { new: true }
  );
};

gigSchema.statics.incrementViews = async function(gigId) {
  return this.findByIdAndUpdate(
    gigId,
    { $inc: { views: 1 } },
    { new: true }
  );
};
const updateGigCounts = async function(doc, oldStatus) {
  try {
    const Category = mongoose.model('Category');
    const Subcategory = mongoose.model('Subcategory');
    
    const wasOpen = oldStatus === 'open';
    const isNowOpen = doc.status === 'open';
    
    // Skip if no change or gig is not active
    if (wasOpen === isNowOpen || doc.isActive === false) {
      return;
    }
    
    // Use atomic operations with proper conditions
    if (!wasOpen && isNowOpen) {
      // Gig became open - increment counts
      await Category.findByIdAndUpdate(
        doc.projectCategory,
        { 
          $inc: { gigsCount: 1 },
          $set: { lastUpdatedAt: new Date() }
        },
        { session: this.$session() }
      );
      
      if (doc.subcategory) {
        await Subcategory.findByIdAndUpdate(
          doc.subcategory,
          { 
            $inc: { gigsCount: 1 },
            $set: { lastUpdatedAt: new Date() }
          },
          { session: this.$session() }
        );
      }
    } else if (wasOpen && !isNowOpen) {
      // Gig became closed - decrement with safety
      await Category.findOneAndUpdate(
        { 
          _id: doc.projectCategory,
          gigsCount: { $gt: 0 }
        },
        { 
          $inc: { gigsCount: -1 },
          $set: { lastUpdatedAt: new Date() }
        },
        { session: this.$session() }
      );
      
      if (doc.subcategory) {
        await Subcategory.findOneAndUpdate(
          { 
            _id: doc.subcategory,
            gigsCount: { $gt: 0 }
          },
          { 
            $inc: { gigsCount: -1 },
            $set: { lastUpdatedAt: new Date() }
          },
          { session: this.$session() }
        );
      }
    }
  } catch (error) {
    console.error('Error updating gig counts:', error.message);
  }
};
const Gig = mongoose.model('Gig', gigSchema);

module.exports = Gig;