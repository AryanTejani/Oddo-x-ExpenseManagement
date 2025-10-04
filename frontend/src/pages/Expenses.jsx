import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Fab,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  CloudUpload as UploadIcon,
  AutoFixHigh as AutoFixHighIcon,
  Close as CloseIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import axios from 'axios';
import ReceiptUpload from '../components/ReceiptUpload';
import { getStatusColor, getCategoryLabel, formatCurrency, formatDate } from '../utils/expenseUtils';

const Expenses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiptUploadOpen, setReceiptUploadOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadExpenses();
  }, []);

  // Refresh expenses when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadExpenses();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔄 Loading expenses...');
      const response = await axios.get("/api/expenses");
      
      console.log('✅ API Response:', response.data);
      
      if (response.data && Array.isArray(response.data.expenses)) {
        console.log('📊 Expenses loaded:', response.data.expenses.length, 'items');
        console.log('📊 Expense statuses:', response.data.expenses.map(e => ({ id: e._id, status: e.status, description: e.description })));
        setExpenses(response.data.expenses);
      } else if (Array.isArray(response.data)) {
        console.log('📊 Expenses loaded (direct array):', response.data.length, 'items');
        setExpenses(response.data);
      } else {
        console.warn("⚠️ Unexpected API response format:", response.data);
        setExpenses([]);
      }
    } catch (error) {
      console.error("❌ Failed to load expenses:", error);
      console.error("❌ Error response:", error.response?.data);
      setExpenses([]);
      const errorMessage = error.response?.data?.message || "Failed to load expenses";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await axios.delete(`/api/expenses/${expenseId}`);
        toast.success("Expense deleted successfully");
        loadExpenses();
      } catch (error) {
        console.error("Failed to delete expense:", error);
        toast.error("Failed to delete expense");
        handleMenuClose();
      }
    }
  };


  const handleMenuOpen = (event, expense) => {
    setAnchorEl(event.currentTarget);
    setSelectedExpense(expense);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedExpense(null);
  };

  const handleEdit = () => {
    if (selectedExpense) {
      navigate(`/expenses/${selectedExpense.id}/edit`);
    }
    handleMenuClose();
  };

  const handleView = () => {
    if (selectedExpense) {
      // Navigate to expense detail view
      console.log('View expense:', selectedExpense.id);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedExpense) {
      handleDeleteExpense(selectedExpense._id);
      handleMenuClose();
    }
  };

  const handleSubmit = async () => {
    if (selectedExpense && selectedExpense.status === 'draft') {
      try {
        // Use the workflow that was selected when the expense was created
        const response = await axios.post(
          `/api/expenses/${selectedExpense._id}/submit`,
          { workflowId: selectedExpense.selectedWorkflow || null },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );

        if (response.status === 200) {
          toast.success('Expense submitted successfully!');
          loadExpenses(); // Refresh the expenses list
        }
      } catch (error) {
        console.error('Failed to submit expense:', error);
        toast.error('Failed to submit expense');
      }
      handleMenuClose();
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchTerm || 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.merchant?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || expense.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          My Expenses
        </Typography>
        <Box display="flex" gap={1}>
          {user?.role === 'employee' && (
            <>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setReceiptUploadOpen(true)}
              >
                Smart Upload
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/expenses/new')}
              >
                New Expense
              </Button>
            </>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search expenses"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by description, category, or merchant"
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
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="outlined"
              onClick={loadExpenses}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
              fullWidth
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Expenses
              </Typography>
              <Typography variant="h4">
                {filteredExpenses.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4" color="warning.main">
                {filteredExpenses.filter(e => e.status === 'submitted').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Approved
              </Typography>
              <Typography variant="h4" color="success.main">
                {filteredExpenses.filter(e => e.status === 'approved').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Amount
              </Typography>
              <Typography variant="h4">
                ${filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Expenses Table */}
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Receipt</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary">
                        {searchTerm || filterStatus ? 'No expenses match your filters' : 'No expenses found. Create your first expense!'}
                      </Typography>
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
                        <Chip
                          label={getCategoryLabel(expense.category)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(expense.amount, expense.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatDate(expense.date)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.status}
                          color={getStatusColor(expense.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {expense.receipt && expense.receipt.url ? (
                          <ReceiptIcon color="success" />
                        ) : expense.receipt && expense.receipt.pendingOCRData ? (
                          <ReceiptIcon color="warning" />
                        ) : (
                          <ReceiptIcon color="disabled" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => handleMenuOpen(e, expense)}
                          size="small"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* Debug Panel - Temporary for testing */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="h6">Debug Info</Typography>
          <Typography variant="body2">Total expenses: {expenses.length}</Typography>
          <Typography variant="body2">Filtered expenses: {filteredExpenses.length}</Typography>
          <Typography variant="body2">Loading: {loading ? 'Yes' : 'No'}</Typography>
          <Typography variant="body2">Error: {error || 'None'}</Typography>
          <Button onClick={loadExpenses} variant="outlined" size="small" sx={{ mt: 1 }}>
            Manual Refresh
          </Button>
        </Box>
      )}

      {/* Floating Action Button - Only for employees */}
      {user?.role === 'employee' && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
          onClick={() => navigate('/expenses/new')}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        {user?.role === 'employee' && selectedExpense?.employee?._id === user._id && (
          <>
            <MenuItem onClick={handleEdit}>
              <EditIcon sx={{ mr: 1 }} />
              Edit
            </MenuItem>
            {selectedExpense.status === 'draft' && (
              <MenuItem onClick={handleSubmit} sx={{ color: 'success.main' }}>
                <CheckIcon sx={{ mr: 1 }} />
                Submit
              </MenuItem>
            )}
            <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
              <DeleteIcon sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Receipt Upload Dialog */}
      <ReceiptUpload 
        open={receiptUploadOpen}
        onClose={() => setReceiptUploadOpen(false)}
      />
    </Box>
  );
};

export default Expenses;

