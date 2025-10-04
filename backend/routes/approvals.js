const express = require('express');
const { authenticateToken, requireRole, requireCompany } = require('../middleware/auth');
const Expense = require('../models/Expense');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get pending approvals
router.get('/pending', authenticateToken, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Find expenses where current user is in the approval chain
    const query = {
      company: req.user.company._id,
      status: 'submitted',
      'approvalChain.approver': req.user._id,
      'approvalChain.status': 'pending'
    };

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('approvalChain.approver', 'firstName lastName email role')
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    res.json({
      expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: 'Failed to get pending approvals' });
  }
});

// Get approval history
router.get('/history', authenticateToken, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {
      company: req.user.company._id,
      'approvalChain.approver': req.user._id
    };

    if (status) {
      query.status = status;
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('approvalChain.approver', 'firstName lastName email role')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    res.json({
      expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({ message: 'Failed to get approval history' });
  }
});

// Approve expense
router.post('/:expenseId/approve',
  authenticateToken,
  requireRole('manager', 'admin'),
  [
    body('comments').optional().trim().isLength({ max: 500 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { expenseId } = req.params;
      const { comments } = req.body;

      const expense = await Expense.findOne({
        _id: expenseId,
        company: req.user.company._id,
        'approvalChain.approver': req.user._id,
        'approvalChain.status': 'pending'
      });

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found or not pending your approval' });
      }

      // Update approval chain
      const approvalIndex = expense.approvalChain.findIndex(
        approval => approval.approver.toString() === req.user._id.toString() && 
                   approval.status === 'pending'
      );

      if (approvalIndex === -1) {
        return res.status(400).json({ message: 'No pending approval found for this user' });
      }

      expense.approvalChain[approvalIndex].status = 'approved';
      expense.approvalChain[approvalIndex].comments = comments;
      expense.approvalChain[approvalIndex].actionDate = new Date();

      // Check if all required approvals are complete
      const pendingApprovals = expense.approvalChain.filter(
        approval => approval.status === 'pending' && approval.isRequired
      );

      if (pendingApprovals.length === 0) {
        expense.status = 'approved';
        expense.approvedAt = new Date();
        expense.totalApprovedAmount = expense.amount;
      }

      await expense.save();

      // Send email notification to employee
      try {
        const populatedExpense = await Expense.findById(expense._id)
          .populate('employee', 'firstName lastName email');
        
        await emailService.sendExpenseApprovedEmail(populatedExpense, req.user);
        console.log('Expense approval notification sent');
      } catch (emailError) {
        console.error('Failed to send expense approval email:', emailError);
        // Don't fail the request if email fails
      }

      res.json({
        message: 'Expense approved successfully',
        expense
      });
    } catch (error) {
      console.error('Approve expense error:', error);
      res.status(500).json({ message: 'Failed to approve expense' });
    }
  }
);

// Reject expense
router.post('/:expenseId/reject',
  authenticateToken,
  requireRole('manager', 'admin'),
  [
    body('reason').trim().isLength({ min: 1, max: 500 }),
    body('comments').optional().trim().isLength({ max: 500 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { expenseId } = req.params;
      const { reason, comments } = req.body;

      const expense = await Expense.findOne({
        _id: expenseId,
        company: req.user.company._id,
        'approvalChain.approver': req.user._id,
        'approvalChain.status': 'pending'
      });

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found or not pending your approval' });
      }

      // Update approval chain
      const approvalIndex = expense.approvalChain.findIndex(
        approval => approval.approver.toString() === req.user._id.toString() && 
                   approval.status === 'pending'
      );

      if (approvalIndex === -1) {
        return res.status(400).json({ message: 'No pending approval found for this user' });
      }

      expense.approvalChain[approvalIndex].status = 'rejected';
      expense.approvalChain[approvalIndex].comments = comments;
      expense.approvalChain[approvalIndex].actionDate = new Date();

      // Reject the entire expense
      expense.status = 'rejected';
      expense.rejectionReason = reason;

      await expense.save();

      // Send email notification to employee
      try {
        const populatedExpense = await Expense.findById(expense._id)
          .populate('employee', 'firstName lastName email');
        
        await emailService.sendExpenseRejectedEmail(populatedExpense, req.user, reason);
        console.log('Expense rejection notification sent');
      } catch (emailError) {
        console.error('Failed to send expense rejection email:', emailError);
        // Don't fail the request if email fails
      }

      res.json({
        message: 'Expense rejected successfully',
        expense
      });
    } catch (error) {
      console.error('Reject expense error:', error);
      res.status(500).json({ message: 'Failed to reject expense' });
    }
  }
);

// Get approval statistics
router.get('/stats', authenticateToken, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {
      company: req.user.company._id,
      'approvalChain.approver': req.user._id
    };

    if (startDate || endDate) {
      query.updatedAt = {};
      if (startDate) query.updatedAt.$gte = new Date(startDate);
      if (endDate) query.updatedAt.$lte = new Date(endDate);
    }

    const stats = await Expense.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalPending = await Expense.countDocuments({
      ...query,
      status: 'submitted',
      'approvalChain.status': 'pending'
    });

    res.json({
      stats,
      totalPending
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({ message: 'Failed to get approval statistics' });
  }
});

// Override approval (Admin only)
router.post('/:expenseId/override',
  authenticateToken,
  requireRole('admin'),
  [
    body('action').isIn(['approve', 'reject']),
    body('reason').trim().isLength({ min: 1, max: 500 }),
    body('comments').optional().trim().isLength({ max: 500 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { expenseId } = req.params;
      const { action, reason, comments } = req.body;

      const expense = await Expense.findOne({
        _id: expenseId,
        company: req.user.company._id
      });

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      // Add admin override to approval chain
      expense.approvalChain.push({
        approver: req.user._id,
        level: 999, // High level for admin override
        status: action === 'approve' ? 'approved' : 'rejected',
        comments: `Admin override: ${comments || reason}`,
        actionDate: new Date()
      });

      if (action === 'approve') {
        expense.status = 'approved';
        expense.approvedAt = new Date();
        expense.totalApprovedAmount = expense.amount;
      } else {
        expense.status = 'rejected';
        expense.rejectionReason = reason;
      }

      await expense.save();

      res.json({
        message: `Expense ${action}d by admin override`,
        expense
      });
    } catch (error) {
      console.error('Override approval error:', error);
      res.status(500).json({ message: 'Failed to override approval' });
    }
  }
);

module.exports = router;
