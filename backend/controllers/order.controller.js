const mongoose = require('mongoose');
const crypto = require('crypto');
const Order = require('../models/order.model');
const Service = require('../models/services.model');
const User = require('../models/user.model');
const { sanitizeHtml } = require('../utils/sanitize');
const { emitNewOrder, emitOrderStatusChange, emitOrderUpdate } = require('../socket/order.socket');

// Security: Request ID for tracking
const generateRequestId = () => {
  return crypto.randomBytes(8).toString('hex');
};

// Security: Audit logging
const logAudit = (action, resource, resourceId, userId, details = {}) => {
  console.log(`[AUDIT:ORDER] ${new Date().toISOString()} - ${action} - ${resource}:${resourceId} - User:${userId}`, details);
};

// Security: Build secure query
const buildSecureOrderQuery = (queryParams, userRole, userId) => {
  const {
    status,
    service,
    minAmount,
    maxAmount,
    createdAfter,
    createdBefore,
    deadlineAfter,
    deadlineBefore,
    orderNumber,
    role,
    showAll = false,
  } = queryParams;

  const filter = { isActive: true };

  // Security: Visibility based on user role
  if (showAll && userRole === 'admin') {
    // Admin can see all orders
  } else {
    // Regular users can only see their own orders as buyer
    filter.buyer = userId;
  }

  // Apply role-based filter if specified
  if (role === 'buyer') {
    filter.buyer = userId;
  }

  // Apply filters
  if (status) filter.status = status;
  if (service && mongoose.Types.ObjectId.isValid(service)) {
    filter.service = service;
  }

  // Amount range
  if (minAmount || maxAmount) {
    filter.totalAmount = {};
    if (minAmount) filter.totalAmount.$gte = parseFloat(minAmount);
    if (maxAmount) filter.totalAmount.$lte = parseFloat(maxAmount);
  }

  // Date filters
  const addDateFilter = (field, date, operator) => {
    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        filter[field] = { ...filter[field], [operator]: parsedDate };
      }
    }
  };

  addDateFilter('createdAt', createdAfter, '$gte');
  addDateFilter('createdAt', createdBefore, '$lte');
  addDateFilter('deadlineAt', deadlineAfter, '$gte');
  addDateFilter('deadlineAt', deadlineBefore, '$lte');

  // Order number search
  if (orderNumber) {
    const sanitizedOrderNumber = sanitizeHtml(orderNumber, { allowedTags: [] });
    filter.orderNumber = { $regex: `^${sanitizedOrderNumber}`, $options: 'i' };
  }

  return filter;
};

// Calculate order totals
const calculateOrderTotals = (service, packageId, extras = [], quantity = 1, discount = null) => {
  let basePrice = service.price;
  let packagePrice = 0;
  let deliveryTime = service.deliveryTime;
  let revisions = service.revisions;

  // Get package details if specified
  if (packageId && service.packages && service.packages.length > 0) {
    const selectedPackage = service.packages.find(pkg => 
      pkg._id.toString() === packageId.toString()
    );
    
    if (selectedPackage) {
      basePrice = selectedPackage.price;
      packagePrice = selectedPackage.price;
      deliveryTime = selectedPackage.deliveryTime;
      revisions = selectedPackage.revisions || 0;
    }
  }

  // Calculate extras total
  let extrasTotal = 0;
  if (extras && extras.length > 0) {
    extrasTotal = extras.reduce((sum, extra) => {
      return sum + (extra.price * (extra.quantity || 1));
    }, 0);
  }

  // Calculate subtotal
  let subtotal = (basePrice + extrasTotal) * quantity;

  // Apply discount
  let discountAmount = 0;
  if (discount) {
    if (discount.type === 'percentage' && discount.percentage) {
      discountAmount = (subtotal * discount.percentage) / 100;
    } else if (discount.type === 'amount' && discount.amount) {
      discountAmount = discount.amount;
    }
    discountAmount = Math.min(discountAmount, subtotal);
    subtotal -= discountAmount;
  }

  // Calculate service fee (5% of subtotal)
  const serviceFee = subtotal * 0.05;

  // Calculate tax (if applicable, 10% for example)
  const tax = subtotal * 0.10;

  // Calculate total
  const totalAmount = subtotal + serviceFee + tax;

  return {
    basePrice: basePrice * quantity,
    packagePrice: packagePrice * quantity,
    extrasTotal,
    subtotal,
    discount: discountAmount,
    serviceFee,
    tax,
    totalAmount,
    deliveryTime,
    revisions,
    currency: service.currency || 'USD'
  };
};

