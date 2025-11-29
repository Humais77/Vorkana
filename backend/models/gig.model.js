const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
    fullName:{
        type: String,
        required: true,
        trim: true,
        minlength: 3,
    },
    oauthEmail:{
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    country:{
        type: String,
        required: true,
        trim: true,
    },
    phone:{
        type: String,
        required: true,
        trim: true,
    },
    projectCategory:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    description:{
        type: String,
        required: true,
        trim: true,
        minlength: 20,
    },
    budget:{
        type: Number,
        required: true,
        min: 5,
    },
    timeline:{
        type: String,
        required: true,
        trim: true,
    },
    communication:{
        type: String,
        enum: ['Email', 'Phone', 'Video Call'],
        default: 'Email',
    },
    attachments:[{
        type: String,
        trim: true,
    }]
}, { timestamps: true });

const Gig = mongoose.model('Gig', gigSchema);
module.exports = Gig;