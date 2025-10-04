import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const userData = searchParams.get('user');

        if (!token) {
          setError('No authentication token received');
          setLoading(false);
          return;
        }

        // If user data is provided, user already exists
        if (userData) {
          console.log('✅ Existing user logged in, redirecting to dashboard');
          // Store token in localStorage
          localStorage.setItem('token', token);
          navigate('/dashboard');
          return;
        }

        // If no user data, redirect to role selection
        console.log('🆕 New user, redirecting to role selection');
        navigate(`/auth/role-selection?token=${token}`);
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('Authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
      >
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <button onClick={() => navigate('/login')}>
          Return to Login
        </button>
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      justifyContent="center" 
      alignItems="center" 
      minHeight="100vh"
      flexDirection="column"
    >
      <CircularProgress size={60} />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Completing authentication...
      </Typography>
    </Box>
  );
};

export default AuthCallback;
