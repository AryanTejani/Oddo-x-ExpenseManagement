const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    code: {
      type: String,
      required: true,
      uppercase: true
    },
    symbol: String,
    name: String
  },
  category: {
    type: String,
    required: true,
    enum: [
      'travel', 'meals', 'accommodation', 'transport', 
      'office_supplies', 'entertainment', 'training', 
      'communication', 'other'
    ]
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  receipt: {
    url: String,
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    ocrData: {
      extractedText: String,
      confidence: Number,
      extractedAmount: Number,
      extractedDate: Date,
      extractedMerchant: String
    }
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'paid'],
    default: 'draft'
  },
  approvalChain: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    level: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    stepName: {
      type: String
    },
    isRequired: {
      type: Boolean,
      default: false
    },
    isManagerApprover: {
      type: Boolean,
      default: false
    },
    rule: {
      type: String
    },
    comments: String,
    actionDate: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalApprovedAmount: {
    type: Number,
    default: 0
  },
  rejectionReason: String,
  submittedAt: Date,
  approvedAt: Date,
  paidAt: Date,
  tags: [String],
  isReimbursable: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

expenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

expenseSchema.index({ employee: 1, createdAt: -1 });
expenseSchema.index({ company: 1, status: 1 });
expenseSchema.index({ date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);

