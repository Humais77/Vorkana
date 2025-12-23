// models/PopularService.js
const mongoose = require('mongoose');

const popularServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  searchQuery: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['web', 'video', 'software', 'mobile', 'design', 'data'],
    required: true
  },
  publicId: {
    type: String,
    required: true,
    unique: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PopularService', popularServiceSchema);