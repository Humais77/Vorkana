// testRoutes.js  → ONLY LOADED DURING TESTS
const { protect } = require('./middleware/auth.middleware');

module.exports = (app) => {
  console.log('Test-only dummy routes loaded');

  app.put('/api/users/me', protect, (req, res) => {
    const updatedName = req.body.name || req.user.name || 'Default User';
    res.status(200).json({
      success: true,
      user: {
        _id: req.user._id,
        name: updatedName,
        email: req.user.email,
        role: req.user.role || 'user',
      },
    });
  });

  app.put('/api/users/:id', protect, (req, res) => {
    res.status(200).json({ success: true, user: req.user });
  });
};