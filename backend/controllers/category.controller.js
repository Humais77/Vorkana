const mongoose = require('mongoose');
const Category = require('../models/category.model.js');

// Helper function to build query from parameters
const buildCategoryQuery = (queryParams, userRole) => {
  const {
    search,
    name,
    slug,
    isActive,
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    createdBy,
    minNameLength,
    maxNameLength,
    hasDescription,
    ids,
    excludeIds,
    nameStartsWith,
    nameEndsWith,
    showAll = false
  } = queryParams;

  const filter = {};

  // Active status filter
  if (showAll === 'true' && userRole === 'admin') {
    // Show all categories including inactive
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
  } else {
    filter.isActive = true;
  }

  // Text search across multiple fields
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filter.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { slug: searchRegex }
    ];
  }

  // Exact match filters
  if (name) filter.name = { $regex: `^${name}$`, $options: 'i' };
  if (slug) filter.slug = slug;
  if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
    filter.createdBy = createdBy;
  }

  // Date range filters
  if (createdAfter) {
    filter.createdAt = { ...filter.createdAt, $gte: new Date(createdAfter) };
  }
  if (createdBefore) {
    filter.createdAt = { ...filter.createdAt, $lte: new Date(createdBefore) };
  }
  if (updatedAfter) {
    filter.updatedAt = { ...filter.updatedAt, $gte: new Date(updatedAfter) };
  }
  if (updatedBefore) {
    filter.updatedAt = { ...filter.updatedAt, $lte: new Date(updatedBefore) };
  }

  // Name length filters
  if (minNameLength) {
    filter.name = { 
      ...filter.name, 
      $exists: true,
      $expr: { $gte: [{ $strLenCP: "$name" }, parseInt(minNameLength)] }
    };
  }
  if (maxNameLength) {
    filter.name = { 
      ...filter.name, 
      $exists: true,
      $expr: { $lte: [{ $strLenCP: "$name" }, parseInt(maxNameLength)] }
    };
  }

  // Description existence filter
  if (hasDescription === 'true') {
    filter.description = { $ne: '', $exists: true };
  } else if (hasDescription === 'false') {
    filter.$or = [
      { description: '' },
      { description: { $exists: false } }
    ];
  }

  // ID filters
  if (ids) {
    const idArray = ids.split(',').map(id => id.trim());
    const validIds = idArray.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length > 0) {
      filter._id = { $in: validIds };
    }
  }

  if (excludeIds) {
    const excludeArray = excludeIds.split(',').map(id => id.trim());
    const validExcludeIds = excludeArray.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validExcludeIds.length > 0) {
      filter._id = { ...filter._id, $nin: validExcludeIds };
    }
  }

  // Partial match filters
  if (nameStartsWith) {
    filter.name = { $regex: `^${nameStartsWith}`, $options: 'i' };
  }
  if (nameEndsWith) {
    filter.name = { $regex: `${nameEndsWith}$`, $options: 'i' };
  }

  return filter;
};

// Helper function to build sort object
const buildSortObject = (sort, order, sortByFields = []) => {
  const allowedSortFields = ['name', 'createdAt', 'updatedAt', ...sortByFields];
  const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
  const sortOrder = order === 'asc' ? 1 : -1;
  
  // Handle multiple sort fields
  if (sort.includes(',')) {
    const sortFields = sort.split(',');
    const sortObj = {};
    sortFields.forEach(field => {
      const [fieldName, fieldOrder] = field.split(':');
      if (allowedSortFields.includes(fieldName)) {
        sortObj[fieldName] = fieldOrder === 'asc' ? 1 : -1;
      }
    });
    return Object.keys(sortObj).length > 0 ? sortObj : { createdAt: -1 };
  }
  
  return { [sortField]: sortOrder };
};

// Create Category (Admin Only)
const createCategory = async (req, res, next) => {
  try {
    const { name, description, isActive = true } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || '',
      isActive,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: 'Category with that name already exists' });
    }
    next(error);
  }
};

