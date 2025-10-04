// Shared utility functions for expense-related UI components

export const getStatusColor = (status) => {
  switch (status) {
    case 'draft': return 'default';
    case 'submitted': return 'warning';
    case 'approved': return 'success';
    case 'rejected': return 'error';
    case 'pending': return 'warning'; // Legacy support
    default: return 'default';
  }
};

export const getCategoryLabel = (category) => {
  const labels = {
    travel: 'Travel',
    meals: 'Meals',
    accommodation: 'Accommodation',
    transport: 'Transport',
    office_supplies: 'Office Supplies',
    entertainment: 'Entertainment',
    training: 'Training',
    communication: 'Communication',
    other: 'Other'
  };
  return labels[category] || category;
};

export const getStatusIcon = (status) => {
  switch (status) {
    case 'draft': return '📝';
    case 'submitted': return '⏳';
    case 'approved': return '✅';
    case 'rejected': return '❌';
    default: return '📄';
  }
};

export const formatCurrency = (amount, currency) => {
  if (typeof currency === 'object') {
    return `${currency.symbol}${amount.toFixed(2)} ${currency.code}`;
  }
  return `$${amount.toFixed(2)}`;
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString();
};

export const getExpenseStatusText = (status) => {
  const statusTexts = {
    draft: 'Draft',
    submitted: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected'
  };
  return statusTexts[status] || status;
};
