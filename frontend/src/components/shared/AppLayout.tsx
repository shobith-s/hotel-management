import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-72 flex-1 min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}
