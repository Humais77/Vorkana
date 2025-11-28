const Service = require('../models/category.model.js');
const errorHandler = require('../utils/errorHandler.js');

const createService = async (req, res, next) => {
    try {
        const { title, description, category, price, deliveryTime } = req.body;

        const service = await Service.create({
            title,
            description,
            category,
            price,
            deliveryTime,
            createdBy: req.user?._id,
        });

        res.status(201).json({ success: true, service });
    } catch (err) {
        next(errorHandler(500, "Server Error"));

    }
};

const getServices = async (req,res,next)=>{
    try {
    const services = await Service.find()
      .populate("category", "name")
      .populate("createdBy", "fullname email")
      .sort({ createdAt: -1 });

    res.json({ success: true, services });
  } catch (err) {
    next(err);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate("category", "name")
      .populate("createdBy", "fullname email");

    if (!service)
      return res.status(404).json({ message: "Service not found" });

    res.json({ success: true, service });
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    const updated = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ message: "Service not found" });

    res.json({ success: true, service: updated });
  } catch (err) {
    next(err);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const deleted = await Service.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Service not found" });

    res.json({ success: true, message: "Service deleted" });
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