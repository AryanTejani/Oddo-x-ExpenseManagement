const ApprovalWorkflow = require('../models/ApprovalWorkflow');
const User = require('../models/User');
const Expense = require('../models/Expense');
const emailService = require('./emailService');

class ApprovalWorkflowService {
  async createWorkflow(companyId, workflowData) {
    try {
      const workflow = new ApprovalWorkflow({
        company: companyId,
        ...workflowData
      });

      await workflow.save();
      return { success: true, workflow };
    } catch (error) {
      console.error('Create workflow error:', error);
      return { success: false, error: error.message };
    }
  }

  async getWorkflowForExpense(expense) {
    try {
      // Find applicable workflow based on expense criteria
      const workflows = await ApprovalWorkflow.find({
        company: expense.company,
        isActive: true
      });

      for (const workflow of workflows) {
        if (await this.isWorkflowApplicable(workflow, expense)) {
          return workflow;
        }
      }

      // Return default workflow if no specific one found
      return await this.getDefaultWorkflow(expense.company);
    } catch (error) {
      console.error('Get workflow error:', error);
      return null;
    }
  }

  async isWorkflowApplicable(workflow, expense) {
    try {
      for (const rule of workflow.rules) {
        switch (rule.condition) {
          case 'amount_threshold':
            if (expense.amount >= rule.value) {
              return true;
            }
            break;
          case 'category':
            if (expense.category === rule.value) {
              return true;
            }
            break;
          case 'department':
            if (expense.employee.department === rule.value) {
              return true;
            }
            break;
          case 'employee_level':
            if (expense.employee.role === rule.value) {
              return true;
            }
            break;
        }
      }
      return false;
    } catch (error) {
      console.error('Check workflow applicability error:', error);
      return false;
    }
  }

  async getDefaultWorkflow(companyId) {
    try {
      let workflow = await ApprovalWorkflow.findOne({
        company: companyId,
        isActive: true,
        name: 'Default Workflow'
      });

      if (!workflow) {
        // Create default workflow
        workflow = new ApprovalWorkflow({
          company: companyId,
          name: 'Default Workflow',
          description: 'Default approval workflow for all expenses',
          rules: [{
            condition: 'amount_threshold',
            value: 0,
            approvers: [],
            level: 1,
            isRequired: true
          }],
          defaultApprovers: [],
          escalationSettings: {
            enabled: false,
            escalationTime: 48,
            escalationApprovers: []
          }
        });

        await workflow.save();
      }

      return workflow;
    } catch (error) {
      console.error('Get default workflow error:', error);
      return null;
    }
  }

