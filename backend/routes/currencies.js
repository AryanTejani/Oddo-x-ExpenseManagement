const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Currency = require('../models/Currency');
const externalApiService = require('../services/externalApiService');

const router = express.Router();

// Get all currencies
router.get('/', authenticateToken, async (req, res) => {
  try {
    const currencies = await Currency.find({ isActive: true })
      .sort({ code: 1 });

    res.json(currencies);
  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({ message: 'Failed to get currencies' });
  }
});

// Get exchange rates for a base currency
router.get('/rates/:baseCurrency', authenticateToken, async (req, res) => {
  try {
    const { baseCurrency } = req.params;
    const rates = await externalApiService.getExchangeRates(baseCurrency);
    res.json(rates);
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({ message: 'Failed to get exchange rates' });
  }
});

// Convert amount between currencies
router.post('/convert', authenticateToken, async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({ 
        message: 'Amount, fromCurrency, and toCurrency are required' 
      });
    }

    const result = await externalApiService.convertCurrency(amount, fromCurrency, toCurrency);
    res.json(result);
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({ message: 'Failed to convert currency' });
  }
});

// Get countries and their currencies
router.get('/countries', authenticateToken, async (req, res) => {
  try {
    const countries = await externalApiService.getCountries(); 
    res.json(countries);
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ message: 'Failed to fetch countries data' });
  }
});

// Update currency rates (Admin only)
router.post('/update-rates', authenticateToken, async (req, res) => {
  try {
    const { baseCurrency = 'USD' } = req.body;
    const result = await externalApiService.updateCurrencyRates(baseCurrency);
    
    if (result.success) {
      res.json({
        message: 'Currency rates updated successfully',
        base: baseCurrency,
        ratesCount: result.updated,
        lastUpdated: new Date()
      });
    } else {
      res.status(500).json({ message: result.error });
    }
  } catch (error) {
    console.error('Update currency rates error:', error);
    res.status(500).json({ message: 'Failed to update currency rates' });
  }
});

// Get currency statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalCurrencies = await Currency.countDocuments({ isActive: true });
    
    const currenciesWithRates = await Currency.aggregate([
      { $match: { isActive: true } },
      { $project: { 
        code: 1, 
        name: 1, 
        ratesCount: { $size: '$exchangeRates' },
        lastUpdated: 1
      }},
      { $sort: { lastUpdated: -1 } }
    ]);

    res.json({
      totalCurrencies,
      currenciesWithRates
    });
  } catch (error) {
    console.error('Get currency stats error:', error);
    res.status(500).json({ message: 'Failed to get currency statistics' });
  }
});

module.exports = router;

