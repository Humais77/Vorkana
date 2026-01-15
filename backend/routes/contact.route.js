const express = require('express');
const router = express.Router();
const { 
  submitContactForm, 
  checkSubmissionLimit 
} = require('../controllers/contact.controller');

/**
 * @route   POST /api/contact
 * @desc    Submit contact form
 * @access  Public
 */
router.post('/', checkSubmissionLimit, submitContactForm);

/**
 * @route   GET /api/contact/validate-phone
 * @desc    Validate phone number format
 * @access  Public
 */
router.get('/validate-phone', (req, res) => {
  const { phone } = req.query;
  
  if (!phone) {
    return res.json({
      valid: true,
      message: 'Phone number is optional'
    });
  }
  
  // Simple validation for frontend
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
  const isValid = phoneRegex.test(phone.trim());
  
  res.json({
    valid: isValid,
    message: isValid ? 'Valid phone number format' : 'Invalid phone number format'
  });
});

module.exports = router;