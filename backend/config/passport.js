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

        // 1. First, check by googleId (existing Google user)
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          console.log('Found existing Google user:', user.email);
          
          // Update user info and set online status
          user.picture = profile.photos?.[0]?.value || user.picture;
          user.lastLoginAt = new Date();
          user.isOnline = true;
          await user.save({ validateBeforeSave: false });
          
          console.log('Updated existing Google user');
          return done(null, user);
        }

        // 2. Check if user exists by email (email/password user)
        user = await User.findOne({ email: email.toLowerCase() });
        
        if (user) {
          console.log('Found existing user with same email:', user.email);
          
          // Case 1: User already has Google linked
          if (user.googleId) {
            // This shouldn't happen as we already checked, but just in case
            console.log('User already has Google linked');
            user.lastLoginAt = new Date();
            user.isOnline = true;
            await user.save({ validateBeforeSave: false });
            return done(null, user);
          }
          
          // Case 2: Email/password user - link Google account
          if (user.emailVerified && user.registrationStatus === 'verified') {
            console.log('Linking Google account to existing verified user');
            user.googleId = profile.id;
            user.picture = profile.photos?.[0]?.value || user.picture;
            user.lastLoginAt = new Date();
            user.isOnline = true;
            await user.save({ validateBeforeSave: false });
            return done(null, user);
          }
          
          // Case 3: Pending registration - complete with Google
          if (user.registrationStatus === 'pending') {
            console.log('Completing pending registration with Google');
            user.googleId = profile.id;
            user.name = profile.displayName || user.registrationData?.name || user.name;
            user.picture = profile.photos?.[0]?.value;
            user.emailVerified = true;
            user.registrationStatus = 'verified';
            user.isActive = true;
            user.lastLoginAt = new Date();
            user.isOnline = true;
            
            // Move registration data to user fields
            if (user.registrationData) {
              user.phoneNumber = user.registrationData.phoneNumber || user.phoneNumber;
              user.dateOfBirth = user.registrationData.dateOfBirth || user.dateOfBirth;
              user.gender = user.registrationData.gender || user.gender;
              user.country = user.registrationData.country || user.country;
              user.city = user.registrationData.city || user.city;
              user.registrationData = undefined;
            }
            
            await user.save({ validateBeforeSave: false });
            console.log('Completed registration with Google');
            return done(null, user);
          }
        }

        // 3. Create new user (no existing user found)
        console.log('Creating new Google user');
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: email.toLowerCase(),
          picture: profile.photos?.[0]?.value,
          emailVerified: true,
          registrationStatus: 'verified',
          isActive: true,
          lastLoginAt: new Date(),
          isOnline: true
        });
        
        await user.save({ validateBeforeSave: false });
        console.log('Created new Google user successfully');
        
        return done(null, user);

      } catch (error) {
        console.error('Google OAuth error:', error);
        
        // Handle duplicate key error (shouldn't happen with proper checks)
        if (error.code === 11000) {
          const duplicateField = Object.keys(error.keyPattern)[0];
          const errorMsg = duplicateField === 'email' 
            ? 'Email already exists. Please use login instead.'
            : 'User already exists with this Google account.';
          
          return done(new Error(errorMsg), null);
        }
        
        return done(error, null);
      }
    }
  )
);