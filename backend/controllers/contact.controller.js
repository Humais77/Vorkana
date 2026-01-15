const Contact = require('../models/contact.model');
const validator = require('validator');

/**
 * Validate phone number for any country
 */
const validatePhoneNumber = (phone) => {
  if (!phone || phone.trim() === '') {
    return { 
      valid: false, 
      message: 'Phone number is required' 
    };
  }
  
  // Clean the phone number
  const cleanedPhone = phone.trim();
  
  // Check if it starts with + (international format)
  if (!cleanedPhone.startsWith('+')) {
    return { 
      valid: false, 
      message: 'Please include country code starting with + (e.g., +1234567890)' 
    };
  }
  
  // Check minimum length (country code + number)
  if (cleanedPhone.length < 8) {
    return { 
      valid: false, 
      message: 'Phone number is too short (minimum 8 characters with country code)' 
    };
  }
  
  // Check maximum length
  if (cleanedPhone.length > 16) {
    return { 
      valid: false, 
      message: 'Phone number is too long (maximum 16 characters)' 
    };
  }
  
  // Check if it's a valid mobile phone number for any country
  const isValid = validator.isMobilePhone(cleanedPhone, 'any', { strictMode: false });
  
  if (!isValid) {
    return { 
      valid: false, 
      message: 'Please enter a valid international phone number' 
    };
  }
  
  return { valid: true, message: 'Valid phone number' };
};

/**
 * Submit a contact form
 */
const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    
    // Get client info for logging
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Basic validation
    if (!name || !email || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, email, phone, and message'
      });
    }

    // Validate email
    if (!validator.isEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate phone (required)
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        message: phoneValidation.message
      });
    }

    // Create contact submission
    const contact = await Contact.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      message: message.trim(),
      ipAddress,
      userAgent
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you for your message. We\'ll get back to you soon.',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt,
        countryCode: contact.countryCode
      }
    });

  } catch (error) {
    console.error('Contact form submission error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Handle duplicate submission (same email or phone within 5 minutes)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this message recently'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

/**
 * Rate limiting check
 */
const checkSubmissionLimit = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // Check for multiple submissions in last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const conditions = [
      { email, createdAt: { $gte: oneHourAgo } },
      { phone, createdAt: { $gte: oneHourAgo } },
      { ipAddress, createdAt: { $gte: oneHourAgo } }
    ];
    
    const recentSubmissions = await Contact.countDocuments({
      $or: conditions
    });

    if (recentSubmissions >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many submissions. Please try again later.'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitContactForm,
  checkSubmissionLimit,
  validatePhoneNumber
};