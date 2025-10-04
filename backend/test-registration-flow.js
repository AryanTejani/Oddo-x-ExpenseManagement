const mongoose = require('mongoose');
const Company = require('./models/Company');
const User = require('./models/User');
const Currency = require('./models/Currency');
require('dotenv').config();

async function testRegistrationFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-management');
    console.log('✅ Connected to MongoDB');

    // Clear test data
    await Company.deleteMany({ domain: { $in: ['test.com', 'example.com'] } });
    await User.deleteMany({ email: { $in: ['test@test.com', 'test2@example.com'] } });
    console.log('🧹 Cleared test data');

    // Test 1: Create a company manually
    console.log('\n📝 Test 1: Creating company manually...');
    
    // Create or find currency
    let currency = await Currency.findOne({ code: 'USD' });
    if (!currency) {
      currency = new Currency({
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        country: 'United States'
      });
      await currency.save();
      console.log('✅ Currency created:', currency.code);
    } else {
      console.log('✅ Currency found:', currency.code);
    }

    // Create company
    const company = new Company({
      name: 'Test Company Inc',
      domain: 'test.com',
      country: 'United States',
      currency: {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar'
      },
      isActive: true
    });
    await company.save();
    console.log('✅ Company created:', company.name);

    // Verify company
    console.log('📋 Company details:', {
      id: company._id,
      name: company.name,
      country: company.country,
      currency: company.currency.code,
      isActive: company.isActive
    });

    // Test 2: Search for the company
    console.log('\n🔍 Test 2: Searching for company...');
    const searchResults = await Company.find({
      isActive: true,
      name: { $regex: 'Test', $options: 'i' }
    });
    
    console.log('📋 Search results:', searchResults.length);
    searchResults.forEach(comp => {
      console.log(`  - ${comp.name} (${comp.country}) - ${comp.currency?.code}`);
    });

    // Test 3: Create a user for the company
    console.log('\n👤 Test 3: Creating user for company...');
    const user = new User({
      googleId: 'test123',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      company: company._id,
      role: 'admin',
      isActive: true
    });
    await user.save();
    console.log('✅ User created:', user.email);

    // Test 4: Verify company appears in search
    console.log('\n🔍 Test 4: Testing company search API...');
    const searchQuery = 'Test';
    const searchResults2 = await Company.find({
      isActive: true,
      name: { $regex: searchQuery, $options: 'i' }
    }).limit(10).sort({ name: 1 });
    
    console.log(`📋 Search for "${searchQuery}" returned:`, searchResults2.length);
    searchResults2.forEach(comp => {
      console.log(`  - ${comp.name} (${comp.country}) - ${comp.currency?.code}`);
    });

    // Test 5: List all companies
    console.log('\n📋 Test 5: All companies in database...');
    const allCompanies = await Company.find({ isActive: true })
      .sort({ createdAt: -1 });
    
    console.log(`📊 Total companies: ${allCompanies.length}`);
    allCompanies.forEach(comp => {
      console.log(`  - ${comp.name} (${comp.country}) - ${comp.currency?.code} - Created: ${comp.createdAt}`);
    });

    console.log('\n✅ All tests completed successfully!');
    console.log('\n🚀 You can now test the registration flow:');
    console.log('1. Go to http://localhost:5173');
    console.log('2. Login with Google');
    console.log('3. Try searching for "Test" in company search');
    console.log('4. Or create a new company');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testRegistrationFlow();
