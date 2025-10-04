import React, { useState } from 'react';
import { Box, Button, Typography, Paper, TextField } from '@mui/material';

const APITest = () => {
  const [searchTerm, setSearchTerm] = useState('Test');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('🔍 Testing API with search term:', searchTerm);
      
      const response = await axios.get(`/api/companies/search?q=${encodeURIComponent(searchTerm)}`);
      
      console.log('✅ API Response:', response.data);
      setResults(response.data);
    } catch (err) {
      console.error('❌ API Error:', err);
      setError(`API Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDebugAPI = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await axios.get('/api/companies/debug/all');
      
      console.log('✅ Debug API Response:', response.data);
      setResults(response.data);
    } catch (err) {
      console.error('❌ Debug API Error:', err);
      setError(`Debug API Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        API Test Page
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Company Search API
        </Typography>
        
        <Box display="flex" gap={2} mb={2}>
          <TextField
            label="Search Term"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            variant="outlined"
          />
          <Button 
            variant="contained" 
            onClick={testAPI}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Search API'}
          </Button>
          <Button 
            variant="outlined" 
            onClick={testDebugAPI}
            disabled={loading}
          >
            Test Debug API
          </Button>
        </Box>

        <Typography variant="body2" color="textSecondary">
          API URL: {import.meta.env.VITE_API_URL || 'http://localhost:3000'}
        </Typography>
      </Paper>

      {error && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'error.light' }}>
          <Typography variant="h6" color="error">
            Error:
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {error}
          </Typography>
        </Paper>
      )}

      {results && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Results:
          </Typography>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </Paper>
      )}
    </Box>
  );
};

export default APITest;
