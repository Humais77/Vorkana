const mongoose = require('mongoose');  
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        minLength:2,
        maxLength:50,
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
categorySchema.pre("save",function(next){
    if(!this.isModified("name")){
        this.slug = slugify(this.name,{lower:true,strict:true});
    }
    next();
});
categorySchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Category with that name already exists'));
  } else {
    next(error);
  }
});
const Category = mongoose.model('Category',categorySchema);
module.exports = Category;