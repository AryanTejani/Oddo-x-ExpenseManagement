import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { handleApiError, formatValidationErrors } from '../utils/errorHandler';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Paper,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  AttachFile as AttachFileIcon
} from '@mui/icons-material';

const ExpenseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    tags: []
  });

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const categories = [
    { value: 'travel', label: 'Travel' },
    { value: 'meals', label: 'Meals' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'transport', label: 'Transport' },
    { value: 'office_supplies', label: 'Office Supplies' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'training', label: 'Training' },
    { value: 'communication', label: 'Communication' },
    { value: 'other', label: 'Other' }
  ];

  const currencies = [
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)' }
  ];

  const currencyDetails = {
    USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
    CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setReceiptFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setReceiptPreview(previewUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.amount || !formData.category || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Submit expense to API
      console.log('Submitting expense:', formData);
      
      const expenseData = {
        amount: parseFloat(formData.amount),
        currency: currencyDetails[formData.currency] || currencyDetails['USD'],
        category: formData.category,
        description: formData.description,
        date: formData.date,
        merchant: formData.merchant || '',
        tags: []
      };

      console.log('💸 Processed expense data:', expenseData);
      await axios.post('/api/expenses', expenseData);
      
      toast.success('Expense created successfully!');
      navigate('/expenses');
    } catch (error) {
      const errorInfo = handleApiError(error, 'ExpenseForm');
      
      if (errorInfo.details && errorInfo.details.length > 0) {
        const validationErrors = formatValidationErrors(errorInfo.details);
        toast.error(`Validation Error: ${validationErrors}`);
      } else {
        toast.error(errorInfo.message);
      }
      
      // Handle special cases
      if (errorInfo.action === 'redirect') {
        setTimeout(() => {
          navigate(errorInfo.redirectTo);
        }, 2000);
      }
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/expenses')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {isEdit ? 'Edit Expense' : 'New Expense'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      required
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={formData.currency}
                        onChange={(e) => handleInputChange('currency', e.target.value)}
                        label="Currency"
                      >
                        {currencies.map((currency) => (
                          <MenuItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        label="Category"
                      >
                        {categories.map((category) => (
                          <MenuItem key={category.value} value={category.value}>
                            {category.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Merchant"
                      value={formData.merchant}
                      onChange={(e) => handleInputChange('merchant', e.target.value)}
                      placeholder="e.g., Restaurant Name, Store, etc."
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Description"
                      multiline
                      rows={3}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      required
                      placeholder="Describe the expense..."
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">
                        Receipt Upload
                      </Typography>
                      <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="receipt-upload"
                        type="file"
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="receipt-upload">
                        <Button
                          variant="outlined"
                          component="span"
                          startIcon={<CloudUploadIcon />}
                        >
                          Upload Receipt
                        </Button>
                      </label>
                    </Box>
                  </Grid>

                  {receiptPreview && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <img
                          src={receiptPreview}
                          alt="Receipt preview"
                          style={{ maxWidth: '100%', maxHeight: '300px' }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {receiptFile?.name}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Box display="flex" gap={2} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        onClick={() => navigate('/expenses')}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                      >
                        {isEdit ? 'Update Expense' : 'Submit Expense'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Expense Guidelines
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • Include detailed description of the expense
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • Upload clear receipt images
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • Submit within 30 days of expense
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              • Ensure amounts match receipt
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExpenseForm;

