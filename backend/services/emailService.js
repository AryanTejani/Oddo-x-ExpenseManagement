const nodemailer = require('nodemailer');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Validate required Gmail credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ GMAIL CREDENTIALS MISSING!');
      console.error('   Please set the following environment variables:');
      console.error('   EMAIL_USER=your-email@gmail.com');
      console.error('   EMAIL_PASSWORD=your-app-password');
      console.error('\n🔧 How to get an App Password:');
      console.error('   1. Go to https://myaccount.google.com/security');
      console.error('   2. Enable 2-Step Verification if not already enabled');
      console.error('   3. Go to https://myaccount.google.com/apppasswords');
      console.error('   4. Generate an App Password for "Mail"');
      console.error('   5. Use that 16-character password in EMAIL_PASSWORD\n');
      return;
    }

    // Check if using OAuth2 (optional, more secure)
    if (process.env.EMAIL_OAUTH_CLIENT_ID && 
        process.env.EMAIL_OAUTH_CLIENT_SECRET && 
        process.env.EMAIL_OAUTH_REFRESH_TOKEN) {
      console.log('📧 Using Gmail with OAuth2 for:', process.env.EMAIL_USER);
      this.setupGmailOAuth2();
    } else {
      console.log('📧 Using Gmail with App Password for:', process.env.EMAIL_USER);
      this.setupGmailAppPassword();
    }

    this.isConfigured = true;
  }

  setupGmailAppPassword() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // This MUST be an App Password
      }
    });
  }

  setupGmailOAuth2() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.EMAIL_OAUTH_CLIENT_ID,
        clientSecret: process.env.EMAIL_OAUTH_CLIENT_SECRET,
        refreshToken: process.env.EMAIL_OAUTH_REFRESH_TOKEN
      }
    });
  }

  async verifyConnection() {
    if (!this.isConfigured) {
      console.error('❌ Email service is not configured. Please check your environment variables.');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Gmail connection verified successfully!');
      return true;
    } catch (error) {
      console.error('❌ Gmail connection failed:', error.message);
      
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        console.error('\n🔧 AUTHENTICATION FAILED - Common issues:');
        console.error('   ❌ Using regular Gmail password instead of App Password');
        console.error('   ❌ 2-Factor Authentication not enabled');
        console.error('   ❌ App Password not generated correctly');
        console.error('\n✅ Solution:');
        console.error('   1. Enable 2FA: https://myaccount.google.com/security');
        console.error('   2. Generate App Password: https://myaccount.google.com/apppasswords');
        console.error('   3. Update EMAIL_PASSWORD with the 16-character App Password\n');
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        console.error('🌐 Network issue. Check your internet connection.');
      }
      
      return false;
    }
  }

  async sendEmail({ to, subject, html, text, attachments = [] }) {
    if (!this.isConfigured) {
      const error = 'Email service is not configured. Please set EMAIL_USER and EMAIL_PASSWORD.';
      console.error('❌', error);
      return { success: false, error };
    }

    try {
      const mailOptions = {
        from: `"Expense Manager" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully to:', to);
      console.log('   Message ID:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      
      // Handle specific error types
      if (error.code === 'EAUTH' || error.responseCode === 535) {
        console.error('🔧 Authentication failed. Please verify your App Password.');
      } else if (error.responseCode === 550) {
        console.error('📧 Invalid recipient email address:', to);
      } else if (error.responseCode === 552 || error.responseCode === 552) {
        console.error('📦 Message too large. Consider reducing attachment sizes.');
      } else if (error.responseCode === 421 || error.responseCode === 450) {
        console.error('⏱️  Temporary server issue. Try again in a few minutes.');
      } else if (error.responseCode === 454) {
        console.error('🔐 TLS/SSL issue. Check your connection security.');
      }
      
      return { success: false, error: error.message, code: error.code };
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
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
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
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
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
          <h2 style="color: #4caf50;">Expense Approved ✓</h2>
          <p>Your expense has been approved by ${approver.firstName} ${approver.lastName}.</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <p><strong>Description:</strong> ${expense.description}</p>
            <p><strong>Amount:</strong> ${expense.currency.symbol}${expense.amount} ${expense.currency.code}</p>
            <p><strong>Category:</strong> ${expense.category}</p>
            <p><strong>Approved Amount:</strong> ${expense.currency.symbol}${expense.totalApprovedAmount} ${expense.currency.code}</p>
          </div>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/expenses" 
               style="background-color: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Expenses
            </a>
          </div>
          <p>Thank you for using our expense management system.</p>
        </div>
      `,
      text: `
Expense Approved ✓

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
            <p style="color: #f44336;"><strong>Rejection Reason:</strong> ${reason}</p>
          </div>
          <div style="margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/expenses" 
               style="background-color: #f44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
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
               style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}
          </p>
        </div>
      `,
      text: `
Password Reset Request

Hello ${user.firstName},

You have requested to reset your password for the Expense Management System.

Reset your password at: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}

This link will expire in 1 hour for security reasons.

If you didn't request this reset, please ignore this email and your password will remain unchanged.
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