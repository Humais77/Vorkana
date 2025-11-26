const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true,
        trim:true,
    },
    description:String,
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
        required:true,
    },
    price:{
        type:Number,
        default:0
    },
    deliveryTime:{
        type:Number, 
        default:3
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    }
},{timestamps:true});
const Service = mongoose.model('Service',serviceSchema);
module.exports = Service;