const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");
const User = require("../models/user.model.js");
const jwt = require("jsonwebtoken");

// For JWT-based authentication, we don't need passport sessions
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      passReqToCallback: true // Add this to get access to req object
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if user exists by email (in case they registered with email/password)
          user = await User.findOne({ email: profile.emails?.[0]?.value });
          
          if (user) {
            // Link Google account to existing email/password account
            user.googleId = profile.id;
            user.picture = profile.photos?.[0]?.value;
            await user.save();
          } else {
            // Create new user
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails?.[0]?.value,
              picture: profile.photos?.[0]?.value,
            });
          }
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        // Return user with token
        const userWithToken = {
          ...user.toObject(),
          token
        };

        return done(null, userWithToken);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);