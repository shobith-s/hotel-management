import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout() {
  const isOnline = useOnlineStatus()
  const { user } = useAuth()
  const isMobileRole = user?.role === 'housekeeping'

  const offlineBanner = !isOnline && (
    <div className="sticky top-0 z-50 flex items-center gap-2 bg-amber-500 text-white px-4 py-2 text-sm font-semibold shadow-md">
      <span className="material-symbols-outlined text-base">wifi_off</span>
      You are offline — showing cached data. Changes will not be saved until reconnected.
    </div>
  )

  if (isMobileRole) {
    return (
      <div className="min-h-screen bg-surface">
        {offlineBanner}
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-72 flex-1 min-h-screen">
        {offlineBanner}
        <Outlet />
      </div>
    </div>
  )
}
