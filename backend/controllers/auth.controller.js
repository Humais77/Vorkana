const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const User = require('../models/user.model');
const createError  = require('../utils/createError');


const register = async (req, res, next) => {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return next(createError(409, "User with this email already exists"));
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
        name,
        email,
        password: hashedPassword
    });

    try {
        await newUser.save();

        const payload = { user: { id: newUser._id } };

         const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "40h" });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role:newUser.role,
            },
            token, 
        });

    } catch (error) {
        next(error);
    }
};
const login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return next(createError(401, "Invalid credentials"));
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return next(createError(401, "Invalid credentials"));
        }
        const payload = { user: { id: user._id } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '40h' });
        res.status(200).json({
            message: "Login successful",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role:user.role,
            },
            token
        });
    } catch (error) {
        next(error);
    }

}
module.exports = { register, login };