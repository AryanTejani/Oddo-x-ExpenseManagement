const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticateToken, requireRole, requireCompany } = require('../middleware/auth');
const Expense = require('../models/Expense');
const User = require('../models/User');
const emailService = require('../services/emailService');
const ocrService = require('../services/ocrService');
const approvalWorkflowService = require('../services/approvalWorkflowService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get expenses
router.get('/', authenticateToken, requireCompany, async (req, res) => {
  try {
    const { 
      status, 
      category, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { company: req.user.company._id };

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (req.user.role === 'manager') {
      // Managers can see their team's expenses
      const teamMembers = await User.find({ 
        $or: [
          { manager: req.user._id },
          { _id: req.user._id }
        ],
        isActive: true
      }).select('_id');
      
      query.employee = { $in: teamMembers.map(member => member._id) };
    }

    if (status) query.status = status;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email department')
      .sort(sortOptions)
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
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Failed to get expenses' });
  }
});

// Get expense by ID
router.get('/:expenseId', authenticateToken, requireCompany, async (req, res) => {
  try {
    const { expenseId } = req.params;
    
    const expense = await Expense.findOne({ 
      _id: expenseId, 
      company: req.user.company._id 
    })
    .populate('employee', 'firstName lastName email department')
    .populate('approvalChain.approver', 'firstName lastName email role');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Check access permissions
    if (req.user.role === 'employee' && expense.employee._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Failed to get expense' });
  }
});

// Create expense
router.post('/',
  authenticateToken,
  requireRole('employee'),
  [
    body('amount').isNumeric().isFloat({ min: 0 }),
    body('currency.code').isLength({ min: 3, max: 3 }),
    body('category').isIn([
      'travel', 'meals', 'accommodation', 'transport', 
      'office_supplies', 'entertainment', 'training', 
      'communication', 'other'
    ]),
    body('description').trim().isLength({ min: 1, max: 500 }),
    body('date').isISO8601()
  ],
  async (req, res) => {
    try {
      console.log('🔧 Expense creation request:', req.body);
      console.log('👤 User:', req.user ? 'Authenticated' : 'Not authenticated');
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, currency, category, description, date, merchant, tags } = req.body;

      const expense = new Expense({
        employee: req.user._id,
        company: req.user.company._id,
        amount,
        currency,
        category,
        description,
        date: new Date(date),
        merchant: merchant || '',
        tags: tags || []
      });

      await expense.save();

      const populatedExpense = await Expense.findById(expense._id)
        .populate('employee', 'firstName lastName email department');

      res.status(201).json({
        message: 'Expense created successfully',
        expense: populatedExpense
      });
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json({ message: 'Failed to create expense' });
    }
  }
);

// Upload receipt with OCR
router.post('/:expenseId/receipt',
  authenticateToken,
  requireRole('employee'),
  upload.single('receipt'),
  async (req, res) => {
    try {
      const { expenseId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const expense = await Expense.findOne({ 
        _id: expenseId, 
        employee: req.user._id,
        company: req.user.company._id 
      });

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        {
          folder: 'expense-receipts',
          resource_type: 'image'
        }
      );

      // Process receipt with OCR
      const ocrResult = await ocrService.processReceipt(req.file.buffer, req.file.mimetype);
      
      if (ocrResult.success) {
        const ocrData = ocrResult.data;
        
        // Update expense with OCR data if amounts match
        if (ocrData.extractedAmount && Math.abs(ocrData.extractedAmount - expense.amount) < 0.01) {
          console.log('OCR extracted amount matches expense amount');
        }
        
        expense.receipt.ocrData = ocrData;
      } else {
        console.error('OCR processing failed:', ocrResult.error);
        // Still save receipt without OCR data
        expense.receipt.ocrData = {
          extractedText: 'OCR processing failed',
          confidence: 0,
          extractedAmount: null,
          extractedDate: null,
          extractedMerchant: null
        };
      }

      expense.receipt = {
        url: result.secure_url,
        filename: result.public_id,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        ocrData
      };

      await expense.save();

      res.json({
        message: 'Receipt uploaded successfully',
        receipt: expense.receipt
      });
    } catch (error) {
      console.error('Upload receipt error:', error);
      res.status(500).json({ message: 'Failed to upload receipt' });
    }
  }
);

// Update expense
router.put('/:expenseId',
  authenticateToken,
  requireRole('employee'),
  [
    body('amount').optional().isNumeric().isFloat({ min: 0 }),
    body('category').optional().isIn([
      'travel', 'meals', 'accommodation', 'transport', 
      'office_supplies', 'entertainment', 'training', 
      'communication', 'other'
    ]),
    body('description').optional().trim().isLength({ min: 1, max: 500 }),
    body('date').optional().isISO8601(),
    body('tags').optional().isArray()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { expenseId } = req.params;
      const expense = await Expense.findOne({ 
        _id: expenseId, 
        employee: req.user._id,
        company: req.user.company._id 
      });

      if (!expense) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      if (expense.status !== 'draft') {
        return res.status(400).json({ message: 'Only draft expenses can be updated' });
      }

      const { amount, category, description, date, tags } = req.body;

      if (amount !== undefined) expense.amount = amount;
      if (category) expense.category = category;
      if (description) expense.description = description;
      if (date) expense.date = new Date(date);
      if (tags) expense.tags = tags;

      await expense.save();

      const updatedExpense = await Expense.findById(expense._id)
        .populate('employee', 'firstName lastName email department');

      res.json({
        message: 'Expense updated successfully',
        expense: updatedExpense
      });
    } catch (error) {
      console.error('Update expense error:', error);
      res.status(500).json({ message: 'Failed to update expense' });
    }
  }
);

// Submit expense for approval
router.post('/:expenseId/submit', authenticateToken, requireRole('employee'), async (req, res) => {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findOne({ 
      _id: expenseId, 
      employee: req.user._id,
      company: req.user.company._id 
    }).populate('employee', 'firstName lastName email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.status !== 'draft') {
      return res.status(400).json({ message: 'Expense already submitted' });
    }

        // Set up approval chain using workflow service
        const approvalChain = await approvalWorkflowService.setupApprovalChain(expense);
        expense.approvalChain = approvalChain;

    expense.status = 'submitted';
    expense.submittedAt = new Date();
    await expense.save();

    // Send email notification to approvers
    if (approvalChain && approvalChain.length > 0) {
      try {
        const approvers = approvalChain.map(app => app.approver).filter(app => app);
        if (approvers.length > 0) {
          await emailService.sendExpenseSubmittedEmail(expense, expense.employee, approvers);
          console.log('Expense submission notification sent');
        }
      } catch (emailError) {
        console.error('Failed to send expense submission email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      message: 'Expense submitted for approval',
      expense
    });
  } catch (error) {
    console.error('Submit expense error:', error);
    res.status(500).json({ message: 'Failed to submit expense' });
  }
});

// Delete expense
router.delete('/:expenseId', authenticateToken, requireRole('employee'), async (req, res) => {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findOne({ 
      _id: expenseId, 
      employee: req.user._id,
      company: req.user.company._id 
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft expenses can be deleted' });
    }

    await Expense.findByIdAndDelete(expenseId);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Failed to delete expense' });
  }
});

// Get team expenses (Manager role)
router.get('/team/expenses', authenticateToken, requireRole('manager'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, startDate, endDate } = req.query;
    
    // Get team members (employees who report to this manager)
    const teamMembers = await User.find({
      manager: req.user._id,
      company: req.user.company._id,
      isActive: true
    }).select('_id');

    const teamMemberIds = teamMembers.map(member => member._id);
    
    const query = { 
      employee: { $in: teamMemberIds },
      company: req.user.company._id
    };

    if (status) query.status = status;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('approvalChain.approver', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    // Get team statistics
    const teamStats = await Expense.aggregate([
      { $match: { employee: { $in: teamMemberIds }, company: req.user.company._id } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }}
    ]);

    res.json({
      expenses,
      teamStats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get team expenses error:', error);
    res.status(500).json({ message: 'Failed to get team expenses' });
  }
});

// Process receipt with OCR and create draft expense
router.post('/ocr-process',
  authenticateToken,
  requireRole('employee'),
  upload.single('receipt'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Process receipt with OCR
      const ocrResult = await ocrService.processReceipt(req.file.buffer, req.file.mimetype);
      
      if (!ocrResult.success) {
        return res.status(400).json({ 
          message: 'Failed to process receipt',
          error: ocrResult.error 
        });
      }

      res.json({
        success: true,
        data: ocrResult.data
      });
    } catch (error) {
      console.error('OCR processing error:', error);
      res.status(500).json({ message: 'Failed to process receipt' });
    }
  }
);

