import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading } = useAuth();

  const error = searchParams.get('error');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/google`;
  };

  if (loading) {
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
          Loading...
        </Typography>
      </Box>
    );
  }

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
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            padding: 4,
            borderRadius: 2,
            textAlign: 'center'
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Expense Management System
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Sign in to manage your expenses and approvals
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error === 'oauth_failed' 
                ? 'Google authentication failed. Please try again.' 
                : 'An error occurred during login. Please try again.'
              }
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            sx={{
              backgroundColor: '#4285f4',
              '&:hover': {
                backgroundColor: '#3367d6',
              },
              py: 1.5,
              px: 4,
              fontSize: '1.1rem'
            }}
            fullWidth
          >
            Sign in with Google
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;

