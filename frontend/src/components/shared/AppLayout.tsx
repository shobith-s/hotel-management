import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export default function AppLayout() {
  const isOnline = useOnlineStatus()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-72 flex-1 min-h-screen">
        {!isOnline && (
          <div className="sticky top-0 z-50 flex items-center gap-2 bg-amber-500 text-white px-4 py-2 text-sm font-semibold shadow-md">
            <span className="material-symbols-outlined text-base">wifi_off</span>
            You are offline — showing cached data. Changes will not be saved until reconnected.
          </div>
        )}
        <Outlet />
      </div>
    </div>
  )
}
