const express = require('express');
const { authenticateToken, requireRole, requireCompany } = require('../middleware/auth');
const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get all approval workflows for company
router.get('/', authenticateToken, requireCompany, async (req, res) => {
  try {
    const workflows = await ApprovalWorkflow.find({ 
      company: req.user.company._id,
      isActive: true 
    })
    .populate('defaultApprovers', 'firstName lastName email role')
    .populate('rules.approvers', 'firstName lastName email role')
    .populate('approvalSequence.approvers', 'firstName lastName email role')
    .populate('conditionalRules.specificApprovers', 'firstName lastName email role')
    .sort({ createdAt: -1 });

    res.json(workflows);
  } catch (error) {
    console.error('Get approval workflows error:', error);
    res.status(500).json({ message: 'Failed to get approval workflows' });
  }
});

// Get single approval workflow
router.get('/:id', authenticateToken, requireCompany, async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findOne({
      _id: req.params.id,
      company: req.user.company._id
    })
    .populate('defaultApprovers', 'firstName lastName email role')
    .populate('rules.approvers', 'firstName lastName email role')
    .populate('approvalSequence.approvers', 'firstName lastName email role')
    .populate('conditionalRules.specificApprovers', 'firstName lastName email role');

    if (!workflow) {
      return res.status(404).json({ message: 'Approval workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    console.error('Get approval workflow error:', error);
    res.status(500).json({ message: 'Failed to get approval workflow' });
  }
});

// Create new approval workflow
router.post('/', 
  authenticateToken, 
  requireRole('admin'), 
  requireCompany,
  [
    body('name').notEmpty().withMessage('Workflow name is required'),
    body('description').optional().isString(),
    body('rules').optional().isArray(),
    body('approvalSequence').optional().isArray(),
    body('conditionalRules').optional().isArray(),
    body('defaultApprovers').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        description,
        rules = [],
        approvalSequence = [],
        conditionalRules = [],
        defaultApprovers = [],
        escalationSettings = {}
      } = req.body;

      // Validate approvers exist and belong to company
      const allApproverIds = [
        ...defaultApprovers,
        ...rules.flatMap(rule => rule.approvers || []),
        ...approvalSequence.flatMap(step => step.approvers || []),
        ...conditionalRules.flatMap(rule => rule.specificApprovers || [])
      ];

      // Remove duplicates but keep unique IDs
      const uniqueApproverIds = [...new Set(allApproverIds)];

      console.log('🔍 Validating approvers:', {
        totalApproverIds: allApproverIds.length,
        uniqueApproverIds: uniqueApproverIds.length,
        approverIds: allApproverIds,
        uniqueIds: uniqueApproverIds,
        companyId: req.user.company._id
      });

      if (uniqueApproverIds.length > 0) {
        const approvers = await User.find({
          _id: { $in: uniqueApproverIds },
          company: req.user.company._id,
          isActive: true
        });

        console.log('🔍 Found approvers:', {
          requested: uniqueApproverIds.length,
          found: approvers.length,
          foundIds: approvers.map(a => a._id.toString()),
          foundUsers: approvers.map(a => `${a.firstName} ${a.lastName} (${a.role})`)
        });

        if (approvers.length !== uniqueApproverIds.length) {
          const missingIds = uniqueApproverIds.filter(id => 
            !approvers.some(app => app._id.toString() === id)
          );
          
          console.log('❌ Missing approvers:', missingIds);
          
          // Get all available approvers for debugging
          const allAvailableApprovers = await User.find({
             company: req.user.company._id,
             isActive: true,
             role: { $in: ['manager', 'admin'] }
           }).select('firstName lastName email role');
          
          return res.status(400).json({ 
            message: 'Some approvers not found or inactive',
            details: {
              requested: uniqueApproverIds.length,
              found: approvers.length,
              missing: missingIds,
              availableApprovers: allAvailableApprovers.map(a => ({
                id: a._id.toString(),
                name: `${a.firstName} ${a.lastName}`,
                role: a.role
              }))
            }
          });
        }
      }

      const workflow = new ApprovalWorkflow({
        company: req.user.company._id,
        name,
        description,
        rules,
        approvalSequence,
        conditionalRules,
        defaultApprovers,
        escalationSettings
      });

      await workflow.save();

      const populatedWorkflow = await ApprovalWorkflow.findById(workflow._id)
        .populate('defaultApprovers', 'firstName lastName email role')
        .populate('rules.approvers', 'firstName lastName email role')
        .populate('approvalSequence.approvers', 'firstName lastName email role')
        .populate('conditionalRules.specificApprovers', 'firstName lastName email role');

      res.status(201).json({
        message: 'Approval workflow created successfully',
        workflow: populatedWorkflow
      });
    } catch (error) {
      console.error('Create approval workflow error:', error);
      res.status(500).json({ message: 'Failed to create approval workflow' });
    }
  }
);

