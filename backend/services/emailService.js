const nodemailer = require('nodemailer');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Create transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production email service (e.g., SendGrid, Mailgun, etc.)
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } else {
      // Development - use Ethereal Email for testing
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'ethereal.pass'
        }
      });
    }
  }

  async sendEmail({ to, subject, html, text, attachments = [] }) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@expensemanager.com',
        to,
        subject,
        html,
        text,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // In development, log the preview URL for Ethereal emails
      if (process.env.NODE_ENV !== 'production') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Email templates
  getWelcomeEmailTemplate(user, company) {
    return {
      subject: `Welcome to ${company.name} Expense Management System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Welcome to Expense Manager!</h2>
          <p>Hello ${user.firstName} ${user.lastName},</p>
          <p>Welcome to ${company.name}'s expense management system. Your account has been created successfully.</p>
          <p><strong>Your Role:</strong> ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
          <p><strong>Company:</strong> ${company.name}</p>
          <p><strong>Default Currency:</strong> ${company.currency.code}</p>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Access Dashboard
            </a>
          </div>
          <p>If you have any questions, please contact your administrator.</p>
          <p>Best regards,<br>Expense Management Team</p>
        </div>
      `,
      text: `
        Welcome to Expense Manager!
        
        Hello ${user.firstName} ${user.lastName},
        
        Welcome to ${company.name}'s expense management system. Your account has been created successfully.
        
        Your Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        Company: ${company.name}
        Default Currency: ${company.currency.code}
        
        Access your dashboard at: ${process.env.FRONTEND_URL}/dashboard
        
        If you have any questions, please contact your administrator.
        
        Best regards,
        Expense Management Team
      `
    };
  }

  getExpenseSubmittedTemplate(expense, employee) {
    return {
      subject: `New Expense Submitted - ${expense.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">New Expense Submitted</h2>
          <p>A new expense has been submitted and requires your approval.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <p><strong>Employee:</strong> ${employee.firstName} ${employee.lastName}</p>
            <p><strong>Description:</strong> ${expense.description}</p>
            <p><strong>Amount:</strong> ${expense.currency.symbol}${expense.amount} ${expense.currency.code}</p>
            <p><strong>Category:</strong> ${expense.category}</p>
            <p><strong>Date:</strong> ${new Date(expense.date).toLocaleDateString()}</p>
          </div>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/approvals" 
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Review Expense
            </a>
          </div>
          <p>Please review and approve or reject this expense.</p>
        </div>
      `,
      text: `
        New Expense Submitted
        
        A new expense has been submitted and requires your approval.
        
        Employee: ${employee.firstName} ${employee.lastName}
        Description: ${expense.description}
        Amount: ${expense.currency.symbol}${expense.amount} ${expense.currency.code}
        Category: ${expense.category}
        Date: ${new Date(expense.date).toLocaleDateString()}
        
        Review this expense at: ${process.env.FRONTEND_URL}/approvals
        
        Please review and approve or reject this expense.
      `
    };
  }

  getExpenseApprovedTemplate(expense, approver) {
    return {
      subject: `Expense Approved - ${expense.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4caf50;">Expense Approved</h2>
          <p>Your expense has been approved by ${approver.firstName} ${approver.lastName}.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <p><strong>Description:</strong> ${expense.description}</p>
            <p><strong>Amount:</strong> ${expense.currency.symbol}${expense.amount} ${expense.currency.code}</p>
            <p><strong>Category:</strong> ${expense.category}</p>
            <p><strong>Approved Amount:</strong> ${expense.currency.symbol}${expense.totalApprovedAmount} ${expense.currency.code}</p>
          </div>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/expenses" 
               style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              View Expenses
            </a>
          </div>
          <p>Thank you for using our expense management system.</p>
        </div>
      `,
      text: `
        Expense Approved
        
        Your expense has been approved by ${approver.firstName} ${approver.lastName}.
        
        Description: ${expense.description}
        Amount: ${expense.currency.symbol}${expense.amount} ${expense.currency.code}
        Category: ${expense.category}
        Approved Amount: ${expense.currency.symbol}${expense.totalApprovedAmount} ${expense.currency.code}
        
        View your expenses at: ${process.env.FRONTEND_URL}/expenses
        
        Thank you for using our expense management system.
      `
    };
  }

  getExpenseRejectedTemplate(expense, approver, reason) {
    return {
      subject: `Expense Rejected - ${expense.description}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">Expense Rejected</h2>
          <p>Your expense has been rejected by ${approver.firstName} ${approver.lastName}.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <p><strong>Description:</strong> ${expense.description}</p>
            <p><strong>Amount:</strong> ${expense.currency.symbol}${expense.amount} ${expense.currency.code}</p>
            <p><strong>Category:</strong> ${expense.category}</p>
            <p><strong>Rejection Reason:</strong> ${reason}</p>
          </div>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/expenses" 
               style="background-color: #f44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              View Expenses
            </a>
          </div>
          <p>Please review the rejection reason and submit a new expense if needed.</p>
        </div>
      `,
      text: `
        Expense Rejected
        
        Your expense has been rejected by ${approver.firstName} ${approver.lastName}.
        
        Description: ${expense.description}
        Amount: ${expense.currency.symbol}${expense.amount} ${expense.currency.code}
        Category: ${expense.category}
        Rejection Reason: ${reason}
        
        View your expenses at: ${process.env.FRONTEND_URL}/expenses
        
        Please review the rejection reason and submit a new expense if needed.
      `
    };
  }

  getPasswordResetTemplate(user, resetToken) {
    return {
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Password Reset Request</h2>
          <p>Hello ${user.firstName},</p>
          <p>You have requested to reset your password for the Expense Management System.</p>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hello ${user.firstName},
        
        You have requested to reset your password for the Expense Management System.
        
        Reset your password at: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}
        
        This link will expire in 1 hour for security reasons.
        
        If you didn't request this reset, please ignore this email.
      `
    };
  }

  // Send welcome email to new user
  async sendWelcomeEmail(user, company) {
    const template = this.getWelcomeEmailTemplate(user, company);
    return await this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send expense submitted notification
  async sendExpenseSubmittedEmail(expense, employee, approvers) {
    const template = this.getExpenseSubmittedTemplate(expense, employee);
    const results = [];
    
    for (const approver of approvers) {
      const result = await this.sendEmail({
        to: approver.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
      results.push({ approver: approver.email, result });
    }
    
    return results;
  }

  // Send expense approved notification
  async sendExpenseApprovedEmail(expense, approver) {
    const template = this.getExpenseApprovedTemplate(expense, approver);
    return await this.sendEmail({
      to: expense.employee.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send expense rejected notification
  async sendExpenseRejectedEmail(expense, approver, reason) {
    const template = this.getExpenseRejectedTemplate(expense, approver, reason);
    return await this.sendEmail({
      to: expense.employee.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const template = this.getPasswordResetTemplate(user, resetToken);
    return await this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send bulk notification
  async sendBulkNotification(recipients, subject, message) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendEmail({
        to: recipient.email,
        subject,
        html: message,
        text: message.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
      });
      results.push({ recipient: recipient.email, result });
    }
    
    return results;
  }
}

module.exports = new EmailService();
