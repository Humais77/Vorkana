// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   googleId: {
//     type: String,
//     // keep model field if you use OAuth later; if not using, set unique:false or remove later
//     unique: true,
//     sparse: true,
//     index: true
//   },
//   name: {
//     type: String,
//     trim: true
//   },
//   password:{
//         type:String,
//         required:true,
//         select:false,
//     },
//   email: {
//     type: String,
//     index: true,
//     sparse: true,
//     lowercase: true,
//     trim: true
//   },
//   picture: String,
//   role: {
//     type: String,
//     enum: ['user', 'admin'],
//     default: 'user'
//   }
// }, { timestamps: true });

// const User = mongoose.model('User', userSchema);
// module.exports = User;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  name: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password required only for email/password users
    },
    select: false,
    minlength: 6
  },
  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  picture: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

// Hash password before saving


const User = mongoose.model('User', userSchema);
module.exports = User;