const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  country: {
    type: String,
    required: true
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
  settings: {
    approvalWorkflow: {
      type: String,
      enum: ['simple', 'multi-level', 'custom'],
      default: 'simple'
    },
    autoApprovalThreshold: {
      type: Number,
      default: 0
    },
    requireReceipt: {
      type: Boolean,
      default: true
    },
    maxExpenseAmount: {
      type: Number,
      default: 10000
    }
  },
  isActive: {
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

companySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Company', companySchema);

