import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Autocomplete,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const ExpenseManagement = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    receipt: null,
    merchant: '',
    country: 'United States'
  });

  const categories = [
    'travel', 'meals', 'accommodation', 'transport',
    'office_supplies', 'entertainment', 'training',
    'communication', 'other'
  ];

  useEffect(() => {
    loadExpenses();
    loadCountries();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/expenses');
      
      if (response.data && Array.isArray(response.data.expenses)) {
        setExpenses(response.data.expenses);
      } else {
        console.warn('Unexpected API response format:', response.data);
        setExpenses([]);
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
      setExpenses([]);
      const errorMessage = error.response?.data?.message || 'Failed to load expenses';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const response = await axios.get('/api/companies/data/countries');
      setCountries(response.data || []);
    } catch (error) {
      console.error('Failed to load countries:', error);
    }
  };

  const loadExchangeRates = async (baseCurrency) => {
    try {
      const response = await axios.get(`/api/companies/data/exchange-rates/${baseCurrency}`);
      setExchangeRates(response.data.rates);
    } catch (error) {
      console.error('Failed to load exchange rates:', error);
    }
  };

  const handleCountryChange = (countryName) => {
    const country = countries.find(c => c.name === countryName);
    if (country && country.currencies.length > 0) {
      const currency = country.currencies[0];
      setExpenseForm(prev => ({
        ...prev,
        country: countryName,
        currency: {
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol
        }
      }));
      loadExchangeRates(currency.code);
    }
  };

  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) return amount;
    const rate = exchangeRates[toCurrency];
    return rate ? (amount * rate).toFixed(2) : amount;
  };

  const handleSubmitExpense = async () => {
    try {
      // Validate required fields
      if (!expenseForm.amount || !expenseForm.category || !expenseForm.description || !expenseForm.date) {
        toast.error('Please fill in all required fields');
        return;
      }

      const expenseData = {
        amount: parseFloat(expenseForm.amount),
        currency: expenseForm.currency,
        category: expenseForm.category,
        description: expenseForm.description,
        date: expenseForm.date,
        merchant: expenseForm.merchant || '',
        tags: []
      };

      console.log('📝 Submitting expense:', expenseData);

      if (editingExpense) {
        await axios.put(`/api/expenses/${editingExpense._id}`, expenseData);
        toast.success('Expense updated successfully');
      } else {
        await axios.post('/api/expenses', expenseData);
        toast.success('Expense created successfully');
      }

      setOpenDialog(false);
      setEditingExpense(null);
      resetForm();
      loadExpenses();
    } catch (error) {
      console.error('Failed to save expense:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save expense';
      toast.error(errorMessage);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await axios.delete(`/api/expenses/${expenseId}`);
        toast.success('Expense deleted successfully');
        loadExpenses();
      } catch (error) {
        console.error('Failed to delete expense:', error);
        toast.error('Failed to delete expense');
      }
    }
  };

  const handleSubmitForApproval = async (expenseId) => {
    try {
      await axios.post(`/api/expenses/${expenseId}/submit`);
      toast.success('Expense submitted for approval');
      loadExpenses();
    } catch (error) {
      console.error('Failed to submit expense:', error);
      toast.error('Failed to submit expense');
    }
  };

  const resetForm = () => {
    setExpenseForm({
      amount: '',
      currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      receipt: null,
      merchant: '',
      country: 'United States'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'default';
      case 'submitted': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const filteredExpenses = safeExpenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || expense.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = safeExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const pendingAmount = safeExpenses
    .filter(e => e.status === 'submitted')
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Expense Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingExpense(null);
            resetForm();
            setOpenDialog(true);
          }}
        >
          Add Expense
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MoneyIcon color="primary" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">Total Expenses</Typography>
                  <Typography variant="h4">${totalAmount.toFixed(2)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <TrendingUpIcon color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="h6">Pending</Typography>
                  <Typography variant="h4">${pendingAmount.toFixed(2)}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <ReceiptIcon color="success" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h6">Total Count</Typography>
                <Typography variant="h4">{safeExpenses.length}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <FilterIcon color="info" sx={{ mr: 1 }} />
              <Box>
                <Typography variant="h6">Approved</Typography>
                <Typography variant="h4">
                  {safeExpenses.filter(e => e.status === 'approved').length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search expenses"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                label="Filter by Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Expenses Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Description</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="textSecondary">No expenses found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense._id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {expense.description}
                    </Typography>
                    {expense.merchant && (
                      <Typography variant="caption" color="textSecondary">
                        {expense.merchant}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {expense.currency.symbol}{expense.amount}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {expense.currency.code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={expense.category} size="small" />
                  </TableCell>
                  <TableCell>
                    {new Date(expense.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={expense.status} 
                      color={getStatusColor(expense.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      onClick={() => {
                        setEditingExpense(expense);
                        setExpenseForm({
                          amount: expense.amount.toString(),
                          currency: expense.currency,
                          category: expense.category,
                          description: expense.description,
                          date: expense.date.split('T')[0],
                          receipt: expense.receipt,
                          merchant: expense.merchant || '',
                          country: expense.country || 'United States'
                        });
                        setOpenDialog(true);
                      }}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDeleteExpense(expense._id)}
                      size="small"
                      disabled={expense.status !== 'draft'}
                    >
                      <DeleteIcon />
                    </IconButton>
                    {expense.status === 'draft' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSubmitForApproval(expense._id)}
                      >
                        Submit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Expense Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingExpense ? 'Edit Expense' : 'Add New Expense'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  label="Category"
                  required
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category.replace('_', ' ').toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select
                  value={expenseForm.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  label="Country"
                  required
                >
                  {countries.map((country) => (
                    <MenuItem key={country.name} value={country.name}>
                      {country.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Currency"
                value={`${expenseForm.currency.symbol} ${expenseForm.currency.name} (${expenseForm.currency.code})`}
                disabled
                helperText="Currency is set based on country selection"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                multiline
                rows={2}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Merchant"
                value={expenseForm.merchant}
                onChange={(e) => setExpenseForm({ ...expenseForm, merchant: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmitExpense} variant="contained">
            {editingExpense ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseManagement;
