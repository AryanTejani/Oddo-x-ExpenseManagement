import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  SwapHoriz as SwapIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from 'axios';

const CurrencyConverter = () => {
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const popularCurrencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' }
  ];

  useEffect(() => {
    convertCurrency();
  }, [amount, fromCurrency, toCurrency]);

  const convertCurrency = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setConvertedAmount('');
      setExchangeRate(0);
      return;
    }

    if (fromCurrency === toCurrency) {
      setConvertedAmount(amount);
      setExchangeRate(1);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Use backend proxy instead of direct API call
      const response = await axios.post('/api/companies/data/convert-currency', {
        amount: parseFloat(amount),
        fromCurrency,
        toCurrency
      });

      setConvertedAmount(response.data.convertedAmount.toString());
      setExchangeRate(response.data.rate);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.error('Currency conversion error:', error);
      setError(error.response?.data?.message || 'Failed to convert currency. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const getCurrencySymbol = (code) => {
    const currency = popularCurrencies.find(c => c.code === code);
    return currency ? currency.symbol : code;
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">Currency Converter</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Typography sx={{ mr: 1, color: 'text.secondary' }}>
                    {getCurrencySymbol(fromCurrency)}
                  </Typography>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>From</InputLabel>
              <Select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                label="From"
              >
                {popularCurrencies.map((currency) => (
                  <MenuItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={1} sx={{ textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={swapCurrencies}
              sx={{ minWidth: 'auto', p: 1 }}
            >
              <SwapIcon />
            </Button>
          </Grid>

          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>To</InputLabel>
              <Select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                label="To"
              >
                {popularCurrencies.map((currency) => (
                  <MenuItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code} - {currency.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={2}>
            <Box textAlign="center">
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="h6" color="primary">
                  {convertedAmount && `${getCurrencySymbol(toCurrency)}${convertedAmount}`}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>

        {exchangeRate > 0 && (
          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              Exchange Rate: 1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
            </Typography>
            {lastUpdated && (
              <Typography variant="caption" color="textSecondary">
                Last updated: {lastUpdated}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CurrencyConverter;
