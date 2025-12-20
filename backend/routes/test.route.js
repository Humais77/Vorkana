const express = require("express");
const EmailService = require('../services/email.service');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const router = express.Router();
// Test email endpoint (protected, admin only in production)
router.post('/test-email', 
  protect,
  process.env.NODE_ENV === 'production' ? adminOnly : (req, res, next) => next(),
  async (req, res) => {
    try {
      const { email, type = 'test' } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      let emailData;
      
      switch (type) {
        case 'verification':
          emailData = {
            name: 'Test User',
            verificationUrl: `${process.env.FRONTEND_URL}/verify-email/test-token-123`
          };
          await EmailService.sendVerificationEmail({ email, name: 'Test User' }, 'test-token-123');
          break;
          
        case 'password-reset':
          emailData = {
            name: 'Test User',
            resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=test-reset-token-456`
          };
          await EmailService.sendPasswordResetEmail({ email, name: 'Test User' }, 'test-reset-token-456');
          break;
          
        case 'welcome':
          await EmailService.sendWelcomeEmail({ email, name: 'Test User' });
          break;
          
        default:
          await EmailService.sendTestEmail(email);
      }

      res.json({
        success: true,
        message: `Test email sent to ${email}`,
        type,
        note: process.env.NODE_ENV === 'development' 
          ? 'Email content logged to console (check server logs)' 
          : 'Email sent via SMTP'
      });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: error.message,
        note: 'Check your email configuration in .env file'
      });
    }
  }
);

// Quick health check for email service
router.get('/email-health', async (req, res) => {
  const health = {
    service: 'Email Service',
    status: 'operational',
    environment: process.env.NODE_ENV,
    config: {
      hasEmailUser: !!process.env.EMAIL_USER,
      hasEmailPassword: !!process.env.EMAIL_PASSWORD,
      frontendUrl: process.env.FRONTEND_URL,
      templates: ['verify-email', 'password-reset', 'welcome', 'password-changed', 'test']
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(health);
});
module.exports = router;