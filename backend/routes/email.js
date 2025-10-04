const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const emailService = require('../services/emailService');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Send test email (Admin only)
router.post('/test', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    const result = await emailService.sendEmail({
      to: to || req.user.email,
      subject: subject || 'Test Email from Expense Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Test Email</h2>
          <p>This is a test email from the Expense Management System.</p>
          <p>${message || 'Email service is working correctly!'}</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `,
      text: `Test Email\n\nThis is a test email from the Expense Management System.\n\n${message || 'Email service is working correctly!'}\n\nSent at: ${new Date().toLocaleString()}`
    });

    if (result.success) {
      res.json({ message: 'Test email sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ message: 'Failed to send test email', error: result.error });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ message: 'Failed to send test email' });
  }
});

// Send welcome email to user
router.post('/welcome/:userId', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).populate('company');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await emailService.sendWelcomeEmail(user, user.company);
    
    if (result.success) {
      res.json({ message: 'Welcome email sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ message: 'Failed to send welcome email', error: result.error });
    }
  } catch (error) {
    console.error('Welcome email error:', error);
    res.status(500).json({ message: 'Failed to send welcome email' });
  }
});

// Send bulk notification
router.post('/bulk-notification', 
  authenticateToken, 
  requireRole('admin'),
  [
    body('subject').trim().isLength({ min: 1, max: 200 }),
    body('message').trim().isLength({ min: 1, max: 2000 }),
    body('recipients').isArray().isLength({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { subject, message, recipients } = req.body;

      // Get user details for recipients
      const users = await User.find({ 
        _id: { $in: recipients },
        company: req.user.company._id,
        isActive: true
      }).select('email firstName lastName');

      if (users.length === 0) {
        return res.status(400).json({ message: 'No valid recipients found' });
      }

      const results = await emailService.sendBulkNotification(users, subject, message);
      
      const successCount = results.filter(r => r.result.success).length;
      const failureCount = results.filter(r => !r.result.success).length;

      res.json({
        message: `Bulk notification sent to ${successCount} recipients`,
        successCount,
        failureCount,
        results
      });
    } catch (error) {
      console.error('Bulk notification error:', error);
      res.status(500).json({ message: 'Failed to send bulk notification' });
    }
  }
);

// Send notification to company users
router.post('/company-notification',
  authenticateToken,
  requireRole('admin'),
  [
    body('subject').trim().isLength({ min: 1, max: 200 }),
    body('message').trim().isLength({ min: 1, max: 2000 }),
    body('roles').optional().isArray(),
    body('departments').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { subject, message, roles, departments } = req.body;

      // Build query for recipients
      const query = {
        company: req.user.company._id,
        isActive: true
      };

      if (roles && roles.length > 0) {
        query.role = { $in: roles };
      }

      if (departments && departments.length > 0) {
        query.department = { $in: departments };
      }

      const users = await User.find(query).select('email firstName lastName role department');

      if (users.length === 0) {
        return res.status(400).json({ message: 'No users found matching criteria' });
      }

      const results = await emailService.sendBulkNotification(users, subject, message);
      
      const successCount = results.filter(r => r.result.success).length;
      const failureCount = results.filter(r => !r.result.success).length;

      res.json({
        message: `Company notification sent to ${successCount} users`,
        successCount,
        failureCount,
        totalUsers: users.length,
        results
      });
    } catch (error) {
      console.error('Company notification error:', error);
      res.status(500).json({ message: 'Failed to send company notification' });
    }
  }
);

// Get email service status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const emailService = process.env.EMAIL_SERVICE || 'gmail';
    
    res.json({
      status: 'active',
      service: emailService,
      environment: isProduction ? 'production' : 'development',
      from: process.env.EMAIL_FROM || 'noreply@expensemanager.com'
    });
  } catch (error) {
    console.error('Email status error:', error);
    res.status(500).json({ message: 'Failed to get email status' });
  }
});

// Send password reset email
router.post('/password-reset',
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      const user = await User.findOne({ email, isActive: true });
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ message: 'If the email exists, a password reset link has been sent' });
      }

      // Generate reset token (in real app, use crypto.randomBytes)
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Store reset token in user document (you might want to add a resetToken field to User model)
      // user.resetToken = resetToken;
      // user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
      // await user.save();

      const result = await emailService.sendPasswordResetEmail(user, resetToken);
      
      if (result.success) {
        res.json({ message: 'Password reset email sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send password reset email' });
      }
    } catch (error) {
      console.error('Password reset email error:', error);
      res.status(500).json({ message: 'Failed to send password reset email' });
    }
  }
);

module.exports = router;

