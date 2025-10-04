// Quick test script to check environment variables
require('dotenv').config();

console.log('🔍 Environment Check:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Missing');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Fallback Set' : '❌ Missing');

// Test JWT creation
const jwt = require('jsonwebtoken');

if (process.env.JWT_SECRET) {
  try {
    const token = jwt.sign({ test: 'data' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('✅ JWT creation test passed');
  } catch (error) {
    console.log('❌ JWT creation failed:', error.message);
  }
} else {
  console.log('❌ Cannot test JWT without secret');
}
