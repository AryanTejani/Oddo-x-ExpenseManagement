// Centralized error handling utilities

export const handleApiError = (error, context = '') => {
  console.error(`❌ API Error in ${context}:`, error);
  
  // Network errors
  if (!error.response) {
    return {
      message: 'Network error. Please check your connection and try again.',
      type: 'network',
      severity: 'error'
    };
  }

  // HTTP status errors
  const status = error.response.status;
  const data = error.response.data;

  switch (status) {
    case 400:
      return {
        message: data.message || 'Invalid request. Please check your input.',
        type: 'validation',
        severity: 'warning',
        details: data.errors || []
      };
    
    case 401:
      return {
        message: 'Your session has expired. Please log in again.',
        type: 'auth',
        severity: 'error',
        action: 'redirect',
        redirectTo: '/login'
      };
    
    case 403:
      return {
        message: 'You do not have permission to perform this action.',
        type: 'permission',
        severity: 'error'
      };
    
    case 404:
      return {
        message: 'The requested resource was not found.',
        type: 'not_found',
        severity: 'warning'
      };
    
    case 422:
      return {
        message: 'Validation failed. Please check your input.',
        type: 'validation',
        severity: 'warning',
        details: data.errors || []
      };
    
    case 500:
      return {
        message: 'Server error. Please try again later.',
        type: 'server',
        severity: 'error'
      };
    
    default:
      return {
        message: data.message || 'An unexpected error occurred.',
        type: 'unknown',
        severity: 'error'
      };
  }
};

export const showErrorToast = (error, context = '') => {
  const errorInfo = handleApiError(error, context);
  
  // You can customize this based on your toast library
  return {
    message: errorInfo.message,
    type: errorInfo.severity,
    autoClose: errorInfo.severity === 'error' ? 5000 : 3000,
    details: errorInfo.details
  };
};

export const isValidationError = (error) => {
  return error.response?.status === 400 || error.response?.status === 422;
};

export const getValidationErrors = (error) => {
  if (isValidationError(error)) {
    return error.response.data.errors || [];
  }
  return [];
};

export const formatValidationErrors = (errors) => {
  if (!Array.isArray(errors)) return '';
  
  return errors
    .map(err => err.msg || err.message || err)
    .join(', ');
};
