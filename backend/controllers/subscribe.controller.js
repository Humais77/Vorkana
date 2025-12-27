const Subscriber = require('../models/subscribe.model');
const validator = require('validator');
const crypto = require('crypto');
const EmailService = require('../services/email.service');
const generateVerificationToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return { token, expires };
};

const generateUnsubscribeToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * @desc    Subscribe to newsletter
 * @route   POST /api/subscribe-email/subscribe
 * @access  Public
 */
const subscribe = async (req, res) => {
  try {
    const { email, preferences = {}, source = 'footer' } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if email already exists
    const existingSubscriber = await Subscriber.findOne({ 
      email: email.toLowerCase() 
    });

    // If already subscribed and active
    if (existingSubscriber && existingSubscriber.subscriptionStatus === 'active') {
      return res.status(200).json({
        success: true,
        message: existingSubscriber.isVerified 
          ? 'You are already subscribed to our newsletter!' 
          : 'Please check your email to verify your subscription.',
        data: {
          email: existingSubscriber.email,
          isVerified: existingSubscriber.isVerified,
          subscribedAt: existingSubscriber.subscribedAt
        }
      });
    }

    // If unsubscribed previously, allow resubscription
    if (existingSubscriber && existingSubscriber.subscriptionStatus === 'unsubscribed') {
      // Resubscribe
      existingSubscriber.subscriptionStatus = 'active';
      existingSubscriber.unsubscribeReason = undefined;
      existingSubscriber.unsubscribedAt = undefined;
      
      existingSubscriber.metadata = {
        ...existingSubscriber.metadata,
        ipAddress: ip,
        userAgent,
        referrer: req.headers.referer || req.headers.referrer,
        source: source,
        tags: existingSubscriber.metadata?.tags || []
      };
      existingSubscriber.preferences = { ...existingSubscriber.preferences, ...preferences };
      
      // Send verification email if not verified
      if (!existingSubscriber.isVerified) {
        const { token, expires } = generateVerificationToken();
        existingSubscriber.verificationToken = token;
        existingSubscriber.verificationTokenExpires = expires;
      }
      
      await existingSubscriber.save();

      return res.status(200).json({
        success: true,
        message: existingSubscriber.isVerified 
          ? 'Welcome back! You have successfully resubscribed.'
          : 'Please check your email to verify your resubscription.',
        data: {
          email: existingSubscriber.email,
          isVerified: existingSubscriber.isVerified,
          subscribedAt: existingSubscriber.subscribedAt,
          resubscribed: true
        }
      });
    }

    // Create new subscriber
    const metadata = {
      ipAddress: ip,
      userAgent: userAgent,
      referrer: req.headers.referer || req.headers.referrer,
      source: source,
      tags: ['new_subscriber']
    };

    const { token: verificationToken, expires: verificationTokenExpires } = generateVerificationToken();
    const unsubscribeToken = generateUnsubscribeToken();

    const subscriber = new Subscriber({
      email: email.toLowerCase(),
      metadata: metadata,
      preferences: preferences,
      subscriptionType: 'newsletter',
      verificationToken,
      verificationTokenExpires,
      unsubscribeToken
    });
    
    await subscriber.save();

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(
        { email: subscriber.email, name: 'Subscriber' },
        verificationToken
      );
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail subscription if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Please check your email to verify your subscription!',
      data: {
        email: subscriber.email,
        subscribedAt: subscriber.subscribedAt,
        requiresVerification: true
      }
    });

  } catch (error) {
    console.error('Subscribe error:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This email is already subscribed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to subscribe. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Verify email subscription
 * @route   GET /api/subscribe-email/verify/:token
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length !== 64) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Find subscriber by verification token
    const subscriber = await Subscriber.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!subscriber) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Verify the subscriber
    subscriber.isVerified = true;
    subscriber.verifiedAt = Date.now();
    subscriber.verificationToken = undefined;
    subscriber.verificationTokenExpires = undefined;
    
    await subscriber.save();

    // Send welcome email
    try {
      await EmailService.sendWelcomeEmail(
        { email: subscriber.email, name: 'Subscriber' }
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail verification if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You are now subscribed to our newsletter.',
      data: {
        email: subscriber.email,
        verifiedAt: subscriber.verifiedAt
      }
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    });
  }
};
/**
 * @desc    Unsubscribe from newsletter
 * @route   GET /api/subscribe-email/unsubscribe/:token
 * @access  Public
 */
const unsubscribe = async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.query;

    // Find subscriber by unsubscribe token
    const subscriber = await Subscriber.findOne({ unsubscribeToken: token });

    if (!subscriber) {
      return res.status(400).json({
        success: false,
        message: 'Invalid unsubscribe link'
      });
    }

    // Unsubscribe
    subscriber.unsubscribe(reason);
    await subscriber.save();

    // Send confirmation email
    try {
      await EmailService.sendEmail(
        subscriber.email,
        'Unsubscribed from Vorkana Newsletter',
        'unsubscribe-confirm',
        {
          name: 'Subscriber',
          email: subscriber.email,
          unsubscribeReason: reason || 'No reason provided'
        }
      );
    } catch (emailError) {
      console.error('Failed to send unsubscribe confirmation:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'You have been unsubscribed from our newsletter.',
      data: {
        unsubscribedAt: subscriber.unsubscribedAt,
        reason: subscriber.unsubscribeReason
      }
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe'
    });
  }
};

/**
 * @desc    Update subscription preferences
 * @route   PATCH /api/subscribe-email/preferences
 * @access  Private (protected)
 */
const updatePreferences = async (req, res) => {
  try {
    const { email, preferences, subscriptionType } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const subscriber = await Subscriber.findOne({ email: email.toLowerCase() });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found'
      });
    }

    // Update preferences
    if (preferences) {
      subscriber.preferences = { ...subscriber.preferences, ...preferences };
    }

    if (subscriptionType) {
      subscriber.subscriptionType = subscriptionType;
    }

    await subscriber.save();

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: subscriber.preferences,
        subscriptionType: subscriber.subscriptionType,
        updatedAt: subscriber.updatedAt
      }
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
};

/**
 * @desc    Get subscription stats (admin)
 * @route   GET /api/subscribe-email/stats
 * @access  Private (admin)
 */
const getStats = async (req, res) => {
  try {
    const stats = await Subscriber.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$subscriptionStatus', 'active'] }, 1, 0] }
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
          },
          unsubscribed: {
            $sum: { $cond: [{ $eq: ['$subscriptionStatus', 'unsubscribed'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || { total: 0, active: 0, verified: 0, unsubscribed: 0 };
    
    // Get daily signups for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailySignups = await Subscriber.aggregate([
      {
        $match: {
          subscribedAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$subscribedAt" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...result,
        dailySignups,
        dateRange: {
          start: sevenDaysAgo.toISOString(),
          end: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription statistics'
    });
  }
};

/**
 * @desc    Get subscriber by email
 * @route   GET /api/subscribe-email/status/:email
 * @access  Public
 */
const getSubscriberStatus = async (req, res) => {
  try {
    const { email } = req.params;

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address'
      });
    }

    const subscriber = await Subscriber.findOne({ 
      email: email.toLowerCase() 
    }).select('-verificationToken -verificationTokenExpires -unsubscribeToken');

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our subscription list'
      });
    }

    res.status(200).json({
      success: true,
      data: subscriber
    });

  } catch (error) {
    console.error('Get subscriber status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status'
    });
  }
};

module.exports = {
  subscribe,
  verifyEmail,
  unsubscribe,
  updatePreferences,
  getStats,
  getSubscriberStatus
};