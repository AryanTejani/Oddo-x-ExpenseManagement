const mongoose = require('mongoose');
const Currency = require('./models/Currency');
const axios = require('axios');

// Sample data for initial setup
const sampleCurrencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States' },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'European Union' },
  { code: 'GBP', name: 'British Pound', symbol: '£', country: 'United Kingdom' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', country: 'Canada' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', country: 'Australia' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', country: 'Japan' }
];

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-management');
    console.log('Connected to MongoDB');

    // Create sample currencies
    console.log('Creating sample currencies...');
    for (const currency of sampleCurrencies) {
      const existingCurrency = await Currency.findOne({ code: currency.code });
      if (!existingCurrency) {
        const newCurrency = new Currency(currency);
        await newCurrency.save();
        console.log(`Created currency: ${currency.code}`);
      } else {
        console.log(`Currency ${currency.code} already exists`);
      }
    }

    // Fetch and update exchange rates
    console.log('Fetching exchange rates...');
    try {
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
      const rates = response.data.rates;

      for (const currency of sampleCurrencies) {
        if (currency.code !== 'USD') {
          const currencyDoc = await Currency.findOne({ code: currency.code });
          if (currencyDoc) {
            currencyDoc.exchangeRates = Object.entries(rates)
              .filter(([code]) => code !== currency.code)
              .map(([code, rate]) => ({
                toCurrency: code,
                rate: 1 / rate, // Convert from USD to target currency
                lastUpdated: new Date()
              }));
            await currencyDoc.save();
            console.log(`Updated exchange rates for ${currency.code}`);
          }
        }
      }
    } catch (error) {
      console.log('Could not fetch exchange rates:', error.message);
    }

    console.log('Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  require('dotenv').config();
  setupDatabase();
}

module.exports = setupDatabase;

