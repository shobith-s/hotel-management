import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import AppLayout from './components/shared/AppLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OrderEntryPage from './pages/OrderEntryPage'
import KDSPage from './pages/KDSPage'
import BillingPage from './pages/BillingPage'
import LodgePage from './pages/LodgePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* App (with Sidebar) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<OrderEntryPage />} />
          <Route path="/kds" element={<KDSPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/lodge" element={<LodgePage />} />
        </Route>

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
