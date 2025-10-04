const mongoose = require('mongoose');

const approvalWorkflowSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  rules: [{
    condition: {
      type: String,
      enum: ['amount_threshold', 'category', 'department', 'employee_level'],
      required: true
    },
    value: mongoose.Schema.Types.Mixed,
    approvers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    level: {
      type: Number,
      required: true
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    isManagerApprover: {
      type: Boolean,
      default: false
    }
  }],
  defaultApprovers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Conditional approval rules (Percentage, Specific Approver, Hybrid)
  conditionalRules: [{
    name: String,
    type: {
      type: String,
      enum: ['percentage', 'specific_approver', 'hybrid'],
      required: true
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    specificApprovers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    autoApprove: {
      type: Boolean,
      default: false
    },
    conditions: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'greater_than', 'less_than', 'contains']
      },
      value: mongoose.Schema.Types.Mixed
    }]
  }],
  // Multi-level approval sequence (Step 1: Manager → Step 2: Finance → Step 3: Director)
  approvalSequence: [{
    step: {
      type: Number,
      required: true
    },
    name: String,
    approvers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    isManagerApprover: {
      type: Boolean,
      default: false
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    conditions: [{
      field: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed
    }]
  }],
  escalationSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    escalationTime: {
      type: Number, // hours
      default: 48
    },
    escalationApprovers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
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

approvalWorkflowSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);

