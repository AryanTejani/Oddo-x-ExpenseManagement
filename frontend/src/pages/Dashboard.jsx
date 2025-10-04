import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import CurrencyConverter from '../components/CurrencyConverter';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    rejectedExpenses: 0,
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0
  });
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard data with server-side role filtering
      const dashboardResponse = await axios.get('/api/expenses/dashboard');
      
      if (dashboardResponse.data) {
        // Use server-provided stats (already filtered by role)
        setStats(dashboardResponse.data.stats);
        setRecentExpenses(dashboardResponse.data.recentExpenses || []);
      } else {
        console.warn('Unexpected dashboard API response format:', dashboardResponse.data);
        setError('Invalid dashboard data format');
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted': return <PendingIcon />;
      case 'approved': return <CheckCircleIcon />;
      case 'rejected': return <CheckCircleIcon />;
      default: return <ReceiptIcon />;
    }
  };

  if (loading) {
    return (
      <Box p={3} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome back, {user?.firstName}!
      </Typography>
      
      <Typography variant="body1" color="textSecondary" gutterBottom>
        {user?.role === 'admin' ? 'Administrator Dashboard' : 
         user?.role === 'manager' ? 'Manager Dashboard' : 'Employee Dashboard'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ReceiptIcon color="primary" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{stats.totalExpenses}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Expenses
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PendingIcon color="warning" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{stats.pendingExpenses}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending Approval
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircleIcon color="success" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{stats.approvedExpenses}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Approved
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MoneyIcon color="info" sx={{ mr: 2, fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">${stats.totalAmount.toFixed(2)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Amount
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Expenses */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Expenses
            </Typography>
            {recentExpenses.length === 0 ? (
              <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                No expenses found. Create your first expense!
              </Typography>
            ) : (
              <List>
                {recentExpenses.map((expense, index) => (
                  <React.Fragment key={expense._id}>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(expense.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={expense.description}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {expense.category} • {new Date(expense.date).toLocaleDateString()}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                              <Typography variant="body2" fontWeight="medium">
                                {expense.currency.symbol}{expense.amount}
                              </Typography>
                              <Chip 
                                label={expense.status} 
                                color={getStatusColor(expense.status)}
                                size="small"
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < recentExpenses.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
            <Box mt={2}>
              <Button 
                variant="outlined" 
                href="/expense-management"
                fullWidth
              >
                View All Expenses
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Currency Converter */}
        <Grid item xs={12} md={4}>
          <CurrencyConverter />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              startIcon={<ReceiptIcon />}
              href="/expense-management"
              fullWidth
              sx={{ py: 1.5 }}
            >
              Add Expense
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<ReceiptIcon />}
              href="/expenses"
              fullWidth
              sx={{ py: 1.5 }}
            >
              Smart Upload
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<TrendingUpIcon />}
              href="/currency-converter"
              fullWidth
              sx={{ py: 1.5 }}
            >
              Currency Converter
            </Button>
          </Grid>
          {user?.role === 'manager' && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                startIcon={<CheckCircleIcon />}
                href="/approvals"
                fullWidth
                sx={{ py: 1.5 }}
              >
                Review Approvals
              </Button>
            </Grid>
          )}
          {user?.role === 'admin' && (
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                startIcon={<PeopleIcon />}
                href="/users"
                fullWidth
                sx={{ py: 1.5 }}
              >
                Manage Users
              </Button>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;