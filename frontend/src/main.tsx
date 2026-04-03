import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import AppLayout from './components/shared/AppLayout'
import RequireAuth from './components/shared/RequireAuth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MenuPage from './pages/MenuPage'
import OrderEntryPage from './pages/OrderEntryPage'
import KDSPage from './pages/KDSPage'
import BillingPage from './pages/BillingPage'
import LodgePage from './pages/LodgePage'
import UsersPage from './pages/UsersPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import AuditLogPage from './pages/AuditLogPage'
import HousekeepingPage from './pages/HousekeepingPage'
import ErrorBoundary from './components/shared/ErrorBoundary'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public — redirect to dashboard if already logged in */}
          <Route
            path="/login"
            element={localStorage.getItem('token') ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />

          {/* Protected app routes — RequireAuth validates token before rendering */}
          <Route element={<RequireAuth />}>
            {/* Change password — no sidebar, rendered before AppLayout guard */}
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/orders" element={<OrderEntryPage />} />
              <Route path="/kds" element={<KDSPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/lodge" element={<LodgePage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/audit" element={<AuditLogPage />} />
              <Route path="/housekeeping" element={<HousekeepingPage />} />
            </Route>
          </Route>

          {/* Default */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
)
