const axios = require('axios');
const Currency = require('../models/Currency');

class ExternalApiService {
  constructor() {
    this.restCountriesUrl = 'https://restcountries.com/v3.1/all';
    this.exchangeRateUrl = 'https://api.exchangerate-api.com/v4/latest';
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour
  }

  async getCountries() {
    try {
      const cacheKey = 'countries';
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(`${this.restCountriesUrl}?fields=name,currencies,capital,region`);
      const countries = response.data.map(country => ({
        name: country.name.common,
        code: country.cca2,
        capital: country.capital?.[0] || '',
        region: country.region || '',
        currencies: Object.keys(country.currencies || {}).map(code => ({
          code,
          name: country.currencies[code].name,
          symbol: country.currencies[code].symbol
        }))
      }));

      this.setCache(cacheKey, countries);
      return countries;
    } catch (error) {
      console.error('Get countries error:', error);
      return this.getFallbackCountries();
    }
  }

  async getExchangeRates(baseCurrency = 'USD') {
    try {
      const cacheKey = `exchange_rates_${baseCurrency}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(`${this.exchangeRateUrl}/${baseCurrency}`);
      const rates = response.data.rates;

      // Convert to our format
      const exchangeRates = Object.entries(rates).map(([code, rate]) => ({
        toCurrency: code,
        rate,
        lastUpdated: new Date()
      }));

      const result = {
        base: baseCurrency,
        date: response.data.date,
        rates: exchangeRates,
        lastUpdated: new Date()
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Get exchange rates error:', error);
      return this.getFallbackExchangeRates(baseCurrency);
    }
  }

  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) {
        return { originalAmount: amount, convertedAmount: amount, rate: 1 };
      }

      const rates = await this.getExchangeRates(fromCurrency);
      const rate = rates.rates.find(r => r.toCurrency === toCurrency);

      if (!rate) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      return {
        originalAmount: amount,
        convertedAmount: amount * rate.rate,
        fromCurrency,
        toCurrency,
        rate: rate.rate,
        lastUpdated: rate.lastUpdated
      };
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw error;
    }
  }

  async updateCurrencyRates(baseCurrency = 'USD') {
    try {
      const rates = await this.getExchangeRates(baseCurrency);
      
      // Update or create currency record
      let currency = await Currency.findOne({ code: baseCurrency });
      if (currency) {
        currency.exchangeRates = rates.rates;
        currency.updatedAt = new Date();
      } else {
        currency = new Currency({
          code: baseCurrency,
          name: baseCurrency,
          exchangeRates: rates.rates
        });
      }

      await currency.save();

      // Update other currencies in database
      for (const rate of rates.rates) {
        let targetCurrency = await Currency.findOne({ code: rate.toCurrency });
        if (targetCurrency) {
          // Update existing currency
          const existingRate = targetCurrency.exchangeRates.find(r => r.toCurrency === baseCurrency);
          if (existingRate) {
            existingRate.rate = 1 / rate.rate;
            existingRate.lastUpdated = new Date();
          } else {
            targetCurrency.exchangeRates.push({
              toCurrency: baseCurrency,
              rate: 1 / rate.rate,
              lastUpdated: new Date()
            });
          }
          await targetCurrency.save();
        }
      }

      return { success: true, updated: rates.rates.length };
    } catch (error) {
      console.error('Update currency rates error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCurrencyInfo(currencyCode) {
    try {
      const countries = await this.getCountries();
      const currencyInfo = countries
        .flatMap(country => country.currencies)
        .find(currency => currency.code === currencyCode);

      if (!currencyInfo) {
        throw new Error(`Currency ${currencyCode} not found`);
      }

      return currencyInfo;
    } catch (error) {
      console.error('Get currency info error:', error);
      throw error;
    }
  }

  async getPopularCurrencies() {
    try {
      const popularCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];
      const currencies = [];

      for (const code of popularCodes) {
        try {
          const info = await this.getCurrencyInfo(code);
          currencies.push(info);
        } catch (error) {
          console.log(`Currency ${code} not found, skipping`);
        }
      }

      return currencies;
    } catch (error) {
      console.error('Get popular currencies error:', error);
      return this.getFallbackPopularCurrencies();
    }
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getFallbackCountries() {
    return [
      {
        name: 'United States',
        code: 'US',
        capital: 'Washington, D.C.',
        region: 'Americas',
        currencies: [{ code: 'USD', name: 'US Dollar', symbol: '$' }]
      },
      {
        name: 'Canada',
        code: 'CA',
        capital: 'Ottawa',
        region: 'Americas',
        currencies: [{ code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' }]
      },
      {
        name: 'United Kingdom',
        code: 'GB',
        capital: 'London',
        region: 'Europe',
        currencies: [{ code: 'GBP', name: 'British Pound', symbol: '£' }]
      },
      {
        name: 'Germany',
        code: 'DE',
        capital: 'Berlin',
        region: 'Europe',
        currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }]
      },
      {
        name: 'India',
        code: 'IN',
        capital: 'New Delhi',
        region: 'Asia',
        currencies: [{ code: 'INR', name: 'Indian Rupee', symbol: '₹' }]
      }
    ];
  }

  getFallbackExchangeRates(baseCurrency) {
    const fallbackRates = {
      USD: [
        { toCurrency: 'EUR', rate: 0.85, lastUpdated: new Date() },
        { toCurrency: 'GBP', rate: 0.73, lastUpdated: new Date() },
        { toCurrency: 'JPY', rate: 110.0, lastUpdated: new Date() },
        { toCurrency: 'CAD', rate: 1.25, lastUpdated: new Date() },
        { toCurrency: 'AUD', rate: 1.35, lastUpdated: new Date() }
      ],
      EUR: [
        { toCurrency: 'USD', rate: 1.18, lastUpdated: new Date() },
        { toCurrency: 'GBP', rate: 0.86, lastUpdated: new Date() },
        { toCurrency: 'JPY', rate: 129.0, lastUpdated: new Date() }
      ]
    };

    return {
      base: baseCurrency,
      date: new Date().toISOString().split('T')[0],
      rates: fallbackRates[baseCurrency] || [],
      lastUpdated: new Date()
    };
  }

  getFallbackPopularCurrencies() {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' }
    ];
  }

  async syncAllCurrencies() {
    try {
      const countries = await this.getCountries();
      const currencies = [];

      for (const country of countries) {
        for (const currency of country.currencies) {
          if (!currencies.find(c => c.code === currency.code)) {
            currencies.push({
              ...currency,
              country: country.name
            });
          }
        }
      }

      // Save to database
      for (const currencyData of currencies) {
        try {
          let currency = await Currency.findOne({ code: currencyData.code });
          if (currency) {
            currency.name = currencyData.name;
            currency.symbol = currencyData.symbol;
            currency.country = currencyData.country;
          } else {
            currency = new Currency(currencyData);
          }
          await currency.save();
        } catch (error) {
          console.error(`Error saving currency ${currencyData.code}:`, error);
        }
      }

      return { success: true, synced: currencies.length };
    } catch (error) {
      console.error('Sync all currencies error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ExternalApiService();
