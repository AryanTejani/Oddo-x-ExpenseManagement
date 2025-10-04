const emailService = require('./services/emailService');
require('dotenv').config();

async function testEmailService() {
  console.log('Testing Email Service...\n');

  try {
    // Test basic email sending
    console.log('1. Testing basic email sending...');
    const result = await emailService.sendEmail({
      to: process.env.TEST_EMAIL || 'test@example.com',
      subject: 'Test Email from Expense Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Email Service Test</h2>
          <p>This is a test email to verify the email service is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p>If you receive this email, the email service is configured properly!</p>
        </div>
      `,
      text: `
        Email Service Test
        
        This is a test email to verify the email service is working correctly.
        
        Timestamp: ${new Date().toLocaleString()}
        Environment: ${process.env.NODE_ENV || 'development'}
        
        If you receive this email, the email service is configured properly!
      `
    });

    if (result.success) {
      console.log('✅ Basic email test passed');
      console.log(`   Message ID: ${result.messageId}`);
    } else {
      console.log('❌ Basic email test failed');
      console.log(`   Error: ${result.error}`);
    }

    // Test welcome email template
    console.log('\n2. Testing welcome email template...');
    const mockUser = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: 'employee'
    };

    const mockCompany = {
      name: 'Test Company',
      currency: { code: 'USD', name: 'US Dollar' }
    };

    const welcomeResult = await emailService.sendWelcomeEmail(mockUser, mockCompany);
    
    if (welcomeResult.success) {
      console.log('✅ Welcome email template test passed');
    } else {
      console.log('❌ Welcome email template test failed');
      console.log(`   Error: ${welcomeResult.error}`);
    }

    // Test expense notification template
    console.log('\n3. Testing expense notification template...');
    const mockExpense = {
      description: 'Test Business Lunch',
      amount: 45.50,
      currency: { code: 'USD', symbol: '$' },
      category: 'meals',
      date: new Date()
    };

    const mockEmployee = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com'
    };

    const mockApprover = {
      firstName: 'Manager',
      lastName: 'User',
      email: 'manager@example.com'
    };

    const expenseResult = await emailService.sendExpenseSubmittedEmail(mockExpense, mockEmployee, [mockApprover]);
    
    if (expenseResult.length > 0 && expenseResult[0].result.success) {
      console.log('✅ Expense notification template test passed');
    } else {
      console.log('❌ Expense notification template test failed');
    }

    console.log('\n🎉 Email service testing completed!');
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📧 Development Mode:');
      console.log('   - Check console for Ethereal Email preview URLs');
      console.log('   - Emails are sent to test accounts only');
      console.log('   - No real emails are delivered in development');
    }

  } catch (error) {
    console.error('❌ Email service test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your environment variables');
    console.log('   2. Verify email service configuration');
    console.log('   3. Check network connectivity');
    console.log('   4. Review the EMAIL_SETUP.md guide');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEmailService().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = testEmailService;