// Create Order
const createOrder = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const {
      service: serviceId,
      package: packageId,
      quantity = 1,
      requirements = [],
      extras = [],
      discount = null,
      paymentMethod = 'wallet',
      notes = '',
      currency = 'USD'
    } = req.body;

    // Rate limiting: Check for too many recent orders
    const recentOrders = await Order.countDocuments({
      buyer: req.user._id,
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    if (recentOrders >= 10) {
      return res.status(429).json({
        success: false,
        message: 'Order limit reached. Please try again later.',
        code: 'ORDER_LIMIT_EXCEEDED',
        requestId: req.requestId
      });
    }

    // Security: Validate service exists and is available
    const service = await Service.findById(serviceId).select('+isActive +status');
    if (!service || !service.isActive || service.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Service is not available for ordering',
        code: 'SERVICE_UNAVAILABLE',
        requestId: req.requestId
      });
    }

    // Security: Check buyer is active
    const buyer = await User.findById(req.user._id);
    if (!buyer || !buyer.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Buyer account is not active',
        code: 'BUYER_INACTIVE',
        requestId
      });
    }

    // Check for duplicate pending order for same service
    const existingOrder = await Order.findOne({
      buyer: req.user._id,
      service: serviceId,
      status: 'pending',
      isActive: true
    });
    
    if (existingOrder) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending order for this service',
        code: 'DUPLICATE_ORDER',
        requestId: req.requestId,
        existingOrderId: existingOrder._id
      });
    }

    // Validate package if specified
    if (packageId) {
      const packageExists = service.packages.some(pkg => 
        pkg._id.toString() === packageId.toString()
      );
      if (!packageExists) {
        return res.status(400).json({
          success: false,
          message: 'Invalid package selected',
          code: 'INVALID_PACKAGE',
          requestId
        });
      }
    }

    // Calculate order totals
    const totals = calculateOrderTotals(service, packageId, extras, quantity, discount);

    // Create order
    const order = new Order({
      service: serviceId,
      buyer: req.user._id,
      package: packageId,
      quantity,
      requirements: requirements.map(req => ({
        ...req,
        answer: req.type === 'file' ? req.fileUrl : req.answer
      })),
      extras,
      discount,
      basePrice: totals.basePrice,
      packagePrice: totals.packagePrice,
      subtotal: totals.subtotal,
      serviceFee: totals.serviceFee,
      tax: totals.tax,
      totalAmount: totals.totalAmount,
      currency: totals.currency,
      paymentMethod,
      deliveryTime: totals.deliveryTime,
      deliveryTimeUnit: service.deliveryTimeUnit || 'days',
      revisions: totals.revisions,
      notes: sanitizeHtml(notes, { allowedTags: [] }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceInfo: req.headers['user-agent'],
      buyerVerified: buyer.emailVerified || false,
      paymentVerified: true
    });

    await order.save();

    // Populate order details
    const populatedOrder = await Order.findById(order._id)
      .populate('service', 'title slug thumbnail price currency deliveryTime deliveryTimeUnit')
      .populate('buyer', 'name email picture')
      .lean();

    // Emit real-time notification
    await emitNewOrder(order);

    // Security: Audit log
    logAudit('CREATE', 'ORDER', order._id, req.user._id, {
      orderNumber: order.orderNumber,
      service: serviceId,
      totalAmount: order.totalAmount,
      currency: order.currency
    });

    res.status(201).json({
      success: true,
      order: populatedOrder,
      message: 'Order created successfully',
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error creating order:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Order validation failed',
        errors: messages,
        code: 'ORDER_VALIDATION_ERROR',
        requestId
      });
    }

    logAudit('ERROR', 'ORDER', 'CREATE', req.user?._id, { error: error.message });
    next(error);
  }
};

// Get Orders
const getOrders = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const {
      status,
      service,
      minAmount,
      maxAmount,
      createdAfter,
      createdBefore,
      deadlineAfter,
      deadlineBefore,
      orderNumber,
      role,
      showAll = false,
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      includeService = true,
      includeBuyer = false
    } = req.query;

    // Build secure query
    const filter = buildSecureOrderQuery({
      status,
      service,
      minAmount,
      maxAmount,
      createdAfter,
      createdBefore,
      deadlineAfter,
      deadlineBefore,
      orderNumber,
      role,
      showAll
    }, req.user.role, req.user._id);

    // Pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortField = ['createdAt', 'updatedAt', 'totalAmount', 'deadlineAt', 'status'].includes(sort) 
      ? sort 
      : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };

    // Populate options
    const populateOptions = [];
    if (includeService) {
      populateOptions.push({
        path: 'service',
        select: 'title slug thumbnail price currency deliveryTime deliveryTimeUnit'
      });
    }
    if (includeBuyer && req.user.role === 'admin') {
      populateOptions.push({
        path: 'buyer',
        select: 'name email picture'
      });
    }

    // Execute queries
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate(populateOptions)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    // Calculate pagination
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    // Security: Remove sensitive data
    const safeOrders = orders.map(order => {
      const safeOrder = { ...order };
      
      if (safeOrder.buyer && safeOrder.buyer._id && req.user.role !== 'admin') {
        delete safeOrder.buyer.email;
        delete safeOrder.buyer.phone;
      }
      
      return safeOrder;
    });

    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum
    });

    res.json({
      success: true,
      orders: safeOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext,
        hasPrev,
        nextPage: hasNext ? pageNum + 1 : null,
        prevPage: hasPrev ? pageNum - 1 : null
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'ORDER', 'GET_LIST', req.user?._id, { error: error.message });
    next(error);
  }
};