// Create draft expense from OCR data
router.post('/ocr-draft',
  authenticateToken,
  requireRole('employee'),
  [
    body('amount').isNumeric().isFloat({ min: 0 }),
    body('currency.code').isLength({ min: 3, max: 3 }),
    body('category').optional().isIn([
      'travel', 'meals', 'accommodation', 'transport', 
      'office_supplies', 'entertainment', 'training', 
      'communication', 'other'
    ]),
    body('description').trim().isLength({ min: 1, max: 500 }),
    body('date').optional().isISO8601(),
    body('ocrData').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, currency, category, description, date, merchant, tags, ocrData } = req.body;

      const expense = new Expense({
        employee: req.user._id,
        company: req.user.company._id,
        amount,
        currency,
        category: category || 'other',
        description,
        date: date ? new Date(date) : new Date(),
        merchant: merchant || '',
        tags: tags || [],
        status: 'draft',
        receipt: {
          pendingOCRData: ocrData || null
        }
      });

      await expense.save();

      const populatedExpense = await Expense.findById(expense._id)
        .populate('employee', 'firstName lastName email department');

      res.status(201).json({
        message: 'Draft expense created successfully',
        expense: populatedExpense
      });
    } catch (error) {
      console.error('Create draft expense error:', error);
      res.status(500).json({ message: 'Failed to create draft expense' });
    }
  }
);

