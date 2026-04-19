import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { AuthorizePage } from './pages/AuthorizePage';
import { PasskeyVerificationPage } from './pages/PasskeyVerificationPage';
import { XmojBindingPage } from './pages/XmojBindingPage';
import { AccountSecurityPage } from './pages/AccountSecurityPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminPendingAppsPage } from './pages/AdminPendingAppsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminSystemSettingsPage } from './pages/AdminSystemSettingsPage';
import { DocsPage } from './pages/DocsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/authorize" element={<AuthorizePage />} />
            <Route path="/passkey-verification" element={<PasskeyVerificationPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pending-apps"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPendingAppsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminSystemSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/apps"
              element={
                <ProtectedRoute>
                  <ApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/apps/:appId"
              element={
                <ProtectedRoute>
                  <ApplicationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/xmoj-binding"
              element={
                <ProtectedRoute>
                  <XmojBindingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account-security"
              element={
                <ProtectedRoute>
                  <AccountSecurityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <AccountSecurityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/docs"
              element={
                <ProtectedRoute allowedRoles={['merchant', 'admin']}>
                  <DocsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
