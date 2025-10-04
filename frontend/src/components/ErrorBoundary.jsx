import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            p: 3,
            textAlign: 'center'
          }}
        >
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          
          <Typography variant="h5" gutterBottom>
            Something went wrong
          </Typography>
          
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3, maxWidth: 600 }}>
            We encountered an unexpected error. This might be due to a temporary issue or a bug in the application.
          </Typography>

          <Alert severity="error" sx={{ mb: 3, maxWidth: 600, textAlign: 'left' }}>
            <Typography variant="body2" component="div">
              <strong>Error Details:</strong>
              <br />
              {this.state.error && this.state.error.toString()}
              {this.state.errorInfo && (
                <>
                  <br /><br />
                  <strong>Component Stack:</strong>
                  <br />
                  <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={this.handleRefresh}
            >
              Refresh Page
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
