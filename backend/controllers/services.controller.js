const Category = require('../models/category.model.js');
const Service = require('../models/services.model.js');

const createService = async (req, res, next) => {
  try {
    const { title, description, category, price, deliveryTime } = req.body;
    const cat = await Category.findById(category).lean();
    if (!cat) return res.status(400).json({ success: false, message: 'Invalid category id' });
    const service = await Service.create({
      title,
      description,
      category,
      price,
      deliveryTime,
      createdBy: req.user?._id
    });
    res.status(201).json({ success: true, service });
  } catch (err) {
    next(err);

  }
};

const getServices = async (req, res, next) => {
  try {
    const services = await Service.find()
      .lean()
      .sort({ createdAt: -1 })
      .populate("category", "name")
      .populate("createdBy", "fullname email");

    res.json({ success: true, services });
  } catch (err) {
    next(err);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('category', 'name')
      .populate('createdBy', 'name email')
      .lean();
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });
    res.json({ success: true, service });
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    // ownership or admin
    if (service.createdBy && req.user.role !== 'admin' && service.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updatable = ['title', 'description', 'category', 'price', 'deliveryTime'];
    updatable.forEach(field => {
      if (req.body[field] !== undefined) service[field] = req.body[field];
    });

    // Check category exists
    if (req.body.category) {
      const cat = await Category.findById(req.body.category).lean();
      if (!cat) return res.status(400).json({ success: false, message: 'Invalid category id' });
    }

    await service.save();

    const populated = await Service.findById(service._id)
      .populate('category', 'name')
      .populate('createdBy', 'fullname email')
      .lean();

    res.json({ success: true, service: populated });
  } catch (err) {
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ success: false, message: 'Invalid service ID' });
    }
    next(err);
  }
};


const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    if (service.createdBy && req.user.role !== 'admin' && service.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await service.deleteOne();
    res.json({ success: true, message: 'Service deleted' });
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
};