  async setupApprovalChain(expense, selectedWorkflowId = null) {
    try {
      let workflow;
      
      if (selectedWorkflowId) {
        // Use the workflow explicitly selected by employee
        console.log('🔍 Using selected workflow:', selectedWorkflowId);
        workflow = await ApprovalWorkflow.findOne({
          _id: selectedWorkflowId,
          company: expense.company,
          isActive: true
        });
        
        if (!workflow) {
          throw new Error('Selected workflow not found or inactive');
        }
      } else {
        // Auto-select workflow based on expense criteria
        workflow = await this.getWorkflowForExpense(expense);
      }
      
      if (!workflow) {
        throw new Error('No workflow found for expense');
      }

      console.log('✅ Using workflow:', workflow.name, 'with steps:', workflow.approvalSequence?.length || 0);
      console.log('🔍 Workflow details:', {
        workflowId: workflow._id,
        workflowName: workflow.name,
        approvalSequence: workflow.approvalSequence,
        rules: workflow.rules,
        defaultApprovers: workflow.defaultApprovers
      });

      const approvalChain = [];

      // Use approval sequence if available (Odoo-style multi-level)
      if (workflow.approvalSequence && workflow.approvalSequence.length > 0) {
        console.log('🔄 Using approval sequence workflow');
        for (const sequenceStep of workflow.approvalSequence.sort((a, b) => a.step - b.step)) {
          console.log(`📋 Processing step ${sequenceStep.step}: ${sequenceStep.name}`);
          const approvers = await this.getApproversForSequenceStep(sequenceStep, expense);
          console.log(`👥 Found ${approvers.length} approvers for step ${sequenceStep.step}`);
          
          for (const approver of approvers) {
            approvalChain.push({
              approver: approver._id,
              level: sequenceStep.step,
              stepName: sequenceStep.name,
              status: 'pending',
              isRequired: sequenceStep.isRequired,
              isManagerApprover: sequenceStep.isManagerApprover,
              rule: 'approval_sequence'
            });
          }
        }
      } else {
        // Fallback to old rules-based system
        const processedLevels = new Set();

        for (const rule of workflow.rules) {
          if (await this.isWorkflowApplicable(workflow, expense)) {
            const approvers = await this.getApproversForRule(rule, expense);
            
            if (!processedLevels.has(rule.level)) {
              approvalChain.push({
                approver: approvers[0]._id,
                level: rule.level,
                status: 'pending',
                isRequired: rule.isRequired,
                isManagerApprover: rule.isManagerApprover,
                rule: rule.condition
              });
              processedLevels.add(rule.level);
            }
          }
        }

        // Add default approvers if no specific rules matched
        if (approvalChain.length === 0 && workflow.defaultApprovers.length > 0) {
          const defaultApprovers = await User.find({
            _id: { $in: workflow.defaultApprovers },
            company: expense.company,
            isActive: true
          });

          for (let i = 0; i < defaultApprovers.length; i++) {
            approvalChain.push({
              approver: defaultApprovers[i]._id,
              level: i + 1,
              status: 'pending',
              isRequired: true,
              isManagerApprover: false
            });
          }
        }
      }

      // Sort by level
      approvalChain.sort((a, b) => a.level - b.level);

      console.log('🔗 Final approval chain:', approvalChain.map(a => ({
        approver: a.approver.toString(),
        level: a.level,
        stepName: a.stepName,
        status: a.status,
        isRequired: a.isRequired
      })));

      return approvalChain;
    } catch (error) {
      console.error('Setup approval chain error:', error);
      return [];
    }
  }

  async getApproversForRule(rule, expense) {
    try {
      const approvers = [];

      // Get specific approvers from rule
      if (rule.approvers && rule.approvers.length > 0) {
        const users = await User.find({
          _id: { $in: rule.approvers },
          company: expense.company,
          isActive: true
        });
        approvers.push(...users);
      }

      // Add manager if no specific approvers
      if (approvers.length === 0 && expense.employee.manager) {
        const manager = await User.findById(expense.employee.manager);
        if (manager && manager.isActive) {
          approvers.push(manager);
        }
      }

      // Add admin as fallback
      if (approvers.length === 0) {
        const admins = await User.find({
          company: expense.company,
          role: 'admin',
          isActive: true
        });
        approvers.push(...admins);
      }

      return approvers;
    } catch (error) {
      console.error('Get approvers error:', error);
      return [];
    }
  }

  async getApproversForSequenceStep(sequenceStep, expense) {
    try {
      console.log(`🔍 Getting approvers for step ${sequenceStep.step}: ${sequenceStep.name}`);
      console.log(`   isManagerApprover: ${sequenceStep.isManagerApprover}`);
      console.log(`   specific approvers: ${sequenceStep.approvers?.length || 0}`);
      
      const approvers = [];

      // Get specific approvers from sequence step
      if (sequenceStep.approvers && sequenceStep.approvers.length > 0) {
        const users = await User.find({
          _id: { $in: sequenceStep.approvers },
          company: expense.company,
          isActive: true
        });
        approvers.push(...users);
        console.log(`   Found ${users.length} specific approvers`);
      }

      // If this is a manager approver step, get the employee's manager
      if (sequenceStep.isManagerApprover) {
        console.log(`   Looking for employee's manager...`);
        // Populate the employee to get manager information
        const populatedExpense = await Expense.findById(expense._id)
          .populate('employee', 'manager firstName lastName');
        
        console.log(`   Employee: ${populatedExpense.employee?.firstName} ${populatedExpense.employee?.lastName}`);
        console.log(`   Employee manager ID: ${populatedExpense.employee?.manager}`);
        
        if (populatedExpense.employee && populatedExpense.employee.manager) {
          const manager = await User.findById(populatedExpense.employee.manager);
          if (manager && manager.isActive) {
            approvers.push(manager);
            console.log(`   Found manager: ${manager.firstName} ${manager.lastName}`);
          } else {
            console.log(`   Manager not found or inactive`);
          }
        } else {
          console.log(`   Employee has no manager assigned`);
        }
      }

      // Add admin as fallback if no approvers found
      if (approvers.length === 0) {
        console.log(`   No approvers found, using admin fallback`);
        const admins = await User.find({
          company: expense.company,
          role: 'admin',
          isActive: true
        });
        approvers.push(...admins);
        console.log(`   Found ${admins.length} admin fallbacks`);
      }

      console.log(`   Total approvers for step ${sequenceStep.step}: ${approvers.length}`);
      return approvers;
    } catch (error) {
      console.error('Get sequence step approvers error:', error);
      return [];
    }
  }

