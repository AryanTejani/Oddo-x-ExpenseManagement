// Environment Configuration Example
// Copy this to .env and fill in your actual values

module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-management',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret-key-here',

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',

  // Cloudinary Configuration (for receipt uploads and OCR)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloudinary-cloud-name',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || 'your-cloudinary-api-key',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || 'your-cloudinary-api-secret',

  // Email Configuration (Simple Gmail Setup)
  EMAIL_USER: process.env.EMAIL_USER || 'your-email@gmail.com',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || 'your-app-password',
  
  // Development Email (Ethereal Email for testing)
  ETHEREAL_USER: process.env.ETHEREAL_USER || 'ethereal.user@ethereal.email',
  ETHEREAL_PASS: process.env.ETHEREAL_PASS || 'ethereal.pass',

  // External APIs
  RESTCOUNTRIES_API_URL: process.env.RESTCOUNTRIES_API_URL || 'https://restcountries.com/v3.1/all',
  EXCHANGERATE_API_URL: process.env.EXCHANGERATE_API_URL || 'https://api.exchangerate-api.com/v4/latest'
};