// Get Order by ID
const getOrderById = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const order = await Order.findById(id)
      .populate('service', 'title slug description thumbnail price currency deliveryTime deliveryTimeUnit revisions packages requirements')
      .populate('buyer', 'name email picture')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        requestId
      });
    }

    // Security: Check permissions
    const isBuyer = order.buyer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isBuyer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this order',
        code: 'ACCESS_DENIED',
        requestId
      });
    }

    // Remove sensitive data based on role
    if (!isAdmin) {
      if (order.buyer) {
        delete order.buyer.email;
      }
    }

    // Calculate time remaining
    if (order.deadlineAt) {
      const now = new Date();
      const deadline = new Date(order.deadlineAt);
      order.timeRemaining = Math.max(0, deadline - now);
      order.isExpired = now > deadline;
    }

    res.json({
      success: true,
      order,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'ORDER', 'GET_BY_ID', req.user?._id, { error: error.message });
    next(error);
  }
};

// Update Order Status
const updateOrderStatus = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { id } = req.params;
    const { status, reason, notes } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        requestId
      });
    }

    // Security: Check permissions - only buyer or admin can update
    const isBuyer = order.buyer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isBuyer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to update this order',
        code: 'ACCESS_DENIED',
        requestId
      });
    }

    // Validate status transition
    const validTransitions = {
      pending: ['in_progress', 'cancelled'],
      in_progress: ['delivered', 'cancelled'],
      delivered: ['completed', 'revision', 'cancelled'],
      revision: ['delivered', 'cancelled'],
      cancelled: [],
      completed: []
    };

    const currentStatus = order.status;
    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${currentStatus} to ${status}`,
        code: 'INVALID_STATUS_TRANSITION',
        requestId
      });
    }

    // Store old status for real-time notification
    const oldStatus = order.status;

    // Update order
    order.status = status;
    
    if (reason) {
      order.notes = notes ? `${notes}\nReason: ${reason}` : `Reason: ${reason}`;
    }
    
    if (notes) {
      order.notes = notes;
    }

    // Set timestamps based on status
    const now = new Date();
    if (status === 'in_progress') {
      order.startedAt = now;
    } else if (status === 'delivered') {
      order.deliveredAt = now;
    } else if (status === 'completed') {
      order.completedAt = now;
    } else if (status === 'cancelled') {
      order.cancelledAt = now;
    }

    await order.save();

    // Emit real-time notification
    await emitOrderStatusChange(order._id, oldStatus, status, req.user._id);

    // Security: Audit log
    logAudit('UPDATE_STATUS', 'ORDER', order._id, req.user._id, {
      oldStatus,
      newStatus: status,
      reason,
      orderNumber: order.orderNumber
    });

    res.json({
      success: true,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        updatedAt: order.updatedAt
      },
      message: `Order status updated to ${status}`,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'ORDER', 'UPDATE_STATUS', req.user?._id, { error: error.message });
    next(error);
  }
};

// Add Deliverables (Service provider delivers work)
const addDeliverables = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { id } = req.params;
    const { title, description, files, revisionNotes } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        requestId
      });
    }

    // Security: Only buyer (or admin) can add deliverables
    if (order.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied to add deliverables',
        code: 'ACCESS_DENIED',
        requestId
      });
    }

    // Check if order is in correct status
    if (!['in_progress', 'revision'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot add deliverables when order is ${order.status}`,
        code: 'INVALID_ORDER_STATUS',
        requestId
      });
    }

    // Create deliverable
    const deliverable = {
      title: sanitizeHtml(title, { allowedTags: [] }),
      description: description ? sanitizeHtml(description, { allowedTags: [] }) : '',
      files: files || [],
      deliveredAt: new Date(),
      revisionRequested: order.status === 'revision',
      revisionNotes: revisionNotes ? sanitizeHtml(revisionNotes, { allowedTags: [] }) : ''
    };

    // Add to order
    order.deliverables.push(deliverable);
    
    // Update order status to delivered if not revision
    if (order.status !== 'revision') {
      order.status = 'delivered';
      order.deliveredAt = new Date();
    }

    await order.save();

    // Emit real-time notification
    await emitOrderUpdate(order._id, {
      type: 'deliverable_added',
      deliverable,
      status: order.status
    });

    // Security: Audit log
    logAudit('ADD_DELIVERABLE', 'ORDER', order._id, req.user._id, {
      orderNumber: order.orderNumber,
      deliverableTitle: title,
      filesCount: files?.length || 0,
      status: order.status
    });

    res.json({
      success: true,
      message: 'Deliverable added successfully',
      deliverable,
      orderStatus: order.status,
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'ORDER', 'ADD_DELIVERABLE', req.user?._id, { error: error.message });
    next(error);
  }
};

