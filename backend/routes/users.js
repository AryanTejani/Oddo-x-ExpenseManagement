const express = require('express');
const { authenticateToken, requireRole, requireCompany } = require('../middleware/auth');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all users in company (Admin/Manager only)
router.get('/', authenticateToken, requireRole('admin', 'manager'), requireCompany, async (req, res) => {
  try {
    const { role, department, isActive, search } = req.query;
    const query = { company: req.user.company._id };

    if (role) query.role = role;
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('manager', 'firstName lastName email')
      .select('-googleId')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Get user by ID
router.get('/:userId', authenticateToken, requireCompany, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only view their own profile unless they're admin/manager
    if (userId !== req.user._id.toString() && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findOne({ 
      _id: userId, 
      company: req.user.company._id 
    })
    .populate('manager', 'firstName lastName email')
    .populate('company')
    .select('-googleId');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

// Create new user (Admin only)
router.post('/', 
  authenticateToken, 
  requireRole('admin'), 
  requireCompany,
  [
    body('email').isEmail().normalizeEmail(),
    body('firstName').trim().isLength({ min: 1 }),
    body('lastName').trim().isLength({ min: 1 }),
    body('role').isIn(['employee', 'manager']),
    body('department').optional().trim(),
    body('employeeId').optional().trim(),
    body('manager').optional().isMongoId()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, firstName, lastName, role, department, employeeId, manager } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ 
        email, 
        company: req.user.company._id 
      });

      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Validate manager if provided
      if (manager) {
        const managerUser = await User.findOne({ 
          _id: manager, 
          company: req.user.company._id,
          role: 'manager'
        });
        if (!managerUser) {
          return res.status(400).json({ message: 'Invalid manager' });
        }
      }

      const user = new User({
        email,
        firstName,
        lastName,
        role,
        department,
        employeeId,
        manager,
        company: req.user.company._id
      });

      await user.save();

      const populatedUser = await User.findById(user._id)
        .populate('manager', 'firstName lastName email')
        .populate('company')
        .select('-googleId');

      // Send welcome email to new user
      try {
        await emailService.sendWelcomeEmail(populatedUser, populatedUser.company);
        console.log('Welcome email sent to new user');
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        message: 'User created successfully',
        user: populatedUser
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  }
);

// Update user (Admin only)
router.put('/:userId', 
  authenticateToken, 
  requireRole('admin'), 
  requireCompany,
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('firstName').optional().trim().isLength({ min: 1 }),
    body('lastName').optional().trim().isLength({ min: 1 }),
    body('role').optional().isIn(['employee', 'manager', 'admin']),
    body('department').optional().trim(),
    body('employeeId').optional().trim(),
    body('manager').optional().isMongoId(),
    body('isActive').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { userId } = req.params;
      const user = await User.findOne({ 
        _id: userId, 
        company: req.user.company._id 
      });

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { email, firstName, lastName, role, department, employeeId, manager, isActive } = req.body;

      // Check email uniqueness if changing
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ 
          email, 
          company: req.user.company._id,
          _id: { $ne: userId }
        });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already exists' });
        }
        user.email = email;
      }

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (role) user.role = role;
      if (department !== undefined) user.department = department;
      if (employeeId !== undefined) user.employeeId = employeeId;
      if (isActive !== undefined) user.isActive = isActive;

      // Validate manager if provided
      if (manager !== undefined) {
        if (manager) {
          const managerUser = await User.findOne({ 
            _id: manager, 
            company: req.user.company._id,
            role: 'manager'
          });
          if (!managerUser) {
            return res.status(400).json({ message: 'Invalid manager' });
          }
        }
        user.manager = manager;
      }

      await user.save();

      const updatedUser = await User.findById(user._id)
        .populate('manager', 'firstName lastName email')
        .select('-googleId');

      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  }
);

// Delete user (Admin only)
router.delete('/:userId', authenticateToken, requireRole('admin'), requireCompany, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting self
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findOne({ 
      _id: userId, 
      company: req.user.company._id 
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete
    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Get team members (for managers)
router.get('/team/members', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const teamMembers = await User.find({
      $or: [
        { manager: req.user._id },
        { _id: req.user._id }
      ],
      isActive: true
    })
    .populate('manager', 'firstName lastName email')
    .select('-googleId')
    .sort({ firstName: 1 });

    res.json(teamMembers);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ message: 'Failed to get team members' });
  }
});

module.exports = router;
