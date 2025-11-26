const Category = require('../models/category.model.js');
const slugify = require('slugify');
const errorHandler = require('../utils/errorHandler.js');

const createCategory = async(req,res,next)=>{
    try {
        const {name,description} = req.body;
        const category = await Category.create({
            name,
            description,
            slug:slugify(name,{lower:true}),
            createdBy:req.user?._id,
        });
        res.status(201).json({success:true,category});
    } catch (error) {
        next(errorHandler(500, "Server Error"));
    }
}

const getCategories = async(req,res,next)=>{
    try {
        const categories = await Category.find().sort({createdAt:-1});
        res.json({success:true,categories});
    } catch (error) {
        next(errorHandler(500, "Server Error"));
    }
}

const getCategoryById = async(req,res,next)=>{
    try {
        const categoryById = await Category.findById(req.params.id);
        if (!categoryById) return res.status(404).json({ message: "Category not found" });
        res.json({success:true,categoryById});
    } catch (error) {
        next(errorHandler(500, "Server Error"));
    }
}

const updateCategory = async(req,res,next)=>{
    try {
        const {name,description} = req.body;
        const updateCategory = await Category.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                slug:name? slugify(name,{lower:true}):undefined,
            },
            {new:true}
        );
        if(!updateCategory) return res.status(404).json({message:"Category not found"});
        res.json({success:true,updateCategory});
    } catch (error) {
        next(errorHandler(500, "Server Error"));
    }
}

const deleteCategory = async(req,res,next)=>{
    try {
        const deletedCategory = await Category.findByIdAndDelete(req.params.id);
        if(!deletedCategory) return res.status(404).json({message:"Category not found"});
        res.json({success:true,message:"Category deleted successfully"});
    } catch (error) {
        next(errorHandler(500, "Server Error"));
    }
}

module.exports = {createCategory,getCategories,getCategoryById,updateCategory,deleteCategory};