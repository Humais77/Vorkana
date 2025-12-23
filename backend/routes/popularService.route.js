// routes/popularServices.route.js
const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const PopularService = require('../models/PopularService');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Common image transformation (same as before)
const transformation = {
  width: 512,           // Increased slightly for better quality
  height: 384,
  crop: 'fill',
  gravity: 'center',
  quality: 'auto:best',
  fetch_format: 'auto',
  secure: true,
};

// GET /api/popular-services
router.get('/', async (req, res) => {
  try {
    // Fetch all popular services from DB, sorted by order or createdAt
    const services = await PopularService.find({})
      .sort({ order: 1, createdAt: -1 })
      .lean(); // Use .lean() for better performance since we don't need Mongoose docs

    if (services.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No popular services found'
      });
    }

    // Map over services and generate Cloudinary URLs
    const servicesWithImages = services.map(service => ({
      id: service._id.toString(),
      name: service.name,
      description: service.description,
      searchQuery: service.searchQuery,
      category: service.category,
      imageUrl: cloudinary.url(service.publicId, transformation)
    }));

    res.json({
      success: true,
      data: servicesWithImages
    });

  } catch (error) {
    console.error('Error fetching popular services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load popular services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;