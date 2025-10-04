const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const { id, displayName, emails, photos } = profile;
    const email = emails[0].value;
    const profilePicture = photos[0]?.value;

    // Extract first and last name
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const userData = {
      googleId: id,
      email,
      firstName,
      lastName,
      profilePicture
    };

    return done(null, userData);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.userId).populate('company');
    if (user && user.isActive) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    console.error('JWT Strategy error:', error);
    return done(error, false);
  }
}));

// Session serialization (required for session-based auth)
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;

