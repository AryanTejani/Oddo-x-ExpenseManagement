const express = require('express');
const { authenticateToken, requireRole, requireCompany } = require('../middleware/auth');
const Company = require('../models/Company');
const User = require('../models/User');
const axios = require('axios');

const router = express.Router();

// Debug endpoint to list all companies
router.get('/debug/all', async (req, res) => {
  try {
    const companies = await Company.find({ isActive: true })
      .sort({ createdAt: -1 });

    console.log('📋 All companies in database:', companies.length);
    companies.forEach(company => {
      console.log(`  - ${company.name} (${company.country}) - ${company.currency?.code} - Created: ${company.createdAt}`);
    });

    res.json({
      total: companies.length,
      companies: companies.map(company => ({
        id: company._id,
        name: company.name,
        country: company.country,
        currency: company.currency,
        createdAt: company.createdAt,
        isActive: company.isActive
      }))
    });
  } catch (error) {
    console.error('❌ Debug companies error:', error);
    res.status(500).json({ message: 'Failed to get companies' });
  }
});

// Search companies (public endpoint for registration)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    console.log('🔍 Company search query:', q);
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const companies = await Company.find({
      isActive: true,
      name: { $regex: q, $options: 'i' }
    })
    .limit(10)
    .sort({ name: 1 });

    console.log('📋 Found companies:', companies.length);
    companies.forEach(company => {
      console.log(`  - ${company.name} (${company.country}) - ${company.currency?.code}`);
    });

    res.json(companies);
  } catch (error) {
    console.error('❌ Search companies error:', error);
    res.status(500).json({ message: 'Failed to search companies' });
  }
});

// Get company details
router.get('/:companyId', authenticateToken, requireCompany, async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ message: 'Failed to get company details' });
  }
});

// Update company settings
router.put('/:companyId', authenticateToken, requireRole('admin'), requireCompany, async (req, res) => {
  try {
    const { name, settings, currency } = req.body;
    
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    if (name) company.name = name;
    if (settings) company.settings = { ...company.settings, ...settings };
    if (currency) company.currency = { ...company.currency, ...currency };

    await company.save();

    res.json({ message: 'Company updated successfully', company });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Failed to update company' });
  }
});

// Get company users
router.get('/:companyId/users', authenticateToken, requireCompany, async (req, res) => {
  try {
    const { role, department, isActive } = req.query;
    const query = { company: req.params.companyId };

    if (role) query.role = role;
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .populate('manager', 'firstName lastName email')
      .select('-googleId')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Get company users error:', error);
    res.status(500).json({ message: 'Failed to get company users' });
  }
});

// Get company statistics
router.get('/:companyId/stats', authenticateToken, requireCompany, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ 
      company: req.params.companyId,
      isActive: true 
    });
    
    const usersByRole = await User.aggregate([
      { $match: { company: req.params.companyId, isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const usersByDepartment = await User.aggregate([
      { $match: { company: req.params.companyId, isActive: true, department: { $exists: true } } },
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    res.json({
      totalUsers,
      usersByRole,
      usersByDepartment
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({ message: 'Failed to get company statistics' });
  }
});

// Get countries and currencies
router.get('/data/countries', async (req, res) => {
  try {
    console.log('🌍 Fetching countries from REST Countries API...');
    const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,currencies');
    const countries = response.data.map(country => ({
      name: country.name.common,
      code: country.cca2,
      currencies: Object.keys(country.currencies || {}).map(code => ({
        code,
        name: country.currencies[code].name,
        symbol: country.currencies[code].symbol
      }))
    }));

    console.log(`✅ Loaded ${countries.length} countries`);
    res.json(countries);
  } catch (error) {
    console.error('❌ Get countries error:', error);
    res.status(500).json({ message: 'Failed to fetch countries data' });
  }
});

// Get exchange rates
router.get('/data/exchange-rates/:baseCurrency', async (req, res) => {
  try {
    const { baseCurrency } = req.params;
    console.log(`💱 Fetching exchange rates for ${baseCurrency}...`);
    
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    
    console.log(`✅ Loaded exchange rates for ${baseCurrency}`);
    res.json({
      base: response.data.base,
      date: response.data.date,
      rates: response.data.rates
    });
  } catch (error) {
    console.error('❌ Get exchange rates error:', error);
    res.status(500).json({ message: 'Failed to fetch exchange rates' });
  }
});

// Convert currency (proxy endpoint)
router.post('/data/convert-currency', async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;
    console.log(`💱 Converting ${amount} ${fromCurrency} to ${toCurrency}...`);
    
    if (fromCurrency === toCurrency) {
      return res.json({
        amount: parseFloat(amount),
        convertedAmount: parseFloat(amount),
        fromCurrency,
        toCurrency,
        rate: 1
      });
    }
    
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    const rate = response.data.rates[toCurrency];
    
    if (!rate) {
      return res.status(400).json({ message: `Exchange rate not available for ${fromCurrency} to ${toCurrency}` });
    }
    
    const convertedAmount = (parseFloat(amount) * rate).toFixed(2);
    
    console.log(`✅ Converted ${amount} ${fromCurrency} = ${convertedAmount} ${toCurrency}`);
    res.json({
      amount: parseFloat(amount),
      convertedAmount: parseFloat(convertedAmount),
      fromCurrency,
      toCurrency,
      rate: rate
    });
  } catch (error) {
    console.error('❌ Currency conversion error:', error);
    res.status(500).json({ message: 'Failed to convert currency' });
  }
});

module.exports = router;

