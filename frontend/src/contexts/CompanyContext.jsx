import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CompanyContext = createContext();

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});

  // Load company data when user is authenticated
  useEffect(() => {
    const loadCompanyData = async () => {
      if (isAuthenticated && user?.company) {
        try {
          setLoading(true);
          
          // Load company details
          const companyResponse = await axios.get(`/api/companies/${user.company._id}`);
          setCompany(companyResponse.data);

          // Load currencies
          const currenciesResponse = await axios.get('/api/currencies');
          setCurrencies(currenciesResponse.data);

          // Load exchange rates for company currency
          if (companyResponse.data.currency?.code) {
            const ratesResponse = await axios.get(`/api/currencies/rates/${companyResponse.data.currency.code}`);
            setExchangeRates(ratesResponse.data.rates || {});
          }
        } catch (error) {
          console.error('Failed to load company data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadCompanyData();
  }, [isAuthenticated, user]);

  const updateCompany = async (companyData) => {
    try {
      const response = await axios.put(`/api/companies/${company._id}`, companyData);
      setCompany(response.data.company);
      return { success: true };
    } catch (error) {
      console.error('Company update error:', error);
      return { success: false, error: error.response?.data?.message };
    }
  };

  const getExchangeRate = (fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return 1;
    
    const rateKey = `${fromCurrency}_${toCurrency}`;
    return exchangeRates[rateKey] || exchangeRates[toCurrency] || 1;
  };

  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    const rate = getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  };

  const getCompanyUsers = async (filters = {}) => {
    try {
      const response = await axios.get(`/api/companies/${company._id}/users`, {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get company users:', error);
      throw error;
    }
  };

  const getCompanyStats = async () => {
    try {
      const response = await axios.get(`/api/companies/${company._id}/stats`);
      return response.data;
    } catch (error) {
      console.error('Failed to get company stats:', error);
      throw error;
    }
  };

  const getCountries = async () => {
    try {
      const response = await axios.get('/api/companies/data/countries');
      return response.data;
    } catch (error) {
      console.error('Failed to get countries:', error);
      throw error;
    }
  };

  const getExchangeRates = async (baseCurrency) => {
    try {
      const response = await axios.get(`/api/companies/data/exchange-rates/${baseCurrency}`);
      setExchangeRates(response.data.rates || {});
      return response.data;
    } catch (error) {
      console.error('Failed to get exchange rates:', error);
      throw error;
    }
  };

  const value = {
    company,
    currencies,
    exchangeRates,
    loading,
    updateCompany,
    getExchangeRate,
    convertCurrency,
    getCompanyUsers,
    getCompanyStats,
    getCountries,
    getExchangeRates
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

