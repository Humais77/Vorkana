const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  isSubscribed: {
    type: Boolean,
    default: true,
  },
  unsubscribeToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  // Optional: Track source for analytics
  source: {
    type: String,
    default: 'footer',
  }
}, {
  timestamps: true,
});

// Generate unsubscribe token
subscriberSchema.methods.generateUnsubscribeToken = function() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// Toggle subscription status
subscriberSchema.methods.toggleSubscription = function() {
  this.isSubscribed = !this.isSubscribed;
  this.lastUpdated = new Date();
  
  if (!this.isSubscribed) {
    this.unsubscribeToken = this.generateUnsubscribeToken();
  } else {
    this.unsubscribeToken = undefined;
  }
  
  return this.save();
};

module.exports = mongoose.model("Subscriber", subscriberSchema);