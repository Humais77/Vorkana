const Subscriber = require('../models/subscribe.model');
const validator = require('validator');
const crypto = require('crypto');

/**
 * @desc    Simple subscribe to newsletter
 * @route   POST /api/subscribe-email/subscribe
 * @access  Public
 */
const subscribe = async (req, res) => {
  try {
    const { email } = req.body;

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

    const emailLower = email.toLowerCase();
    
    // Check if email already exists
    let subscriber = await Subscriber.findOne({ email: emailLower });

    if (subscriber) {
      // If already subscribed, return current status
      if (subscriber.isSubscribed) {
        return res.status(200).json({
          success: true,
          message: 'Already subscribed!',
          data: {
            email: subscriber.email,
            isSubscribed: true,
            subscribedAt: subscriber.subscribedAt,
            unsubscribeToken: subscriber.unsubscribeToken
          }
        });
      } else {
        // Resubscribe if previously unsubscribed
        subscriber.isSubscribed = true;
        subscriber.unsubscribeToken = undefined;
        subscriber.lastUpdated = new Date();
        await subscriber.save();
        
        return res.status(200).json({
          success: true,
          message: 'Resubscribed successfully!',
          data: {
            email: subscriber.email,
            isSubscribed: true,
            subscribedAt: subscriber.subscribedAt
          }
        });
      }
    }

    // Create new subscriber
    subscriber = new Subscriber({
      email: emailLower,
      unsubscribeToken: crypto.randomBytes(32).toString('hex'),
      source: req.body.source || 'footer'
    });
    
    await subscriber.save();

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed!',
      data: {
        email: subscriber.email,
        isSubscribed: true,
        subscribedAt: subscriber.subscribedAt,
        unsubscribeToken: subscriber.unsubscribeToken
      }
    });

  } catch (error) {
    console.error('Subscribe error:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This email is already in our system'
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
 * @desc    Simple unsubscribe from newsletter
 * @route   POST /api/subscribe-email/unsubscribe
 * @access  Public
 */
const unsubscribe = async (req, res) => {
  try {
    const { email, unsubscribeToken } = req.body;

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

    const emailLower = email.toLowerCase();
    
    // Find subscriber by email
    const subscriber = await Subscriber.findOne({ email: emailLower });

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our subscription list'
      });
    }

    // Check if already unsubscribed
    if (!subscriber.isSubscribed) {
      return res.status(200).json({
        success: true,
        message: 'Already unsubscribed!',
        data: {
          email: subscriber.email,
          isSubscribed: false,
          unsubscribedAt: subscriber.lastUpdated
        }
      });
    }

    // Verify unsubscribe token if provided
    if (unsubscribeToken && subscriber.unsubscribeToken !== unsubscribeToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid unsubscribe token'
      });
    }

    // Unsubscribe
    subscriber.isSubscribed = false;
    subscriber.lastUpdated = new Date();
    await subscriber.save();

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed!',
      data: {
        email: subscriber.email,
        isSubscribed: false,
        unsubscribedAt: subscriber.lastUpdated
      }
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe. Please try again later.'
    });
  }
};

/**
 * @desc    Check subscription status
 * @route   GET /api/subscribe-email/status/:email
 * @access  Public
 */
const getSubscriptionStatus = async (req, res) => {
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
    }).select('email isSubscribed subscribedAt unsubscribeToken');

    if (!subscriber) {
      return res.status(200).json({
        success: true,
        data: {
          email: email,
          isSubscribed: false,
          exists: false
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        email: subscriber.email,
        isSubscribed: subscriber.isSubscribed,
        subscribedAt: subscriber.subscribedAt,
        unsubscribeToken: subscriber.unsubscribeToken,
        exists: true
      }
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status'
    });
  }
};

/**
 * @desc    Toggle subscription (subscribe/unsubscribe in one endpoint)
 * @route   POST /api/subscribe-email/toggle
 * @access  Public
 */
const toggleSubscription = async (req, res) => {
  try {
    const { email } = req.body;

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

    const emailLower = email.toLowerCase();
    
    // Find or create subscriber
    let subscriber = await Subscriber.findOne({ email: emailLower });

    if (!subscriber) {
      // Create new subscriber if doesn't exist
      subscriber = new Subscriber({
        email: emailLower,
        unsubscribeToken: crypto.randomBytes(32).toString('hex'),
        source: req.body.source || 'footer'
      });
      await subscriber.save();
      
      return res.status(200).json({
        success: true,
        message: 'Subscribed successfully!',
        data: {
          email: subscriber.email,
          isSubscribed: true,
          subscribedAt: subscriber.subscribedAt,
          unsubscribeToken: subscriber.unsubscribeToken,
          action: 'subscribed'
        }
      });
    }

    // Toggle subscription status
    await subscriber.toggleSubscription();

    const action = subscriber.isSubscribed ? 'subscribed' : 'unsubscribed';
    const message = subscriber.isSubscribed 
      ? 'Resubscribed successfully!' 
      : 'Unsubscribed successfully!';

    res.status(200).json({
      success: true,
      message,
      data: {
        email: subscriber.email,
        isSubscribed: subscriber.isSubscribed,
        subscribedAt: subscriber.subscribedAt,
        unsubscribeToken: subscriber.unsubscribeToken,
        action: action
      }
    });

  } catch (error) {
    console.error('Toggle subscription error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Subscription conflict. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update subscription. Please try again later.'
    });
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  getSubscriptionStatus,
  toggleSubscription
};