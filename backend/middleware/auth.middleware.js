const jwt = require('jsonwebtoken');
const User = require('../models/user.model.js');

const protect = async (req,res,next)=>{
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith("Bearer")){
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.user?.id || decoded._id || decoded.id;
            if(!userId){
                return res.status(401).json({success:false, message:"Not authorized, token failed"});
            }
            req.user = await User.findById(userId, '-password');
            if(!req.user){
                return res.status(401).json({success:false, message:"Not authorized, user not found"});
            }
            return next();
        } catch (error) {
            console.error("Token verification failed:", error);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }else{
             return res.status(401).json({ message: "Not authorized, no token provided" });
        }
}
const adminOnly = (req,res,next)=>{
    if(req.user && req.user.role ==="admin"){
        next();
    }else{
        res.status(403).json({message:"Not authorized as an admin"});
    }
}

module.exports = { protect ,adminOnly};