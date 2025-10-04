import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const ExpenseTest = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [testExpense, setTestExpense] = useState({
    amount: '50.00',
    currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
    category: 'meals',
    description: 'Test expense for debugging',
    date: new Date().toISOString().split('T')[0],
    merchant: 'Test Restaurant'
  });

  const testCreateExpense = async () => {
    try {
      setLoading(true);
      setTestResult(null);

      console.log('🧪 Testing expense creation...');
      console.log('📝 Test data:', testExpense);
      console.log('👤 User:', user);

      const response = await axios.post('/api/expenses', testExpense);
      
      console.log('✅ Success response:', response.data);
      setTestResult({
        success: true,
        message: 'Expense created successfully!',
        data: response.data
      });
      toast.success('Test expense created successfully!');
    } catch (error) {
      console.error('❌ Error creating expense:', error);
      console.error('❌ Error response:', error.response?.data);
      
      setTestResult({
        success: false,
        message: `Error: ${error.response?.data?.message || error.message}`,
        error: error.response?.data
      });
      toast.error('Failed to create test expense');
    } finally {
      setLoading(false);
    }
  };

  const testLoadExpenses = async () => {
    try {
      setLoading(true);
      setTestResult(null);

      console.log('🧪 Testing expense loading...');
      const response = await axios.get('/api/expenses');
      
      console.log('✅ Success response:', response.data);
      const expenses = response.data.expenses || [];
      setTestResult({
        success: true,
        message: `Loaded ${expenses.length} expenses`,
        data: response.data
      });
      toast.success(`Loaded ${expenses.length} expenses`);
    } catch (error) {
      console.error('❌ Error loading expenses:', error);
      console.error('❌ Error response:', error.response?.data);
      
      setTestResult({
        success: false,
        message: `Error: ${error.response?.data?.message || error.message}`,
        error: error.response?.data
      });
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'travel', 'meals', 'accommodation', 'transport',
    'office_supplies', 'entertainment', 'training',
    'communication', 'other'
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" component="h1" gutterBottom>
        Expense API Test
      </Typography>
      
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Test expense creation and loading functionality
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Expense Data
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={testExpense.amount}
                    onChange={(e) => setTestExpense({ ...testExpense, amount: e.target.value })}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={testExpense.category}
                      onChange={(e) => setTestExpense({ ...testExpense, category: e.target.value })}
                      label="Category"
                    >
                      {categories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category.replace('_', ' ').toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    value={testExpense.description}
                    onChange={(e) => setTestExpense({ ...testExpense, description: e.target.value })}
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Merchant"
                    value={testExpense.merchant}
                    onChange={(e) => setTestExpense({ ...testExpense, merchant: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date"
                    type="date"
                    value={testExpense.date}
                    onChange={(e) => setTestExpense({ ...testExpense, date: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <Box mt={2} display="flex" gap={2}>
                <Button
                  variant="contained"
                  onClick={testCreateExpense}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Creating...' : 'Test Create Expense'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={testLoadExpenses}
                  disabled={loading}
                >
                  Test Load Expenses
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Test Results
              </Typography>
              
              {testResult && (
                <Alert 
                  severity={testResult.success ? 'success' : 'error'}
                  sx={{ mb: 2 }}
                >
                  {testResult.message}
                </Alert>
              )}

              {testResult && testResult.data && (
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Response Data:
                  </Typography>
                  <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '10px', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '300px'
                  }}>
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </Box>
              )}

              {testResult && testResult.error && (
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Error Details:
                  </Typography>
                  <pre style={{ 
                    backgroundColor: '#ffebee', 
                    padding: '10px', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '300px'
                  }}>
                    {JSON.stringify(testResult.error, null, 2)}
                  </pre>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={3}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Debug Information:</strong>
            <br />
            • User: {user ? `${user.firstName} ${user.lastName} (${user.role})` : 'Not logged in'}
            <br />
            • Company: {user?.company?.name || 'N/A'}
            <br />
            • API Base URL: {import.meta.env.VITE_API_URL || 'http://localhost:3000'}
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
};

export default ExpenseTest;
