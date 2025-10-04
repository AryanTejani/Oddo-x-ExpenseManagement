import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Autocomplete,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const RoleSelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    role: '',
    companyId: '',
    companyName: '',
    country: '',
    currency: { code: '', name: '', symbol: '' },
    registrationType: 'join' // 'join' or 'create'
  });
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [error, setError] = useState('');

  const tempToken = searchParams.get('token');

  useEffect(() => {
    if (!tempToken) {
      navigate('/login');
      return;
    }

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      console.log('🌍 Loading countries from backend proxy...');
      
      const response = await axios.get('/api/companies/data/countries');
      setCountries(response.data);
      console.log('✅ Loaded countries:', response.data.length);
    } catch (error) {
      console.error('❌ Failed to load countries:', error);
      setError('Failed to load countries data. Please try again.');
    } finally {
      setLoadingCountries(false);
    }
  };

    loadCountries();
  }, [tempToken, navigate]);

  // Search companies function
  const searchCompanies = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setCompanies([]);
      return;
    }

    try {
      setLoadingCompanies(true);
      console.log('🔍 Searching for companies:', searchTerm);
      
      const response = await axios.get(`/api/companies/search?q=${encodeURIComponent(searchTerm)}`);
      
      console.log('📋 Search results:', response.data);
      setCompanies(response.data);
    } catch (error) {
      console.error('❌ Company search error:', error);
      setCompanies([]);
      setError(`Search error: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Debounced company search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (companySearch) {
        searchCompanies(companySearch);
      } else {
        setCompanies([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [companySearch]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCountryChange = (countryName) => {
    const country = countries.find(c => c.name === countryName);
    if (country && country.currencies.length > 0) {
      const currency = country.currencies[0];
      setFormData(prev => ({
        ...prev,
        country: countryName,
        currency: {
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol
        }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.role) {
      setError('Please select your role');
      return;
    }

    if (formData.registrationType === 'join' && !formData.companyId) {
      setError('Please select a company to join');
      return;
    }

    if (formData.registrationType === 'create' && !formData.companyName) {
      setError('Please enter a company name');
      return;
    }

    // Only require country/currency for new company creation
    if (formData.registrationType === 'create' && (!formData.country || !formData.currency.code)) {
      setError('Please select your country and currency');
      return;
    }

    try {
      console.log('🚀 Starting registration with data:', {
        registrationType: formData.registrationType,
        role: formData.role,
        companyId: formData.companyId,
        companyName: formData.companyName,
        country: formData.country,
        currency: formData.currency
      });

      const companyData = formData.registrationType === 'join'
        ? { companyId: formData.companyId }
        : {
            companyName: formData.companyName,
            country: formData.country,
            currency: formData.currency
          };

      console.log('📤 Sending company data:', companyData);

      const result = await login(tempToken, formData.role, companyData);
      
      console.log('📥 Registration result:', result);
      
      if (result.success) {
        console.log('✅ Registration successful, navigating to dashboard');
        navigate('/dashboard');
      } else {
        console.error('❌ Registration failed:', result.error);
        setError(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      setError(`Registration failed: ${error.message}`);
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Administrator', description: 'Full system access and management' },
    { value: 'manager', label: 'Manager', description: 'Approve expenses and manage team' },
    { value: 'employee', label: 'Employee', description: 'Submit and track expenses' }
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 2
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={10}
          sx={{
            padding: 4,
            borderRadius: 2
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Complete Your Registration
          </Typography>
          
          <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
            Please select your role and company information
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Role Selection */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Select Your Role
                </Typography>
                <Grid container spacing={2}>
                  {roleOptions.map((role) => (
                    <Grid item xs={12} sm={4} key={role.value}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          border: formData.role === role.value ? 2 : 1,
                          borderColor: formData.role === role.value ? 'primary.main' : 'divider'
                        }}
                        onClick={() => handleInputChange('role', role.value)}
                      >
                        <CardContent>
                          <Typography variant="h6" component="div">
                            {role.label}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {role.description}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Registration Type Selection */}
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Registration Type</FormLabel>
                  <RadioGroup
                    value={formData.registrationType}
                    onChange={(e) => handleInputChange('registrationType', e.target.value)}
                    row
                  >
                    <FormControlLabel value="join" control={<Radio />} label="Join Existing Company" />
                    <FormControlLabel value="create" control={<Radio />} label="Create New Company" />
                  </RadioGroup>
                </FormControl>
              </Grid>

              {/* Company Selection - Join Existing */}
              {formData.registrationType === 'join' && (
                <Grid item xs={12}>
                  <Autocomplete
                    freeSolo
                    options={companies}
                    getOptionLabel={(option) => option.name || ''}
                    value={companies.find(c => c._id === formData.companyId) || null}
                    onChange={(event, newValue) => {
                      if (newValue && typeof newValue === 'object') {
                        handleInputChange('companyId', newValue._id);
                      }
                    }}
                    onInputChange={(event, newInputValue) => {
                      setCompanySearch(newInputValue);
                    }}
                    loading={loadingCompanies}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search Company"
                        placeholder="Type company name..."
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <React.Fragment>
                              {loadingCompanies ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </React.Fragment>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body1">{option.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {option.country} • {option.currency?.code}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  />
                </Grid>
              )}

              {/* Company Creation - Create New */}
              {formData.registrationType === 'create' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Company Name"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="Enter company name"
                    required
                  />
                </Grid>
              )}

              {/* Country and Currency - Only for new company creation */}
              {formData.registrationType === 'create' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Country</InputLabel>
                      <Select
                        value={formData.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        label="Country"
                        disabled={loadingCountries}
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
                      value={formData.currency.name || ''}
                      disabled
                      helperText={`Code: ${formData.currency.code} | Symbol: ${formData.currency.symbol}`}
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Complete Registration'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default RoleSelection;