// Get dashboard data with role-based filtering
router.get('/dashboard', authenticateToken, requireCompany, async (req, res) => {
  try {
    const query = { company: req.user.company._id };

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.employee = req.user._id;
    } else if (req.user.role === 'manager') {
      // Managers can see their team's expenses
      const teamMembers = await User.find({ 
        $or: [
          { manager: req.user._id },
          { _id: req.user._id }
        ],
        isActive: true
      }).select('_id');
      
      query.employee = { $in: teamMembers.map(member => member._id) };
    }
    // Admins can see all expenses (no additional filtering)

    // Get recent expenses (last 5)
    const recentExpenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email department')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get statistics
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

    // Calculate total stats
    let totalExpenses = 0;
    let pendingExpenses = 0;
    let approvedExpenses = 0;
    let rejectedExpenses = 0;
    let totalAmount = 0;
    let pendingAmount = 0;
    let approvedAmount = 0;

    stats.forEach(stat => {
      totalExpenses += stat.count;
      totalAmount += stat.totalAmount;
      
      if (stat._id === 'submitted') {
        pendingExpenses = stat.count;
        pendingAmount = stat.totalAmount;
      } else if (stat._id === 'approved') {
        approvedExpenses = stat.count;
        approvedAmount = stat.totalAmount;
      } else if (stat._id === 'rejected') {
        rejectedExpenses = stat.count;
      }
    });

    res.json({
      stats: {
        totalExpenses,
        pendingExpenses,
        approvedExpenses,
        rejectedExpenses,
        totalAmount,
        pendingAmount,
        approvedAmount
      },
      recentExpenses
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({ message: 'Failed to get dashboard data' });
  }
});

// Get my expenses (Employee role)
router.get('/my/expenses', authenticateToken, requireRole('employee'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, startDate, endDate } = req.query;
    
    const query = { 
      employee: req.user._id,
      company: req.user.company._id
    };

    if (status) query.status = status;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('approvalChain.approver', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Expense.countDocuments(query);

    res.json({
      expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get my expenses error:', error);
    res.status(500).json({ message: 'Failed to get expenses' });
  }
});

module.exports = router;
