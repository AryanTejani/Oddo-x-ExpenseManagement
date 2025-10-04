// Centralized API client with consistent error handling

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      console.log(`🔄 API Request: ${config.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      console.log(`📡 API Response: ${response.status} ${response.statusText}`);

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status} - ${errorText}`);
        
        // Try to parse as JSON for structured error
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new ApiError(response.status, errorData.message, errorData);
      }

      // Check if response has content
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`✅ API Success:`, data);
        return data;
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        console.log(`✅ API Success (text):`, text);
        return text;
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      console.error(`💥 Network Error:`, error);
      throw new ApiError(0, 'Network error. Please check your connection.', null);
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
      headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // Helper method for handling array responses
  async getArray(endpoint, arrayKey = null) {
    const data = await this.get(endpoint);
    
    if (arrayKey && data[arrayKey] && Array.isArray(data[arrayKey])) {
      return data[arrayKey];
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.warn('Expected array response but got:', data);
      return [];
    }
  }
}

class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
export { ApiError };

// Convenience methods for common endpoints
export const api = {
  // Expenses
  expenses: {
    getAll: () => apiClient.getArray('/api/expenses', 'expenses'),
    getById: (id) => apiClient.get(`/api/expenses/${id}`),
    create: (data) => apiClient.post('/api/expenses', data),
    update: (id, data) => apiClient.put(`/api/expenses/${id}`, data),
    delete: (id) => apiClient.delete(`/api/expenses/${id}`),
    submit: (id) => apiClient.post(`/api/expenses/${id}/submit`),
    ocrProcess: (formData) => apiClient.post('/api/expenses/ocr-process', formData),
    ocrDraft: (data) => apiClient.post('/api/expenses/ocr-draft', data),
    dashboard: () => apiClient.get('/api/expenses/dashboard'),
  },

  // Approvals
  approvals: {
    getPending: () => apiClient.getArray('/api/approvals/pending', 'expenses'),
    getHistory: () => apiClient.getArray('/api/approvals/history', 'expenses'),
    approve: (id, data) => apiClient.post(`/api/approvals/${id}/approve`, data),
    reject: (id, data) => apiClient.post(`/api/approvals/${id}/reject`, data),
    getStats: () => apiClient.get('/api/approvals/stats'),
  },

  // Approval Workflows
  workflows: {
    getAll: () => apiClient.getArray('/api/approval-workflows', 'workflows'),
    getById: (id) => apiClient.get(`/api/approval-workflows/${id}`),
    create: (data) => apiClient.post('/api/approval-workflows', data),
    update: (id, data) => apiClient.put(`/api/approval-workflows/${id}`, data),
    delete: (id) => apiClient.delete(`/api/approval-workflows/${id}`),
    getAvailableApprovers: () => apiClient.getArray('/api/approval-workflows/approvers/available', 'approvers'),
  },

  // Users
  users: {
    getAll: () => apiClient.getArray('/api/users', 'users'),
    getById: (id) => apiClient.get(`/api/users/${id}`),
    create: (data) => apiClient.post('/api/users', data),
    update: (id, data) => apiClient.put(`/api/users/${id}`, data),
    delete: (id) => apiClient.delete(`/api/users/${id}`),
  },

  // Companies
  companies: {
    getById: (id) => apiClient.get(`/api/companies/${id}`),
    update: (id, data) => apiClient.put(`/api/companies/${id}`, data),
    getCountries: () => apiClient.getArray('/api/companies/data/countries'),
    getExchangeRates: (currency) => apiClient.get(`/api/companies/data/exchange-rates/${currency}`),
  },

  // Auth
  auth: {
    me: () => apiClient.get('/api/auth/me'),
    logout: () => apiClient.post('/api/auth/logout'),
    updateProfile: (data) => apiClient.put('/api/auth/profile', data),
  },
};
