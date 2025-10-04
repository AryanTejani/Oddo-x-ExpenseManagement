import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { CompanyProvider } from './contexts/CompanyContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import ExpenseForm from './pages/ExpenseForm';
import Approvals from './pages/Approvals';
import ApprovalWorkflows from './pages/ApprovalWorkflows';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import APITest from './pages/APITest';
import ExpenseManagement from './pages/ExpenseManagement';
import CurrencyConverter from './components/CurrencyConverter';
import SystemTest from './pages/SystemTest';
import ExpenseTest from './pages/ExpenseTest';
import FeatureTest from './pages/FeatureTest';
import DemoSetup from './pages/DemoSetup';
import AuthCallback from './pages/AuthCallback';
import ErrorBoundary from './components/ErrorBoundary';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <CompanyProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/role-selection" element={<RoleSelection />} />
                
                {/* Protected Routes */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/expenses" replace />} />
                  <Route path="dashboard" element={
                    <ProtectedRoute allowedRoles={['manager', 'admin']}>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="expenses" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <Expenses />
                      </ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="expenses/new" element={
                    <ProtectedRoute>
                      <ExpenseForm />
                    </ProtectedRoute>
                  } />
                  <Route path="expenses/:id/edit" element={
                    <ProtectedRoute>
                      <ExpenseForm />
                    </ProtectedRoute>
                  } />
                  <Route path="approvals" element={
                    <ProtectedRoute allowedRoles={['manager', 'admin']}>
                      <Approvals />
                    </ProtectedRoute>
                  } />
                  <Route path="approval-workflows" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ApprovalWorkflows />
                    </ProtectedRoute>
                  } />
                  <Route path="users" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Users />
                    </ProtectedRoute>
                  } />
                  <Route path="settings" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="api-test" element={<APITest />} />
                  <Route path="expense-management" element={
                    <ProtectedRoute>
                      <ExpenseManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="currency-converter" element={<CurrencyConverter />} />
                  <Route path="system-test" element={<SystemTest />} />
                  <Route path="expense-test" element={
                    <ProtectedRoute>
                      <ExpenseTest />
                    </ProtectedRoute>
                  } />
                  <Route path="feature-test" element={
                    <ProtectedRoute>
                      <FeatureTest />
                    </ProtectedRoute>
                  } />
                  <Route path="demo-setup" element={
                    <ProtectedRoute>
                      <DemoSetup />
                    </ProtectedRoute>
                  } />
                </Route>
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Router>
          </CompanyProvider>
        </AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