// Get All Categories with Advanced Query Parameters
const getCategories = async (req, res, next) => {
  try {
    const {
      // Pagination
      page = 1,
      limit = 10,
      offset,
      
      // Sorting
      sort = 'createdAt',
      order = 'desc',
      sortBy,
      
      // Search
      search,
      q, // alias for search
      
      // Filtering
      name,
      slug,
      isActive,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      createdBy,
      minNameLength,
      maxNameLength,
      hasDescription,
      ids,
      excludeIds,
      nameStartsWith,
      nameEndsWith,
      descriptionContains,
      
      // Data control
      fields,
      excludeFields,
      populate = 'true',
      populateFields = 'name email',
      
      // Admin features
      showAll = false,
      includeDeleted = false,
      
      // Performance
      lean = 'true',
      cache = 'false',
    } = req.query;

    // Use q as alias for search
    const searchTerm = search || q;

    // Build query filter
    const filter = buildCategoryQuery({
      search: searchTerm,
      name,
      slug,
      isActive: includeDeleted === 'true' ? isActive : undefined,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      createdBy,
      minNameLength,
      maxNameLength,
      hasDescription,
      ids,
      excludeIds,
      nameStartsWith,
      nameEndsWith,
      descriptionContains,
      showAll: showAll || includeDeleted,
    }, req.user?.role);

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page
    const skip = offset ? parseInt(offset) : (pageNum - 1) * limitNum;

    // Build sort
    const sortObj = buildSortObject(sortBy || sort, order);

    // Build field selection
    let select = {};
    if (fields) {
      const fieldArray = fields.split(',');
      fieldArray.forEach(field => {
        select[field.trim()] = 1;
      });
    }
    if (excludeFields) {
      const excludeArray = excludeFields.split(',');
      excludeArray.forEach(field => {
        select[field.trim()] = 0;
      });
    }

    // Build populate options
    let populateOptions = null;
    if (populate === 'true') {
      const populateArray = populateFields.split(',').map(field => field.trim());
      populateOptions = {
        path: 'createdBy',
        select: populateArray.join(' '),
        options: { lean: lean === 'true' }
      };
    }

    // Execute queries in parallel
    const [categories, total, activeCount, inactiveCount] = await Promise.all([
      // Main query
      Category.find(filter)
        .select(Object.keys(select).length > 0 ? select : null)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate(populateOptions)
        .lean(lean === 'true'),
      
      // Total count
      Category.countDocuments(filter),
      
      // Active count
      Category.countDocuments({ ...filter, isActive: true }),
      
      // Inactive count (admin only)
      req.user?.role === 'admin' 
        ? Category.countDocuments({ ...filter, isActive: false })
        : 0,
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Build response metadata
    const metadata = {
      query: {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        pagination: {
          page: pageNum,
          limit: limitNum,
          offset: skip,
          total,
          totalPages,
          hasNext,
          hasPrev,
          nextPage: hasNext ? pageNum + 1 : null,
          prevPage: hasPrev ? pageNum - 1 : null,
        },
        sort: sortObj,
        fields: Object.keys(select).length > 0 ? Object.keys(select) : undefined,
      },
      counts: {
        total,
        active: activeCount,
        inactive: req.user?.role === 'admin' ? inactiveCount : undefined,
        returned: categories.length,
      },
      performance: {
        lean: lean === 'true',
        populated: populate === 'true',
        cached: cache === 'true',
      }
    };

    // Add cache headers if requested
    if (cache === 'true') {
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    }

    res.json({
      success: true,
      data: categories,
      metadata,
    });
  } catch (error) {
    next(error);
  }
};

// Get Category Statistics
const getCategoryStats = async (req, res, next) => {
  try {
    const stats = await Category.aggregate([
      {
        $facet: {
          totalCount: [
            { $count: 'count' }
          ],
          activeCount: [
            { $match: { isActive: true } },
            { $count: 'count' }
          ],
          inactiveCount: [
            { $match: { isActive: false } },
            { $count: 'count' }
          ],
          byMonth: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
          ],
          topCreators: [
            {
              $group: {
                _id: '$createdBy',
                count: { $sum: 1 }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          nameLengthStats: [
            {
              $project: {
                nameLength: { $strLenCP: '$name' }
              }
            },
            {
              $group: {
                _id: null,
                avgLength: { $avg: '$nameLength' },
                minLength: { $min: '$nameLength' },
                maxLength: { $max: '$nameLength' }
              }
            }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0]
    });
  } catch (error) {
    next(error);
  }
};

// Search Categories (full-text search alternative)
const searchCategories = async (req, res, next) => {
  try {
    const { query, fuzzy = 'false', threshold = 0.3 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let results;
    
    if (fuzzy === 'true') {
      // Fuzzy search using regex (for development)
      results = await Category.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ],
        isActive: true
      }).limit(50);
    } else {
      // Exact or starts with search
      results = await Category.find({
        $or: [
          { name: new RegExp(`^${query}`, 'i') },
          { slug: query.toLowerCase() }
        ],
        isActive: true
      }).limit(20);
    }

    res.json({
      success: true,
      query,
      results,
      count: results.length
    });
  } catch (error) {
    next(error);
  }
};

// Get Category by ID or Slug
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fields, populate = 'true' } = req.query;

    // Build field selection
    let select = {};
    if (fields) {
      const fieldArray = fields.split(',');
      fieldArray.forEach(field => {
        select[field.trim()] = 1;
      });
    }

    // Build populate options
    let populateOptions = null;
    if (populate === 'true') {
      populateOptions = {
        path: 'createdBy',
        select: 'name email role'
      };
    }

    let category;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);

    if (isObjectId) {
      category = await Category.findOne({
        $or: [
          { _id: id },
          { slug: id.toLowerCase() }
        ]
      })
      .select(Object.keys(select).length > 0 ? select : null)
      .populate(populateOptions);
    } else {
      category = await Category.findOne({ slug: id.toLowerCase() })
        .select(Object.keys(select).length > 0 ? select : null)
        .populate(populateOptions);
    }

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if user can view inactive category
    if (!category.isActive && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this category'
      });
    }

    res.json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

