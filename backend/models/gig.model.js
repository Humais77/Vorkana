const mongoose = require('mongoose');
const { sanitizeHtml } = require('../utils/sanitize.js');

const gigSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 60,
      set: sanitizeHtml,
    },
    oauthEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      index: true,
      set: sanitizeHtml,
    },
    country: { type: String, required: true, trim: true, maxlength: 80, set: sanitizeHtml },
    phone: { type: String, required: true, trim: true, maxlength: 20, set: sanitizeHtml },
    projectCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000,
      set: sanitizeHtml,
    },
    budget: { type: Number, required: true, min: 5, max: 100000 },
    timeline: { type: String, required: true, trim: true, maxlength: 100, set: sanitizeHtml },
    communication: {
      type: String,
      enum: ['Email', 'Phone', 'Video Call'],
      default: 'Email',
    },
    attachments: [
      {
        type: String,
        trim: true,
        validate: {
          validator: (v) =>
            /^\/uploads\/[a-f0-9]{20,64}\.(jpg|jpeg|png|pdf|zip)$/i.test(v),
          message: 'Invalid attachment filename',
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// NEW CORRECT SYNTAX (Mongoose 6+/7+)
gigSchema.pre('save', async function () {
  // No "next" parameter anymore
  this.fullName = sanitizeHtml(this.fullName);
  this.description = sanitizeHtml(this.description);
  this.country = sanitizeHtml(this.country);
  this.timeline = sanitizeHtml(this.timeline);
  this.oauthEmail = sanitizeHtml(this.oauthEmail);
  this.phone = sanitizeHtml(this.phone);
});

module.exports = mongoose.model('Gig', gigSchema);