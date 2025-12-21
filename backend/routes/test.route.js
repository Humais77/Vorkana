const express = require("express");
const EmailService = require('../services/email.service');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Rate limiting for test emails
const emailTestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // Max requests per window
  message: {
    success: false,
    message: 'Too many test email requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id || req.ip
});

// Enhanced validation middleware
const validateTestEmail = (req, res, next) => {
  const { email, type, templateData } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email address is required',
      code: 'EMAIL_REQUIRED'
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address',
      code: 'INVALID_EMAIL'
    });
  }

  // Validate email type
  const allowedTypes = [
    'test', 'verification', 'password-reset', 'welcome', 
    'password-changed', 'account-deactivated', 'account-reactivated',
    'email-changed', 'all'
  ];
  
  if (type && !allowedTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid email type. Allowed types: ${allowedTypes.join(', ')}`,
      code: 'INVALID_EMAIL_TYPE'
    });
  }

  // Limit email length
  if (email.length > 254) {
    return res.status(400).json({
      success: false,
      message: 'Email address is too long',
      code: 'EMAIL_TOO_LONG'
    });
  }

  next();
};

// Middleware to check if email service is properly configured
const checkEmailConfig = (req, res, next) => {
  if (!process.env.EMAIL_USER && process.env.NODE_ENV === 'production') {
    return res.status(503).json({
      success: false,
      message: 'Email service is not configured',
      code: 'EMAIL_SERVICE_DISABLED',
      instructions: 'Set EMAIL_USER and EMAIL_PASSWORD in environment variables'
    });
  }
  next();
};

// Test all email templates at once
async function sendAllTestEmails(email) {
  const testUser = {
    email,
    name: 'Test User',
    _id: 'test_user_id_123'
  };

  const results = [];
  
  try {
    // 1. Verification Email
    results.push({
      type: 'verification',
      status: 'sent',
      details: await EmailService.sendVerificationEmail(testUser, 'test-verification-token-123')
    });
  } catch (error) {
    results.push({ type: 'verification', status: 'failed', error: error.message });
  }

  try {
    // 2. Password Reset
    results.push({
      type: 'password-reset',
      status: 'sent',
      details: await EmailService.sendPasswordResetEmail(testUser, 'test-reset-token-456')
    });
  } catch (error) {
    results.push({ type: 'password-reset', status: 'failed', error: error.message });
  }

  try {
    // 3. Welcome Email
    results.push({
      type: 'welcome',
      status: 'sent',
      details: await EmailService.sendWelcomeEmail(testUser)
    });
  } catch (error) {
    results.push({ type: 'welcome', status: 'failed', error: error.message });
  }

  try {
    // 4. Password Changed
    results.push({
      type: 'password-changed',
      status: 'sent',
      details: await EmailService.sendPasswordChangedEmail(testUser, '192.168.1.100')
    });
  } catch (error) {
    results.push({ type: 'password-changed', status: 'failed', error: error.message });
  }

  try {
    // 5. Account Deactivated
    results.push({
      type: 'account-deactivated',
      status: 'sent',
      details: await EmailService.sendAccountDeactivatedEmail(testUser, 'Test deactivation reason')
    });
  } catch (error) {
    results.push({ type: 'account-deactivated', status: 'failed', error: error.message });
  }

  return results;
}

// Enhanced test email endpoint
router.post('/test-email',
  protect,
  emailTestLimiter,
  checkEmailConfig,
  validateTestEmail,
  process.env.NODE_ENV === 'production' ? adminOnly : (req, res, next) => next(),
  async (req, res) => {
    try {
      const { email, type = 'test', templateData } = req.body;
      const startTime = Date.now();
      
      console.log(`📧 Test email requested by ${req.user?.email || 'unknown'} to ${email}, type: ${type}`);

      let result;
      const testUser = {
        email,
        name: templateData?.name || 'Test User',
        _id: templateData?._id || 'test_user_id_123'
      };

      // Handle different email types
      switch (type) {
        case 'verification':
          result = await EmailService.sendVerificationEmail(
            testUser, 
            templateData?.token || 'test-verification-token-123'
          );
          break;
          
        case 'password-reset':
          result = await EmailService.sendPasswordResetEmail(
            testUser, 
            templateData?.token || 'test-reset-token-456'
          );
          break;
          
        case 'welcome':
          result = await EmailService.sendWelcomeEmail(testUser);
          break;
          
        case 'password-changed':
          result = await EmailService.sendPasswordChangedEmail(
            testUser, 
            templateData?.ipAddress || req.ip || '192.168.1.100'
          );
          break;
          
        case 'account-deactivated':
          result = await EmailService.sendAccountDeactivatedEmail(
            testUser, 
            templateData?.reason || 'Test deactivation for QA purposes'
          );
          break;
          
        case 'account-reactivated':
          result = await EmailService.sendAccountReactivatedEmail(testUser);
          break;
          
        case 'email-changed':
          result = await EmailService.sendEmailChangedEmail(
            testUser, 
            templateData?.oldEmail || 'old-email@example.com'
          );
          break;
          
        case 'all':
          const allResults = await sendAllTestEmails(email);
          result = {
            batch: true,
            results: allResults,
            summary: {
              total: allResults.length,
              successful: allResults.filter(r => r.status === 'sent').length,
              failed: allResults.filter(r => r.status === 'failed').length
            }
          };
          break;
          
        default: // 'test'
          result = await EmailService.sendTestEmail(email);
      }

      const duration = Date.now() - startTime;

      // Log successful test
      console.log(`✅ Test email sent successfully to ${email} in ${duration}ms`);

      const response = {
        success: true,
        message: `Test email sent successfully to ${email}`,
        type,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        requestedBy: req.user?.email || 'unknown',
        mode: process.env.NODE_ENV === 'development' ? 'development (logged to console)' : 'production (sent via SMTP)',
        ...(type === 'all' ? {
          batchResults: result.results,
          summary: result.summary
        } : {})
      };

      // Include preview URL in development
      if (process.env.NODE_ENV === 'development') {
        response.previewNote = 'Check server console for email preview and links';
        
        // Add direct preview links for common email types
        if (type === 'verification' && !result.batch) {
          response.previewUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/test-verification-token-123`;
        }
        if (type === 'password-reset' && !result.batch) {
          response.previewUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=test-reset-token-456`;
        }
      }

      res.json(response);

    } catch (error) {
      console.error('❌ Test email error:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to send test email';
      let errorCode = 'EMAIL_SEND_ERROR';
      let suggestions = [];

      if (error.code === 'EAUTH') {
        errorMessage = 'Email authentication failed';
        errorCode = 'EMAIL_AUTH_ERROR';
        suggestions = [
          'Check your EMAIL_USER and EMAIL_PASSWORD in .env',
          'Ensure you have enabled "Less Secure Apps" or generated an App Password for Gmail',
          'Verify your email service credentials'
        ];
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'Cannot connect to email server';
        errorCode = 'EMAIL_CONNECTION_ERROR';
        suggestions = [
          'Check EMAIL_HOST and EMAIL_PORT in .env',
          'Verify network connectivity',
          'Ensure the email server is running and accessible'
        ];
      } else if (error.message.includes('template')) {
        errorMessage = 'Email template error';
        errorCode = 'EMAIL_TEMPLATE_ERROR';
        suggestions = [
          'Check that email templates exist in views/emails/',
          'Verify template file extensions are .hbs',
          'Ensure templates are properly formatted'
        ];
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: error.message,
        code: errorCode,
        suggestions,
        timestamp: new Date().toISOString(),
        documentation: 'https://github.com/your-repo/docs/email-configuration'
      });
    }
  }
);

// Enhanced email service health check
router.get('/email-health', 
  protect,
  async (req, res) => {
    try {
      const isConfigured = !!process.env.EMAIL_USER && !!process.env.EMAIL_PASSWORD;
      const testEmail = process.env.TEST_EMAIL || 'test@example.com';
      
      const health = {
        service: 'Email Service',
        status: isConfigured ? 'configured' : 'unconfigured',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        config: {
          hasEmailUser: !!process.env.EMAIL_USER,
          hasEmailPassword: !!process.env.EMAIL_PASSWORD,
          emailHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
          emailPort: process.env.EMAIL_PORT || '587',
          frontendUrl: process.env.FRONTEND_URL || 'Not set',
          fromAddress: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'Not set'
        },
        templates: {
          available: ['verify-email', 'password-reset', 'welcome', 'password-changed', 
                     'account-deactivated', 'account-reactivated', 'email-changed', 'test'],
          directory: './views/emails/',
          engine: 'handlebars'
        },
        security: {
          requiresAuth: true,
          rateLimited: true,
          adminOnly: process.env.NODE_ENV === 'production',
          testEmailLimit: emailTestLimiter.maxRequests
        }
      };

      // Test connection if configured
      if (isConfigured && process.env.NODE_ENV !== 'test') {
        try {
          const testStart = Date.now();
          await EmailService.sendTestEmail(testEmail);
          health.connectionTest = {
            status: 'success',
            duration: `${Date.now() - testStart}ms`,
            testEmail,
            note: 'Sent test email successfully'
          };
          health.status = 'operational';
        } catch (testError) {
          health.connectionTest = {
            status: 'failed',
            error: testError.message,
            testEmail
          };
          health.status = 'degraded';
        }
      }

      // Add warnings/advice
      health.warnings = [];
      if (!isConfigured && process.env.NODE_ENV === 'production') {
        health.warnings.push('Email service is not configured. Emails will not be sent.');
      }
      if (!process.env.FRONTEND_URL) {
        health.warnings.push('FRONTEND_URL is not set. Links in emails may not work.');
      }

      res.json(health);
    } catch (error) {
      console.error('Email health check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check email service health',
        error: error.message
      });
    }
  }
);

// Preview email templates (HTML output without sending)
router.post('/preview-email',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { template, data } = req.body;
      
      if (!template) {
        return res.status(400).json({
          success: false,
          message: 'Template name is required',
          code: 'TEMPLATE_REQUIRED'
        });
      }

      const allowedTemplates = ['verify-email', 'welcome', 'password-reset'];
      if (!allowedTemplates.includes(template)) {
        return res.status(400).json({
          success: false,
          message: `Template not allowed. Allowed: ${allowedTemplates.join(', ')}`,
          code: 'INVALID_TEMPLATE'
        });
      }

      // Mock email data for preview
      const mockData = {
        name: data?.name || 'John Doe',
        verificationUrl: data?.verificationUrl || `${process.env.FRONTEND_URL}/verify-email/preview-token`,
        resetUrl: data?.resetUrl || `${process.env.FRONTEND_URL}/reset-password?token=preview-token`,
        dashboardUrl: data?.dashboardUrl || `${process.env.FRONTEND_URL}/dashboard`,
        expiresIn: '24 hours',
        buttonText: 'Verify Email Address',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@vorkana.com',
        currentYear: new Date().getFullYear(),
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        ...data
      };

      // Generate preview HTML
      const previewHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Preview: ${template}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .preview-info { 
              background: #f0f0f0; 
              padding: 15px; 
              margin-bottom: 20px; 
              border-radius: 5px; 
            }
            .email-preview { 
              border: 2px dashed #ccc; 
              padding: 20px; 
              max-width: 600px; 
              margin: 0 auto; 
            }
          </style>
        </head>
        <body>
          <div class="preview-info">
            <h2>Email Template Preview</h2>
            <p><strong>Template:</strong> ${template}</p>
            <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
            <p><strong>Data used:</strong></p>
            <pre>${JSON.stringify(mockData, null, 2)}</pre>
          </div>
          <div class="email-preview">
            <!-- Email content would be rendered here -->
            <p><em>Note: This is a static preview. For actual template rendering, check the email logs.</em></p>
            <p>Template "${template}" would render with the data above.</p>
          </div>
        </body>
        </html>
      `;

      res.json({
        success: true,
        template,
        data: mockData,
        preview: {
          html: previewHtml,
          note: 'This is a static preview. Actual rendering requires full template engine.'
        },
        instructions: `Check server console logs after sending a test email to see the actual rendered template.`
      });

    } catch (error) {
      console.error('Preview email error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate preview',
        error: error.message
      });
    }
  }
);

// Get email configuration (read-only, admin only)
router.get('/email-config',
  protect,
  adminOnly,
  async (req, res) => {
    // Never expose passwords in response
    const safeConfig = {
      EMAIL_HOST: process.env.EMAIL_HOST || 'Not set',
      EMAIL_PORT: process.env.EMAIL_PORT || 'Not set',
      EMAIL_USER: process.env.EMAIL_USER ? 'Configured' : 'Not set',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'Configured' : 'Not set',
      EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'Not set',
      FRONTEND_URL: process.env.FRONTEND_URL || 'Not set',
      SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'Not set',
      NODE_ENV: process.env.NODE_ENV
    };

    res.json({
      success: true,
      config: safeConfig,
      instructions: process.env.NODE_ENV === 'development' 
        ? 'Check .env file for full configuration'
        : 'Configuration is stored in environment variables',
      timestamp: new Date().toISOString()
    });
  }
);

module.exports = router;