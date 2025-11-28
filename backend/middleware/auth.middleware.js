const jwt = require('jsonwebtoken');
const User = require('../models/user.model.js');

const protect = async (req, res, next) => {
    try {
        const auth = req.headers.authorization;
        const token = auth && auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;
        if (!token) {
            return res.status(401).json({ success: false, message: "Authorization denied" });
        }
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (!payload?.id) return res.status(401).json({ success: false, message: "Invalid Token" });
        const user = await User.findById(payload.id).lean();
        if (!user) return res.status(401).json({ success: false, message: "User not found" });

        req.user = { _id: payload.id, role: user.role, name: user.name, email: user.email };
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Token invalid or expired" });
    }
}
const adminOnly = (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    next();
}
module.exports = { protect, adminOnly };