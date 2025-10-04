import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  ThumbUp as ThumbUpIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/apiClient';
import { toast } from 'react-toastify';

const DemoSetup = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [demoData, setDemoData] = useState({
    employee: null,
    manager: null,
    admin: null,
    expense: null,
    approvalChain: []
  });

  const steps = [
    'Setup Demo Users',
    'Create Test Expense',
    'Manager Approval',
    'Admin Approval',
    'Verify Workflow'
  ];

  const setupDemoUsers = async () => {
    try {
      setLoading(true);
      
      // This would typically create demo users, but for now we'll use existing users
      // In a real demo, you'd want to create specific demo accounts
      
      toast.success('Demo users ready! Use existing accounts for demo.');
      setCurrentStep(1);
    } catch (error) {
      console.error('Setup demo users error:', error);
      toast.error('Failed to setup demo users');
    } finally {
      setLoading(false);
    }
  };

  const createTestExpense = async () => {
    try {
      setLoading(true);
      
      const testExpense = {
        amount: 150.00,
        currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
        category: 'meals',
        description: 'Demo expense for workflow testing',
        date: new Date().toISOString().split('T')[0],
        merchant: 'Demo Restaurant'
      };

      const result = await api.expenses.create(testExpense);
      setDemoData(prev => ({ ...prev, expense: result.expense }));
      
      toast.success('Test expense created!');
      setCurrentStep(2);
    } catch (error) {
      console.error('Create test expense error:', error);
      toast.error('Failed to create test expense');
    } finally {
      setLoading(false);
    }
  };

  const submitForApproval = async () => {
    try {
      setLoading(true);
      
      if (!demoData.expense) {
        toast.error('No expense to submit');
        return;
      }

      await api.expenses.submit(demoData.expense._id);
      
      toast.success('Expense submitted for approval!');
      setCurrentStep(3);
    } catch (error) {
      console.error('Submit expense error:', error);
      toast.error('Failed to submit expense');
    } finally {
      setLoading(false);
    }
  };

  const checkApprovalStatus = async () => {
    try {
      setLoading(true);
      
      const expenses = await api.expenses.getAll();
      const submittedExpenses = expenses.filter(e => e.status === 'submitted');
      const approvedExpenses = expenses.filter(e => e.status === 'approved');
      
      setDemoData(prev => ({
        ...prev,
        approvalChain: [
          { step: 'Employee Submission', status: 'completed', count: expenses.length },
          { step: 'Manager Approval', status: submittedExpenses.length > 0 ? 'pending' : 'completed', count: submittedExpenses.length },
          { step: 'Admin Approval', status: approvedExpenses.length > 0 ? 'completed' : 'pending', count: approvedExpenses.length }
        ]
      }));
      
      toast.success('Approval status checked!');
      setCurrentStep(4);
    } catch (error) {
      console.error('Check approval status error:', error);
      toast.error('Failed to check approval status');
    } finally {
      setLoading(false);
    }
  };

  const resetDemo = () => {
    setCurrentStep(0);
    setDemoData({
      employee: null,
      manager: null,
      admin: null,
      expense: null,
      approvalChain: []
    });
  };

  return (
    <Box p={3}>
      <Typography variant="h4" component="h1" gutterBottom>
        Demo Workflow Setup
      </Typography>
      
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Setup the complete expense approval workflow for your demo video
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Demo Steps
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="1. Employee Creates Expense"
                    secondary="Login as employee and create a new expense"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <ThumbUpIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="2. Manager Approves"
                    secondary="Login as manager and approve the expense"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <AdminIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="3. Admin Final Approval"
                    secondary="Login as admin and give final approval"
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="4. Employee Sees Approved Status"
                    secondary="Employee can see the expense is approved"
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Box display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  onClick={setupDemoUsers}
                  disabled={loading || currentStep > 0}
                >
                  Setup Demo Users
                </Button>
                
                <Button
                  variant="contained"
                  onClick={createTestExpense}
                  disabled={loading || currentStep < 1}
                >
                  Create Test Expense
                </Button>
                
                <Button
                  variant="contained"
                  onClick={submitForApproval}
                  disabled={loading || currentStep < 2}
                >
                  Submit for Approval
                </Button>
                
                <Button
                  variant="contained"
                  onClick={checkApprovalStatus}
                  disabled={loading || currentStep < 3}
                >
                  Check Status
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={resetDemo}
                  disabled={loading}
                >
                  Reset Demo
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Demo Status
              </Typography>
              
              {demoData.approvalChain.length > 0 && (
                <Box>
                  {demoData.approvalChain.map((step, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={step.step}
                          color={step.status === 'completed' ? 'success' : step.status === 'pending' ? 'warning' : 'default'}
                          size="small"
                        />
                        <Typography variant="body2" color="textSecondary">
                          ({step.count} items)
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {demoData.expense && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Test Expense Created:
                  </Typography>
                  <Typography variant="body2">
                    {demoData.expense.description} - ${demoData.expense.amount}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Demo Instructions:</strong>
          <br />
          1. Use different browser tabs/incognito windows for different roles
          <br />
          2. Create an expense as an employee
          <br />
          3. Switch to manager account and approve it
          <br />
          4. Switch to admin account and give final approval
          <br />
          5. Switch back to employee account to see approved status
        </Typography>
      </Alert>
    </Box>
  );
};

export default DemoSetup;
