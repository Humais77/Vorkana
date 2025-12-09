const mongoose = require('mongoose');
const sanitizeHtml = require('sanitize-html');
const Category = require('../models/category.model.js');
const Service = require('../models/services.model.js');

const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return sanitizeHtml(str, { allowedTags: [], allowedAttributes: {} }).trim();
};

const sanitizeBody = (body) => {
  const clean = {};
  for (const key in body) {
    if (Object.hasOwn(body, key)) {
      clean[key] = typeof body[key] === 'string' ? sanitizeInput(body[key]) : body[key];
    }
  }
  return clean;
};

const buildServiceQuery = (queryParams, userId, userRole) => {
  const {
    search,
    title,
    category,
    minPrice,
    maxPrice,
    minDeliveryTime,
    maxDeliveryTime,
    createdBy,
    createdAfter,
    createdBefore,
    updatedAfter,
    updatedBefore,
    isActive,
    hasDescription,
    ids,
    excludeIds,
    showAll = false
  } = queryParams;

  const filter = {};

  if (showAll === 'true' && userRole === 'admin') {
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
  } else {
    filter.isActive = { $ne: false };
  }

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex }
    ];
  }

  if (title) filter.title = { $regex: `^${title}`, $options: 'i' };
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    filter.category = category;
  }
  if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
    filter.createdBy = createdBy;
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  if (minDeliveryTime || maxDeliveryTime) {
    filter.deliveryTime = {};
    if (minDeliveryTime) filter.deliveryTime.$gte = parseInt(minDeliveryTime);
    if (maxDeliveryTime) filter.deliveryTime.$lte = parseInt(maxDeliveryTime);
  }

  if (createdAfter) filter.createdAt = { ...filter.createdAt, $gte: new Date(createdAfter) };
  if (createdBefore) filter.createdAt = { ...filter.createdAt, $lte: new Date(createdBefore) };
  if (updatedAfter) filter.updatedAt = { ...filter.updatedAt, $gte: new Date(updatedAfter) };
  if (updatedBefore) filter.updatedAt = { ...filter.updatedAt, $lte: new Date(updatedBefore) };

  if (hasDescription === 'true') {
    filter.description = { $ne: '', $exists: true };
  } else if (hasDescription === 'false') {
    filter.$or = [
      { description: '' },
      { description: { $exists: false } }
    ];
  }

  if (ids) {
    const idArray = ids.split(',').map(id => id.trim());
    const validIds = idArray.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length > 0) filter._id = { $in: validIds };
  }

  if (excludeIds) {
    const excludeArray = excludeIds.split(',').map(id => id.trim());
    const validExcludeIds = excludeArray.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validExcludeIds.length > 0) {
      filter._id = { ...filter._id, $nin: validExcludeIds };
    }
  }

  if (userRole !== 'admin' && userId) {
    filter.$or = [
      { createdBy: userId },
      { isActive: true }
    ];
  }

  return filter;
};

const buildSortObject = (sort, order, sortByFields = []) => {
  const allowedSortFields = ['title', 'price', 'deliveryTime', 'createdAt', 'updatedAt', ...sortByFields];
  const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
  const sortOrder = order === 'asc' ? 1 : -1;
  
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

const createService = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { title, description, category, price, deliveryTime } = sanitizeBody(req.body);

    if (!title || !category || price === undefined || !deliveryTime) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (price < 0) return res.status(400).json({ success: false, message: 'Invalid price' });
    if (deliveryTime < 1) return res.status(400).json({ success: false, message: 'Invalid delivery time' });

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }

    const cat = await Category.findById(category);
    if (!cat) return res.status(400).json({ success: false, message: 'Category not found' });

    const service = await Service.create({
      title,
      description: description || '',
      category,
      price,
      deliveryTime,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, service });
  } catch (err) {
    next(err); 
  }
};