// Accept Delivery (Buyer accepts delivered work)
const acceptDelivery = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        requestId
      });
    }

    // Security: Only buyer can accept delivery
    if (order.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only buyer can accept delivery',
        code: 'ACCESS_DENIED',
        requestId
      });
    }

    // Check if order is in delivered status
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order must be in delivered status to accept',
        code: 'INVALID_ORDER_STATUS',
        requestId
      });
    }

    const oldStatus = order.status;
    order.status = 'completed';
    order.completedAt = new Date();
    order.deliveryVerified = true;

    await order.save();

    // Emit real-time notification
    await emitOrderStatusChange(order._id, oldStatus, 'completed', req.user._id);

    res.json({
      success: true,
      message: 'Delivery accepted successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        completedAt: order.completedAt
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'ORDER', 'ACCEPT_DELIVERY', req.user?._id, { error: error.message });
    next(error);
  }
};

// Request Revision (Buyer requests revision)
const requestRevision = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { id } = req.params;
    const { revisionNotes } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID',
        code: 'INVALID_ID',
        requestId
      });
    }

    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        code: 'ORDER_NOT_FOUND',
        requestId
      });
    }

    // Security: Only buyer can request revision
    if (order.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only buyer can request revision',
        code: 'ACCESS_DENIED',
        requestId
      });
    }

    // Check if order is in delivered status
    if (order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order must be in delivered status to request revision',
        code: 'INVALID_ORDER_STATUS',
        requestId
      });
    }

    const oldStatus = order.status;
    order.status = 'revision';
    
    // Mark latest deliverable as needing revision
    if (order.deliverables && order.deliverables.length > 0) {
      const latestDeliverable = order.deliverables[order.deliverables.length - 1];
      latestDeliverable.revisionRequested = true;
      latestDeliverable.revisionNotes = revisionNotes ? sanitizeHtml(revisionNotes, { allowedTags: [] }) : '';
    }

    await order.save();

    // Emit real-time notification
    await emitOrderStatusChange(order._id, oldStatus, 'revision', req.user._id);

    res.json({
      success: true,
      message: 'Revision requested successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'ORDER', 'REQUEST_REVISION', req.user?._id, { error: error.message });
    next(error);
  }
};

// Get Buyer Active Orders
const getBuyerActiveOrders = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      buyer: req.user._id,
      status: { $in: ['in_progress', 'delivered', 'revision'] },
      isActive: true
    };

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('service', 'title slug thumbnail')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.set({
      'X-Request-ID': requestId,
      'X-Total-Count': total,
      'X-Total-Pages': totalPages,
      'X-Page-Size': limitNum,
      'X-Current-Page': pageNum
    });

    res.json({
      success: true,
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'ORDER', 'GET_BUYER_ACTIVE', req.user?._id, { error: error.message });
    next(error);
  }
};

// Get Order Statistics
const getOrderStats = async (req, res, next) => {
  const requestId = generateRequestId();
  
  try {
    const filter = {};
    
    // Apply role-based filter
    if (req.user.role === 'user') {
      filter.buyer = req.user._id;
    }

    const stats = await Order.aggregate([
      { $match: { ...filter, isActive: true } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          pendingOrders: { 
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } 
          },
          activeOrders: { 
            $sum: { $cond: [{ $in: ['$status', ['in_progress', 'delivered', 'revision']] }, 1, 0] } 
          },
          completedOrders: { 
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } 
          },
          cancelledOrders: { 
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } 
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        pendingOrders: 0,
        activeOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logAudit('ERROR', 'ORDER', 'STATS', req.user?._id, { error: error.message });
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  addDeliverables,
  acceptDelivery,
  requestRevision,
  getBuyerActiveOrders,
  getOrderStats
};