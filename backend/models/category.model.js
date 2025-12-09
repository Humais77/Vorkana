const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [50, 'Category name cannot exceed 50 characters'],
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
  },
  image: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|webp|gif|svg)$/i.test(v);
      },
      message: 'Invalid image URL format',
    },
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  popular: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
    min: [0, 'Order cannot be negative'],
  },
  level: {
    type: Number,
    default: 0,
    min: [0, 'Level cannot be negative'],
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
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  version: {
    type: Number,
    default: 1,
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory',
});

// Slug generation
// categorySchema.pre('save', function(next) {
//   if (this.isModified('name')) {
//     this.slug = slugify(this.name, { 
//       lower: true, 
//       strict: true,
//       locale: 'en',
//       trim: true
//     });
//   }
  
//   // Set level based on parent
//   if (this.parentCategory) {
//     this.level = 1;
//   }
  
//   next();
// });

// // Cascade delete prevention
// categorySchema.pre('deleteOne', { document: true, query: false }, async function() {
//   const Category = mongoose.model('Category');
//   const Service = mongoose.model('Service');

//   const subcategories = await Category.countDocuments({
//     parentCategory: this._id,
//     isActive: true
//   });

//   if (subcategories > 0) {
//     throw new Error('Cannot delete category with active subcategories');
//   }

//   const services = await Service.countDocuments({
//     category: this._id,
//     isActive: true
//   });

//   if (services > 0) {
//     throw new Error('Cannot delete category with active services');
//   }
// });

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ isActive: 1, featured: 1 });
categorySchema.index({ isActive: 1, popular: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ createdAt: -1 });
categorySchema.index({ 'metaKeywords': 'text', 'name': 'text', 'description': 'text' });

// Static methods
categorySchema.statics.incrementServicesCount = async function(categoryId) {
  return this.findByIdAndUpdate(
    categoryId,
    { $inc: { servicesCount: 1 } },
    { new: true }
  );
};

categorySchema.statics.decrementServicesCount = async function(categoryId) {
  return this.findByIdAndUpdate(
    categoryId,
    { $inc: { servicesCount: -1 } },
    { new: true }
  );
};

categorySchema.statics.incrementGigsCount = async function(categoryId) {
  return this.findByIdAndUpdate(
    categoryId,
    { $inc: { gigsCount: 1 } },
    { new: true }
  );
};

categorySchema.statics.decrementGigsCount = async function(categoryId) {
  return this.findByIdAndUpdate(
    categoryId,
    { $inc: { gigsCount: -1 } },
    { new: true }
  );
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;