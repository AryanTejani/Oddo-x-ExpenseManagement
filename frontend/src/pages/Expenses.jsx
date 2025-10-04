import React, { useState } from 'react';
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
  Fab
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

const Expenses = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Mock data - in real app, this would come from API
  const expenses = [
    {
      id: 1,
      description: 'Business lunch with client',
      amount: 85.50,
      currency: 'USD',
      category: 'meals',
      date: '2024-01-15',
      status: 'approved',
      receipt: true
    },
    {
      id: 2,
      description: 'Taxi to airport',
      amount: 45.00,
      currency: 'USD',
      category: 'transport',
      date: '2024-01-14',
      status: 'pending',
      receipt: false
    },
    {
      id: 3,
      description: 'Office supplies',
      amount: 120.00,
      currency: 'USD',
      category: 'office_supplies',
      date: '2024-01-13',
      status: 'approved',
      receipt: true
    },
    {
      id: 4,
      description: 'Hotel accommodation',
      amount: 250.00,
      currency: 'USD',
      category: 'accommodation',
      date: '2024-01-12',
      status: 'rejected',
      receipt: true
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      travel: 'Travel',
      meals: 'Meals',
      accommodation: 'Accommodation',
      transport: 'Transport',
      office_supplies: 'Office Supplies',
      entertainment: 'Entertainment',
      training: 'Training',
      communication: 'Communication',
      other: 'Other'
    };
    return labels[category] || category;
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
      // Handle delete
      console.log('Delete expense:', selectedExpense.id);
    }
    handleMenuClose();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          My Expenses
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/expenses/new')}
        >
          New Expense
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Expenses
              </Typography>
              <Typography variant="h4">
                {expenses.length}
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
                {expenses.filter(e => e.status === 'pending').length}
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
                {expenses.filter(e => e.status === 'approved').length}
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
                ${expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
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
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {expense.description}
                      </Typography>
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
                        ${expense.amount.toFixed(2)} {expense.currency}
                      </Typography>
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
                      {expense.receipt ? (
                        <ReceiptIcon color="success" />
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      {/* Floating Action Button */}
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
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Expenses;

