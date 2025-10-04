const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const Company = require('../models/Company');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all users with advanced filtering and pagination
router.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      role, 
      department, 
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { company: req.user.company._id };

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) query.role = role;
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .populate('manager', 'firstName lastName email')
      .populate('company', 'name currency')
      .select('-googleId')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const companyId = req.user.company._id;

    const [
      totalUsers,
      activeUsers,
      usersByRole,
      usersByDepartment,
      recentUsers,
      managerStats
    ] = await Promise.all([
      User.countDocuments({ company: companyId }),
      User.countDocuments({ company: companyId, isActive: true }),
      User.aggregate([
        { $match: { company: companyId } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $match: { company: companyId, department: { $exists: true } } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),
      User.find({ company: companyId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email role createdAt'),
      User.aggregate([
        { $match: { company: companyId, role: 'manager' } },
        { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'manager',
          as: 'teamMembers'
        }},
        { $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          teamSize: { $size: '$teamMembers' }
        }}
      ])
    ]);

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole,
      usersByDepartment,
      recentUsers,
      managerStats
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Failed to get admin statistics' });
  }
});

// Bulk user operations
router.post('/users/bulk', 
  authenticateToken, 
  requireRole('admin'),
  [
    body('action').isIn(['activate', 'deactivate', 'changeRole', 'assignManager']),
    body('userIds').isArray().isLength({ min: 1 }),
    body('data').optional()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { action, userIds, data } = req.body;
      const results = [];

      for (const userId of userIds) {
        try {
          const user = await User.findOne({ 
            _id: userId, 
            company: req.user.company._id 
          });

          if (!user) {
            results.push({ userId, success: false, error: 'User not found' });
            continue;
          }

          switch (action) {
            case 'activate':
              user.isActive = true;
              break;
            case 'deactivate':
              user.isActive = false;
              break;
            case 'changeRole':
              if (data?.role) {
                user.role = data.role;
              }
              break;
            case 'assignManager':
              if (data?.managerId) {
                const manager = await User.findOne({ 
                  _id: data.managerId, 
                  company: req.user.company._id,
                  role: 'manager'
                });
                if (manager) {
                  user.manager = data.managerId;
                }
              }
              break;
          }

          await user.save();
          results.push({ userId, success: true });
        } catch (error) {
          results.push({ userId, success: false, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      res.json({
        message: `Bulk operation completed: ${successCount} successful, ${failureCount} failed`,
        results,
        successCount,
        failureCount
      });
    } catch (error) {
      console.error('Bulk user operation error:', error);
      res.status(500).json({ message: 'Failed to perform bulk operation' });
    }
  }
);

// Import users from CSV/Excel
router.post('/users/import', 
  authenticateToken, 
  requireRole('admin'),
  async (req, res) => {
    try {
      const { users } = req.body; // Array of user objects
      
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ message: 'No users provided for import' });
      }

      const results = [];
      const errors = [];

      for (let i = 0; i < users.length; i++) {
        const userData = users[i];
        
        try {
          // Validate required fields
          if (!userData.email || !userData.firstName || !userData.lastName) {
            errors.push({ row: i + 1, error: 'Missing required fields' });
            continue;
          }

          // Check if user already exists
          const existingUser = await User.findOne({ 
            email: userData.email, 
            company: req.user.company._id 
          });

          if (existingUser) {
            errors.push({ row: i + 1, error: 'User already exists' });
            continue;
          }

          // Create new user
          const user = new User({
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role || 'employee',
            department: userData.department,
            employeeId: userData.employeeId,
            company: req.user.company._id
          });

          await user.save();
          results.push({ row: i + 1, email: userData.email, success: true });
        } catch (error) {
          errors.push({ row: i + 1, error: error.message });
        }
      }

      res.json({
        message: `Import completed: ${results.length} successful, ${errors.length} failed`,
        results,
        errors,
        successCount: results.length,
        errorCount: errors.length
      });
    } catch (error) {
      console.error('User import error:', error);
      res.status(500).json({ message: 'Failed to import users' });
    }
  }
);

// Export users to CSV
router.get('/users/export', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    
    const users = await User.find({ company: req.user.company._id })
      .populate('manager', 'firstName lastName email')
      .select('-googleId -__v');

    if (format === 'csv') {
      // Generate CSV
      const csvHeader = 'Email,FirstName,LastName,Role,Department,EmployeeId,Manager,IsActive,CreatedAt\n';
      const csvRows = users.map(user => 
        `"${user.email}","${user.firstName}","${user.lastName}","${user.role}","${user.department || ''}","${user.employeeId || ''}","${user.manager ? user.manager.firstName + ' ' + user.manager.lastName : ''}","${user.isActive}","${user.createdAt}"`
      ).join('\n');
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.send(csv);
    } else {
      res.json({ users });
    }
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ message: 'Failed to export users' });
  }
});

// Get company settings
router.get('/settings', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const company = await Company.findById(req.user.company._id);
    res.json(company);
  } catch (error) {
    console.error('Get company settings error:', error);
    res.status(500).json({ message: 'Failed to get company settings' });
  }
});

// Update company settings
router.put('/settings', 
  authenticateToken, 
  requireRole('admin'),
  [
    body('name').optional().trim().isLength({ min: 1 }),
    body('settings.approvalWorkflow').optional().isIn(['simple', 'multi-level', 'custom']),
    body('settings.autoApprovalThreshold').optional().isNumeric().isFloat({ min: 0 }),
    body('settings.requireReceipt').optional().isBoolean(),
    body('settings.maxExpenseAmount').optional().isNumeric().isFloat({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const company = await Company.findById(req.user.company._id);
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }

      const { name, settings } = req.body;

      if (name) company.name = name;
      if (settings) {
        company.settings = { ...company.settings, ...settings };
      }

      await company.save();

      res.json({
        message: 'Company settings updated successfully',
        company
      });
    } catch (error) {
      console.error('Update company settings error:', error);
      res.status(500).json({ message: 'Failed to update company settings' });
    }
  }
);

module.exports = router;
