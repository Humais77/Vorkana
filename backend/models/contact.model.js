const mongoose = require('mongoose');
const validator = require('validator');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return validator.isEmail(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'], // Changed to required
    trim: true,
    validate: {
      validator: function(v) {
        return validator.isMobilePhone(v, 'any', { strictMode: false });
      },
      message: 'Please enter a valid phone number with country code'
    }
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  countryCode: {
    type: String,
    required: false,
    trim: true,
    maxlength: 5
  },
  status: {
    type: String,
    enum: ['new', 'read', 'archived'],
    default: 'new'
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes for faster queries
contactSchema.index({ createdAt: -1 });
contactSchema.index({ status: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ phone: 1 });

// Pre-save middleware to extract country code
contactSchema.pre('save', async function() {
  if (this.phone) {
    // Extract country code
    const phone = this.phone.trim();
    if (phone.startsWith('+')) {
      const match = phone.match(/^\+(\d{1,4})/);
      if (match) {
        this.countryCode = `+${match[1]}`;
      }
    }
  }
});

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;