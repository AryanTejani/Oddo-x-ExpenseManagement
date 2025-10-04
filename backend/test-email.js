// test-email.js
// Run this file to test your email configuration

require('dotenv').config();

console.log('🔍 Checking environment variables...\n');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Missing');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'Not set');
console.log('\n');

const emailService = require('./services/emailService');

async function testEmail() {
  console.log('📧 Testing email service...\n');

  // Test 1: Verify connection
  console.log('Test 1: Verifying Gmail connection...');
  const isConnected = await emailService.verifyConnection();
  
  if (!isConnected) {
    console.log('\n❌ Connection test failed. Please check your credentials.\n');
    process.exit(1);
  }

  console.log('\n✅ Connection test passed!\n');

  // Test 2: Send a test email
  console.log('Test 2: Sending test email to yourself...');
  const result = await emailService.sendEmail({
    to: process.env.EMAIL_USER,
    subject: 'Test Email - Expense Manager',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Email Service Test ✓</h2>
        <p>Congratulations! Your email service is working correctly.</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Email User: ${process.env.EMAIL_USER}</li>
          <li>Service: Gmail</li>
          <li>Status: Active</li>
        </ul>
        <p>You can now send emails from your Expense Manager application.</p>
      </div>
    `,
    text: 'Email Service Test - Your email service is working correctly!'
  });

  if (result.success) {
    console.log('\n✅ Test email sent successfully!');
    console.log('📬 Check your inbox:', process.env.EMAIL_USER);
    console.log('📝 Message ID:', result.messageId);
  } else {
    console.log('\n❌ Test email failed:', result.error);
  }

  console.log('\n🎉 Email service test complete!\n');
}

testEmail().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});