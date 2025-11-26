const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    googleId:{
        type:String,
        required:true,
        unique:true,
        index:true
    },
    name:{
        type:String,
    },
    email:{
        type:String,
        index:true,
    },
    picture:String,
    role:{
        type:String,
        enum:['user','admin'],
        default:'user'
    },
},{timestamps:true});
const User = mongoose.model('User',userSchema);
module.exports = User;