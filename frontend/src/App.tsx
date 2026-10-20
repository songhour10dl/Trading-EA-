import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { PositionsPage } from './pages/PositionsPage';
import { TradeHistoryPage } from './pages/TradeHistoryPage';
import { ActivityFeedPage } from './pages/ActivityFeedPage';
import { MarketAnalysisPage } from './pages/MarketAnalysisPage';
import { SettingsPage } from './pages/SettingsPage';
import { BotControlPage } from './pages/BotControlPage';
import { SetupPage } from './pages/SetupPage';
import { EAManagementPage } from './pages/EAManagementPage';
import { ToastContainer, ErrorBoundary } from './components/Common';
import { MainLayout } from './components/Layout';

// Waits for auth check then either renders children or redirects
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const authChecked = useAuthStore((state) => state.authChecked);

  // Not yet checked — render nothing (avoids flicker/redirect)
  if (!authChecked) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, []);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/setup"
            element={
              <ProtectedRoute>
                <SetupPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/positions"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PositionsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TradeHistoryPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ActivityFeedPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MarketAnalysisPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SettingsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/control"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <BotControlPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ea"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <EAManagementPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