const getServices = async (req, res, next) => {
  try {
    const {
      search,
      q,
      title,
      category,
      minPrice,
      maxPrice,
      minDeliveryTime,
      maxDeliveryTime,
      createdBy,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      hasDescription,
      ids,
      excludeIds,
      sort = 'createdAt',
      order = 'desc',
      sortBy,
      page = 1,
      limit = 10,
      offset,
      fields,
      excludeFields,
      populate = 'true',
      populateFields = 'name',
      showAll = false,
      includeDeleted = false,
      lean = 'true',
    } = req.query;

    const searchTerm = search || q;
    const filter = buildServiceQuery({
      search: searchTerm,
      title,
      category,
      minPrice,
      maxPrice,
      minDeliveryTime,
      maxDeliveryTime,
      createdBy,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      hasDescription,
      ids,
      excludeIds,
      showAll: showAll || includeDeleted,
    }, req.user?._id, req.user?.role);

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = offset ? parseInt(offset) : (pageNum - 1) * limitNum;

    const sortObj = buildSortObject(sortBy || sort, order);

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

    let categoryPopulate = null;
    let userPopulate = null;
    if (populate === 'true') {
      const populateArray = populateFields.split(',').map(field => field.trim());
      categoryPopulate = {
        path: 'category',
        select: populateArray.join(' '),
      };
      userPopulate = {
        path: 'createdBy',
        select: 'fullname email',
      };
    }

    const [services, total] = await Promise.all([
      Service.find(filter)
        .select(Object.keys(select).length > 0 ? select : null)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate(categoryPopulate)
        .populate(userPopulate)
        .lean(lean === 'true'),
      
      Service.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    res.json({
      success: true,
      data: services,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext,
        hasPrev,
        nextPage: hasNext ? pageNum + 1 : null,
        prevPage: hasPrev ? pageNum - 1 : null,
      }
    });
  } catch (err) {
    next(err);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fields, populate = 'true' } = req.query;

    let select = {};
    if (fields) {
      const fieldArray = fields.split(',');
      fieldArray.forEach(field => {
        select[field.trim()] = 1;
      });
    }

    let categoryPopulate = null;
    let userPopulate = null;
    if (populate === 'true') {
      categoryPopulate = { path: 'category', select: 'name' };
      userPopulate = { path: 'createdBy', select: 'fullname email' };
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    let service;

    if (isObjectId) {
      service = await Service.findOne({
        $or: [
          { _id: id },
          { slug: id.toLowerCase() }
        ]
      })
      .select(Object.keys(select).length > 0 ? select : null)
      .populate(categoryPopulate)
      .populate(userPopulate);
    } else {
      service = await Service.findOne({ slug: id.toLowerCase() })
        .select(Object.keys(select).length > 0 ? select : null)
        .populate(categoryPopulate)
        .populate(userPopulate);
    }

    if (!service || service.isActive === false) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (!service.isActive && req.user?.role !== 'admin' && service.createdBy.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, service });
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID' });
    }

    const service = await Service.findById(id);
    if (!service || service.isActive === false) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    if (req.user.role !== 'admin' && service.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const cleanData = sanitizeBody(req.body);
    const allowed = ['title', 'description', 'category', 'price', 'deliveryTime'];

    allowed.forEach(field => {
      if (Object.hasOwn(cleanData, field)) {
        service[field] = cleanData[field];
      }
    });
    
    if (service.price < 0) return res.status(400).json({ success: false, message: 'Invalid price' });
    if (service.deliveryTime < 1) return res.status(400).json({ success: false, message: 'Invalid delivery time' });
    
    if (cleanData.category) {
      if (!mongoose.Types.ObjectId.isValid(cleanData.category)) {
        return res.status(400).json({ success: false, message: 'Invalid category ID' });
      }
      const cat = await Category.findById(cleanData.category);
      if (!cat) return res.status(400).json({ success: false, message: 'Category not found' });
    }

    await service.save();

    const populated = await Service.findById(service._id)
      .populate('category', 'name')
      .populate('createdBy', 'fullname email');

    res.json({ success: true, service: populated || service });
  } catch (err) {
    next(err);
  }
};

const deleteService = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const { permanent = 'false' } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID' });
    }

    const service = await Service.findById(id);
    if (!service || service.isActive === false) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (req.user.role !== 'admin' && service.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (permanent === 'true' && req.user.role === 'admin') {
      await Service.findByIdAndDelete(id);
      res.json({ success: true, message: 'Service permanently deleted' });
    } else {
      service.isActive = false;
      await service.save();
      res.json({ success: true, message: 'Service soft deleted' });
    }
  } catch (err) {
    next(err);
  }
};

const getServiceStats = async (req, res, next) => {
  try {
    const stats = await Service.aggregate([
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          activeCount: [{ $match: { isActive: { $ne: false } } }, { $count: 'count' }],
          inactiveCount: [{ $match: { isActive: false } }, { $count: 'count' }],
          priceStats: [
            { $group: { _id: null, avgPrice: { $avg: '$price' }, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } }
          ],
          deliveryStats: [
            { $group: { _id: null, avgDelivery: { $avg: '$deliveryTime' }, minDelivery: { $min: '$deliveryTime' }, maxDelivery: { $max: '$deliveryTime' } } }
          ],
          byCategory: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          byMonth: [
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
          ]
        }
      }
    ]);

    res.json({ success: true, stats: stats[0] });
  } catch (err) {
    next(err);
  }
};

const bulkUpdateServices = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { ids, operation, data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Service IDs are required' });
    }

    let result;
    switch (operation) {
      case 'activate':
        result = await Service.updateMany(
          { _id: { $in: ids } },
          { $set: { isActive: true, updatedAt: new Date() } }
        );
        break;
      case 'deactivate':
        result = await Service.updateMany(
          { _id: { $in: ids } },
          { $set: { isActive: false, updatedAt: new Date() } }
        );
        break;
      case 'update':
        if (!data) {
          return res.status(400).json({ success: false, message: 'Update data is required' });
        }
        result = await Service.updateMany(
          { _id: { $in: ids } },
          { $set: { ...data, updatedAt: new Date() } }
        );
        break;
      case 'delete':
        result = await Service.updateMany(
          { _id: { $in: ids } },
          { $set: { isActive: false, updatedAt: new Date() } }
        );
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid operation' });
    }

    res.json({
      success: true,
      message: `Bulk ${operation} completed`,
      result: { matched: result.matchedCount, modified: result.modifiedCount }
    });
  } catch (err) {
    next(err);
  }
};

const exportServices = async (req, res, next) => {
  try {
    const { format = 'json', ...queryParams } = req.query;
    
    const filter = buildServiceQuery(queryParams, req.user?._id, req.user?.role);
    
    const services = await Service.find(filter)
      .populate('category', 'name')
      .populate('createdBy', 'fullname email')
      .lean();

    if (format === 'csv') {
      const headers = ['ID', 'Title', 'Description', 'Category', 'Price', 'Delivery Time', 'Active', 'Created At', 'Created By'];
      const csvRows = services.map(service => [
        service._id,
        `"${(service.title || '').replace(/"/g, '""')}"`,
        `"${(service.description || '').replace(/"/g, '""')}"`,
        service.category?.name || 'N/A',
        service.price,
        service.deliveryTime,
        service.isActive ? 'Yes' : 'No',
        new Date(service.createdAt).toISOString(),
        service.createdBy?.fullname || 'Unknown'
      ]);

      const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

      res.header('Content-Type', 'text/csv');
      res.attachment('services.csv');
      return res.send(csvContent);
    }

    res.json({ success: true, format, count: services.length, data: services });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  getServiceStats,
  bulkUpdateServices,
  exportServices,
};