import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import axios from 'axios';

const SystemTest = () => {
  const [tests, setTests] = useState([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState({});

  const testCases = [
    {
      id: 'countries-api',
      name: 'Countries API Test',
      description: 'Test REST Countries API integration via backend proxy',
      test: async () => {
        const response = await axios.get('/api/companies/data/countries');
        return response.data.length > 0 ? 'success' : 'warning';
      }
    },
    {
      id: 'exchange-rates-api',
      name: 'Exchange Rates API Test',
      description: 'Test Exchange Rate API integration via backend proxy',
      test: async () => {
        const response = await axios.get('/api/companies/data/exchange-rates/USD');
        return response.data.rates ? 'success' : 'warning';
      }
    },
    {
      id: 'currency-conversion',
      name: 'Currency Conversion Test',
      description: 'Test currency conversion functionality',
      test: async () => {
        const response = await axios.post('/api/companies/data/convert-currency', {
          amount: 100,
          fromCurrency: 'USD',
          toCurrency: 'EUR'
        });
        return response.data.convertedAmount ? 'success' : 'warning';
      }
    },
    {
      id: 'backend-connection',
      name: 'Backend Connection Test',
      description: 'Test connection to backend server',
      test: async () => {
        const response = await axios.get('/api/companies/debug/all');
        return response.status === 200 ? 'success' : 'error';
      }
    },
    {
      id: 'company-search',
      name: 'Company Search API Test',
      description: 'Test company search functionality',
      test: async () => {
        const response = await axios.get('/api/companies/search?q=Test');
        return Array.isArray(response.data) ? 'success' : 'error';
      }
    },
    {
      id: 'auth-endpoint',
      name: 'Authentication Endpoint Test',
      description: 'Test authentication endpoint availability',
      test: async () => {
        try {
          const response = await axios.get('/api/auth/me');
          return response.status === 401 ? 'success' : 'warning'; // 401 is expected without token
        } catch (error) {
          return error.response?.status === 401 ? 'success' : 'error';
        }
      }
    }
  ];

  const runAllTests = async () => {
    setRunning(true);
    setTests(testCases);
    const newResults = {};

    for (const testCase of testCases) {
      try {
        console.log(`🧪 Running test: ${testCase.name}`);
        const result = await testCase.test();
        newResults[testCase.id] = result;
        console.log(`✅ Test ${testCase.name}: ${result}`);
      } catch (error) {
        console.error(`❌ Test ${testCase.name} failed:`, error);
        newResults[testCase.id] = 'error';
      }
    }

    setResults(newResults);
    setRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircleIcon color="success" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'error': return <ErrorIcon color="error" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success': return 'PASSED';
      case 'warning': return 'WARNING';
      case 'error': return 'FAILED';
      default: return 'PENDING';
    }
  };

  const successCount = Object.values(results).filter(r => r === 'success').length;
  const warningCount = Object.values(results).filter(r => r === 'warning').length;
  const errorCount = Object.values(results).filter(r => r === 'error').length;

  return (
    <Box p={3}>
      <Typography variant="h4" component="h1" gutterBottom>
        System Integration Test
      </Typography>
      
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Test all API integrations and system functionality
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4">{successCount}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Passed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4">{warningCount}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Warnings
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ErrorIcon color="error" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h4">{errorCount}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Failed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mb={3}>
        <Button
          variant="contained"
          onClick={runAllTests}
          disabled={running}
          startIcon={running ? <CircularProgress size={20} /> : null}
        >
          {running ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </Box>

      {tests.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Results
            </Typography>
            <List>
              {tests.map((test, index) => (
                <React.Fragment key={test.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getStatusIcon(results[test.id])}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" fontWeight="medium">
                            {test.name}
                          </Typography>
                          <Chip 
                            label={getStatusText(results[test.id])}
                            color={getStatusColor(results[test.id])}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={test.description}
                    />
                  </ListItem>
                  {index < tests.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <Box mt={3}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Test Instructions:</strong>
            <br />
            1. Make sure backend server is running on port 3000
            <br />
            2. Make sure frontend server is running on port 5173
            <br />
            3. Click "Run All Tests" to verify all integrations
            <br />
            4. All tests should pass for full functionality
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default SystemTest;
