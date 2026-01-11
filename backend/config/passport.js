const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");
const User = require("../models/user.model.js");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

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
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        
        if (!email) {
          return done(new Error("Google account doesn't have an email address"), null);
        }

        console.log('Google OAuth attempt:', {
          googleId: profile.id,
          email: email,
          name: profile.displayName
        });

        // Check if user exists by googleId (existing Google user)
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          console.log('Found existing Google user:', user.email);
          
          // Ensure user is verified and active (Google accounts are always verified)
          user.emailVerified = true;
          user.registrationStatus = 'verified';
          user.isActive = true;
          user.picture = profile.photos?.[0]?.value || user.picture;
          user.lastLoginAt = new Date();
          await user.save({ validateBeforeSave: false });
          
          console.log('Updated existing Google user');
        } else {
          // Check if user exists by email (email/password user trying to use Google)
          user = await User.findOne({ email: email });
          
          if (user) {
            console.log('Found existing email user:', user.email);
            
            if (user.googleId) {
              // User already has Google linked, shouldn't happen but just in case
              console.log('User already has Google linked');
            } else if (user.emailVerified && user.registrationStatus === 'verified') {
              // Verified email/password user - link Google account
              user.googleId = profile.id;
              user.picture = profile.photos?.[0]?.value || user.picture;
              user.lastLoginAt = new Date();
              await user.save({ validateBeforeSave: false });
              
              console.log('Linked Google to existing verified user');
            } else {
              // Pending registration with same email - delete and create new with Google
              console.log('Deleting pending registration and creating Google user');
              await User.deleteOne({ _id: user._id });
              
              // Create new user with Google
              user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: email,
                picture: profile.photos?.[0]?.value,
                emailVerified: true, // Google accounts are automatically verified
                registrationStatus: 'verified',
                isActive: true,
                lastLoginAt: new Date()
              });
              
              await user.save({ validateBeforeSave: false });
              console.log('Created new Google user from deleted pending registration');
            }
          } else {
            // No user exists - create new Google user
            console.log('Creating new Google user');
            user = new User({
              googleId: profile.id,
              name: profile.displayName,
              email: email,
              picture: profile.photos?.[0]?.value,
              emailVerified: true, // Google accounts are automatically verified
              registrationStatus: 'verified',
              isActive: true,
              lastLoginAt: new Date()
            });
            
            await user.save({ validateBeforeSave: false });
            console.log('Created new Google user successfully');
          }
        }

        // Generate JWT token
        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        // Generate refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');

        // Return user with tokens
        const userWithTokens = {
          ...user.toObject(),
          token,
          refreshToken
        };

        console.log('Google OAuth successful for:', user.email);
        return done(null, userWithTokens);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);