const mongoose = require('mongoose');
const Company = require('./models/Company');
require('dotenv').config();

async function createTestCompanies() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-management');
    console.log('Connected to MongoDB');

    // Create test companies
    const testCompanies = [
      {
        name: 'Acme Corporation',
        domain: 'acme.com',
        country: 'United States',
        currency: {
          code: 'USD',
          symbol: '$',
          name: 'US Dollar'
        },
        isActive: true
      },
      {
        name: 'Tech Solutions Inc',
        domain: 'techsolutions.com',
        country: 'Canada',
        currency: {
          code: 'CAD',
          symbol: 'C$',
          name: 'Canadian Dollar'
        },
        isActive: true
      },
      {
        name: 'Global Enterprises',
        domain: 'global.com',
        country: 'United Kingdom',
        currency: {
          code: 'GBP',
          symbol: '£',
          name: 'British Pound'
        },
        isActive: true
      },
      {
        name: 'Innovation Labs',
        domain: 'innovation.com',
        country: 'Germany',
        currency: {
          code: 'EUR',
          symbol: '€',
          name: 'Euro'
        },
        isActive: true
      }
    ];

    // Clear existing test companies
    await Company.deleteMany({ domain: { $in: testCompanies.map(c => c.domain) } });
    console.log('Cleared existing test companies');

    // Create new test companies
    for (const companyData of testCompanies) {
      const company = new Company(companyData);
      await company.save();
      console.log(`Created company: ${company.name}`);
    }

    console.log('Test companies created successfully!');
    console.log('You can now test the company search functionality.');

  } catch (error) {
    console.error('Error creating test companies:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestCompanies();