// Update approval workflow
router.put('/:id', 
  authenticateToken, 
  requireRole('admin'), 
  requireCompany,
  [
    body('name').optional().notEmpty(),
    body('description').optional().isString(),
    body('rules').optional().isArray(),
    body('approvalSequence').optional().isArray(),
    body('conditionalRules').optional().isArray(),
    body('defaultApprovers').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const workflow = await ApprovalWorkflow.findOne({
        _id: req.params.id,
        company: req.user.company._id
      });

      if (!workflow) {
        return res.status(404).json({ message: 'Approval workflow not found' });
      }

      const {
        name,
        description,
        rules,
        approvalSequence,
        conditionalRules,
        defaultApprovers,
        escalationSettings
      } = req.body;

      // Validate approvers if provided
      if (defaultApprovers || rules || approvalSequence || conditionalRules) {
        const allApproverIds = [
          ...(defaultApprovers || []),
          ...(rules || []).flatMap(rule => rule.approvers || []),
          ...(approvalSequence || []).flatMap(step => step.approvers || []),
          ...(conditionalRules || []).flatMap(rule => rule.specificApprovers || [])
        ];

        // Remove duplicates but keep unique IDs
        const uniqueApproverIds = [...new Set(allApproverIds)];

        console.log('🔍 Updating workflow - Validating approvers:', {
          totalApproverIds: allApproverIds.length,
          uniqueApproverIds: uniqueApproverIds.length,
          approverIds: allApproverIds,
          uniqueIds: uniqueApproverIds,
          companyId: req.user.company._id,
          workflowId: req.params.id
        });

        if (uniqueApproverIds.length > 0) {
          const approvers = await User.find({
            _id: { $in: uniqueApproverIds },
            company: req.user.company._id,
            isActive: true
          });

          console.log('🔍 Found approvers for update:', {
            requested: uniqueApproverIds.length,
            found: approvers.length,
            foundIds: approvers.map(a => a._id.toString()),
            foundUsers: approvers.map(a => `${a.firstName} ${a.lastName} (${a.role})`)
          });

          if (approvers.length !== uniqueApproverIds.length) {
            const missingIds = uniqueApproverIds.filter(id => 
              !approvers.some(app => app._id.toString() === id)
            );
            
            console.log('❌ Missing approvers for update:', missingIds);
            
            // Get all available approvers for debugging
            const allAvailableApprovers = await User.find({
               company: req.user.company._id,
               isActive: true,
               role: { $in: ['manager', 'admin'] }
             }).select('firstName lastName email role');
            
            return res.status(400).json({ 
              message: 'Some approvers not found or inactive',
              details: {
                requested: uniqueApproverIds.length,
                found: approvers.length,
                missing: missingIds,
                availableApprovers: allAvailableApprovers.map(a => ({
                  id: a._id.toString(),
                  name: `${a.firstName} ${a.lastName}`,
                  role: a.role
                }))
              }
            });
          }
        }
      }

      // Update workflow
      if (name) workflow.name = name;
      if (description !== undefined) workflow.description = description;
      if (rules) workflow.rules = rules;
      if (approvalSequence) workflow.approvalSequence = approvalSequence;
      if (conditionalRules) workflow.conditionalRules = conditionalRules;
      if (defaultApprovers) workflow.defaultApprovers = defaultApprovers;
      if (escalationSettings) workflow.escalationSettings = { ...workflow.escalationSettings, ...escalationSettings };

      await workflow.save();

      const populatedWorkflow = await ApprovalWorkflow.findById(workflow._id)
        .populate('defaultApprovers', 'firstName lastName email role')
        .populate('rules.approvers', 'firstName lastName email role')
        .populate('approvalSequence.approvers', 'firstName lastName email role')
        .populate('conditionalRules.specificApprovers', 'firstName lastName email role');

      res.json({
        message: 'Approval workflow updated successfully',
        workflow: populatedWorkflow
      });
    } catch (error) {
      console.error('Update approval workflow error:', error);
      res.status(500).json({ message: 'Failed to update approval workflow' });
    }
  }
);

