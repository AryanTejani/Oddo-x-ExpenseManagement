// Testing utilities for expense management system

export const createMockExpense = (overrides = {}) => ({
  _id: 'test-expense-123',
  amount: 50.00,
  currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
  category: 'meals',
  description: 'Test expense',
  date: new Date().toISOString(),
  merchant: 'Test Restaurant',
  status: 'draft',
  employee: {
    _id: 'test-employee-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com'
  },
  company: {
    _id: 'test-company-123',
    name: 'Test Company'
  },
  createdAt: new Date().toISOString(),
  ...overrides
});

export const createMockUser = (role = 'employee', overrides = {}) => ({
  _id: 'test-user-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  role,
  isActive: true,
  company: {
    _id: 'test-company-123',
    name: 'Test Company'
  },
  ...overrides
});

export const createMockCompany = (overrides = {}) => ({
  _id: 'test-company-123',
  name: 'Test Company',
  domain: 'testcompany.com',
  currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
  settings: {
    approvalWorkflow: 'manager',
    maxExpenseAmount: 1000
  },
  ...overrides
});

export const testExpenseData = {
  valid: {
    amount: 25.50,
    currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
    category: 'meals',
    description: 'Business lunch',
    date: new Date().toISOString().split('T')[0],
    merchant: 'Restaurant ABC'
  },
  invalid: {
    amount: -10, // Invalid negative amount
    currency: 'INVALID', // Invalid currency format
    category: 'invalid_category', // Invalid category
    description: '', // Empty description
    date: 'invalid-date' // Invalid date format
  }
};

export const testOCRData = {
  valid: {
    extractedText: 'Sample receipt text',
    confidence: 0.85,
    extractedAmount: 45.50,
    extractedDate: new Date(),
    extractedMerchant: 'Sample Store'
  },
  invalid: {
    extractedText: '',
    confidence: 0.1,
    extractedAmount: null,
    extractedDate: null,
    extractedMerchant: null
  }
};

export const validateExpenseData = (expenseData) => {
  const errors = [];
  
  if (!expenseData.amount || expenseData.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }
  
  if (!expenseData.currency || !expenseData.currency.code) {
    errors.push('Currency is required');
  }
  
  if (!expenseData.category) {
    errors.push('Category is required');
  }
  
  if (!expenseData.description || expenseData.description.trim().length === 0) {
    errors.push('Description is required');
  }
  
  if (!expenseData.date) {
    errors.push('Date is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const testApiEndpoints = {
  expenses: {
    create: 'POST /api/expenses',
    get: 'GET /api/expenses',
    update: 'PUT /api/expenses/:id',
    delete: 'DELETE /api/expenses/:id',
    submit: 'POST /api/expenses/:id/submit'
  },
  ocr: {
    process: 'POST /api/expenses/ocr-process',
    draft: 'POST /api/expenses/ocr-draft'
  },
  dashboard: {
    stats: 'GET /api/expenses/dashboard'
  }
};

export const runExpenseTests = async () => {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
  };
  
  // Test expense data validation
  const validTest = validateExpenseData(testExpenseData.valid);
  results.total++;
  if (validTest.isValid) {
    results.passed++;
    results.details.push('✅ Valid expense data validation passed');
  } else {
    results.failed++;
    results.details.push('❌ Valid expense data validation failed');
  }
  
  const invalidTest = validateExpenseData(testExpenseData.invalid);
  results.total++;
  if (!invalidTest.isValid) {
    results.passed++;
    results.details.push('✅ Invalid expense data validation passed');
  } else {
    results.failed++;
    results.details.push('❌ Invalid expense data validation failed');
  }
  
  return results;
};
