import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
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
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Rule as RuleIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { api } from '../utils/apiClient';

const ApprovalWorkflows = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [availableApprovers, setAvailableApprovers] = useState([]);

  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    rules: [],
    approvalSequence: [],
    conditionalRules: [],
    defaultApprovers: [],
    escalationSettings: {
      enabled: false,
      escalationTime: 48,
      escalationApprovers: []
    }
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchWorkflows();
      fetchAvailableApprovers();
    }
  }, [user]);

  const fetchWorkflows = async () => {
    try {
      const workflows = await api.workflows.getAll();
      setWorkflows(workflows);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      toast.error('Failed to load approval workflows');
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableApprovers = async () => {
    try {
      const approvers = await api.workflows.getAvailableApprovers();
      setAvailableApprovers(approvers);
    } catch (error) {
      console.error('Failed to fetch approvers:', error);
      setAvailableApprovers([]);
    }
  };

  const handleCreateWorkflow = () => {
    setEditingWorkflow(null);
    setWorkflowForm({
      name: '',
      description: '',
      rules: [],
      approvalSequence: [],
      conditionalRules: [],
      defaultApprovers: [],
      escalationSettings: {
        enabled: false,
        escalationTime: 48,
        escalationApprovers: []
      }
    });
    setOpenDialog(true);
  };

  const handleEditWorkflow = (workflow) => {
    setEditingWorkflow(workflow);
    setWorkflowForm({
      name: workflow.name,
      description: workflow.description || '',
      rules: workflow.rules || [],
      approvalSequence: workflow.approvalSequence || [],
      conditionalRules: workflow.conditionalRules || [],
      defaultApprovers: workflow.defaultApprovers || [],
      escalationSettings: workflow.escalationSettings || {
        enabled: false,
        escalationTime: 48,
        escalationApprovers: []
      }
    });
    setOpenDialog(true);
  };

  const handleSaveWorkflow = async () => {
    try {
      if (editingWorkflow) {
        await api.workflows.update(editingWorkflow._id, workflowForm);
        toast.success('Workflow updated successfully');
      } else {
        await api.workflows.create(workflowForm);
        toast.success('Workflow created successfully');
      }
      
      setOpenDialog(false);
      fetchWorkflows();
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast.error('Failed to save workflow');
    }
  };

  const handleDeleteWorkflow = async (workflowId) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await api.workflows.delete(workflowId);
        toast.success('Workflow deleted successfully');
        fetchWorkflows();
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        toast.error('Failed to delete workflow');
      }
    }
  };

  const addApprovalSequenceStep = () => {
    const newStep = {
      step: workflowForm.approvalSequence.length + 1,
      name: '',
      approvers: [],
      isManagerApprover: false,
      isRequired: true,
      conditions: []
    };
    setWorkflowForm({
      ...workflowForm,
      approvalSequence: [...workflowForm.approvalSequence, newStep]
    });
  };

  const addConditionalRule = () => {
    const newRule = {
      name: '',
      type: 'percentage',
      percentage: 60,
      specificApprovers: [],
      autoApprove: false,
      conditions: []
    };
    setWorkflowForm({
      ...workflowForm,
      conditionalRules: [...workflowForm.conditionalRules, newRule]
    });
  };

  const updateApprovalSequenceStep = (index, field, value) => {
    const updatedSequence = [...workflowForm.approvalSequence];
    updatedSequence[index] = { ...updatedSequence[index], [field]: value };
    setWorkflowForm({ ...workflowForm, approvalSequence: updatedSequence });
  };

  const updateConditionalRule = (index, field, value) => {
    const updatedRules = [...workflowForm.conditionalRules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    setWorkflowForm({ ...workflowForm, conditionalRules: updatedRules });
  };

  const addWorkflowRule = () => {
    const newRule = {
      condition: 'amount_threshold',
      value: 0,
      approvers: [],
      level: 1,
      isRequired: true,
      isManagerApprover: false
    };
    setWorkflowForm({
      ...workflowForm,
      rules: [...workflowForm.rules, newRule]
    });
  };

  const updateWorkflowRule = (index, field, value) => {
    const updatedRules = [...workflowForm.rules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    setWorkflowForm({ ...workflowForm, rules: updatedRules });
  };

  const removeWorkflowRule = (index) => {
    const updatedRules = workflowForm.rules.filter((_, i) => i !== index);
    setWorkflowForm({ ...workflowForm, rules: updatedRules });
  };

  if (user?.role !== 'admin') {
    return (
      <Box p={3}>
        <Alert severity="error">
          Access denied. Admin role required.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Loading approval workflows...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Approval Workflows
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateWorkflow}
        >
          Create Workflow
        </Button>
      </Box>

      <Grid container spacing={3}>
        {workflows.map((workflow) => (
          <Grid item xs={12} md={6} lg={4} key={workflow._id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6">{workflow.name}</Typography>
                  <Box>
                    <IconButton onClick={() => handleEditWorkflow(workflow)} size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteWorkflow(workflow._id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                
                <Typography variant="body2" color="textSecondary" mb={2}>
                  {workflow.description}
                </Typography>

                <Box mb={2}>
                  <Chip 
                    icon={<TimelineIcon />} 
                    label={`${workflow.approvalSequence?.length || 0} Steps`} 
                    size="small" 
                    sx={{ mr: 1 }}
                  />
                  <Chip 
                    icon={<RuleIcon />} 
                    label={`${workflow.conditionalRules?.length || 0} Rules`} 
                    size="small" 
                    sx={{ mr: 1 }}
                  />
                  <Chip 
                    icon={<CheckCircleIcon />} 
                    label={`${workflow.defaultApprovers?.length || 0} Default Approvers`} 
                    size="small" 
                  />
                </Box>

                {workflow.escalationSettings?.enabled && (
                  <Chip 
                    label={`Escalation: ${workflow.escalationSettings.escalationTime}h`} 
                    color="warning" 
                    size="small" 
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Workflow Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
        </DialogTitle>
        <DialogContent>
          <Box mb={3}>
            <TextField
              fullWidth
              label="Workflow Name"
              value={workflowForm.name}
              onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Description"
              value={workflowForm.description}
              onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
          </Box>

          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Rules" />
            <Tab label="Approval Sequence" />
            <Tab label="Conditional Rules" />
            <Tab label="Settings" />
          </Tabs>

          {/* Rules Tab */}
          {tabValue === 0 && (
            <Box mt={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Workflow Rules</Typography>
                <Button startIcon={<AddIcon />} onClick={addWorkflowRule}>
                  Add Rule
                </Button>
              </Box>

              {workflowForm.rules.map((rule, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      {rule.condition === 'amount_threshold' ? `Amount >= $${rule.value}` :
                       rule.condition === 'category' ? `Category: ${rule.value}` :
                       rule.condition === 'department' ? `Department: ${rule.value}` :
                       'Unnamed Rule'}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                          <InputLabel>Condition</InputLabel>
                          <Select
                            value={rule.condition}
                            onChange={(e) => updateWorkflowRule(index, 'condition', e.target.value)}
                          >
                            <MenuItem value="amount_threshold">Amount Threshold</MenuItem>
                            <MenuItem value="category">Category</MenuItem>
                            <MenuItem value="department">Department</MenuItem>
                            <MenuItem value="employee_level">Employee Level</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        {rule.condition === 'amount_threshold' ? (
                          <TextField
                            fullWidth
                            label="Amount Threshold"
                            type="number"
                            value={rule.value}
                            onChange={(e) => updateWorkflowRule(index, 'value', parseFloat(e.target.value))}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        ) : rule.condition === 'category' ? (
                          <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                              value={rule.value}
                              onChange={(e) => updateWorkflowRule(index, 'value', e.target.value)}
                            >
                              <MenuItem value="travel">Travel</MenuItem>
                              <MenuItem value="meals">Meals</MenuItem>
                              <MenuItem value="accommodation">Accommodation</MenuItem>
                              <MenuItem value="transport">Transport</MenuItem>
                              <MenuItem value="office_supplies">Office Supplies</MenuItem>
                              <MenuItem value="entertainment">Entertainment</MenuItem>
                              <MenuItem value="training">Training</MenuItem>
                              <MenuItem value="communication">Communication</MenuItem>
                              <MenuItem value="other">Other</MenuItem>
                            </Select>
                          </FormControl>
                        ) : (
                          <TextField
                            fullWidth
                            label="Value"
                            value={rule.value}
                            onChange={(e) => updateWorkflowRule(index, 'value', e.target.value)}
                          />
                        )}
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                          <InputLabel>Approvers</InputLabel>
                          <Select
                            multiple
                            value={rule.approvers}
                            onChange={(e) => updateWorkflowRule(index, 'approvers', e.target.value)}
                          >
                            {availableApprovers.map((approver) => (
                              <MenuItem key={approver._id} value={approver._id}>
                                {approver.firstName} {approver.lastName} ({approver.role})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <Button 
                          color="error" 
                          onClick={() => removeWorkflowRule(index)}
                          startIcon={<DeleteIcon />}
                        >
                          Remove Rule
                        </Button>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}

              {workflowForm.rules.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  No rules defined. Add rules to define when this workflow should apply.
                </Typography>
              )}
            </Box>
          )}

          {/* Approval Sequence Tab */}
          {tabValue === 1 && (
            <Box mt={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Approval Sequence</Typography>
                <Button startIcon={<AddIcon />} onClick={addApprovalSequenceStep}>
                  Add Step
                </Button>
              </Box>

              {workflowForm.approvalSequence.map((step, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Step {step.step}: {step.name || 'Unnamed Step'}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Step Name"
                          value={step.name}
                          onChange={(e) => updateApprovalSequenceStep(index, 'name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Approvers</InputLabel>
                          <Select
                            multiple
                            value={step.approvers}
                            onChange={(e) => updateApprovalSequenceStep(index, 'approvers', e.target.value)}
                          >
                            {availableApprovers.map((approver) => (
                              <MenuItem key={approver._id} value={approver._id}>
                                {approver.firstName} {approver.lastName} ({approver.role})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={step.isManagerApprover}
                              onChange={(e) => updateApprovalSequenceStep(index, 'isManagerApprover', e.target.checked)}
                            />
                          }
                          label="Manager Approver"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={step.isRequired}
                              onChange={(e) => updateApprovalSequenceStep(index, 'isRequired', e.target.checked)}
                            />
                          }
                          label="Required"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {/* Conditional Rules Tab */}
          {tabValue === 2 && (
            <Box mt={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Conditional Rules</Typography>
                <Button startIcon={<AddIcon />} onClick={addConditionalRule}>
                  Add Rule
                </Button>
              </Box>

              {workflowForm.conditionalRules.map((rule, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>{rule.name || 'Unnamed Rule'} ({rule.type})</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Rule Name"
                          value={rule.name}
                          onChange={(e) => updateConditionalRule(index, 'name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Rule Type</InputLabel>
                          <Select
                            value={rule.type}
                            onChange={(e) => updateConditionalRule(index, 'type', e.target.value)}
                          >
                            <MenuItem value="percentage">Percentage</MenuItem>
                            <MenuItem value="specific_approver">Specific Approver</MenuItem>
                            <MenuItem value="hybrid">Hybrid</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      {rule.type === 'percentage' && (
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Percentage"
                            type="number"
                            value={rule.percentage}
                            onChange={(e) => updateConditionalRule(index, 'percentage', parseInt(e.target.value))}
                            inputProps={{ min: 0, max: 100 }}
                          />
                        </Grid>
                      )}
                      {rule.type === 'specific_approver' && (
                        <Grid item xs={12}>
                          <FormControl fullWidth>
                            <InputLabel>Specific Approvers</InputLabel>
                            <Select
                              multiple
                              value={rule.specificApprovers}
                              onChange={(e) => updateConditionalRule(index, 'specificApprovers', e.target.value)}
                            >
                              {availableApprovers.map((approver) => (
                                <MenuItem key={approver._id} value={approver._id}>
                                  {approver.firstName} {approver.lastName} ({approver.role})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={rule.autoApprove}
                              onChange={(e) => updateConditionalRule(index, 'autoApprove', e.target.checked)}
                            />
                          }
                          label="Auto Approve"
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {/* Settings Tab */}
          {tabValue === 3 && (
            <Box mt={2}>
              <Typography variant="h6" mb={2}>Default Approvers</Typography>
              <FormControl fullWidth>
                <InputLabel>Default Approvers</InputLabel>
                <Select
                  multiple
                  value={workflowForm.defaultApprovers}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, defaultApprovers: e.target.value })}
                >
                  {availableApprovers.map((approver) => (
                    <MenuItem key={approver._id} value={approver._id}>
                      {approver.firstName} {approver.lastName} ({approver.role})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" mb={2}>Escalation Settings</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={workflowForm.escalationSettings.enabled}
                    onChange={(e) => setWorkflowForm({
                      ...workflowForm,
                      escalationSettings: {
                        ...workflowForm.escalationSettings,
                        enabled: e.target.checked
                      }
                    })}
                  />
                }
                label="Enable Escalation"
              />

              {workflowForm.escalationSettings.enabled && (
                <Grid container spacing={2} mt={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Escalation Time (hours)"
                      type="number"
                      value={workflowForm.escalationSettings.escalationTime}
                      onChange={(e) => setWorkflowForm({
                        ...workflowForm,
                        escalationSettings: {
                          ...workflowForm.escalationSettings,
                          escalationTime: parseInt(e.target.value)
                        }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Escalation Approvers</InputLabel>
                      <Select
                        multiple
                        value={workflowForm.escalationSettings.escalationApprovers}
                        onChange={(e) => setWorkflowForm({
                          ...workflowForm,
                          escalationSettings: {
                            ...workflowForm.escalationSettings,
                            escalationApprovers: e.target.value
                          }
                        })}
                      >
                        {availableApprovers.map((approver) => (
                          <MenuItem key={approver._id} value={approver._id}>
                            {approver.firstName} {approver.lastName} ({approver.role})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveWorkflow} variant="contained">
            {editingWorkflow ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalWorkflows;
