const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  gig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    index: true,
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {},
  },
  isArchived: {
    type: Map,
    of: Boolean,
    default: {},
  },
  isMuted: {
    type: Map,
    of: Boolean,
    default: {},
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

// FIXED: Remove the pre-save middleware that's causing issues
// Instead, handle validation in the findOrCreate method
conversationSchema.pre('save', function(next) {
  // Check if participants is an array
  if (!Array.isArray(this.participants)) {
    return next(new Error('Participants must be an array'));
  }
  
  // Check if we have exactly 2 participants
  if (this.participants.length !== 2) {
    return next(new Error('Conversation must have exactly 2 participants'));
  }
  
  // Ensure participants are ObjectIds
  const participants = this.participants.map(p => {
    if (mongoose.Types.ObjectId.isValid(p)) {
      return new mongoose.Types.ObjectId(p);
    }
    return p;
  });
  
  // Sort participants for consistency (convert to strings for comparison)
  this.participants = participants.sort((a, b) => {
    const aStr = a.toString();
    const bStr = b.toString();
    return aStr.localeCompare(bStr);
  });
  
  next();
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ gig: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

// Virtual for getting other participant
conversationSchema.virtual('otherParticipant').get(function() {
  return (userId) => {
    const userIdStr = userId.toString();
    return this.participants.find(participant => 
      participant.toString() !== userIdStr
    );
  };
});

// Static method to find or create conversation
conversationSchema.statics.findOrCreate = async function(user1Id, user2Id, gigId = null) {
  try {
    // Convert to ObjectIds
    const user1 = new mongoose.Types.ObjectId(user1Id);
    const user2 = new mongoose.Types.ObjectId(user2Id);
    
    // Sort participants
    const participants = [user1, user2].sort((a, b) => 
      a.toString().localeCompare(b.toString())
    );
    
    // Check if conversation exists
    let conversation = await this.findOne({
      participants: { $all: participants }
    })
    .populate('participants', 'name email picture role')
    .populate('gig', 'title slug budget currency');
    
    if (!conversation) {
      // Create new conversation
      conversation = new this({
        participants: participants,
        gig: gigId,
        unreadCount: new Map([
          [user1.toString(), 0],
          [user2.toString(), 0]
        ]),
        isArchived: new Map([
          [user1.toString(), false],
          [user2.toString(), false]
        ]),
        isMuted: new Map([
          [user1.toString(), false],
          [user2.toString(), false]
        ]),
      });
      
      await conversation.save();
      
      // Populate after save
      conversation = await this.findById(conversation._id)
        .populate('participants', 'name email picture role')
        .populate('gig', 'title slug budget currency');
    }
    
    return conversation;
  } catch (error) {
    console.error('Error in findOrCreate:', error);
    throw error;
  }
};

// Helper method to convert Map to Object
conversationSchema.methods.toJSON = function() {
  const obj = this.toObject();
  
  // Convert Map to plain object
  if (obj.unreadCount instanceof Map) {
    obj.unreadCount = Object.fromEntries(obj.unreadCount);
  }
  if (obj.isArchived instanceof Map) {
    obj.isArchived = Object.fromEntries(obj.isArchived);
  }
  if (obj.isMuted instanceof Map) {
    obj.isMuted = Object.fromEntries(obj.isMuted);
  }
  
  return obj;
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;