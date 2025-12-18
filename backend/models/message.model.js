const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  gig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    index: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters'],
  },
  attachments: [{
    type: String,
    validate: {
      validator: (v) => /^\/uploads\/[a-f0-9-]{20,64}\.(jpg|jpeg|png|pdf|doc|docx|zip|rar)$/i.test(v) && !v.includes('..'),
      message: 'Invalid attachment filename or path traversal detected',
    },
  }],
  read: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  deletedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Indexes
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ gig: 1, createdAt: -1 });

// Virtual for checking if message is deleted by user
messageSchema.virtual('isDeletedForUser').get(function(userId) {
  return this.deletedBy.some(deleted => deleted.user.toString() === userId.toString());
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;