  async processApproval(expense, approver, action, comments = '') {
    try {
      const approvalIndex = expense.approvalChain.findIndex(
        approval => approval.approver.toString() === approver._id.toString() && 
                   approval.status === 'pending'
      );

      if (approvalIndex === -1) {
        throw new Error('No pending approval found for this user');
      }

      // Update approval
      expense.approvalChain[approvalIndex].status = action;
      expense.approvalChain[approvalIndex].comments = comments;
      expense.approvalChain[approvalIndex].actionDate = new Date();

      // Check conditional rules for auto-approval
      const workflow = await this.getWorkflowForExpense(expense);
      const shouldAutoApprove = await this.checkConditionalRules(expense, workflow, action);

      if (action === 'rejected') {
        expense.status = 'rejected';
        expense.rejectionReason = comments || 'Rejected by approver';
      } else if (shouldAutoApprove || await this.checkAllRequiredApprovals(expense)) {
        expense.status = 'approved';
        expense.approvedAt = new Date();
        expense.totalApprovedAmount = expense.amount;
      }

      await expense.save();

      // Send notifications
      await this.sendApprovalNotifications(expense, approver, action);

      return { success: true, expense };
    } catch (error) {
      console.error('Process approval error:', error);
      return { success: false, error: error.message };
    }
  }

  async checkConditionalRules(expense, workflow, action) {
    try {
      if (!workflow || !workflow.conditionalRules || workflow.conditionalRules.length === 0) {
        return false;
      }

      for (const rule of workflow.conditionalRules) {
        if (await this.evaluateConditionalRule(rule, expense, action)) {
          return rule.autoApprove;
        }
      }

      return false;
    } catch (error) {
      console.error('Check conditional rules error:', error);
      return false;
    }
  }

  async evaluateConditionalRule(rule, expense, action) {
    try {
      // Check if rule conditions are met
      for (const condition of rule.conditions) {
        if (!await this.evaluateCondition(condition, expense)) {
          return false;
        }
      }

      // Check rule type
      switch (rule.type) {
        case 'percentage':
          return await this.checkPercentageRule(rule, expense);
        case 'specific_approver':
          return await this.checkSpecificApproverRule(rule, expense, action);
        case 'hybrid':
          return await this.checkHybridRule(rule, expense, action);
        default:
          return false;
      }
    } catch (error) {
      console.error('Evaluate conditional rule error:', error);
      return false;
    }
  }

  async checkPercentageRule(rule, expense) {
    try {
      const totalApprovers = expense.approvalChain.length;
      const approvedCount = expense.approvalChain.filter(a => a.status === 'approved').length;
      const percentage = (approvedCount / totalApprovers) * 100;
      
      return percentage >= rule.percentage;
    } catch (error) {
      console.error('Check percentage rule error:', error);
      return false;
    }
  }

  async checkSpecificApproverRule(rule, expense, action) {
    try {
      if (action === 'approved') {
        const approverId = expense.approvalChain.find(a => 
          a.status === 'approved' && 
          rule.specificApprovers.includes(a.approver)
        );
        return !!approverId;
      }
      return false;
    } catch (error) {
      console.error('Check specific approver rule error:', error);
      return false;
    }
  }

  async checkHybridRule(rule, expense, action) {
    try {
      // Check percentage OR specific approver
      const percentageMet = await this.checkPercentageRule(rule, expense);
      const specificApproverMet = await this.checkSpecificApproverRule(rule, expense, action);
      
      return percentageMet || specificApproverMet;
    } catch (error) {
      console.error('Check hybrid rule error:', error);
      return false;
    }
  }

