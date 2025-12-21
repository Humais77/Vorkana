const nodemailer = require('nodemailer');
const path = require('path');
const hbs = require('nodemailer-express-handlebars').default;

class EmailService {
  constructor() {
    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    // Configure handlebars templates
    this.configureTemplates();

    // Verify transporter
    this.verifyTransporter();
  }

  configureTemplates() {
    // Only configure templates if we have the views folder
    try {
      const handlebarOptions = {
        viewEngine: {
          extname: '.hbs',
          partialsDir: path.resolve(__dirname, '../views/emails'),
          layoutsDir: path.resolve(__dirname, '../views/emails'),
          defaultLayout: 'layout',
        },
        viewPath: path.resolve(__dirname, '../views/emails'),
        extName: '.hbs',
      };

      // Use the plugin
      this.transporter.use('compile', hbs(handlebarOptions));
      
      console.log('✅ Email templates configured successfully');
    } catch (error) {
      console.warn('⚠️ Email templates not configured:', error.message);
      console.log('📧 Using inline templates instead');
    }
  }

  async verifyTransporter() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready to send messages');
    } catch (error) {
      console.error('❌ Email service configuration error:', error.message);
      console.log('📧 Emails will be logged to console in development mode');
    }
  }

  async sendEmail(to, subject, template, context) {
    try {
      const mailOptions = {
        from: `"Vorkana" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject,
        template,
        context: {
          ...context,
          year: new Date().getFullYear(),
          appName: 'Vorkana',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@vorkana.com',
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
          currentYear: new Date().getFullYear()
        }
      };

      // In development without proper email config, log to console
      if (!process.env.EMAIL_USER) {
        console.log('\n📧 ===== EMAIL SIMULATION =====');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Template: ${template}`);
        console.log('Context:', context);
        console.log('Set EMAIL_USER and EMAIL_PASSWORD in .env to send real emails\n');
        
        // Create a preview URL for verification emails
        if (template === 'verify-email' && context.verificationUrl) {
          console.log('🔗 Verification Link:', context.verificationUrl);
        }
        if (template === 'password-reset' && context.resetUrl) {
          console.log('🔗 Reset Link:', context.resetUrl);
        }
        
        return { messageId: 'development-mode', accepted: [to] };
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error('Email sending error:', error);
      
      // Fallback: Log email content
      console.log(`📧 [FALLBACK] Email would be sent to ${to}:`);
      console.log(`Subject: ${subject}`);
      console.log(`Template: ${template}`);
      console.log('Context:', context);
      
      throw error;
    }
  }

  // Specific email templates
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
    
    return this.sendEmail(
      user.email,
      'Verify Your Email Address - Vorkana',
      'verify-email',
      {
        name: user.name,
        verificationUrl,
        expiresIn: '24 hours',
        buttonText: 'Verify Email Address'
      }
    );
  }

  async sendPasswordResetEmail(user, token) {
  const resetUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/reset/redirect/${token}`;
  
  return this.sendEmail(
    user.email,
    'Password Reset Request - Vorkana',
    'password-reset',
    {
      name: user.name,
      resetUrl,
      expiresIn: '15 minutes',
      buttonText: 'Reset Password'
    }
  );
}

  async sendWelcomeEmail(user) {
    return this.sendEmail(
      user.email,
      'Welcome to Vorkana! 🎉',
      'welcome',
      {
        name: user.name,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
        buttonText: 'Go to Dashboard'
      }
    );
  }

  async sendPasswordChangedEmail(user, ipAddress = 'Unknown') {
    return this.sendEmail(
      user.email,
      'Password Changed - Security Alert',
      'password-changed',
      {
        name: user.name,
        timestamp: new Date().toLocaleString(),
        ipAddress,
        deviceInfo: 'Web Browser',
        isSecurityAlert: true
      }
    );
  }

  async sendEmailChangedEmail(user, oldEmail) {
    return this.sendEmail(
      user.email,
      'Email Address Changed - Vorkana',
      'email-changed',
      {
        name: user.name,
        oldEmail,
        newEmail: user.email,
        timestamp: new Date().toLocaleString(),
        isSecurityAlert: true
      }
    );
  }

  async sendAccountDeactivatedEmail(user, reason) {
    const reactivationDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    return this.sendEmail(
      user.email,
      'Account Deactivated - Vorkana',
      'account-deactivated',
      {
        name: user.name,
        reason: reason || 'User requested',
        timestamp: new Date().toLocaleString(),
        reactivationDeadline: reactivationDeadline.toLocaleDateString(),
        daysLeft: Math.ceil((reactivationDeadline - Date.now()) / (1000 * 60 * 60 * 24)),
        isSecurityAlert: true
      }
    );
  }

  async sendAccountReactivatedEmail(user) {
    return this.sendEmail(
      user.email,
      'Welcome Back! Account Reactivated',
      'account-reactivated',
      {
        name: user.name,
        timestamp: new Date().toLocaleString(),
        buttonText: 'Go to Dashboard'
      }
    );
  }

  async sendTestEmail(to) {
    return this.sendEmail(
      to,
      'Test Email from Vorkana',
      'test',
      {
        name: 'Test User',
        message: 'This is a test email from Vorkana Email Service',
        timestamp: new Date().toLocaleString()
      }
    );
  }
  // In email.service.js, update sendVerificationEmail:

async sendVerificationEmail(user, token) {
  // Use the redirect endpoint instead of direct frontend URL
  const verificationUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/verify/${token}`;
  
  return this.sendEmail(
    user.email,
    'Verify Your Email Address - Vorkana',
    'verify-email',
    {
      name: user.name,
      verificationUrl, // This will open the redirect page
      expiresIn: '24 hours',
      buttonText: 'Verify Email Address'
    }
  );
}
}

module.exports = new EmailService();