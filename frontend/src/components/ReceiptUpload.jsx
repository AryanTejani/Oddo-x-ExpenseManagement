import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Receipt as ReceiptIcon,
  AutoFixHigh as AutoFixHighIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { api, apiClient } from '../utils/apiClient';

const ReceiptUpload = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    country: 'United States'
  });

  const categories = [
    'travel', 'meals', 'accommodation', 'transport',
    'office_supplies', 'entertainment', 'training',
    'communication', 'other'
  ];

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const processReceiptOCR = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const result = await apiClient.post('/api/expenses/ocr-process', formData);
      
      if (result.success) {
        setOcrData(result.data);
        
        // Pre-fill form with OCR data
        const extracted = result.data;
        setExpenseForm(prev => ({
          ...prev,
          amount: extracted.extractedAmount ? extracted.extractedAmount.toString() : '',
          description: `Receipt from ${extracted.extractedMerchant || 'Unknown Merchant'}`,
          merchant: extracted.extractedMerchant || '',
          date: extracted.extractedDate ? new Date(extracted.extractedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }));
        
        toast.success('Receipt processed successfully!');
      } else {
        toast.error('Failed to process receipt');
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error('Failed to process receipt');
    } finally {
      setUploading(false);
    }
  };

  const createDraftExpense = async () => {
    try {
      // Validate required fields
      if (!expenseForm.amount || !expenseForm.category || !expenseForm.description) {
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
        tags: [],
        status: 'draft',
        hasReceipt: true // Indicate this expense should have a receipt
      };

      const result = await api.expenses.ocrDraft({
        ...expenseData,
        ocrData: ocrData // Include OCR data for reference
      });
      
      toast.success('Draft expense created successfully!');
      
      // Reset form and close dialog
      handleClose();
      
      // Navigate to edit the newly created expense
      navigate(`/expenses/${result.expense._id}/edit`);
      
    } catch (error) {
      console.error('Failed to create expense:', error);
      toast.error('Failed to create expense');
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setOcrData(null);
    setExpenseForm({
      amount: '',
      currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      merchant: '',
      country: 'United States'
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <ReceiptIcon sx={{ mr: 1 }} />
          Smart Receipt Upload
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3}>
          {/* File Upload Section */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Upload Receipt
                  </Typography>
                  {ocrData && (
                    <Chip 
                      icon={<CheckCircleIcon />}
                      label="OCR Processed"
                      color="success"
                      variant="outlined"
                    />
                  )}
                </Box>
                
                {!preview ? (
                  <Box
                    sx={{
                      border: '2px dashed #ccc',
                      borderRadius: 2,
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'action.hover'
                      }
                    }}
                    onClick={() => document.getElementById('file-input').click()}
                  >
                    <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      Click to upload receipt image
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supported formats: JPEG, PNG, GIF, WebP (Max 10MB)
                    </Typography>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </Box>
                ) : (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="subtitle1">
                        Selected: {file.name}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => {
                          setFile(null);
                          setPreview(null);
                          setOcrData(null);
                        }}
                        startIcon={<CloseIcon />}
                      >
                        Remove
                      </Button>
                    </Box>
                    
                    <Box mb={2}>
                      <img
                        src={preview}
                        alt="Receipt preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          border: '1px solid #ddd',
                          borderRadius: 4
                        }}
                      />
                    </Box>

                    <Button
                      variant="contained"
                      startIcon={<AutoFixHighIcon />}
                      onClick={processReceiptOCR}
                      disabled={uploading}
                      fullWidth
                    >
                      {uploading ? 'Processing...' : 'Process with OCR'}
                    </Button>

                    {uploading && (
                      <Box mt={2}>
                        <LinearProgress />
                        <Typography variant="caption" color="text.secondary">
                          Extracting data from receipt...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* OCR Results */}
          {ocrData && (
            <Grid item xs={12}>
              <Alert severity="success" sx={{ mb: 2 }}>
                OCR processing completed successfully! Data has been pre-filled below.
              </Alert>
              
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Extracted Data
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Amount: {ocrData.extractedAmount ? `$${ocrData.extractedAmount}` : 'Not detected'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Merchant: {ocrData.extractedMerchant || 'Not detected'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Date: {ocrData.extractedDate ? new Date(ocrData.extractedDate).toLocaleDateString() : 'Not detected'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Confidence: {Math.round(ocrData.confidence * 100)}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Expense Form */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6" gutterBottom>
              Review & Complete Expense Details
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount *"
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              required
              inputProps={{ min: 0, step: 0.01 }}
              disabled={uploading}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                label="Category"
                disabled={uploading}
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
              label="Description *"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              multiline
              rows={2}
              required
              disabled={uploading}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Merchant"
              value={expenseForm.merchant}
              onChange={(e) => setExpenseForm({ ...expenseForm, merchant: e.target.value })}
              disabled={uploading}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date *"
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
              disabled={uploading}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={createDraftExpense}
          variant="contained"
          disabled={!file || !expenseForm.amount || !expenseForm.category || !expenseForm.description}
        >
          Create Draft Expense
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptUpload;