  async evaluateCondition(condition, expense) {
    try {
      const { field, operator, value } = condition;
      let fieldValue;

      switch (field) {
        case 'amount':
          fieldValue = expense.amount;
          break;
        case 'category':
          fieldValue = expense.category;
          break;
        case 'department':
          fieldValue = expense.employee.department;
          break;
        case 'role':
          fieldValue = expense.employee.role;
          break;
        default:
          return false;
      }

      switch (operator) {
        case 'equals':
          return fieldValue === value;
        case 'greater_than':
          return fieldValue > value;
        case 'less_than':
          return fieldValue < value;
        case 'contains':
          return fieldValue && fieldValue.toString().toLowerCase().includes(value.toLowerCase());
        default:
          return false;
      }
    } catch (error) {
      console.error('Evaluate condition error:', error);
      return false;
    }
  }

  async checkAllRequiredApprovals(expense) {
    try {
      const pendingRequiredApprovals = expense.approvalChain.filter(
        approval => approval.status === 'pending' && approval.isRequired
      );

      return pendingRequiredApprovals.length === 0;
    } catch (error) {
      console.error('Check all required approvals error:', error);
      return false;
    }
  }

  async sendApprovalNotifications(expense, approver, action) {
    try {
      const populatedExpense = await Expense.findById(expense._id)
        .populate('employee', 'firstName lastName email');

      if (action === 'approved') {
        // Notify employee
        await emailService.sendExpenseApprovedEmail(populatedExpense, approver);
      } else if (action === 'rejected') {
        // Notify employee
        await emailService.sendExpenseRejectedEmail(populatedExpense, approver, expense.rejectionReason);
      }

      // Notify next approvers if any
      const nextApprovers = expense.approvalChain.filter(
        approval => approval.status === 'pending' && approval.isRequired
      );

      if (nextApprovers.length > 0) {
        const nextApproverUsers = await User.find({
          _id: { $in: nextApprovers.map(a => a.approver) },
          isActive: true
        });

        await emailService.sendExpenseSubmittedEmail(populatedExpense, populatedExpense.employee, nextApproverUsers);
      }
    } catch (error) {
      console.error('Send approval notifications error:', error);
    }
  }

  async checkEscalation(expense) {
    try {
      const workflow = await this.getWorkflowForExpense(expense);
      if (!workflow || !workflow.escalationSettings.enabled) {
        return;
      }

      const escalationTime = workflow.escalationSettings.escalationTime * 60 * 60 * 1000; // Convert to milliseconds
      const now = new Date();

      for (const approval of expense.approvalChain) {
        if (approval.status === 'pending' && approval.isRequired) {
          const timeSinceCreated = now - approval.createdAt;
          
          if (timeSinceCreated >= escalationTime) {
            // Escalate to escalation approvers
            const escalationApprovers = await User.find({
              _id: { $in: workflow.escalationSettings.escalationApprovers },
              company: expense.company,
              isActive: true
            });

            if (escalationApprovers.length > 0) {
              // Add escalation approver to chain
              expense.approvalChain.push({
                approver: escalationApprovers[0]._id,
                level: 999, // High level for escalation
                status: 'pending',
                isRequired: true,
                isEscalation: true
              });

              await expense.save();

              // Notify escalation approver
              const populatedExpense = await Expense.findById(expense._id)
                .populate('employee', 'firstName lastName email');

              await emailService.sendExpenseSubmittedEmail(
                populatedExpense, 
                populatedExpense.employee, 
                escalationApprovers
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Check escalation error:', error);
    }
  }

  async getWorkflowStats(companyId) {
    try {
      const workflows = await ApprovalWorkflow.find({
        company: companyId,
        isActive: true
      });

      const stats = await Promise.all(workflows.map(async (workflow) => {
        const expenses = await Expense.find({
          company: companyId,
          'approvalChain.rule': { $in: workflow.rules.map(r => r.condition) }
        });

        return {
          workflowId: workflow._id,
          workflowName: workflow.name,
          totalExpenses: expenses.length,
          pendingApprovals: expenses.filter(e => e.status === 'submitted').length,
          approvedExpenses: expenses.filter(e => e.status === 'approved').length,
          rejectedExpenses: expenses.filter(e => e.status === 'rejected').length
        };
      }));

      return stats;
    } catch (error) {
      console.error('Get workflow stats error:', error);
      return [];
    }
  }
}

module.exports = new ApprovalWorkflowService();
