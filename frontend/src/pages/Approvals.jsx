import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  Timeline as TimelineIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircleOutline as CheckCircleOutlineIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { api } from '../utils/apiClient';

const Approvals = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [action, setAction] = useState('');
  const [comments, setComments] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    dateRange: ''
  });

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const expenses = await api.approvals.getPending();
      setExpenses(expenses);
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
      toast.error('Failed to load pending approvals');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (expense) => {
    setSelectedExpense(expense);
    setAction('approve');
    setComments('');
    setOpenDialog(true);
  };

  const handleReject = (expense) => {
    setSelectedExpense(expense);
    setAction('reject');
    setComments('');
    setOpenDialog(true);
  };

  const handleSubmitAction = async () => {
    try {
      const data = action === 'reject' ? { reason: comments, comments } : { comments };
      
      if (action === 'approve') {
        await api.approvals.approve(selectedExpense._id, data);
      } else {
        await api.approvals.reject(selectedExpense._id, data);
      }
      
      toast.success(`Expense ${action}d successfully`);
      setOpenDialog(false);
      fetchPendingApprovals();
    } catch (error) {
      console.error(`Failed to ${action} expense:`, error);
      toast.error(`Failed to ${action} expense`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getApprovalStatus = (approval) => {
    switch (approval.status) {
      case 'pending': return { color: 'warning', icon: <ScheduleIcon />, text: 'Pending' };
      case 'approved': return { color: 'success', icon: <CheckCircleIcon />, text: 'Approved' };
      case 'rejected': return { color: 'error', icon: <CancelIcon />, text: 'Rejected' };
      default: return { color: 'default', icon: null, text: 'Unknown' };
    }
  };

  const calculateApprovalProgress = (approvalChain) => {
    const total = approvalChain.length;
    const completed = approvalChain.filter(a => a.status !== 'pending').length;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress />
        <Typography mt={2}>Loading pending approvals...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Expense Approvals
        </Typography>
        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={() => {/* Implement filter dialog */}}
        >
          Filter
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Pending Approvals" />
        <Tab label="Approval History" />
        <Tab label="Team Expenses" />
      </Tabs>

      {/* Pending Approvals Tab */}
      {tabValue === 0 && (
        <>
          {expenses.length === 0 ? (
            <Card>
              <CardContent>
                <Typography variant="h6" align="center" color="textSecondary">
                  No pending approvals found
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {expenses.map((expense) => (
                <Grid item xs={12} md={6} lg={4} key={expense._id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Typography variant="h6">
                          {expense.employee.firstName} {expense.employee.lastName}
                        </Typography>
                        <Chip 
                          label={expense.status} 
                          color={getStatusColor(expense.status)}
                          size="small"
                        />
                      </Box>

                      <Typography variant="h5" color="primary" mb={1}>
                        {expense.currency.symbol}{expense.amount}
                      </Typography>

                      <Typography variant="body2" color="textSecondary" mb={1}>
                        {expense.category} • {new Date(expense.date).toLocaleDateString()}
                      </Typography>

                      <Typography variant="body2" mb={2}>
                        {expense.description}
                      </Typography>

                      {/* Approval Progress */}
                      <Box mb={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="caption">Approval Progress</Typography>
                          <Typography variant="caption">
                            {expense.approvalChain?.filter(a => a.status !== 'pending').length || 0} / {expense.approvalChain?.length || 0}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={calculateApprovalProgress(expense.approvalChain || [])} 
                        />
                      </Box>

                      {/* Approval Chain */}
                      {expense.approvalChain && expense.approvalChain.length > 0 && (
                        <Accordion>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="caption">Approval Chain</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <List dense>
                              {expense.approvalChain.map((approval, index) => {
                                const status = getApprovalStatus(approval);
                                return (
                                  <ListItem key={index}>
                                    <ListItemIcon>
                                      {status.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={`Step ${approval.level}: ${approval.stepName || 'Approval'}`}
                                      secondary={
                                        <Box>
                                          <Typography variant="caption" color={status.color}>
                                            {status.text}
                                          </Typography>
                                          {approval.comments && (
                                            <Typography variant="caption" display="block">
                                              {approval.comments}
                                            </Typography>
                                          )}
                                        </Box>
                                      }
                                    />
                                  </ListItem>
                                );
                              })}
                            </List>
                          </AccordionDetails>
                        </Accordion>
                      )}

                      <Box display="flex" justifyContent="space-between" mt={2}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleApprove(expense)}
                          size="small"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<CancelIcon />}
                          onClick={() => handleReject(expense)}
                          size="small"
                        >
                          Reject
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => setSelectedExpense(expense)}
                          size="small"
                        >
                          View
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Approval History Tab */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Approval History</Typography>
            <Typography color="textSecondary">
              View all approved and rejected expenses with detailed approval history.
            </Typography>
            {/* Implement approval history table */}
          </CardContent>
        </Card>
      )}

      {/* Team Expenses Tab */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Team Expenses</Typography>
            <Typography color="textSecondary">
              View and manage expenses from your team members.
            </Typography>
            {/* Implement team expenses table */}
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {action === 'approve' ? 'Approve Expense' : 'Reject Expense'}
        </DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box mb={2}>
              <Typography variant="subtitle2">Expense Details:</Typography>
              <Typography>Amount: {selectedExpense.currency.symbol}{selectedExpense.amount}</Typography>
              <Typography>Category: {selectedExpense.category}</Typography>
              <Typography>Description: {selectedExpense.description}</Typography>
              
              {/* Show approval chain if available */}
              {selectedExpense.approvalChain && selectedExpense.approvalChain.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2">Approval Chain:</Typography>
                  {selectedExpense.approvalChain.map((approval, index) => {
                    const status = getApprovalStatus(approval);
                    return (
                      <Box key={index} display="flex" alignItems="center" mb={1}>
                        {status.icon}
                        <Typography variant="body2" ml={1}>
                          Step {approval.level}: {status.text}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
          <TextField
            fullWidth
            label={action === 'approve' ? 'Comments (Optional)' : 'Rejection Reason'}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            multiline
            rows={3}
            required={action === 'reject'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmitAction} 
            variant="contained"
            color={action === 'approve' ? 'success' : 'error'}
          >
            {action === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Approvals;