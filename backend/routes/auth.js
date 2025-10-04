const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const Currency = require('../models/Currency');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const { user } = req;
      
      // Check if user exists
      let existingUser = await User.findOne({ 
        $or: [
          { googleId: user.googleId },
          { email: user.email }
        ]
      }).populate('company');

      if (existingUser) {
        // Update Google ID if missing
        if (!existingUser.googleId) {
          existingUser.googleId = user.googleId;
          await existingUser.save();
        }
        
        const token = jwt.sign(
          { userId: existingUser._id },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
          id: existingUser._id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          role: existingUser.role,
          company: existingUser.company
        }))}`);
      }

      // New user - redirect to role selection
      const tempToken = jwt.sign(
        { 
          tempUser: {
            googleId: user.googleId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePicture: user.profilePicture
          }
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.redirect(`${process.env.FRONTEND_URL}/auth/role-selection?token=${tempToken}`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

// Complete user registration with role
// Test endpoint for debugging
router.get('/test-env', (req, res) => {
  res.json({
    jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Missing',
    mongodbUri: process.env.MONGODB_URI ? 'Set' : 'Missing',
    sessionSecret: process.env.SESSION_SECRET ? 'Set' : 'Missing',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

router.post('/complete-registration', async (req, res) => {
  try {
    const { tempToken, role, companyId, companyName, country, currency } = req.body;

    // Verify temp token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (!decoded.tempUser) {
      return res.status(400).json({ message: 'Invalid registration token' });
    }

    const { googleId, email, firstName, lastName, profilePicture } = decoded.tempUser;

    let company;
    if (companyId) {
      // Join existing company
      try {
        console.log('🔧 Joining existing company:', companyId);
        
        // Validate ObjectId format
        if (!companyId.match(/^[0-9a-fA-F]{24}$/)) {
          console.log('❌ Invalid company ID format:', companyId);
          return res.status(400).json({ message: 'Invalid company ID format' });
        }
        
        company = await Company.findById(companyId).populate('currency');
        if (!company) {
          console.log('❌ Company not found:', companyId);
          return res.status(404).json({ message: 'Company not found' });
        }
        console.log('✅ Company found:', company.name);
      } catch (error) {
        console.error('❌ Error finding company:', error);
        return res.status(500).json({ 
          message: 'Failed to find company',
          error: error.message 
        });
      }
    } else {
      // Create new company
      try {
        console.log('🔧 Creating company with data:', {
          name: companyName,
          domain: email.split('@')[1],
          country,
          currency
        });

        // Create the company with embedded currency data
        company = new Company({
          name: companyName,
          domain: email.split('@')[1],
          country,
          currency: {
            code: currency.code,
            symbol: currency.symbol,
            name: currency.name
          },
          isActive: true
        });
        await company.save();
        
        console.log('✅ Company saved successfully:', company._id);

        // Also create a Currency document for reference
        let currencyDoc = await Currency.findOne({ code: currency.code });
        if (!currencyDoc) {
          currencyDoc = new Currency({
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            country: country
          });
          await currencyDoc.save();
        }
        
        console.log('✅ Company created successfully:', {
          id: company._id,
          name: company.name,
          country: company.country,
          currency: company.currency.code
        });
      } catch (error) {
        console.error('❌ Company creation error:', error);
        return res.status(500).json({ 
          message: 'Failed to create company',
          error: error.message 
        });
      }
    }

    // Create user
    let user;
    try {
      console.log('🔧 Creating user with data:', {
        googleId,
        email,
        firstName,
        lastName,
        company: company._id,
        role: role || 'employee',
        companyId: companyId ? 'joining existing' : 'creating new'
      });

      // Validate role
      const validRoles = ['admin', 'manager', 'employee'];
      const userRole = role || 'employee';
      if (!validRoles.includes(userRole)) {
        console.error('❌ Invalid role:', userRole);
        return res.status(400).json({ 
          message: 'Invalid role specified',
          error: `Role must be one of: ${validRoles.join(', ')}` 
        });
      }

      user = new User({
        googleId,
        email,
        firstName,
        lastName,
        profilePicture,
        company: company._id,
        role: userRole,
        isActive: true
      });

      console.log('🔧 User object created, saving...');
      await user.save();
      console.log('✅ User saved successfully');

      // If this is the first user in the company, make them admin
      if (role === 'admin' || !companyId) {
        user.role = 'admin';
        await user.save();
      }

      console.log('✅ User created successfully:', {
        id: user._id,
        email: user.email,
        role: user.role,
        company: company.name
      });
    } catch (error) {
      console.error('❌ User creation error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      });
      return res.status(500).json({ 
        message: 'Failed to create user',
        error: error.message 
      });
    }

    try {
      // Check JWT_SECRET
      if (!process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET is not set in environment variables');
        return res.status(500).json({ 
          message: 'JWT_SECRET missing',
          error: 'Server configuration error' 
        });
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('✅ Registration completed successfully for:', user.email);
      console.log('🔑 Token created successfully');
      
      // Simplify response to avoid serialization issues
      const response = {
        message: 'Registration completed successfully',
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          company: {
            id: company._id.toString(),
            name: company.name
          }
        }
      };
      
      console.log('📤 Sending response:', { 
        message: response.message,
        hasToken: !!response.token,
        userEmail: response.user.email 
      });
      
      res.json(response);
    } catch (error) {
      console.error('❌ Error creating response:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        message: 'Registration completed but failed to create response',
        error: error.message 
      });
    }
  } catch (error) {
    console.error('Registration completion error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('company')
      .populate('manager', 'firstName lastName email');

    res.json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      profilePicture: user.profilePicture,
      role: user.role,
      company: user.company,
      manager: user.manager,
      department: user.department,
      employeeId: user.employeeId,
      preferences: user.preferences,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user data' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, department, preferences } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (department) user.department = department;
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more sophisticated setup, you might want to blacklist the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const newToken = jwt.sign(
      { userId: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token: newToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

module.exports = router;

