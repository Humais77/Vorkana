const mongoose = require('mongoose');  

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
        trim:true,
    },
    description:{
        type:String,
        default:'',
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    },
    slug:{
        type:String,
        index:true,
    },   
},{timestamps:true});
const Category = mongoose.model('Category',categorySchema);
module.exports = Category;