// Bulk Operations
const bulkUpdateCategories = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { ids, operation, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category IDs are required'
      });
    }

    let result;
    switch (operation) {
      case 'activate':
        result = await Category.updateMany(
          { _id: { $in: ids } },
          { $set: { isActive: true, updatedAt: new Date() } }
        );
        break;
      case 'deactivate':
        result = await Category.updateMany(
          { _id: { $in: ids } },
          { $set: { isActive: false, updatedAt: new Date() } }
        );
        break;
      case 'update':
        if (!data) {
          return res.status(400).json({
            success: false,
            message: 'Update data is required'
          });
        }
        result = await Category.updateMany(
          { _id: { $in: ids } },
          { $set: { ...data, updatedAt: new Date() } }
        );
        break;
      case 'delete':
        result = await Category.updateMany(
          { _id: { $in: ids } },
          { $set: { isActive: false, updatedAt: new Date() } }
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid operation'
        });
    }

    res.json({
      success: true,
      message: `Bulk ${operation} completed`,
      result: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update Category (Admin Only)
const updateCategory = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const { name, description, isActive } = req.body;
    if (name) category.name = name.trim();
    if (description !== undefined) category.description = description.trim();
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: 'Category with that name already exists' });
    }
    next(error);
  }
};

// Delete Category (Admin Only)
const deleteCategory = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { id } = req.params;
    const { permanent = 'false' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    if (permanent === 'true') {
      // Permanent delete
      const category = await Category.findByIdAndDelete(id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
      res.json({ success: true, message: 'Category permanently deleted' });
    } else {
      // Soft delete
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      category.isActive = false;
      await category.save();

      res.json({ success: true, message: 'Category soft deleted' });
    }
  } catch (error) {
    next(error);
  }
};

// Restore Category (Admin Only)
const restoreCategory = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    category.isActive = true;
    await category.save();

    res.json({ success: true, message: 'Category restored', category });
  } catch (error) {
    next(error);
  }
};

// Export Categories
const exportCategories = async (req, res, next) => {
  try {
    const { format = 'json', ...queryParams } = req.query;
    
    const filter = buildCategoryQuery(queryParams, req.user?.role);
    
    const categories = await Category.find(filter)
      .populate('createdBy', 'name email')
      .lean();

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['ID', 'Name', 'Slug', 'Description', 'Active', 'Created At', 'Created By'];
      const csvRows = categories.map(cat => [
        cat._id,
        `"${cat.name.replace(/"/g, '""')}"`,
        cat.slug,
        `"${(cat.description || '').replace(/"/g, '""')}"`,
        cat.isActive ? 'Yes' : 'No',
        new Date(cat.createdAt).toISOString(),
        cat.createdBy?.name || 'Unknown'
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.attachment('categories.csv');
      return res.send(csvContent);
    }

    // Default to JSON
    res.json({
      success: true,
      format,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  restoreCategory,
  getCategoryStats,
  searchCategories,
  bulkUpdateCategories,
  exportCategories,
};