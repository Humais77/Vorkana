// const express = require('express');
// const { register,login } = require('../controllers/auth.controller');
// const route = express.Router();

// route.post('/register',register);
// route.post('/login',login);
// module.exports = route;
// const express = require("express");
// const passport = require("passport");
// const jwt = require("jsonwebtoken");

// const router = express.Router();

// // Step 1: Redirect to Google
// router.get("/google",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );

// // Step 2: Callback URL
// router.get(
//   "/google/callback",
//   passport.authenticate("google", { failureRedirect: "/login" }),
//   (req, res) => {
//     const token = jwt.sign(
//       { id: req.user._id },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     // Redirect to frontend with JWT
//     res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${token}`);
//   }
// );

// module.exports = router;
const express = require("express");
const passport = require("passport");
const session = require("express-session");

const router = express.Router();

// Configure session (still needed for Passport)
router.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
router.use(passport.initialize());
router.use(passport.session());

// Step 1: Redirect to Google
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Step 2: Callback URL - Modified to work with JWT
router.get(
  "/google/callback",
  passport.authenticate("google", { 
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
    session: false // Disable sessions since we're using JWT
  }),
  (req, res) => {
    // req.user should contain the user object with token from passport strategy
    if (!req.user || !req.user.token) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    // Redirect to frontend with JWT token and user data
    const userData = encodeURIComponent(JSON.stringify({
      token: req.user.token,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture,
        role: req.user.role
      }
    }));

    res.redirect(`${process.env.FRONTEND_URL}/oauth-success?data=${userData}`);
  }
);

module.exports = router;