// Delete approval workflow
router.delete('/:id', authenticateToken, requireRole('admin'), requireCompany, async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Approval workflow not found' });
    }

    // Soft delete
    workflow.isActive = false;
    await workflow.save();

    res.json({ message: 'Approval workflow deleted successfully' });
  } catch (error) {
    console.error('Delete approval workflow error:', error);
    res.status(500).json({ message: 'Failed to delete approval workflow' });
  }
});

// Get available approvers for workflow
router.get('/approvers/available', authenticateToken, requireCompany, async (req, res) => {
  try {
    const approvers = await User.find({
      company: req.user.company._id,
      isActive: true,
      role: { $in: ['manager', 'admin'] }
    })
    .select('firstName lastName email role department')
    .sort({ firstName: 1 });

    res.json(approvers);
  } catch (error) {
    console.error('Get available approvers error:', error);
    res.status(500).json({ message: 'Failed to get available approvers' });
  }
});

// Test approval workflow
router.post('/:id/test', 
  authenticateToken, 
  requireRole('admin'), 
  requireCompany,
  [
    body('expenseData').isObject().withMessage('Expense data is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const workflow = await ApprovalWorkflow.findOne({
        _id: req.params.id,
        company: req.user.company._id
      });

      if (!workflow) {
        return res.status(404).json({ message: 'Approval workflow not found' });
      }

      const { expenseData } = req.body;

      // Simulate expense for testing
      const mockExpense = {
        ...expenseData,
        company: req.user.company._id,
        employee: {
          _id: req.user._id,
          manager: req.user.manager,
          department: req.user.department,
          role: req.user.role
        }
      };

      // Test workflow applicability
      const isApplicable = await this.isWorkflowApplicable(workflow, mockExpense);
      
      // Test approval chain setup
      const approvalChain = await this.setupApprovalChain(mockExpense);

      res.json({
        isApplicable,
        approvalChain,
        workflow: workflow.name
      });
    } catch (error) {
      console.error('Test approval workflow error:', error);
      res.status(500).json({ message: 'Failed to test approval workflow' });
    }
  }
);

// Get workflow statistics
router.get('/:id/stats', authenticateToken, requireCompany, async (req, res) => {
  try {
    const workflow = await ApprovalWorkflow.findOne({
      _id: req.params.id,
      company: req.user.company._id
    });

    if (!workflow) {
      return res.status(404).json({ message: 'Approval workflow not found' });
    }

    // Get expense statistics for this workflow
    const Expense = require('../models/Expense');
    
    const stats = await Expense.aggregate([
      {
        $match: {
          company: req.user.company._id,
          'approvalChain.rule': { $in: workflow.rules.map(r => r.condition) }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalExpenses = stats.reduce((sum, stat) => sum + stat.count, 0);
    const totalAmount = stats.reduce((sum, stat) => sum + stat.totalAmount, 0);

    res.json({
      workflow: workflow.name,
      totalExpenses,
      totalAmount,
      statusBreakdown: stats,
      rulesCount: workflow.rules.length,
      sequenceStepsCount: workflow.approvalSequence.length,
      conditionalRulesCount: workflow.conditionalRules.length
    });
  } catch (error) {
    console.error('Get workflow stats error:', error);
    res.status(500).json({ message: 'Failed to get workflow statistics' });
  }
});

module.exports = router;
